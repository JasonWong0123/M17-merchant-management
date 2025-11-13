/**
 * Reports Routes
 * 
 * This module defines all routes for reports and analytics operations including
 * order statistics, promotion analytics, review statistics, and report exports.
 * It connects HTTP endpoints to controller methods and provides comprehensive
 * business intelligence capabilities.
 * 
 * Design decisions:
 * - Groups routes by analytics type (orders, promotions, reviews)
 * - Supports multiple export formats and flexible query parameters
 * - Provides both summary and detailed analytics endpoints
 * - Includes custom analytics and dashboard functionality
 */

const express = require('express');
const reportsController = require('../controllers/reports.controller');
const { asyncErrorHandler } = require('../middleware/error.middleware');

const router = express.Router();

// ==================== ORDER STATISTICS ROUTES ====================

/**
 * @route GET /api/merchant/orders/statistics
 * @desc Get comprehensive order statistics
 * @query {string} period - Time period (today, yesterday, week, month, quarter, year, custom)
 * @query {string} startDate - Start date for custom period (ISO format)
 * @query {string} endDate - End date for custom period (ISO format)
 * @query {string} groupBy - Group results by (hour, day, week, month)
 * @query {boolean} includeDetails - Include detailed breakdown (default: false)
 * @access Public
 * @example GET /api/merchant/orders/statistics?period=week&groupBy=day&includeDetails=true
 */
router.get('/orders/statistics', asyncErrorHandler(reportsController.getOrderStatistics));

// ==================== PROMOTION ANALYTICS ROUTES ====================

/**
 * @route GET /api/merchant/promotions/statistics
 * @desc Get promotion statistics and analytics
 * @query {string} status - Filter by status (active, completed, all)
 * @query {string} sortBy - Sort field (revenue, orders, conversionRate, discountGiven, startDate, endDate)
 * @query {string} sortOrder - Sort direction (asc, desc)
 * @query {number} limit - Maximum number of results (1-100, default: 10)
 * @access Public
 * @example GET /api/merchant/promotions/statistics?status=active&sortBy=revenue&sortOrder=desc&limit=5
 */
router.get('/promotions/statistics', asyncErrorHandler(reportsController.getPromotionStatistics));

/**
 * @route GET /api/merchant/promotion/:promotionId/analytics
 * @desc Get detailed analytics for a specific promotion
 * @param {string} promotionId - Promotion ID (format: promo_[number])
 * @access Public
 * @example GET /api/merchant/promotion/promo_1/analytics
 */
router.get('/promotion/:promotionId/analytics', asyncErrorHandler(reportsController.getPromotionAnalytics));

// ==================== REVIEW STATISTICS ROUTES ====================

/**
 * @route GET /api/merchant/reviews/statistics
 * @desc Get review statistics and analytics
 * @query {string} dishId - Filter by dish ID (format: dish_[number])
 * @query {string} categoryId - Filter by category ID (format: cat_[number])
 * @query {number} minRating - Minimum rating filter (1-5)
 * @query {number} maxRating - Maximum rating filter (1-5)
 * @query {string} period - Time period (week, month, quarter, year, all)
 * @query {boolean} includeComments - Include review comments (default: false)
 * @query {string} sortBy - Sort field (rating, totalReviews, dishName, createdAt)
 * @query {string} sortOrder - Sort direction (asc, desc)
 * @access Public
 * @example GET /api/merchant/reviews/statistics?period=month&minRating=4&includeComments=true
 */
router.get('/reviews/statistics', asyncErrorHandler(reportsController.getReviewStatistics));

// ==================== REPORT EXPORT ROUTES ====================

/**
 * @route GET /api/merchant/reports/export
 * @desc Export reports in various formats
 * @query {string} type - Report type (sales, inventory, reviews, promotions, orders, analytics) - REQUIRED
 * @query {string} format - Export format (json, csv, xlsx) - default: json
 * @query {string} startDate - Start date for date range (ISO format)
 * @query {string} endDate - End date for date range (ISO format)
 * @query {string} categoryId - Filter by category ID
 * @query {string} dishId - Filter by dish ID
 * @query {string} status - Filter by status
 * @query {number} minRating - Minimum rating filter
 * @query {number} maxRating - Maximum rating filter
 * @query {string} groupBy - Group results by (day, week, month, category, dish, status)
 * @query {number} limit - Maximum number of records (1-10000)
 * @query {boolean} includeDetails - Include detailed data (default: false)
 * @access Public
 * @example GET /api/merchant/reports/export?type=sales&format=csv&startDate=2024-11-01&endDate=2024-11-30&groupBy=day
 */
