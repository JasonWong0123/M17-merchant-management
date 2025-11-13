/**
 * Reports Controller
 * 
 * This controller handles HTTP requests for reports and statistics operations including
 * order statistics, promotion analytics, review statistics, and report exports.
 * It validates input, calls appropriate service methods, and returns standardized responses.
 * 
 * Design decisions:
 * - Provides comprehensive analytics and reporting endpoints
 * - Supports multiple export formats (JSON, CSV)
 * - Implements flexible query parameters for customized reports
 * - Returns detailed metadata with statistical insights
 * - Handles large datasets efficiently with pagination support
 */

const statsService = require('../services/stats.service');
const reportsValidators = require('../validators/reports.validators');
const winston = require('winston');
const path = require('path');

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

class ReportsController {
  // ==================== ORDER STATISTICS ====================

  /**
   * Gets comprehensive order statistics
   * GET /api/merchant/orders/statistics
   */
  async getOrderStatistics(req, res) {
    try {
      // Validate query parameters
      const { error, value } = reportsValidators.validateOrderStatsQuery(req.query);
      if (error) {
        logger.warn('Invalid order statistics query parameters:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const orderStats = await statsService.getOrderStatistics(value);

      logger.info('Retrieved order statistics');
      res.json({
        data: orderStats,
        meta: {
          period: value.period || 'today',
          generatedAt: new Date().toISOString(),
          dataPoints: {
            orders: orderStats.todayOrders,
            revenue: orderStats.todayRevenue,
            topDishes: orderStats.topDishes.length
          }
        }
      });
    } catch (error) {
      logger.error('Error in getOrderStatistics:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve order statistics',
          details: error.message
        }
      });
    }
  }

  // ==================== PROMOTION ANALYTICS ====================

