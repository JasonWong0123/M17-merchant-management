/**
 * Menu Controller
 * 
 * This controller handles HTTP requests for menu management operations including
 * categories and dishes. It validates input, calls appropriate service methods,
 * and returns standardized responses.
 * 
 * Design decisions:
 * - Implements comprehensive input validation using Joi validators
 * - Returns consistent response format with data and meta information
 * - Handles errors gracefully with appropriate HTTP status codes
 * - Separates business logic from HTTP handling by delegating to services
 * - Provides detailed logging for debugging and monitoring
 */

const menuService = require('../services/menu.service');
const menuValidators = require('../validators/menu.validators');
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

class MenuController {
  // ==================== CATEGORY OPERATIONS ====================

  /**
   * Gets all categories with optional filtering and sorting
   * GET /api/merchant/categories
   */
  async getCategories(req, res) {
    try {
      // Validate query parameters
      const { error, value } = menuValidators.validateCategoryQuery(req.query);
      if (error) {
        logger.warn('Invalid category query parameters:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const categories = await menuService.getCategories(value);

      logger.info(`Retrieved ${categories.length} categories`);
      res.json({
        data: categories,
        meta: {
          total: categories.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getCategories:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve categories',
          details: error.message
        }
      });
    }
  }

  /**
   * Creates a new category
   * POST /api/merchant/category
   */
  async createCategory(req, res) {
    try {
      // Validate request body
      const { error, value } = menuValidators.validateCreateCategory(req.body);
      if (error) {
        logger.warn('Invalid category creation data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid category data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const newCategory = await menuService.createCategory(value);

      logger.info(`Created new category: ${newCategory.id}`);
      res.status(201).json({
        data: newCategory,
        meta: {
          message: 'Category created successfully',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in createCategory:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create category',
          details: error.message
        }
      });
    }
  }

  /**
   * Updates an existing category
   * PUT /api/merchant/category/:id
   */
  async updateCategory(req, res) {
    try {
      // Validate category ID
      const { error: idError } = menuValidators.validateCategoryId(req.params.id);
      if (idError) {
        logger.warn('Invalid category ID:', req.params.id);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid category ID',
            details: idError.message
          }
        });
      }

      // Validate request body
      const { error, value } = menuValidators.validateUpdateCategory(req.body);
      if (error) {
        logger.warn('Invalid category update data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid category update data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const updatedCategory = await menuService.updateCategory(req.params.id, value);

      if (!updatedCategory) {
        logger.warn(`Category not found: ${req.params.id}`);
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
            details: `Category with ID ${req.params.id} does not exist`
          }
        });
      }

      logger.info(`Updated category: ${req.params.id}`);
      res.json({
        data: updatedCategory,
        meta: {
          message: 'Category updated successfully',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in updateCategory:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update category',
          details: error.message
        }
      });
    }
  }

