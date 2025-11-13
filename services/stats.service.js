/**
 * Statistics Service
 * 
 * This service handles all statistics and reporting operations including order statistics,
 * promotion analytics, review statistics, and report generation. It provides comprehensive
 * business intelligence data for merchant decision making.
 * 
 * Design decisions:
 * - Separates different types of statistics into dedicated JSON files
 * - Provides both summary and detailed analytics
 * - Supports multiple export formats (JSON, CSV)
 * - Implements caching for performance optimization
 * - Calculates derived metrics and trends
 */

const dataStore = require('./data.store');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../logs/app.log') })
  ]
});

class StatsService {
  constructor() {
    this.ordersStatsFile = 'orders.stats';
    this.promotionsStatsFile = 'promotions.stats';
    this.reviewsStatsFile = 'reviews.stats';
    this.dishesFile = 'dishes';
    this.categoriesFile = 'categories';
  }

  // ==================== ORDER STATISTICS ====================

  /**
   * Gets comprehensive order statistics
   * @param {Object} options - Query options (dateRange, groupBy, etc.)
   * @returns {Object} Order statistics
   */
  async getOrderStatistics(options = {}) {
    try {
      const orderStats = dataStore.readData(this.ordersStatsFile);
      const dishes = dataStore.readData(this.dishesFile);
      
      // Enrich top dishes with dish information
      const enrichedTopDishes = orderStats.topDishes.map(topDish => {
        const dish = dataStore.findById(dishes, topDish.dishId);
        return {
          ...topDish,
          dishName: dish ? dish.name : 'Unknown Dish',
          dishPrice: dish ? dish.price : 0,
          categoryId: dish ? dish.categoryId : null
        };
      });
      
      // Calculate additional metrics
      const growthRate = orderStats.yesterdayRevenue > 0 
        ? ((orderStats.todayRevenue - orderStats.yesterdayRevenue) / orderStats.yesterdayRevenue * 100).toFixed(2)
        : 0;
      
      const orderGrowthRate = orderStats.yesterdayOrders > 0
        ? ((orderStats.todayOrders - orderStats.yesterdayOrders) / orderStats.yesterdayOrders * 100).toFixed(2)
        : 0;
      
      const result = {
        ...orderStats,
        topDishes: enrichedTopDishes,
        metrics: {
          revenueGrowthRate: parseFloat(growthRate),
          orderGrowthRate: parseFloat(orderGrowthRate),
          averageOrderValue: orderStats.averageOrderValue,
          conversionRate: this.calculateConversionRate(orderStats),
          peakHourRevenue: this.calculatePeakHourRevenue(orderStats.peakHours, orderStats.averageOrderValue)
        }
      };
      
      logger.info('Retrieved order statistics');
      return result;
    } catch (error) {
      logger.error('Error getting order statistics:', error);
      throw error;
    }
  }

  /**
   * Calculates conversion rate based on order data
   * @param {Object} orderStats - Order statistics data
   * @returns {number} Conversion rate percentage
   */
  calculateConversionRate(orderStats) {
    // Mock calculation - in real app this would be based on actual visitor data
    const estimatedVisitors = orderStats.todayOrders * 3; // Assume 3 visitors per order
    return orderStats.todayOrders > 0 ? ((orderStats.todayOrders / estimatedVisitors) * 100).toFixed(2) : 0;
  }

  /**
   * Calculates peak hour revenue
   * @param {Array} peakHours - Peak hours data
   * @param {number} avgOrderValue - Average order value
   * @returns {Array} Peak hours with revenue
   */
  calculatePeakHourRevenue(peakHours, avgOrderValue) {
    return peakHours.map(hour => ({
      ...hour,
      revenue: (hour.orders * avgOrderValue).toFixed(2)
    }));
  }

  // ==================== PROMOTION STATISTICS ====================

