/**
 * Inventory Controller
 * 
 * This controller handles HTTP requests for inventory management operations including
 * stock updates, low stock alerts, and inventory synchronization. It validates input,
 * calls appropriate service methods, and returns standardized responses.
 * 
 * Design decisions:
 * - Implements comprehensive input validation for stock operations
 * - Provides detailed inventory analytics and alerts
 * - Handles batch operations for efficiency
 * - Returns consistent response format with inventory metadata
 * - Integrates with menu service for dish information
 */

const inventoryService = require('../services/inventory.service');
const inventoryValidators = require('../validators/inventory.validators');
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

class InventoryController {
  // ==================== STOCK MANAGEMENT OPERATIONS ====================

  /**
   * Updates stock for a specific dish
   * PUT /api/merchant/dish/:id/stock
   */
  async updateDishStock(req, res) {
    try {
      // Validate dish ID
      const { error: idError } = inventoryValidators.validateDishId(req.params.id);
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
      const { error, value } = inventoryValidators.validateUpdateStock(req.body);
      if (error) {
        logger.warn('Invalid stock update data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid stock update data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const updatedInventory = await inventoryService.updateDishStock(
        req.params.id,
        value.stock,
        {
          alertThreshold: value.alertThreshold,
          supplier: value.supplier,
          cost: value.cost,
          expiryDate: value.expiryDate
        }
      );

      logger.info(`Updated stock for dish: ${req.params.id} to ${value.stock}`);
      res.json({
        data: updatedInventory,
        meta: {
          message: 'Stock updated successfully',
          previousStock: updatedInventory.stock - value.stock + (updatedInventory.stock || 0),
          newStock: updatedInventory.stock,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in updateDishStock:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update stock',
          details: error.message
        }
      });
    }
  }

  /**
   * Gets dishes with low stock
   * GET /api/merchant/dishes/low-stock
   */
  async getLowStockDishes(req, res) {
    try {
      // Validate threshold parameter if provided
      let customThreshold = null;
      if (req.query.threshold) {
        const { error, value } = inventoryValidators.validateLowStockThreshold(parseInt(req.query.threshold));
        if (error) {
          logger.warn('Invalid threshold parameter:', req.query.threshold);
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid threshold parameter',
              details: error.message
            }
          });
        }
        customThreshold = value;
      }

      const lowStockDishes = await inventoryService.getLowStockDishes(customThreshold);