  /**
   * Deletes a category (soft delete)
   * DELETE /api/merchant/category/:id
   */
  async deleteCategory(req, res) {
    try {
      // Validate category ID
      const { error: idError } = menuValidators.validateCategoryId(req.params.id);
      if (idError) {
        logger.warn('Invalid category ID:', req.params.id);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid category ID',
            details: idError.message
          }
        });
      }

      const deleted = await menuService.deleteCategory(req.params.id);

      if (!deleted) {
        logger.warn(`Category not found for deletion: ${req.params.id}`);
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
            details: `Category with ID ${req.params.id} does not exist`
          }
        });
      }

      logger.info(`Deleted category: ${req.params.id}`);
      res.json({
        data: { deleted: true },
        meta: {
          message: 'Category deleted successfully',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in deleteCategory:', error);
      
      // Handle specific business logic errors
      if (error.message.includes('Cannot delete category with existing dishes')) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Cannot delete category',
            details: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete category',
          details: error.message
        }
      });
    }
  }

  /**
   * Updates the sort order of categories
   * PUT /api/merchant/categories/sort
   */
  async updateCategoriesSort(req, res) {
    try {
      // Validate request body
      const { error, value } = menuValidators.validateCategoriesSort(req.body);
      if (error) {
        logger.warn('Invalid categories sort data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid sort data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const updatedCategories = await menuService.updateCategoriesSort(value);

      logger.info(`Updated sort order for ${value.length} categories`);
      res.json({
        data: updatedCategories,
        meta: {
          message: 'Categories sort order updated successfully',
          updated: value.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in updateCategoriesSort:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update categories sort order',
          details: error.message
        }
      });
    }
  }

  // ==================== DISH OPERATIONS ====================

  /**
   * Gets all dishes with optional filtering and sorting
   * GET /api/merchant/dishes
   */
  async getDishes(req, res) {
    try {
      // Validate query parameters
      const { error, value } = menuValidators.validateDishQuery(req.query);
      if (error) {
        logger.warn('Invalid dish query parameters:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const dishes = await menuService.getDishes(value);

      logger.info(`Retrieved ${dishes.length} dishes`);
      res.json({
        data: dishes,
        meta: {
          total: dishes.length,
          filters: value,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getDishes:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve dishes',
          details: error.message
        }
      });
    }
  }

  /**
   * Gets a single dish by ID
   * GET /api/merchant/dish/:id
   */
  async getDishById(req, res) {
    try {
      // Validate dish ID
      const { error: idError } = menuValidators.validateDishId(req.params.id);
      if (idError) {
        logger.warn('Invalid dish ID:', req.params.id);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid dish ID',
            details: idError.message
          }
        });
      }

      const dish = await menuService.getDishById(req.params.id);

      if (!dish) {
        logger.warn(`Dish not found: ${req.params.id}`);
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Dish not found',
            details: `Dish with ID ${req.params.id} does not exist`
          }
        });
      }

      logger.info(`Retrieved dish: ${req.params.id}`);
      res.json({
        data: dish,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getDishById:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve dish',
          details: error.message
        }
      });
    }
  }

  /**
   * Creates a new dish
   * POST /api/merchant/dish
   */
  async createDish(req, res) {
    try {
      // Validate request body
      const { error, value } = menuValidators.validateCreateDish(req.body);
      if (error) {
        logger.warn('Invalid dish creation data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid dish data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const newDish = await menuService.createDish(value);

      logger.info(`Created new dish: ${newDish.id}`);
      res.status(201).json({
        data: newDish,
        meta: {
          message: 'Dish created successfully',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in createDish:', error);
      
      // Handle specific business logic errors
      if (error.message.includes('Category not found')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CATEGORY',
            message: 'Invalid category',
            details: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create dish',
          details: error.message
        }
      });
    }
  }

  /**
   * Updates an existing dish
   * PUT /api/merchant/dish/:id
   */
  async updateDish(req, res) {
    try {
      // Validate dish ID
      const { error: idError } = menuValidators.validateDishId(req.params.id);
      if (idError) {
        logger.warn('Invalid dish ID:', req.params.id);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid dish ID',
            details: idError.message
          }
        });
      }

      // Validate request body
      const { error, value } = menuValidators.validateUpdateDish(req.body);
      if (error) {
        logger.warn('Invalid dish update data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid dish update data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const updatedDish = await menuService.updateDish(req.params.id, value);

      if (!updatedDish) {
        logger.warn(`Dish not found: ${req.params.id}`);
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Dish not found',
            details: `Dish with ID ${req.params.id} does not exist`
          }
        });
      }

      logger.info(`Updated dish: ${req.params.id}`);
      res.json({
        data: updatedDish,
        meta: {
          message: 'Dish updated successfully',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in updateDish:', error);
      
      // Handle specific business logic errors
      if (error.message.includes('Category not found')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CATEGORY',
            message: 'Invalid category',
            details: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update dish',
          details: error.message
        }
      });
    }
  }

  /**
   * Deletes a dish (soft delete)
   * DELETE /api/merchant/dish/:id
   */
  async deleteDish(req, res) {
    try {
      // Validate dish ID
      const { error: idError } = menuValidators.validateDishId(req.params.id);
      if (idError) {
        logger.warn('Invalid dish ID:', req.params.id);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid dish ID',
            details: idError.message
          }
        });
      }

      const deleted = await menuService.deleteDish(req.params.id);

      if (!deleted) {
        logger.warn(`Dish not found for deletion: ${req.params.id}`);
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Dish not found',
            details: `Dish with ID ${req.params.id} does not exist`
          }
        });
      }

      logger.info(`Deleted dish: ${req.params.id}`);
      res.json({
        data: { deleted: true },
        meta: {
          message: 'Dish deleted successfully',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in deleteDish:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete dish',
          details: error.message
        }
      });
    }
  }

  /**
   * Updates dish status (on/off)
   * PUT /api/merchant/dish/:id/status
   */
  async updateDishStatus(req, res) {
    try {
      // Validate dish ID
      const { error: idError } = menuValidators.validateDishId(req.params.id);
      if (idError) {
        logger.warn('Invalid dish ID:', req.params.id);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid dish ID',
            details: idError.message
          }
        });
      }

      // Validate request body
      const { error, value } = menuValidators.validateDishStatus(req.body);
      if (error) {
        logger.warn('Invalid dish status data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const updatedDish = await menuService.updateDishStatus(req.params.id, value.status);

      if (!updatedDish) {
        logger.warn(`Dish not found: ${req.params.id}`);
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Dish not found',
            details: `Dish with ID ${req.params.id} does not exist`
          }
        });
      }

      logger.info(`Updated dish status: ${req.params.id} -> ${value.status}`);
      res.json({
        data: updatedDish,
        meta: {
          message: `Dish status updated to ${value.status}`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in updateDishStatus:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update dish status',
          details: error.message
        }
      });
    }
  }

  /**
   * Updates multiple dishes status in batch
   * PUT /api/merchant/dishes/batch-status
   */
  async updateDishesStatusBatch(req, res) {
    try {
      // Validate request body
      const { error, value } = menuValidators.validateBatchStatus(req.body);
      if (error) {
        logger.warn('Invalid batch status data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid batch status data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const updatedDishes = await menuService.updateDishesStatusBatch(value.dishIds, value.status);

      logger.info(`Updated status for ${updatedDishes.length} dishes to ${value.status}`);
      res.json({
        data: updatedDishes,
        meta: {
          message: `Updated status for ${updatedDishes.length} dishes to ${value.status}`,
          updated: updatedDishes.length,
          requested: value.dishIds.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in updateDishesStatusBatch:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update dishes status',
          details: error.message
        }
      });
    }
  }

  /**
   * Simulates dish image upload
   * POST /api/merchant/upload/dish-image
   */
  async uploadDishImage(req, res) {
    try {
      const { dishId } = req.body;

      // Validate dish ID
      const { error: idError } = menuValidators.validateDishId(dishId);
      if (idError) {
        logger.warn('Invalid dish ID for image upload:', dishId);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid dish ID',
            details: idError.message
          }
        });
      }

      // Validate image data (mock validation)
      const mockFileData = {
        filename: req.body.filename || 'dish_image.jpg',
        mimetype: req.body.mimetype || 'image/jpeg',
        size: req.body.size || 1024000
      };

      const { error, value } = menuValidators.validateImageUpload(mockFileData);
      if (error) {
        logger.warn('Invalid image upload data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid image data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const result = await menuService.uploadDishImage(dishId, value);

      logger.info(`Uploaded image for dish: ${dishId}`);
      res.json({
        data: result,
        meta: {
          message: 'Image uploaded successfully',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in uploadDishImage:', error);
      
      // Handle specific business logic errors
      if (error.message.includes('Dish not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Dish not found',
            details: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to upload image',
          details: error.message
        }
      });
    }
  }
}

module.exports = new MenuController();
