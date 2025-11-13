/**
 * Inventory Validators
 * 
 * This module contains Joi validation schemas for inventory-related operations including
 * stock updates, threshold management, and inventory queries. It ensures data integrity
 * for all inventory management operations.
 * 
 * Design decisions:
 * - Validates stock quantities to prevent negative values
 * - Implements threshold validation for alert management
 * - Provides batch operation validation for efficiency
 * - Includes supplier and cost validation for comprehensive inventory tracking
 */

const Joi = require('joi');

// ==================== STOCK UPDATE VALIDATION SCHEMAS ====================

/**
 * Schema for updating dish stock
 */
const updateStockSchema = Joi.object({
  stock: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Stock must be a number',
      'number.integer': 'Stock must be an integer',
      'number.min': 'Stock cannot be negative',
      'any.required': 'Stock value is required'
    }),
  
  alertThreshold: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Alert threshold must be a number',
      'number.integer': 'Alert threshold must be an integer',
      'number.min': 'Alert threshold cannot be negative'
    }),
  
  supplier: Joi.string()
    .trim()
    .max(200)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Supplier name cannot exceed 200 characters'
    }),
  
  cost: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Cost must be a number',
      'number.min': 'Cost cannot be negative'
    }),
  
  expiryDate: Joi.date()
    .iso()
    .greater('now')
    .optional()
    .allow(null)
    .messages({
      'date.base': 'Expiry date must be a valid date',
      'date.format': 'Expiry date must be in ISO format',
      'date.greater': 'Expiry date must be in the future'
    })
});

/**
 * Schema for stock adjustment
 */
const stockAdjustmentSchema = Joi.object({
  adjustment: Joi.number()
    .integer()
    .required()
    .messages({
      'number.base': 'Adjustment must be a number',
      'number.integer': 'Adjustment must be an integer',
      'any.required': 'Adjustment value is required'
    }),
  
  reason: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters'
    })
});

/**
 * Schema for batch stock updates
 */
const batchStockUpdateSchema = Joi.array()
  .items(
    Joi.object({
      dishId: Joi.string()
        .pattern(/^dish_\d+$/)
        .required()
        .messages({
          'string.pattern.base': 'Invalid dish ID format. Expected format: dish_[number]',
          'any.required': 'Dish ID is required'
        }),
      
      stock: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
          'number.base': 'Stock must be a number',
          'number.integer': 'Stock must be an integer',
          'number.min': 'Stock cannot be negative',
          'any.required': 'Stock value is required'
        }),
      
      alertThreshold: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
          'number.base': 'Alert threshold must be a number',
          'number.integer': 'Alert threshold must be an integer',
          'number.min': 'Alert threshold cannot be negative'
        }),
      
      supplier: Joi.string()
        .trim()
        .max(200)
        .allow('')
        .optional()
        .messages({
          'string.max': 'Supplier name cannot exceed 200 characters'
        }),
      
      cost: Joi.number()
        .min(0)
        .precision(2)
        .optional()
        .messages({
          'number.base': 'Cost must be a number',
          'number.min': 'Cost cannot be negative'
        }),
      
      expiryDate: Joi.date()
        .iso()
        .greater('now')
        .optional()
        .allow(null)
        .messages({
          'date.base': 'Expiry date must be a valid date',
          'date.format': 'Expiry date must be in ISO format',
          'date.greater': 'Expiry date must be in the future'
        })
    })
  )
  .min(1)
  .max(100) // Limit batch size for performance
  .required()
  .messages({
    'array.min': 'At least one stock update must be provided',
    'array.max': 'Cannot update more than 100 items at once',
    'any.required': 'Stock update data is required'
  });

// ==================== THRESHOLD MANAGEMENT SCHEMAS ====================

/**
 * Schema for updating alert threshold
 */
const alertThresholdSchema = Joi.object({
  alertThreshold: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Alert threshold must be a number',
      'number.integer': 'Alert threshold must be an integer',
      'number.min': 'Alert threshold cannot be negative',
      'any.required': 'Alert threshold is required'
    })
});

/**
 * Schema for low stock threshold query parameter
 */
const lowStockThresholdSchema = Joi.number()
  .integer()
  .min(0)
  .optional()
  .messages({
    'number.base': 'Threshold must be a number',
    'number.integer': 'Threshold must be an integer',
    'number.min': 'Threshold cannot be negative'
  });

// ==================== QUERY PARAMETER SCHEMAS ====================

/**
 * Schema for inventory query parameters
 */
const inventoryQuerySchema = Joi.object({
  lowStock: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'lowStock must be a boolean value'
    }),
  
  outOfStock: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'outOfStock must be a boolean value'
    }),
  
  supplier: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Supplier filter cannot exceed 200 characters'
    }),
  
  sortBy: Joi.string()
    .valid('dishId', 'stock', 'alertThreshold', 'lastUpdated', 'supplier', 'cost', 'expiryDate')
    .optional()
    .messages({
      'any.only': 'sortBy must be one of: dishId, stock, alertThreshold, lastUpdated, supplier, cost, expiryDate'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .messages({
      'any.only': 'sortOrder must be either "asc" or "desc"'
    }),
  
  expiringWithinDays: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .optional()
    .messages({
      'number.base': 'expiringWithinDays must be a number',
      'number.integer': 'expiringWithinDays must be an integer',
      'number.min': 'expiringWithinDays must be at least 1',
      'number.max': 'expiringWithinDays cannot exceed 365'
    })
});

// ==================== PARAMETER VALIDATION SCHEMAS ====================

/**
 * Schema for dish ID parameter validation
 */
const dishIdSchema = Joi.string()
  .pattern(/^dish_\d+$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid dish ID format. Expected format: dish_[number]',
    'any.required': 'Dish ID is required'
  });