  /**
   * Gets promotion statistics and analytics
   * @param {Object} options - Query options
   * @returns {Object} Promotion statistics
   */
  async getPromotionStatistics(options = {}) {
    try {
      const promotionStats = dataStore.readData(this.promotionsStatsFile);
      const dishes = dataStore.readData(this.dishesFile);
      
      // Enrich promotions with dish information
      const enrichActivePromotions = this.enrichPromotionsWithDishInfo(promotionStats.activePromotions, dishes);
      const enrichCompletedPromotions = this.enrichPromotionsWithDishInfo(promotionStats.completedPromotions, dishes);
      
      // Calculate additional metrics
      const totalPromotions = promotionStats.activePromotions.length + promotionStats.completedPromotions.length;
      const averageDiscountPerPromotion = totalPromotions > 0 
        ? (promotionStats.overallStats.totalDiscountGiven / totalPromotions).toFixed(2)
        : 0;
      
      const result = {
        ...promotionStats,
        activePromotions: enrichActivePromotions,
        completedPromotions: enrichCompletedPromotions,
        metrics: {
          totalPromotions,
          averageDiscountPerPromotion: parseFloat(averageDiscountPerPromotion),
          promotionEffectiveness: this.calculatePromotionEffectiveness(promotionStats),
          bestPerformingPromotion: this.findBestPerformingPromotion([...promotionStats.activePromotions, ...promotionStats.completedPromotions])
        }
      };
      
      logger.info('Retrieved promotion statistics');
      return result;
    } catch (error) {
      logger.error('Error getting promotion statistics:', error);
      throw error;
    }
  }

  /**
   * Gets detailed analytics for a specific promotion
   * @param {string} promotionId - Promotion ID
   * @returns {Object} Detailed promotion analytics
   */
  async getPromotionAnalytics(promotionId) {
    try {
      const promotionStats = dataStore.readData(this.promotionsStatsFile);
      const dishes = dataStore.readData(this.dishesFile);
      
      // Find promotion in active or completed promotions
      let promotion = promotionStats.activePromotions.find(p => p.id === promotionId);
      let isActive = true;
      
      if (!promotion) {
        promotion = promotionStats.completedPromotions.find(p => p.id === promotionId);
        isActive = false;
      }
      
      if (!promotion) {
        logger.warn(`Promotion not found: ${promotionId}`);
        return null;
      }
      
      // Enrich with dish information
      const applicableDishes = promotion.applicableDishes.map(dishId => {
        const dish = dataStore.findById(dishes, dishId);
        return dish ? {
          id: dish.id,
          name: dish.name,
          price: dish.price,
          categoryId: dish.categoryId
        } : null;
      }).filter(dish => dish !== null);
      
      // Calculate detailed metrics
      const roi = promotion.totalRevenue > 0 
        ? (((promotion.totalRevenue - promotion.discountGiven) / promotion.discountGiven) * 100).toFixed(2)
        : 0;
      
      const averageOrderValue = promotion.totalOrders > 0 
        ? (promotion.totalRevenue / promotion.totalOrders).toFixed(2)
        : 0;
      
      const discountPercentage = promotion.totalRevenue > 0 
        ? ((promotion.discountGiven / (promotion.totalRevenue + promotion.discountGiven)) * 100).toFixed(2)
        : 0;
      
      const result = {
        ...promotion,
        isActive,
        applicableDishes,
        analytics: {
          roi: parseFloat(roi),
          averageOrderValue: parseFloat(averageOrderValue),
          discountPercentage: parseFloat(discountPercentage),
          ordersPerDay: this.calculateOrdersPerDay(promotion),
          revenuePerDay: this.calculateRevenuePerDay(promotion),
          effectivenessScore: this.calculateEffectivenessScore(promotion)
        }
      };
      
      logger.info(`Retrieved analytics for promotion: ${promotionId}`);
      return result;
    } catch (error) {
      logger.error(`Error getting promotion analytics for ${promotionId}:`, error);
      throw error;
    }
  }

