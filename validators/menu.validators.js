/**
 * Menu Validators
 * 
 * This module contains Joi validation schemas for menu-related operations including
 * categories and dishes. It provides comprehensive input validation to ensure data
 * integrity and security.
 * 
 * Design decisions:
 * - Uses Joi for robust schema validation with custom error messages
 * - Separates validation schemas for different operations (create, update, etc.)
 * - Implements strict validation for required fields and data types
 * - Provides reusable validation functions for controllers
 */

const Joi = require('joi');

// ==================== CATEGORY VALIDATION SCHEMAS ====================

/**
 * Schema for creating a new category
 */
const createCategorySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Category name is required',
      'string.min': 'Category name must be at least 1 character long',
      'string.max': 'Category name cannot exceed 100 characters',
      'any.required': 'Category name is required'
    }),
  
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  sortOrder: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Sort order must be a number',
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order must be at least 1'
    }),
  
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
});

/**
 * Schema for updating an existing category
 */
const updateCategorySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Category name cannot be empty',
      'string.min': 'Category name must be at least 1 character long',
      'string.max': 'Category name cannot exceed 100 characters'
    }),
  
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  sortOrder: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Sort order must be a number',
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order must be at least 1'
    }),
  
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Schema for category ID parameter validation
 */
const categoryIdSchema = Joi.string()
  .pattern(/^cat_\d+$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid category ID format. Expected format: cat_[number]',
    'any.required': 'Category ID is required'
  });

/**
 * Schema for updating categories sort order
 */
const categoriesSortSchema = Joi.array()
  .items(
    Joi.object({
      id: Joi.string()
        .pattern(/^cat_\d+$/)
        .required()
        .messages({
          'string.pattern.base': 'Invalid category ID format',
          'any.required': 'Category ID is required'
        }),
      
      sortOrder: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
          'number.base': 'Sort order must be a number',
          'number.integer': 'Sort order must be an integer',
          'number.min': 'Sort order must be at least 1',
          'any.required': 'Sort order is required'
        })
    })
  )
  .min(1)
  .required()
  .messages({
    'array.min': 'At least one category sort order must be provided',
    'any.required': 'Categories sort data is required'
  });

// ==================== DISH VALIDATION SCHEMAS ====================

/**
 * Schema for creating a new dish
 */
const createDishSchema = Joi.object({
  categoryId: Joi.string()
    .pattern(/^cat_\d+$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid category ID format. Expected format: cat_[number]',
      'any.required': 'Category ID is required'
    }),
  
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Dish name is required',
      'string.min': 'Dish name must be at least 1 character long',
      'string.max': 'Dish name cannot exceed 100 characters',
      'any.required': 'Dish name is required'
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
  
  price: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be greater than 0',
      'any.required': 'Price is required'
    }),
  
  status: Joi.string()
    .valid('on', 'off')
    .optional()
    .messages({
      'any.only': 'Status must be either "on" or "off"'
    }),
  
  stock: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Stock must be a number',
      'number.integer': 'Stock must be an integer',
      'number.min': 'Stock cannot be negative'
    }),
  
  imageUrl: Joi.string()
    .uri({ allowRelative: true })
    .allow('')
    .optional()
    .messages({
      'string.uri': 'Image URL must be a valid URL'
    }),
  
  ingredients: Joi.array()
    .items(Joi.string().trim().min(1))
    .optional()
    .messages({
      'array.base': 'Ingredients must be an array',
      'string.min': 'Each ingredient must be at least 1 character long'
    }),
  
  allergens: Joi.array()
    .items(Joi.string().trim().min(1))
    .optional()
    .messages({
      'array.base': 'Allergens must be an array',
      'string.min': 'Each allergen must be at least 1 character long'
    }),
  
  preparationTime: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Preparation time must be a number',
      'number.integer': 'Preparation time must be an integer',
      'number.min': 'Preparation time cannot be negative'
    }),
  
  calories: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Calories must be a number',
      'number.integer': 'Calories must be an integer',
      'number.min': 'Calories cannot be negative'
    }),
  
  isSpicy: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isSpicy must be a boolean value'
    }),
  
  isVegetarian: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isVegetarian must be a boolean value'
    })
});