// ==================== INVENTORY CREATION SCHEMA ====================

/**
 * Schema for creating new inventory entry
 */
const createInventorySchema = Joi.object({
  dishId: Joi.string()
    .pattern(/^dish_\d+$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid dish ID format. Expected format: dish_[number]',
      'any.required': 'Dish ID is required'
    }),
  
  stock: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Stock must be a number',
      'number.integer': 'Stock must be an integer',
      'number.min': 'Stock cannot be negative',
      'any.required': 'Initial stock value is required'
    }),
  
  alertThreshold: Joi.number()
    .integer()
    .min(0)
    .default(5)
    .messages({
      'number.base': 'Alert threshold must be a number',
      'number.integer': 'Alert threshold must be an integer',
      'number.min': 'Alert threshold cannot be negative'
    }),
  
  supplier: Joi.string()
    .trim()
    .max(200)
    .allow('')
    .default('')
    .messages({
      'string.max': 'Supplier name cannot exceed 200 characters'
    }),
  
  cost: Joi.number()
    .min(0)
    .precision(2)
    .default(0)
    .messages({
      'number.base': 'Cost must be a number',
      'number.min': 'Cost cannot be negative'
    }),
  
  expiryDate: Joi.date()
    .iso()
    .greater('now')
    .optional()
    .allow(null)
    .messages({
      'date.base': 'Expiry date must be a valid date',
      'date.format': 'Expiry date must be in ISO format',
      'date.greater': 'Expiry date must be in the future'
    })
});

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validates stock update data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
const validateUpdateStock = (data) => {
  return updateStockSchema.validate(data, { abortEarly: false });
};

/**
 * Validates stock adjustment data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
const validateStockAdjustment = (data) => {
  return stockAdjustmentSchema.validate(data, { abortEarly: false });
};

/**
 * Validates batch stock update data
 * @param {Array} data - Data to validate
 * @returns {Object} Validation result
 */
const validateBatchStockUpdate = (data) => {
  return batchStockUpdateSchema.validate(data, { abortEarly: false });
};

/**
 * Validates alert threshold update data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
const validateAlertThreshold = (data) => {
  return alertThresholdSchema.validate(data, { abortEarly: false });
};

/**
 * Validates low stock threshold parameter
 * @param {number} threshold - Threshold to validate
 * @returns {Object} Validation result
 */
const validateLowStockThreshold = (threshold) => {
  return lowStockThresholdSchema.validate(threshold);
};

/**
 * Validates inventory query parameters
 * @param {Object} query - Query parameters to validate
 * @returns {Object} Validation result
 */
const validateInventoryQuery = (query) => {
  return inventoryQuerySchema.validate(query, { abortEarly: false });
};

/**
 * Validates dish ID parameter
 * @param {string} dishId - Dish ID to validate
 * @returns {Object} Validation result
 */
const validateDishId = (dishId) => {
  return dishIdSchema.validate(dishId);
};

/**
 * Validates inventory creation data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
const validateCreateInventory = (data) => {
  return createInventorySchema.validate(data, { abortEarly: false });
};

/**
 * Custom validation for stock operations
 * Ensures stock adjustments don't result in negative values
 * @param {number} currentStock - Current stock amount
 * @param {number} adjustment - Adjustment amount
 * @returns {Object} Validation result
 */
const validateStockOperation = (currentStock, adjustment) => {
  const newStock = currentStock + adjustment;
  
  if (newStock < 0) {
    return {
      error: {
        details: [{
          message: `Stock adjustment would result in negative stock. Current: ${currentStock}, Adjustment: ${adjustment}, Result: ${newStock}`,
          path: ['adjustment'],
          type: 'number.negative'
        }]
      }
    };
  }
  
  return { value: newStock };
};

/**
 * Validates expiry date is reasonable (not too far in the future)
 * @param {string} expiryDate - Expiry date to validate
 * @returns {Object} Validation result
 */
const validateExpiryDate = (expiryDate) => {
  if (!expiryDate) return { value: null };
  
  const expiry = new Date(expiryDate);
  const now = new Date();
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(now.getFullYear() + 5); // Max 5 years in future
  
  if (expiry > maxFutureDate) {
    return {
      error: {
        details: [{
          message: 'Expiry date cannot be more than 5 years in the future',
          path: ['expiryDate'],
          type: 'date.max'
        }]
      }
    };
  }
  
  return { value: expiryDate };
};

/**
 * Validates supplier information
 * @param {string} supplier - Supplier name to validate
 * @returns {Object} Validation result
 */
const validateSupplier = (supplier) => {
  const supplierSchema = Joi.string()
    .trim()
    .max(200)
    .pattern(/^[a-zA-Z0-9\s\-&.,()]+$/)
    .messages({
      'string.max': 'Supplier name cannot exceed 200 characters',
      'string.pattern.base': 'Supplier name contains invalid characters'
    });
  
  return supplierSchema.validate(supplier);
};

module.exports = {
  // Main validation functions
  validateUpdateStock,
  validateStockAdjustment,
  validateBatchStockUpdate,
  validateAlertThreshold,
  validateLowStockThreshold,
  validateInventoryQuery,
  validateDishId,
  validateCreateInventory,
  
  // Custom validation functions
  validateStockOperation,
  validateExpiryDate,
  validateSupplier,
  
  // Schemas (for direct use if needed)
  schemas: {
    updateStockSchema,
    stockAdjustmentSchema,
    batchStockUpdateSchema,
    alertThresholdSchema,
    lowStockThresholdSchema,
    inventoryQuerySchema,
    dishIdSchema,
    createInventorySchema
  }
};