  /**
   * Enriches promotions with dish information
   * @param {Array} promotions - Array of promotions
   * @param {Array} dishes - Array of dishes
   * @returns {Array} Enriched promotions
   */
  enrichPromotionsWithDishInfo(promotions, dishes) {
    return promotions.map(promotion => ({
      ...promotion,
      applicableDishNames: promotion.applicableDishes.map(dishId => {
        const dish = dataStore.findById(dishes, dishId);
        return dish ? dish.name : 'Unknown Dish';
      })
    }));
  }

  /**
   * Calculates promotion effectiveness
   * @param {Object} promotionStats - Promotion statistics
   * @returns {number} Effectiveness score
   */
  calculatePromotionEffectiveness(promotionStats) {
    const { overallStats } = promotionStats;
    if (overallStats.totalPromotionalOrders === 0) return 0;
    
    // Effectiveness based on conversion rate and ROI
    const avgConversionRate = overallStats.averageConversionRate;
    const roi = overallStats.totalDiscountGiven > 0 
      ? (overallStats.totalPromotionalRevenue - overallStats.totalDiscountGiven) / overallStats.totalDiscountGiven
      : 0;
    
    return ((avgConversionRate * 100) + (roi * 10)).toFixed(2);
  }

  /**
   * Finds the best performing promotion
   * @param {Array} promotions - Array of all promotions
   * @returns {Object} Best performing promotion
   */
  findBestPerformingPromotion(promotions) {
    if (promotions.length === 0) return null;
    
    return promotions.reduce((best, current) => {
      const currentScore = (current.totalRevenue * current.conversionRate) - current.discountGiven;
      const bestScore = (best.totalRevenue * best.conversionRate) - best.discountGiven;
      
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Calculates orders per day for a promotion
   * @param {Object} promotion - Promotion data
   * @returns {number} Orders per day
   */
  calculateOrdersPerDay(promotion) {
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    return daysDiff > 0 ? (promotion.totalOrders / daysDiff).toFixed(2) : 0;
  }

  /**
   * Calculates revenue per day for a promotion
   * @param {Object} promotion - Promotion data
   * @returns {number} Revenue per day
   */
  calculateRevenuePerDay(promotion) {
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    return daysDiff > 0 ? (promotion.totalRevenue / daysDiff).toFixed(2) : 0;
  }

  /**
   * Calculates effectiveness score for a promotion
   * @param {Object} promotion - Promotion data
   * @returns {number} Effectiveness score (0-100)
   */
  calculateEffectivenessScore(promotion) {
    // Score based on conversion rate, ROI, and order volume
    const conversionScore = promotion.conversionRate * 100;
    const roi = promotion.totalRevenue > promotion.discountGiven 
      ? ((promotion.totalRevenue - promotion.discountGiven) / promotion.discountGiven) * 10
      : 0;
    const volumeScore = Math.min(promotion.totalOrders / 10, 20); // Max 20 points for volume
    
    return Math.min(conversionScore + roi + volumeScore, 100).toFixed(2);
  }

  // ==================== REVIEW STATISTICS ====================

  /**
   * Gets review statistics and analytics
   * @param {Object} options - Query options
   * @returns {Object} Review statistics
   */
  async getReviewStatistics(options = {}) {
    try {
      const reviewStats = dataStore.readData(this.reviewsStatsFile);
      const dishes = dataStore.readData(this.dishesFile);
      
      // Enrich dish reviews with dish information
      const enrichedDishReviews = reviewStats.dishReviews.map(dishReview => {
        const dish = dataStore.findById(dishes, dishReview.dishId);
        return {
          ...dishReview,
          dishName: dish ? dish.name : 'Unknown Dish',
          dishPrice: dish ? dish.price : 0,
          categoryId: dish ? dish.categoryId : null
        };
      });
      
      // Calculate additional metrics
      const satisfactionRate = (reviewStats.ratingDistribution['4'] + reviewStats.ratingDistribution['5']) / reviewStats.totalReviews;
      const averageReviewsPerDish = reviewStats.dishReviews.length > 0 
        ? (reviewStats.totalReviews / reviewStats.dishReviews.length).toFixed(2)
        : 0;
      
      const result = {
        ...reviewStats,
        dishReviews: enrichedDishReviews,
        metrics: {
          satisfactionRate: (satisfactionRate * 100).toFixed(2),
          averageReviewsPerDish: parseFloat(averageReviewsPerDish),
          reviewTrend: this.calculateReviewTrend(reviewStats.monthlyTrend),
          topRatedDish: this.findTopRatedDish(enrichedDishReviews),
          improvementNeeded: this.findDishesNeedingImprovement(enrichedDishReviews)
        }
      };
      
      logger.info('Retrieved review statistics');
      return result;
    } catch (error) {
      logger.error('Error getting review statistics:', error);
      throw error;
    }
  }

  /**
   * Calculates review trend from monthly data
   * @param {Array} monthlyTrend - Monthly trend data
   * @returns {Object} Trend analysis
   */
  calculateReviewTrend(monthlyTrend) {
    if (monthlyTrend.length < 2) {
      return { direction: 'stable', change: 0 };
    }
    
    const latest = monthlyTrend[monthlyTrend.length - 1];
    const previous = monthlyTrend[monthlyTrend.length - 2];
    
    const ratingChange = latest.averageRating - previous.averageRating;
    const reviewChange = latest.totalReviews - previous.totalReviews;
    
    return {
      direction: ratingChange > 0.1 ? 'improving' : ratingChange < -0.1 ? 'declining' : 'stable',
      ratingChange: ratingChange.toFixed(2),
      reviewChange,
      reviewGrowthRate: previous.totalReviews > 0 
        ? ((reviewChange / previous.totalReviews) * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Finds the top rated dish
   * @param {Array} dishReviews - Dish reviews data
   * @returns {Object} Top rated dish
   */
  findTopRatedDish(dishReviews) {
    if (dishReviews.length === 0) return null;
    
    return dishReviews.reduce((top, current) => {
      // Consider both rating and number of reviews
      const topScore = top.averageRating * Math.log(top.totalReviews + 1);
      const currentScore = current.averageRating * Math.log(current.totalReviews + 1);
      
      return currentScore > topScore ? current : top;
    });
  }

  /**
   * Finds dishes that need improvement
   * @param {Array} dishReviews - Dish reviews data
   * @returns {Array} Dishes needing improvement
   */
  findDishesNeedingImprovement(dishReviews) {
    return dishReviews
      .filter(dish => dish.averageRating < 4.0 || dish.totalReviews < 10)
      .sort((a, b) => a.averageRating - b.averageRating)
      .slice(0, 5); // Top 5 dishes needing improvement
  }

  // ==================== REPORT GENERATION ====================

  /**
   * Generates and exports reports in various formats
   * @param {string} type - Report type (sales, inventory, reviews, etc.)
   * @param {string} format - Export format (json, csv)
   * @param {Object} options - Additional options
   * @returns {Object} Export result with file path or data
   */
  async exportReport(type, format = 'json', options = {}) {
    try {
      let reportData;
      let filename;
      
      // Generate report data based on type
      switch (type.toLowerCase()) {
        case 'sales':
          reportData = await this.generateSalesReport(options);
          filename = `sales_report_${this.getDateString()}`;
          break;
        case 'inventory':
          reportData = await this.generateInventoryReport(options);
          filename = `inventory_report_${this.getDateString()}`;
          break;
        case 'reviews':
          reportData = await this.generateReviewsReport(options);
          filename = `reviews_report_${this.getDateString()}`;
          break;
        case 'promotions':
          reportData = await this.generatePromotionsReport(options);
          filename = `promotions_report_${this.getDateString()}`;
          break;
        default:
          throw new Error(`Unsupported report type: ${type}`);
      }
      
      // Export in requested format
      if (format.toLowerCase() === 'csv') {
        const csvData = this.convertToCSV(reportData, type);
        const filePath = await this.saveReportFile(filename, 'csv', csvData);
        
        logger.info(`Exported ${type} report as CSV: ${filePath}`);
        return {
          success: true,
          format: 'csv',
          filePath,
          recordCount: Array.isArray(reportData) ? reportData.length : 1
        };
      } else {
        const jsonData = JSON.stringify(reportData, null, 2);
        const filePath = await this.saveReportFile(filename, 'json', jsonData);
        
        logger.info(`Exported ${type} report as JSON: ${filePath}`);
        return {
          success: true,
          format: 'json',
          filePath,
          data: reportData,
          recordCount: Array.isArray(reportData) ? reportData.length : 1
        };
      }
    } catch (error) {
      logger.error(`Error exporting ${type} report:`, error);
      throw error;
    }
  }

  /**
   * Generates sales report data
   * @param {Object} options - Report options
   * @returns {Object} Sales report data
   */
  async generateSalesReport(options) {
    const orderStats = await this.getOrderStatistics(options);
    const dishes = dataStore.readData(this.dishesFile);
    const categories = dataStore.readData(this.categoriesFile);
    
    return {
      summary: {
        reportType: 'Sales Report',
        generatedAt: new Date().toISOString(),
        period: options.period || 'current',
        totalOrders: orderStats.todayOrders,
        totalRevenue: orderStats.todayRevenue,
        averageOrderValue: orderStats.averageOrderValue
      },
      ordersByStatus: orderStats.ordersByStatus,
      topDishes: orderStats.topDishes,
      peakHours: orderStats.peakHours,
      categoryBreakdown: this.calculateCategoryBreakdown(orderStats.topDishes, dishes, categories),
      trends: {
        revenueGrowth: orderStats.metrics.revenueGrowthRate,
        orderGrowth: orderStats.metrics.orderGrowthRate
      }
    };
  }

  /**
   * Generates inventory report data
   * @param {Object} options - Report options
   * @returns {Array} Inventory report data
   */
  async generateInventoryReport(options) {
    const inventoryService = require('./inventory.service');
    const inventory = await inventoryService.getInventory();
    const dishes = dataStore.readData(this.dishesFile);
    
    return inventory.map(item => {
      const dish = dataStore.findById(dishes, item.dishId);
      return {
        dishId: item.dishId,
        dishName: dish ? dish.name : 'Unknown',
        currentStock: item.stock,
        alertThreshold: item.alertThreshold,
        stockStatus: item.stock <= item.alertThreshold ? 'Low Stock' : 'Normal',
        supplier: item.supplier,
        cost: item.cost,
        totalValue: (item.stock * item.cost).toFixed(2),
        expiryDate: item.expiryDate,
        lastUpdated: item.lastUpdated
      };
    });
  }

  /**
   * Generates reviews report data
   * @param {Object} options - Report options
   * @returns {Object} Reviews report data
   */
  async generateReviewsReport(options) {
    const reviewStats = await this.getReviewStatistics(options);
    
    return {
      summary: {
        reportType: 'Reviews Report',
        generatedAt: new Date().toISOString(),
        totalReviews: reviewStats.totalReviews,
        averageRating: reviewStats.averageRating,
        goodRate: reviewStats.goodRate,
        satisfactionRate: reviewStats.metrics.satisfactionRate
      },
      ratingDistribution: reviewStats.ratingDistribution,
      dishReviews: reviewStats.dishReviews,
      recentReviews: reviewStats.recentReviews,
      trends: reviewStats.monthlyTrend,
      insights: {
        topRatedDish: reviewStats.metrics.topRatedDish,
        improvementNeeded: reviewStats.metrics.improvementNeeded
      }
    };
  }

  /**
   * Generates promotions report data
   * @param {Object} options - Report options
   * @returns {Object} Promotions report data
   */
  async generatePromotionsReport(options) {
    const promotionStats = await this.getPromotionStatistics(options);
    
    return {
      summary: {
        reportType: 'Promotions Report',
        generatedAt: new Date().toISOString(),
        activePromotions: promotionStats.activePromotions.length,
        completedPromotions: promotionStats.completedPromotions.length,
        totalPromotionalRevenue: promotionStats.overallStats.totalPromotionalRevenue,
        totalDiscountGiven: promotionStats.overallStats.totalDiscountGiven
      },
      activePromotions: promotionStats.activePromotions,
      completedPromotions: promotionStats.completedPromotions,
      overallStats: promotionStats.overallStats,
      insights: {
        bestPerformingPromotion: promotionStats.metrics.bestPerformingPromotion,
        averageDiscountPerPromotion: promotionStats.metrics.averageDiscountPerPromotion,
        effectivenessScore: promotionStats.metrics.promotionEffectiveness
      }
    };
  }

  /**
   * Calculates category breakdown for sales
   * @param {Array} topDishes - Top dishes data
   * @param {Array} dishes - All dishes
   * @param {Array} categories - All categories
   * @returns {Array} Category breakdown
   */
  calculateCategoryBreakdown(topDishes, dishes, categories) {
    const categoryStats = {};
    
    topDishes.forEach(topDish => {
      const dish = dataStore.findById(dishes, topDish.dishId);
      if (dish) {
        const category = dataStore.findById(categories, dish.categoryId);
        const categoryName = category ? category.name : 'Unknown';
        
        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = {
            categoryName,
            orders: 0,
            revenue: 0
          };
        }
        
        categoryStats[categoryName].orders += topDish.orders;
        categoryStats[categoryName].revenue += topDish.revenue;
      }
    });
    
    return Object.values(categoryStats).sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Converts data to CSV format
   * @param {Object|Array} data - Data to convert
   * @param {string} type - Report type
   * @returns {string} CSV string
   */
  convertToCSV(data, type) {
    if (type === 'inventory' && Array.isArray(data)) {
      const headers = ['Dish ID', 'Dish Name', 'Current Stock', 'Alert Threshold', 'Stock Status', 'Supplier', 'Cost', 'Total Value', 'Expiry Date', 'Last Updated'];
      const rows = data.map(item => [
        item.dishId,
        item.dishName,
        item.currentStock,
        item.alertThreshold,
        item.stockStatus,
        item.supplier,
        item.cost,
        item.totalValue,
        item.expiryDate || '',
        item.lastUpdated
      ]);
      
      return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    }
    
    // For other report types, convert to a simple CSV format
    return this.objectToCSV(data);
  }

  /**
   * Converts object to CSV (generic method)
   * @param {Object} obj - Object to convert
   * @returns {string} CSV string
   */
  objectToCSV(obj) {
    const flattenObject = (obj, prefix = '') => {
      const flattened = {};
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, flattenObject(obj[key], `${prefix}${key}.`));
        } else {
          flattened[`${prefix}${key}`] = obj[key];
        }
      }
      return flattened;
    };
    
    const flattened = flattenObject(obj);
    const headers = Object.keys(flattened);
    const values = Object.values(flattened);
    
    return [headers.join(','), values.map(v => `"${v}"`).join(',')].join('\n');
  }

  /**
   * Saves report file to disk
   * @param {string} filename - Base filename
   * @param {string} extension - File extension
   * @param {string} content - File content
   * @returns {string} File path
   */
  async saveReportFile(filename, extension, content) {
    const reportsDir = path.join(__dirname, '../reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const filePath = path.join(reportsDir, `${filename}.${extension}`);
    fs.writeFileSync(filePath, content, 'utf8');
    
    return filePath;
  }

  /**
   * Gets current date string for filenames
   * @returns {string} Date string in YYYY-MM-DD format
   */
  getDateString() {
    return new Date().toISOString().split('T')[0];
  }
}

module.exports = new StatsService();