/**
 * Schema for updating an existing dish
 */
const updateDishSchema = Joi.object({
  categoryId: Joi.string()
    .pattern(/^cat_\d+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid category ID format. Expected format: cat_[number]'
    }),
  
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Dish name cannot be empty',
      'string.min': 'Dish name must be at least 1 character long',
      'string.max': 'Dish name cannot exceed 100 characters'
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
  
  price: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be greater than 0'
    }),
  
  status: Joi.string()
    .valid('on', 'off')
    .optional()
    .messages({
      'any.only': 'Status must be either "on" or "off"'
    }),
  
  stock: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Stock must be a number',
      'number.integer': 'Stock must be an integer',
      'number.min': 'Stock cannot be negative'
    }),
  
  imageUrl: Joi.string()
    .uri({ allowRelative: true })
    .allow('')
    .optional()
    .messages({
      'string.uri': 'Image URL must be a valid URL'
    }),
  
  ingredients: Joi.array()
    .items(Joi.string().trim().min(1))
    .optional()
    .messages({
      'array.base': 'Ingredients must be an array',
      'string.min': 'Each ingredient must be at least 1 character long'
    }),
  
  allergens: Joi.array()
    .items(Joi.string().trim().min(1))
    .optional()
    .messages({
      'array.base': 'Allergens must be an array',
      'string.min': 'Each allergen must be at least 1 character long'
    }),
  
  preparationTime: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Preparation time must be a number',
      'number.integer': 'Preparation time must be an integer',
      'number.min': 'Preparation time cannot be negative'
    }),
  
  calories: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Calories must be a number',
      'number.integer': 'Calories must be an integer',
      'number.min': 'Calories cannot be negative'
    }),
  
  isSpicy: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isSpicy must be a boolean value'
    }),
  
  isVegetarian: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isVegetarian must be a boolean value'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

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

/**
 * Schema for dish status update
 */
const dishStatusSchema = Joi.object({
  status: Joi.string()
    .valid('on', 'off')
    .required()
    .messages({
      'any.only': 'Status must be either "on" or "off"',
      'any.required': 'Status is required'
    })
});

/**
 * Schema for batch status update
 */
const batchStatusSchema = Joi.object({
  dishIds: Joi.array()
    .items(
      Joi.string()
        .pattern(/^dish_\d+$/)
        .messages({
          'string.pattern.base': 'Invalid dish ID format. Expected format: dish_[number]'
        })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one dish ID must be provided',
      'any.required': 'Dish IDs are required'
    }),
  
  status: Joi.string()
    .valid('on', 'off')
    .required()
    .messages({
      'any.only': 'Status must be either "on" or "off"',
      'any.required': 'Status is required'
    })
});

/**
 * Schema for image upload validation
 */
const imageUploadSchema = Joi.object({
  filename: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      'string.empty': 'Filename is required',
      'any.required': 'Filename is required'
    }),
  
  mimetype: Joi.string()
    .valid('image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp')
    .optional()
    .messages({
      'any.only': 'Only JPEG, PNG, GIF, and WebP images are allowed'
    }),
  
  size: Joi.number()
    .integer()
    .max(5 * 1024 * 1024) // 5MB max
    .optional()
    .messages({
      'number.max': 'Image size cannot exceed 5MB'
    })
});

// ==================== QUERY PARAMETER SCHEMAS ====================

/**
 * Schema for category query parameters
 */
const categoryQuerySchema = Joi.object({
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    }),
  
  sortBy: Joi.string()
    .valid('name', 'sortOrder', 'createdAt', 'updatedAt')
    .optional()
    .messages({
      'any.only': 'sortBy must be one of: name, sortOrder, createdAt, updatedAt'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .messages({
      'any.only': 'sortOrder must be either "asc" or "desc"'
    })
});