  /**
   * Gets promotion statistics and analytics
   * GET /api/merchant/promotions/statistics
   */
  async getPromotionStatistics(req, res) {
    try {
      // Validate query parameters
      const { error, value } = reportsValidators.validatePromotionAnalyticsQuery(req.query);
      if (error) {
        logger.warn('Invalid promotion analytics query parameters:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const promotionStats = await statsService.getPromotionStatistics(value);

      logger.info('Retrieved promotion statistics');
      res.json({
        data: promotionStats,
        meta: {
          activePromotions: promotionStats.activePromotions.length,
          completedPromotions: promotionStats.completedPromotions.length,
          totalPromotionalRevenue: promotionStats.overallStats.totalPromotionalRevenue,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getPromotionStatistics:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve promotion statistics',
          details: error.message
        }
      });
    }
  }

  /**
   * Gets detailed analytics for a specific promotion
   * GET /api/merchant/promotion/:promotionId/analytics
   */
  async getPromotionAnalytics(req, res) {
    try {
      // Validate promotion ID
      const { error: idError } = reportsValidators.validatePromotionId(req.params.promotionId);
      if (idError) {
        logger.warn('Invalid promotion ID:', req.params.promotionId);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid promotion ID',
            details: idError.message
          }
        });
      }

      const promotionAnalytics = await statsService.getPromotionAnalytics(req.params.promotionId);

      if (!promotionAnalytics) {
        logger.warn(`Promotion not found: ${req.params.promotionId}`);
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Promotion not found',
            details: `Promotion with ID ${req.params.promotionId} does not exist`
          }
        });
      }

      logger.info(`Retrieved analytics for promotion: ${req.params.promotionId}`);
      res.json({
        data: promotionAnalytics,
        meta: {
          promotionId: req.params.promotionId,
          isActive: promotionAnalytics.isActive,
          effectivenessScore: promotionAnalytics.analytics.effectivenessScore,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getPromotionAnalytics:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve promotion analytics',
          details: error.message
        }
      });
    }
  }

  // ==================== REVIEW STATISTICS ====================

  /**
   * Gets review statistics and analytics
   * GET /api/merchant/reviews/statistics
   */
  async getReviewStatistics(req, res) {
    try {
      // Validate query parameters
      const { error, value } = reportsValidators.validateReviewStatsQuery(req.query);
      if (error) {
        logger.warn('Invalid review statistics query parameters:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const reviewStats = await statsService.getReviewStatistics(value);

      logger.info('Retrieved review statistics');
      res.json({
        data: reviewStats,
        meta: {
          totalReviews: reviewStats.totalReviews,
          averageRating: reviewStats.averageRating,
          satisfactionRate: reviewStats.metrics.satisfactionRate,
          dishesReviewed: reviewStats.dishReviews.length,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getReviewStatistics:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve review statistics',
          details: error.message
        }
      });
    }
  }

  // ==================== REPORT EXPORT ====================

  /**
   * Exports reports in various formats
   * GET /api/merchant/reports/export
   */
  async exportReport(req, res) {
    try {
      // Validate query parameters
      const queryData = {
        type: req.query.type,
        format: req.query.format || 'json',
        ...req.query
      };

      const { error, value } = reportsValidators.validateReportExport(queryData);
      if (error) {
        logger.warn('Invalid report export parameters:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid export parameters',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const exportResult = await statsService.exportReport(
        value.type,
        value.format,
        {
          dateRange: value.dateRange,
          filters: value.filters,
          groupBy: value.groupBy,
          limit: value.limit,
          includeDetails: value.includeDetails
        }
      );

      logger.info(`Exported ${value.type} report in ${value.format} format`);

      // For CSV exports, set appropriate headers
      if (value.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(exportResult.filePath)}"`);
        
        return res.json({
          data: {
            downloadUrl: `/downloads/${path.basename(exportResult.filePath)}`,
            filePath: exportResult.filePath,
            format: exportResult.format,
            recordCount: exportResult.recordCount
          },
          meta: {
            message: 'Report exported successfully',
            type: value.type,
            format: value.format,
            generatedAt: new Date().toISOString()
          }
        });
      }

      // For JSON exports, return data directly
      res.json({
        data: exportResult.data || exportResult,
        meta: {
          message: 'Report generated successfully',
          type: value.type,
          format: value.format,
          recordCount: exportResult.recordCount,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in exportReport:', error);
      
      // Handle specific business logic errors
      if (error.message.includes('Unsupported report type')) {
        return res.status(400).json({
          error: {
            code: 'UNSUPPORTED_TYPE',
            message: 'Unsupported report type',
            details: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to export report',
          details: error.message
        }
      });
    }
  }

  // ==================== CUSTOM ANALYTICS ====================

  /**
   * Generates custom analytics based on specified metrics and dimensions
   * POST /api/merchant/analytics/custom
   */
  async getCustomAnalytics(req, res) {
    try {
      // Validate request body
      const { error, value } = reportsValidators.validateCustomAnalytics(req.body);
      if (error) {
        logger.warn('Invalid custom analytics parameters:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid analytics parameters',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      // Generate custom analytics based on requested metrics
      const analytics = {};
      
      for (const metric of value.metrics) {
        switch (metric) {
          case 'revenue':
          case 'orders':
          case 'averageOrderValue':
            const orderStats = await statsService.getOrderStatistics({
              startDate: value.dateRange.startDate,
              endDate: value.dateRange.endDate
            });
            analytics[metric] = orderStats[metric] || orderStats.todayRevenue || orderStats.todayOrders;
            break;
            
          case 'topDishes':
            const orderData = await statsService.getOrderStatistics();
            analytics[metric] = orderData.topDishes;
            break;
            
          case 'customerSatisfaction':
            const reviewStats = await statsService.getReviewStatistics();
            analytics[metric] = {
              averageRating: reviewStats.averageRating,
              satisfactionRate: reviewStats.metrics.satisfactionRate,
              totalReviews: reviewStats.totalReviews
            };
            break;
            
          default:
            analytics[metric] = null;
        }
      }

      logger.info(`Generated custom analytics with ${value.metrics.length} metrics`);
      res.json({
        data: {
          analytics,
          parameters: {
            metrics: value.metrics,
            dimensions: value.dimensions,
            dateRange: value.dateRange,
            aggregation: value.aggregation
          }
        },
        meta: {
          message: 'Custom analytics generated successfully',
          metricsCount: value.metrics.length,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getCustomAnalytics:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate custom analytics',
          details: error.message
        }
      });
    }
  }

  // ==================== DASHBOARD SUMMARY ====================

  /**
   * Gets dashboard summary with key metrics
   * GET /api/merchant/dashboard/summary
   */
  async getDashboardSummary(req, res) {
    try {
      // Get all key statistics
      const [orderStats, promotionStats, reviewStats] = await Promise.all([
        statsService.getOrderStatistics(),
        statsService.getPromotionStatistics(),
        statsService.getReviewStatistics()
      ]);

      const dashboardSummary = {
        orders: {
          today: orderStats.todayOrders,
          revenue: orderStats.todayRevenue,
          averageValue: orderStats.averageOrderValue,
          growth: orderStats.metrics.orderGrowthRate
        },
        promotions: {
          active: promotionStats.activePromotions.length,
          totalRevenue: promotionStats.overallStats.totalPromotionalRevenue,
          totalDiscount: promotionStats.overallStats.totalDiscountGiven,
          conversionRate: promotionStats.overallStats.averageConversionRate
        },
        reviews: {
          total: reviewStats.totalReviews,
          averageRating: reviewStats.averageRating,
          satisfactionRate: reviewStats.metrics.satisfactionRate,
          trend: reviewStats.metrics.reviewTrend.direction
        },
        alerts: {
          lowStock: 0, // This would be populated by inventory service
          expiringSoon: 0,
          negativeReviews: reviewStats.ratingDistribution['1'] + reviewStats.ratingDistribution['2']
        }
      };

      logger.info('Generated dashboard summary');
      res.json({
        data: dashboardSummary,
        meta: {
          message: 'Dashboard summary generated successfully',
          lastUpdated: new Date().toISOString(),
          dataFreshness: 'real-time'
        }
      });
    } catch (error) {
      logger.error('Error in getDashboardSummary:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate dashboard summary',
          details: error.message
        }
      });
    }
  }

  // ==================== PERFORMANCE METRICS ====================

  /**
   * Gets performance metrics and KPIs
   * GET /api/merchant/performance/metrics
   */
  async getPerformanceMetrics(req, res) {
    try {
      const period = req.query.period || 'month';
      
      // Get comprehensive performance data
      const [orderStats, promotionStats, reviewStats] = await Promise.all([
        statsService.getOrderStatistics({ period }),
        statsService.getPromotionStatistics(),
        statsService.getReviewStatistics()
      ]);

      const performanceMetrics = {
        financial: {
          revenue: orderStats.todayRevenue,
          revenueGrowth: orderStats.metrics.revenueGrowthRate,
          averageOrderValue: orderStats.averageOrderValue,
          promotionalRevenue: promotionStats.overallStats.totalPromotionalRevenue,
          profitMargin: 0.25 // Mock calculation
        },
        operational: {
          orderVolume: orderStats.todayOrders,
          orderGrowth: orderStats.metrics.orderGrowthRate,
          averagePreparationTime: 18, // Mock data
          orderFulfillmentRate: 0.96 // Mock data
        },
        customer: {
          satisfaction: reviewStats.averageRating,
          satisfactionRate: reviewStats.metrics.satisfactionRate,
          reviewVolume: reviewStats.totalReviews,
          repeatCustomerRate: 0.68 // Mock data
        },
        marketing: {
          promotionEffectiveness: promotionStats.metrics.promotionEffectiveness,
          conversionRate: promotionStats.overallStats.averageConversionRate,
          customerAcquisitionCost: 25.50, // Mock data
          marketingROI: 3.2 // Mock data
        }
      };

      logger.info(`Generated performance metrics for period: ${period}`);
      res.json({
        data: performanceMetrics,
        meta: {
          period,
          message: 'Performance metrics generated successfully',
          benchmarks: {
            industryAverageRating: 4.2,
            industryAverageOrderValue: 42.0,
            industryConversionRate: 0.18
          },
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getPerformanceMetrics:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate performance metrics',
          details: error.message
        }
      });
    }
  }

  // ==================== TREND ANALYSIS ====================

  /**
   * Gets trend analysis for various metrics
   * GET /api/merchant/trends/analysis
   */
  async getTrendAnalysis(req, res) {
    try {
      const metric = req.query.metric || 'revenue';
      const period = req.query.period || 'week';
      
      // Mock trend data - in real implementation, this would query historical data
      const trendData = {
        metric,
        period,
        dataPoints: [
          { date: '2024-11-06', value: 4200 },
          { date: '2024-11-07', value: 4580 },
          { date: '2024-11-08', value: 4320 },
          { date: '2024-11-09', value: 4890 },
          { date: '2024-11-10', value: 5100 },
          { date: '2024-11-11', value: 5350 },
          { date: '2024-11-12', value: 5600 }
        ],
        trend: {
          direction: 'increasing',
          percentage: 33.33,
          significance: 'strong'
        },
        forecast: {
          nextPeriod: 5850,
          confidence: 0.85
        }
      };

      logger.info(`Generated trend analysis for ${metric} over ${period}`);
      res.json({
        data: trendData,
        meta: {
          message: 'Trend analysis generated successfully',
          analysisType: 'time-series',
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getTrendAnalysis:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate trend analysis',
          details: error.message
        }
      });
    }
  }
}

module.exports = new ReportsController();
