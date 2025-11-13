/**
 * Reports Validators
 * 
 * This module contains Joi validation schemas for reports and statistics operations.
 * It validates report generation parameters, export formats, date ranges, and
 * analytics query parameters to ensure proper report generation.
 * 
 * Design decisions:
 * - Validates report types and export formats
 * - Implements date range validation for time-based reports
 * - Provides flexible query parameter validation for analytics
 * - Ensures proper format validation for different report outputs
 */

const Joi = require('joi');

// ==================== REPORT EXPORT VALIDATION SCHEMAS ====================

/**
 * Schema for report export parameters
 */
const reportExportSchema = Joi.object({
  type: Joi.string()
    .valid('sales', 'inventory', 'reviews', 'promotions', 'orders', 'analytics')
    .required()
    .messages({
      'any.only': 'Report type must be one of: sales, inventory, reviews, promotions, orders, analytics',
      'any.required': 'Report type is required'
    }),
  
  format: Joi.string()
    .valid('json', 'csv', 'xlsx')
    .default('json')
    .messages({
      'any.only': 'Export format must be one of: json, csv, xlsx'
    }),
  
  dateRange: Joi.object({
    startDate: Joi.date()
      .iso()
      .max('now')
      .optional()
      .messages({
        'date.base': 'Start date must be a valid date',
        'date.format': 'Start date must be in ISO format',
        'date.max': 'Start date cannot be in the future'
      }),
    
    endDate: Joi.date()
      .iso()
      .max('now')
      .greater(Joi.ref('startDate'))
      .optional()
      .messages({
        'date.base': 'End date must be a valid date',
        'date.format': 'End date must be in ISO format',
        'date.max': 'End date cannot be in the future',
        'date.greater': 'End date must be after start date'
      })
  }).optional(),
  
  filters: Joi.object({
    categoryId: Joi.string()
      .pattern(/^cat_\d+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid category ID format'
      }),
    
    dishId: Joi.string()
      .pattern(/^dish_\d+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid dish ID format'
      }),
    
    status: Joi.string()
      .valid('on', 'off', 'active', 'inactive', 'completed', 'pending')
      .optional()
      .messages({
        'any.only': 'Invalid status value'
      }),
    
    minRating: Joi.number()
      .min(1)
      .max(5)
      .optional()
      .messages({
        'number.min': 'Minimum rating must be at least 1',
        'number.max': 'Minimum rating cannot exceed 5'
      }),
    
    maxRating: Joi.number()
      .min(1)
      .max(5)
      .greater(Joi.ref('minRating'))
      .optional()
      .messages({
        'number.min': 'Maximum rating must be at least 1',
        'number.max': 'Maximum rating cannot exceed 5',
        'number.greater': 'Maximum rating must be greater than minimum rating'
      })
  }).optional(),
  
  groupBy: Joi.string()
    .valid('day', 'week', 'month', 'category', 'dish', 'status')
    .optional()
    .messages({
      'any.only': 'groupBy must be one of: day, week, month, category, dish, status'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .optional()
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 10000'
    }),
  
  includeDetails: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'includeDetails must be a boolean value'
    })
});

// ==================== STATISTICS QUERY SCHEMAS ====================

/**
 * Schema for order statistics query parameters
 */
const orderStatsQuerySchema = Joi.object({
  period: Joi.string()
    .valid('today', 'yesterday', 'week', 'month', 'quarter', 'year', 'custom')
    .default('today')
    .messages({
      'any.only': 'Period must be one of: today, yesterday, week, month, quarter, year, custom'
    }),
  
  startDate: Joi.date()
    .iso()
    .when('period', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format',
      'any.required': 'Start date is required when period is custom'
    }),
  
  endDate: Joi.date()
    .iso()
    .greater(Joi.ref('startDate'))
    .when('period', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.greater': 'End date must be after start date',
      'any.required': 'End date is required when period is custom'
    }),
  
  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .optional()
    .messages({
      'any.only': 'groupBy must be one of: hour, day, week, month'
    }),
  
  includeDetails: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'includeDetails must be a boolean value'
    })
});

/**
 * Schema for promotion analytics query parameters
 */