      logger.info(`Retrieved ${lowStockDishes.length} low stock dishes`);
      res.json({
        data: lowStockDishes,
        meta: {
          total: lowStockDishes.length,
          threshold: customThreshold || 'default',
          urgentItems: lowStockDishes.filter(item => item.stock === 0).length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getLowStockDishes:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve low stock dishes',
          details: error.message
        }
      });
    }
  }

  /**
   * Gets out of stock dishes
   * GET /api/merchant/dishes/out-of-stock
   */
  async getOutOfStockDishes(req, res) {
    try {
      const outOfStockDishes = await inventoryService.getOutOfStockDishes();

      logger.info(`Retrieved ${outOfStockDishes.length} out of stock dishes`);
      res.json({
        data: outOfStockDishes,
        meta: {
          total: outOfStockDishes.length,
          message: outOfStockDishes.length > 0 ? 'Immediate attention required' : 'All dishes in stock',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getOutOfStockDishes:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve out of stock dishes',
          details: error.message
        }
      });
    }
  }

  /**
   * Gets inventory for a specific dish
   * GET /api/merchant/dish/:id/inventory
   */
  async getDishInventory(req, res) {
    try {
      // Validate dish ID
      const { error: idError } = inventoryValidators.validateDishId(req.params.id);
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

      const inventory = await inventoryService.getInventoryByDishId(req.params.id);

      if (!inventory) {
        logger.warn(`Inventory not found for dish: ${req.params.id}`);
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Inventory not found',
            details: `Inventory for dish ${req.params.id} does not exist`
          }
        });
      }

      logger.info(`Retrieved inventory for dish: ${req.params.id}`);
      res.json({
        data: inventory,
        meta: {
          stockStatus: inventory.stock <= inventory.alertThreshold ? 'low' : 'normal',
          daysUntilExpiry: inventory.expiryDate ? 
            Math.ceil((new Date(inventory.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getDishInventory:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve dish inventory',
          details: error.message
        }
      });
    }
  }

  /**
   * Gets all inventory with optional filtering
   * GET /api/merchant/inventory
   */
  async getInventory(req, res) {
    try {
      // Validate query parameters
      const { error, value } = inventoryValidators.validateInventoryQuery(req.query);
      if (error) {
        logger.warn('Invalid inventory query parameters:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const inventory = await inventoryService.getInventory(value);

      logger.info(`Retrieved ${inventory.length} inventory items`);
      res.json({
        data: inventory,
        meta: {
          total: inventory.length,
          filters: value,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getInventory:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve inventory',
          details: error.message
        }
      });
    }
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Updates stock for multiple dishes in batch
   * PUT /api/merchant/inventory/batch-update
   */
  async batchUpdateStock(req, res) {
    try {
      // Validate request body
      const { error, value } = inventoryValidators.validateBatchStockUpdate(req.body);
      if (error) {
        logger.warn('Invalid batch stock update data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid batch update data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const updatedItems = await inventoryService.batchUpdateStock(value);

      logger.info(`Batch updated stock for ${updatedItems.length} items`);
      res.json({
        data: updatedItems,
        meta: {
          message: 'Batch stock update completed',
          updated: updatedItems.length,
          requested: value.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in batchUpdateStock:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to batch update stock',
          details: error.message
        }
      });
    }
  }

  // ==================== STOCK ADJUSTMENTS ====================

  /**
   * Adjusts stock (add or subtract)
   * POST /api/merchant/dish/:id/adjust-stock
   */
  async adjustStock(req, res) {
    try {
      // Validate dish ID
      const { error: idError } = inventoryValidators.validateDishId(req.params.id);
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
      const { error, value } = inventoryValidators.validateStockAdjustment(req.body);
      if (error) {
        logger.warn('Invalid stock adjustment data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid adjustment data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      // Get current inventory to validate adjustment
      const currentInventory = await inventoryService.getInventoryByDishId(req.params.id);
      if (currentInventory) {
        const validationResult = inventoryValidators.validateStockOperation(
          currentInventory.stock,
          value.adjustment
        );
        
        if (validationResult.error) {
          logger.warn('Invalid stock operation:', validationResult.error.details[0].message);
          return res.status(400).json({
            error: {
              code: 'INVALID_OPERATION',
              message: 'Invalid stock adjustment',
              details: validationResult.error.details[0].message
            }
          });
        }
      }

      const updatedInventory = await inventoryService.adjustStock(
        req.params.id,
        value.adjustment,
        value.reason
      );

      logger.info(`Adjusted stock for dish: ${req.params.id} by ${value.adjustment}`);
      res.json({
        data: updatedInventory,
        meta: {
          message: 'Stock adjusted successfully',
          adjustment: value.adjustment,
          reason: value.reason || 'No reason provided',
          newStock: updatedInventory.stock,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in adjustStock:', error);
      
      // Handle specific business logic errors
      if (error.message.includes('Inventory not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Inventory not found',
            details: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to adjust stock',
          details: error.message
        }
      });
    }
  }

  // ==================== ALERT THRESHOLD MANAGEMENT ====================

  /**
   * Updates alert threshold for a dish
   * PUT /api/merchant/dish/:id/alert-threshold
   */
  async updateAlertThreshold(req, res) {
    try {
      // Validate dish ID
      const { error: idError } = inventoryValidators.validateDishId(req.params.id);
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
      const { error, value } = inventoryValidators.validateAlertThreshold(req.body);
      if (error) {
        logger.warn('Invalid alert threshold data:', error.details);
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid threshold data',
            details: error.details.map(detail => detail.message)
          }
        });
      }

      const updatedInventory = await inventoryService.updateAlertThreshold(
        req.params.id,
        value.alertThreshold
      );

      if (!updatedInventory) {
        logger.warn(`Inventory not found for dish: ${req.params.id}`);
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Inventory not found',
            details: `Inventory for dish ${req.params.id} does not exist`
          }
        });
      }

      logger.info(`Updated alert threshold for dish: ${req.params.id} to ${value.alertThreshold}`);
      res.json({
        data: updatedInventory,
        meta: {
          message: 'Alert threshold updated successfully',
          newThreshold: value.alertThreshold,
          currentStock: updatedInventory.stock,
          alertStatus: updatedInventory.stock <= value.alertThreshold ? 'triggered' : 'normal',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in updateAlertThreshold:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update alert threshold',
          details: error.message
        }
      });
    }
  }

  // ==================== INVENTORY ANALYTICS ====================

  /**
   * Gets inventory summary statistics
   * GET /api/merchant/inventory/summary
   */
  async getInventorySummary(req, res) {
    try {
      const summary = await inventoryService.getInventorySummary();

      logger.info('Retrieved inventory summary');
      res.json({
        data: summary,
        meta: {
          message: 'Inventory summary generated successfully',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getInventorySummary:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate inventory summary',
          details: error.message
        }
      });
    }
  }

  /**
   * Synchronizes inventory with dishes
   * POST /api/merchant/inventory/sync
   */
  async synchronizeInventory(req, res) {
    try {
      const result = await inventoryService.synchronizeInventory();

      logger.info(`Inventory synchronization completed: ${result.message}`);
      res.json({
        data: result,
        meta: {
          message: 'Inventory synchronization completed',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in synchronizeInventory:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to synchronize inventory',
          details: error.message
        }
      });
    }
  }

  // ==================== EXPIRY MANAGEMENT ====================

  /**
   * Gets items expiring within specified days
   * GET /api/merchant/inventory/expiring
   */
  async getExpiringItems(req, res) {
    try {
      const days = parseInt(req.query.days) || 7; // Default to 7 days
      
      // Validate days parameter
      if (days < 1 || days > 365) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid days parameter',
            details: 'Days must be between 1 and 365'
          }
        });
      }

      const inventory = await inventoryService.getInventory();
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + days);

      const expiringItems = inventory.filter(item => {
        if (!item.expiryDate) return false;
        const expiry = new Date(item.expiryDate);
        return expiry <= expiringDate && expiry >= new Date();
      });

      logger.info(`Found ${expiringItems.length} items expiring within ${days} days`);
      res.json({
        data: expiringItems,
        meta: {
          total: expiringItems.length,
          withinDays: days,
          message: expiringItems.length > 0 ? 'Items require attention' : 'No items expiring soon',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error in getExpiringItems:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve expiring items',
          details: error.message
        }
      });
    }
  }
}

module.exports = new InventoryController();