router.get('/reports/export', asyncErrorHandler(reportsController.exportReport));

// ==================== CUSTOM ANALYTICS ROUTES ====================

/**
 * @route POST /api/merchant/analytics/custom
 * @desc Generate custom analytics based on specified metrics and dimensions
 * @body {Array} metrics - Array of metrics to include (revenue, orders, averageOrderValue, conversionRate, topDishes, categoryBreakdown, hourlyTrends, customerSatisfaction)
 * @body {Array} dimensions - Array of dimensions (time, category, dish, promotion, rating, status) - optional
 * @body {Object} dateRange - Date range object with startDate and endDate (required)
 * @body {Object} filters - Additional filters (optional)
 * @body {string} aggregation - Aggregation method (sum, avg, count, min, max) - default: sum
 * @access Public
 * @example POST /api/merchant/analytics/custom
 * Body: {
 *   "metrics": ["revenue", "orders", "topDishes"],
 *   "dimensions": ["time", "category"],
 *   "dateRange": {
 *     "startDate": "2024-11-01T00:00:00Z",
 *     "endDate": "2024-11-30T23:59:59Z"
 *   },
 *   "aggregation": "sum"
 * }
 */
router.post('/analytics/custom', asyncErrorHandler(reportsController.getCustomAnalytics));

// ==================== DASHBOARD ROUTES ====================

/**
 * @route GET /api/merchant/dashboard/summary
 * @desc Get dashboard summary with key metrics
 * @access Public
 * @example GET /api/merchant/dashboard/summary
 * @returns {Object} Dashboard summary with orders, promotions, reviews, and alerts
 */
router.get('/dashboard/summary', asyncErrorHandler(reportsController.getDashboardSummary));

// ==================== PERFORMANCE METRICS ROUTES ====================

/**
 * @route GET /api/merchant/performance/metrics
 * @desc Get performance metrics and KPIs
 * @query {string} period - Time period for metrics (day, week, month, quarter, year) - default: month
 * @access Public
 * @example GET /api/merchant/performance/metrics?period=week
 * @returns {Object} Performance metrics including financial, operational, customer, and marketing KPIs
 */
router.get('/performance/metrics', asyncErrorHandler(reportsController.getPerformanceMetrics));

// ==================== TREND ANALYSIS ROUTES ====================

/**
 * @route GET /api/merchant/trends/analysis
 * @desc Get trend analysis for various metrics
 * @query {string} metric - Metric to analyze (revenue, orders, rating, satisfaction) - default: revenue
 * @query {string} period - Analysis period (day, week, month) - default: week
 * @access Public
 * @example GET /api/merchant/trends/analysis?metric=revenue&period=month
 * @returns {Object} Trend analysis with data points, trend direction, and forecast
 */
router.get('/trends/analysis', asyncErrorHandler(reportsController.getTrendAnalysis));

// ==================== ROUTE DOCUMENTATION ====================

/**
 * @route GET /api/merchant/reports/docs
 * @desc Get reports API documentation
 * @access Public
 */