const promotionAnalyticsQuerySchema = Joi.object({
  promotionId: Joi.string()
    .pattern(/^promo_\d+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid promotion ID format. Expected format: promo_[number]'
    }),
  
  status: Joi.string()
    .valid('active', 'completed', 'all')
    .default('all')
    .messages({
      'any.only': 'Status must be one of: active, completed, all'
    }),
  
  sortBy: Joi.string()
    .valid('revenue', 'orders', 'conversionRate', 'discountGiven', 'startDate', 'endDate')
    .default('revenue')
    .messages({
      'any.only': 'sortBy must be one of: revenue, orders, conversionRate, discountGiven, startDate, endDate'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'sortOrder must be either "asc" or "desc"'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

/**
 * Schema for review statistics query parameters
 */
const reviewStatsQuerySchema = Joi.object({
  dishId: Joi.string()
    .pattern(/^dish_\d+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid dish ID format. Expected format: dish_[number]'
    }),
  
  categoryId: Joi.string()
    .pattern(/^cat_\d+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid category ID format. Expected format: cat_[number]'
    }),
  
  minRating: Joi.number()
    .min(1)
    .max(5)
    .optional()
    .messages({
      'number.min': 'Minimum rating must be at least 1',
      'number.max': 'Minimum rating cannot exceed 5'
    }),
  
  maxRating: Joi.number()
    .min(1)
    .max(5)
    .greater(Joi.ref('minRating'))
    .optional()
    .messages({
      'number.min': 'Maximum rating must be at least 1',
      'number.max': 'Maximum rating cannot exceed 5',
      'number.greater': 'Maximum rating must be greater than minimum rating'
    }),
  
  period: Joi.string()
    .valid('week', 'month', 'quarter', 'year', 'all')
    .default('all')
    .messages({
      'any.only': 'Period must be one of: week, month, quarter, year, all'
    }),
  
  includeComments: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'includeComments must be a boolean value'
    }),
  
  sortBy: Joi.string()
    .valid('rating', 'totalReviews', 'dishName', 'createdAt')
    .default('rating')
    .messages({
      'any.only': 'sortBy must be one of: rating, totalReviews, dishName, createdAt'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'sortOrder must be either "asc" or "desc"'
    })
});

// ==================== PARAMETER VALIDATION SCHEMAS ====================

/**
 * Schema for promotion ID parameter validation
 */
const promotionIdSchema = Joi.string()
  .pattern(/^promo_\d+$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid promotion ID format. Expected format: promo_[number]',
    'any.required': 'Promotion ID is required'
  });

/**
 * Schema for report type parameter validation
 */
const reportTypeSchema = Joi.string()
  .valid('sales', 'inventory', 'reviews', 'promotions', 'orders', 'analytics')
  .required()
  .messages({
    'any.only': 'Report type must be one of: sales, inventory, reviews, promotions, orders, analytics',
    'any.required': 'Report type is required'
  });

/**
 * Schema for export format parameter validation
 */
const exportFormatSchema = Joi.string()
  .valid('json', 'csv', 'xlsx')
  .default('json')
  .messages({
    'any.only': 'Export format must be one of: json, csv, xlsx'
  });

// ==================== ANALYTICS SCHEMAS ====================

/**
 * Schema for custom analytics query
 */
const customAnalyticsSchema = Joi.object({
  metrics: Joi.array()
    .items(
      Joi.string().valid(
        'revenue', 'orders', 'averageOrderValue', 'conversionRate',
        'topDishes', 'categoryBreakdown', 'hourlyTrends', 'customerSatisfaction'
      )
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one metric must be specified',
      'any.required': 'Metrics are required'
    }),
  
  dimensions: Joi.array()
    .items(
      Joi.string().valid(
        'time', 'category', 'dish', 'promotion', 'rating', 'status'
      )
    )
    .optional()
    .messages({
      'array.base': 'Dimensions must be an array'
    }),
  
  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required()
  }).required(),
  
  filters: Joi.object().optional(),
  
  aggregation: Joi.string()
    .valid('sum', 'avg', 'count', 'min', 'max')
    .default('sum')
    .messages({
      'any.only': 'Aggregation must be one of: sum, avg, count, min, max'
    })
});

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validates report export parameters
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
const validateReportExport = (data) => {
  return reportExportSchema.validate(data, { abortEarly: false });
};