/**
 * Schema for dish query parameters
 */
const dishQuerySchema = Joi.object({
  categoryId: Joi.string()
    .pattern(/^cat_\d+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid category ID format'
    }),
  
  status: Joi.string()
    .valid('on', 'off')
    .optional()
    .messages({
      'any.only': 'Status must be either "on" or "off"'
    }),
  
  isVegetarian: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isVegetarian must be a boolean value'
    }),
  
  isSpicy: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isSpicy must be a boolean value'
    }),
  
  sortBy: Joi.string()
    .valid('name', 'price', 'createdAt', 'updatedAt', 'stock')
    .optional()
    .messages({
      'any.only': 'sortBy must be one of: name, price, createdAt, updatedAt, stock'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .messages({
      'any.only': 'sortOrder must be either "asc" or "desc"'
    })
});

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validates category creation data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
const validateCreateCategory = (data) => {
  return createCategorySchema.validate(data, { abortEarly: false });
};

/**
 * Validates category update data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
const validateUpdateCategory = (data) => {
  return updateCategorySchema.validate(data, { abortEarly: false });
};

/**
 * Validates category ID parameter
 * @param {string} categoryId - Category ID to validate
 * @returns {Object} Validation result
 */
const validateCategoryId = (categoryId) => {
  return categoryIdSchema.validate(categoryId);
};

/**
 * Validates categories sort data
 * @param {Array} data - Sort data to validate
 * @returns {Object} Validation result
 */
const validateCategoriesSort = (data) => {
  return categoriesSortSchema.validate(data, { abortEarly: false });
};

/**
 * Validates dish creation data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
const validateCreateDish = (data) => {
  return createDishSchema.validate(data, { abortEarly: false });
};

/**
 * Validates dish update data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
const validateUpdateDish = (data) => {
  return updateDishSchema.validate(data, { abortEarly: false });
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
 * Validates dish status update data
 * @param {Object} data - Status data to validate
 * @returns {Object} Validation result
 */
const validateDishStatus = (data) => {
  return dishStatusSchema.validate(data, { abortEarly: false });
};

/**
 * Validates batch status update data
 * @param {Object} data - Batch status data to validate
 * @returns {Object} Validation result
 */
const validateBatchStatus = (data) => {
  return batchStatusSchema.validate(data, { abortEarly: false });
};

/**
 * Validates image upload data
 * @param {Object} data - Image data to validate
 * @returns {Object} Validation result
 */
const validateImageUpload = (data) => {
  return imageUploadSchema.validate(data, { abortEarly: false });
};

/**
 * Validates category query parameters
 * @param {Object} query - Query parameters to validate
 * @returns {Object} Validation result
 */
const validateCategoryQuery = (query) => {
  return categoryQuerySchema.validate(query, { abortEarly: false });
};

/**
 * Validates dish query parameters
 * @param {Object} query - Query parameters to validate
 * @returns {Object} Validation result
 */
const validateDishQuery = (query) => {
  return dishQuerySchema.validate(query, { abortEarly: false });
};

module.exports = {
  // Category validators
  validateCreateCategory,
  validateUpdateCategory,
  validateCategoryId,
  validateCategoriesSort,
  validateCategoryQuery,
  
  // Dish validators
  validateCreateDish,
  validateUpdateDish,
  validateDishId,
  validateDishStatus,
  validateBatchStatus,
  validateImageUpload,
  validateDishQuery,
  
  // Schemas (for direct use if needed)
  schemas: {
    createCategorySchema,
    updateCategorySchema,
    categoryIdSchema,
    categoriesSortSchema,
    createDishSchema,
    updateDishSchema,
    dishIdSchema,
    dishStatusSchema,
    batchStatusSchema,
    imageUploadSchema,
    categoryQuerySchema,
    dishQuerySchema
  }
};