router.get('/reports/docs', (req, res) => {
  res.json({
    title: 'Reports & Analytics API Documentation',
    version: '1.0.0',
    description: 'API endpoints for generating reports, analytics, and business intelligence data',
    baseUrl: '/api/merchant',
    endpoints: {
      orderStatistics: {
        'GET /orders/statistics': 'Get comprehensive order statistics with flexible time periods and grouping'
      },
      promotionAnalytics: {
        'GET /promotions/statistics': 'Get promotion statistics and performance metrics',
        'GET /promotion/:promotionId/analytics': 'Get detailed analytics for a specific promotion'
      },
      reviewStatistics: {
        'GET /reviews/statistics': 'Get review statistics and customer satisfaction metrics'
      },
      reportExports: {
        'GET /reports/export': 'Export reports in multiple formats (JSON, CSV, XLSX)'
      },
      customAnalytics: {
        'POST /analytics/custom': 'Generate custom analytics with specified metrics and dimensions'
      },
      dashboard: {
        'GET /dashboard/summary': 'Get dashboard summary with key business metrics'
      },
      performance: {
        'GET /performance/metrics': 'Get comprehensive performance metrics and KPIs'
      },
      trends: {
        'GET /trends/analysis': 'Get trend analysis with forecasting capabilities'
      }
    },
    examples: {
      orderStatistics: {
        method: 'GET',
        url: '/api/merchant/orders/statistics?period=week&groupBy=day',
        description: 'Get weekly order statistics grouped by day'
      },
      promotionAnalytics: {
        method: 'GET',
        url: '/api/merchant/promotion/promo_1/analytics',
        description: 'Get detailed analytics for promotion promo_1'
      },
      exportReport: {
        method: 'GET',
        url: '/api/merchant/reports/export?type=sales&format=csv&startDate=2024-11-01&endDate=2024-11-30',
        description: 'Export sales report as CSV for November 2024'
      },
      customAnalytics: {
        method: 'POST',
        url: '/api/merchant/analytics/custom',
        body: {
          metrics: ['revenue', 'orders', 'topDishes'],
          dateRange: {
            startDate: '2024-11-01T00:00:00Z',
            endDate: '2024-11-30T23:59:59Z'
          },
          aggregation: 'sum'
        },
        description: 'Generate custom analytics for revenue, orders, and top dishes'
      }
    },
    queryParameters: {
      timePeriods: {
        today: 'Current day statistics',
        yesterday: 'Previous day statistics',
        week: 'Current week statistics',
        month: 'Current month statistics',
        quarter: 'Current quarter statistics',
        year: 'Current year statistics',
        custom: 'Custom date range (requires startDate and endDate)'
      },
      groupByOptions: {
        hour: 'Group by hour (for daily analysis)',
        day: 'Group by day (for weekly/monthly analysis)',
        week: 'Group by week (for monthly/quarterly analysis)',
        month: 'Group by month (for yearly analysis)',
        category: 'Group by menu category',
        dish: 'Group by individual dish',
        status: 'Group by status (active/inactive)'
      },
      exportFormats: {
        json: 'JSON format (default) - structured data',
        csv: 'CSV format - comma-separated values for spreadsheets',
        xlsx: 'Excel format - Microsoft Excel compatible'
      },
      reportTypes: {
        sales: 'Sales and revenue reports',
        inventory: 'Inventory levels and stock reports',
        reviews: 'Customer reviews and satisfaction reports',
        promotions: 'Promotion performance and effectiveness reports',
        orders: 'Order volume and trends reports',
        analytics: 'Custom analytics and KPI reports'
      }
    },
    responseFormat: {
      success: {
        data: '// Report data or analytics results',
        meta: {
          message: 'Report generated successfully',
          type: 'sales',
          format: 'json',
          recordCount: 150,
          generatedAt: '2024-11-13T03:30:00Z'
        }
      },
      error: {
        error: {
          code: 'ERROR_CODE',
          message: 'Error description',
          details: 'Additional error details',
          timestamp: '2024-11-13T03:30:00Z'
        }
      }
    },
    businessMetrics: {
      financial: [
        'Revenue (total sales amount)',
        'Revenue growth rate (period-over-period)',
        'Average order value (AOV)',
        'Promotional revenue and discounts',
        'Profit margins and cost analysis'
      ],
      operational: [
        'Order volume and trends',
        'Order fulfillment rate',
        'Average preparation time',
        'Peak hours and capacity utilization',
        'Inventory turnover rates'
      ],
      customer: [
        'Customer satisfaction (average rating)',
        'Review volume and sentiment',
        'Repeat customer rate',
        'Customer acquisition metrics',
        'Complaint resolution rates'
      ],
      marketing: [
        'Promotion effectiveness and ROI',
        'Conversion rates by promotion type',
        'Customer acquisition cost',
        'Marketing campaign performance',
        'Seasonal trends and patterns'
      ]
    }
  });
});

module.exports = router;