/**
 * Validates order statistics query parameters
 * @param {Object} query - Query parameters to validate
 * @returns {Object} Validation result
 */
const validateOrderStatsQuery = (query) => {
  return orderStatsQuerySchema.validate(query, { abortEarly: false });
};

/**
 * Validates promotion analytics query parameters
 * @param {Object} query - Query parameters to validate
 * @returns {Object} Validation result
 */
const validatePromotionAnalyticsQuery = (query) => {
  return promotionAnalyticsQuerySchema.validate(query, { abortEarly: false });
};

/**
 * Validates review statistics query parameters
 * @param {Object} query - Query parameters to validate
 * @returns {Object} Validation result
 */
const validateReviewStatsQuery = (query) => {
  return reviewStatsQuerySchema.validate(query, { abortEarly: false });
};

/**
 * Validates promotion ID parameter
 * @param {string} promotionId - Promotion ID to validate
 * @returns {Object} Validation result
 */
const validatePromotionId = (promotionId) => {
  return promotionIdSchema.validate(promotionId);
};

/**
 * Validates report type parameter
 * @param {string} reportType - Report type to validate
 * @returns {Object} Validation result
 */
const validateReportType = (reportType) => {
  return reportTypeSchema.validate(reportType);
};

/**
 * Validates export format parameter
 * @param {string} format - Export format to validate
 * @returns {Object} Validation result
 */
const validateExportFormat = (format) => {
  return exportFormatSchema.validate(format);
};

/**
 * Validates custom analytics query
 * @param {Object} data - Analytics query to validate
 * @returns {Object} Validation result
 */
const validateCustomAnalytics = (data) => {
  return customAnalyticsSchema.validate(data, { abortEarly: false });
};

/**
 * Validates date range for reports
 * @param {Object} dateRange - Date range to validate
 * @returns {Object} Validation result
 */
const validateDateRange = (dateRange) => {
  const dateRangeSchema = Joi.object({
    startDate: Joi.date()
      .iso()
      .max('now')
      .required()
      .messages({
        'date.base': 'Start date must be a valid date',
        'date.format': 'Start date must be in ISO format',
        'date.max': 'Start date cannot be in the future',
        'any.required': 'Start date is required'
      }),
    
    endDate: Joi.date()
      .iso()
      .max('now')
      .greater(Joi.ref('startDate'))
      .required()
      .messages({
        'date.base': 'End date must be a valid date',
        'date.format': 'End date must be in ISO format',
        'date.max': 'End date cannot be in the future',
        'date.greater': 'End date must be after start date',
        'any.required': 'End date is required'
      })
  });
  
  return dateRangeSchema.validate(dateRange, { abortEarly: false });
};

/**
 * Validates pagination parameters
 * @param {Object} pagination - Pagination parameters to validate
 * @returns {Object} Validation result
 */
const validatePagination = (pagination) => {
  const paginationSchema = Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
      }),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(1000)
      .default(50)
      .messages({
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 1000'
      }),
    
    sortBy: Joi.string()
      .optional()
      .messages({
        'string.base': 'sortBy must be a string'
      }),
    
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('asc')
      .messages({
        'any.only': 'sortOrder must be either "asc" or "desc"'
      })
  });
  
  return paginationSchema.validate(pagination, { abortEarly: false });
};

module.exports = {
  // Main validation functions
  validateReportExport,
  validateOrderStatsQuery,
  validatePromotionAnalyticsQuery,
  validateReviewStatsQuery,
  validatePromotionId,
  validateReportType,
  validateExportFormat,
  validateCustomAnalytics,
  
  // Utility validation functions
  validateDateRange,
  validatePagination,
  
  // Schemas (for direct use if needed)
  schemas: {
    reportExportSchema,
    orderStatsQuerySchema,
    promotionAnalyticsQuerySchema,
    reviewStatsQuerySchema,
    promotionIdSchema,
    reportTypeSchema,
    exportFormatSchema,
    customAnalyticsSchema
  }
};
