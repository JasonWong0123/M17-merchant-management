/**
 * Inventory Service
 * 
 * This service manages inventory operations including stock updates, low stock alerts,
 * and inventory synchronization with dish data. It provides real-time inventory tracking
 * and automated alerts for stock management.
 * 
 * Design decisions:
 * - Maintains separate inventory records linked to dishes by dishId
 * - Implements configurable alert thresholds for low stock warnings
 * - Provides batch operations for efficient inventory updates
 * - Tracks supplier information and expiry dates for better inventory management
 */

const dataStore = require('./data.store');
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

class InventoryService {
  constructor() {
    this.inventoryFile = 'inventory';
    this.dishesFile = 'dishes';
  }

  /**
   * Gets all inventory items with optional filtering
   * @param {Object} options - Query options
   * @returns {Array} Array of inventory items
   */
  async getInventory(options = {}) {
    try {
      let inventory = dataStore.readData(this.inventoryFile);
      
      // Apply filters
      if (options.lowStock) {
        inventory = inventory.filter(item => item.stock <= item.alertThreshold);
      }
      
      if (options.outOfStock) {
        inventory = inventory.filter(item => item.stock === 0);
      }
      
      if (options.supplier) {
        inventory = inventory.filter(item => 
          item.supplier && item.supplier.toLowerCase().includes(options.supplier.toLowerCase())
        );
      }
      
      // Sort inventory
      inventory = dataStore.sortData(inventory, options.sortBy || 'lastUpdated', options.sortOrder || 'desc');
      
      logger.info(`Retrieved ${inventory.length} inventory items`);
      return inventory;
    } catch (error) {
      logger.error('Error getting inventory:', error);
      throw error;
    }
  }

  /**
   * Gets inventory for a specific dish
   * @param {string} dishId - Dish ID
   * @returns {Object|null} Inventory item or null if not found
   */
  async getInventoryByDishId(dishId) {
    try {
      const inventory = dataStore.readData(this.inventoryFile);
      const inventoryItem = inventory.find(item => item.dishId === dishId);
      
      if (inventoryItem) {
        logger.info(`Retrieved inventory for dish: ${dishId}`);
      } else {
        logger.warn(`Inventory not found for dish: ${dishId}`);
      }
      
      return inventoryItem;
    } catch (error) {
      logger.error(`Error getting inventory for dish ${dishId}:`, error);
      throw error;
    }
  }

  /**
   * Updates stock for a specific dish
   * @param {string} dishId - Dish ID
   * @param {number} newStock - New stock amount
   * @param {Object} additionalData - Additional inventory data to update
   * @returns {Object} Updated inventory item
   */
  async updateDishStock(dishId, newStock, additionalData = {}) {
    try {
      const inventory = dataStore.readData(this.inventoryFile);
      const inventoryIndex = inventory.findIndex(item => item.dishId === dishId);
      
      if (inventoryIndex === -1) {
        // Create new inventory entry if it doesn't exist
        const newInventoryItem = {
          dishId,
          stock: newStock,
          alertThreshold: additionalData.alertThreshold || 5,
          lastUpdated: new Date().toISOString(),
          supplier: additionalData.supplier || '',
          cost: additionalData.cost || 0,
          expiryDate: additionalData.expiryDate || null
        };
        
        inventory.push(newInventoryItem);
        dataStore.writeData(this.inventoryFile, inventory);
        
        // Update dish stock as well
        await this.updateDishStockField(dishId, newStock);
        
        logger.info(`Created new inventory entry for dish: ${dishId} with stock: ${newStock}`);
        return newInventoryItem;
      }
      
      // Update existing inventory item
      const updatedInventoryItem = {
        ...inventory[inventoryIndex],
        stock: newStock,
        lastUpdated: new Date().toISOString(),
        ...additionalData
      };
      
      inventory[inventoryIndex] = updatedInventoryItem;
      dataStore.writeData(this.inventoryFile, inventory);
      
      // Update dish stock as well
      await this.updateDishStockField(dishId, newStock);
      
      // Check for low stock alert
      if (newStock <= updatedInventoryItem.alertThreshold) {
        logger.warn(`Low stock alert for dish ${dishId}: ${newStock} units remaining (threshold: ${updatedInventoryItem.alertThreshold})`);
      }
      
      logger.info(`Updated stock for dish: ${dishId} to ${newStock} units`);
      return updatedInventoryItem;
    } catch (error) {
      logger.error(`Error updating stock for dish ${dishId}:`, error);
      throw error;
    }
  }

  /**
   * Updates the stock field in the dishes data
   * @param {string} dishId - Dish ID
   * @param {number} newStock - New stock amount
   */
  async updateDishStockField(dishId, newStock) {
    try {
      const dishes = dataStore.readData(this.dishesFile);
      const dishIndex = dataStore.findIndexById(dishes, dishId);
      
      if (dishIndex !== -1) {
        dishes[dishIndex].stock = newStock;
        dishes[dishIndex] = dataStore.addTimestamps(dishes[dishIndex], true);
        dataStore.writeData(this.dishesFile, dishes);
        
        logger.info(`Updated dish stock field for: ${dishId}`);
      }
    } catch (error) {
      logger.error(`Error updating dish stock field for ${dishId}:`, error);
      // Don't throw error as this is a secondary operation
    }
  }

  /**
   * Gets dishes with low stock
   * @param {number} customThreshold - Custom threshold (optional)
   * @returns {Array} Array of dishes with low stock
   */
  async getLowStockDishes(customThreshold = null) {
    try {
      const inventory = dataStore.readData(this.inventoryFile);
      const dishes = dataStore.readData(this.dishesFile);
      
      // Filter inventory items with low stock
      const lowStockInventory = inventory.filter(item => {
        const threshold = customThreshold || item.alertThreshold;
        return item.stock <= threshold;
      });
      
      // Enrich with dish information
      const lowStockDishes = lowStockInventory.map(inventoryItem => {
        const dish = dataStore.findById(dishes, inventoryItem.dishId);
        return {
          ...inventoryItem,
          dishName: dish ? dish.name : 'Unknown Dish',
          dishPrice: dish ? dish.price : 0,
          dishStatus: dish ? dish.status : 'unknown',
          categoryId: dish ? dish.categoryId : null
        };
      });
      
      // Sort by stock level (lowest first)
      lowStockDishes.sort((a, b) => a.stock - b.stock);
      
      logger.info(`Found ${lowStockDishes.length} dishes with low stock`);
      return lowStockDishes;
    } catch (error) {
      logger.error('Error getting low stock dishes:', error);
      throw error;
    }
  }

  /**
   * Gets out of stock dishes
   * @returns {Array} Array of dishes that are out of stock
   */
  async getOutOfStockDishes() {
    try {
      const inventory = dataStore.readData(this.inventoryFile);
      const dishes = dataStore.readData(this.dishesFile);
      
      // Filter inventory items with zero stock
      const outOfStockInventory = inventory.filter(item => item.stock === 0);
      
      // Enrich with dish information
      const outOfStockDishes = outOfStockInventory.map(inventoryItem => {
        const dish = dataStore.findById(dishes, inventoryItem.dishId);
        return {
          ...inventoryItem,
          dishName: dish ? dish.name : 'Unknown Dish',
          dishPrice: dish ? dish.price : 0,
          dishStatus: dish ? dish.status : 'unknown',
          categoryId: dish ? dish.categoryId : null
        };
      });
      
      logger.info(`Found ${outOfStockDishes.length} dishes out of stock`);
      return outOfStockDishes;
    } catch (error) {
      logger.error('Error getting out of stock dishes:', error);
      throw error;
    }
  }

  /**
   * Updates alert threshold for a dish
   * @param {string} dishId - Dish ID
   * @param {number} newThreshold - New alert threshold
   * @returns {Object|null} Updated inventory item or null if not found
   */
  async updateAlertThreshold(dishId, newThreshold) {
    try {
      if (newThreshold < 0) {
        throw new Error('Alert threshold must be non-negative');
      }
      
      const inventory = dataStore.readData(this.inventoryFile);
      const inventoryIndex = inventory.findIndex(item => item.dishId === dishId);
      
      if (inventoryIndex === -1) {
        logger.warn(`Inventory not found for dish: ${dishId}`);
        return null;
      }
      
      inventory[inventoryIndex].alertThreshold = newThreshold;
      inventory[inventoryIndex].lastUpdated = new Date().toISOString();
      
      dataStore.writeData(this.inventoryFile, inventory);
      
      logger.info(`Updated alert threshold for dish ${dishId} to ${newThreshold}`);
      return inventory[inventoryIndex];
    } catch (error) {
      logger.error(`Error updating alert threshold for dish ${dishId}:`, error);
      throw error;
    }
  }

  /**
   * Batch updates stock for multiple dishes
   * @param {Array} stockUpdates - Array of {dishId, stock, ...additionalData} objects
   * @returns {Array} Array of updated inventory items
   */
  async batchUpdateStock(stockUpdates) {
    try {
      const updatedItems = [];
      
      for (const update of stockUpdates) {
        if (!update.dishId || update.stock === undefined) {
          logger.warn('Skipping invalid stock update:', update);
          continue;
        }
        
        try {
          const updatedItem = await this.updateDishStock(
            update.dishId, 
            update.stock, 
            {
              supplier: update.supplier,
              cost: update.cost,
              expiryDate: update.expiryDate,
              alertThreshold: update.alertThreshold
            }
          );
          updatedItems.push(updatedItem);
        } catch (error) {
          logger.error(`Error updating stock for dish ${update.dishId} in batch:`, error);
          // Continue with other updates
        }
      }
      
      logger.info(`Batch updated stock for ${updatedItems.length} dishes`);
      return updatedItems;
    } catch (error) {
      logger.error('Error in batch stock update:', error);
      throw error;
    }
  }

  /**
   * Adjusts stock (add or subtract)
   * @param {string} dishId - Dish ID
   * @param {number} adjustment - Amount to adjust (positive to add, negative to subtract)
   * @param {string} reason - Reason for adjustment
   * @returns {Object} Updated inventory item
   */
  async adjustStock(dishId, adjustment, reason = '') {
    try {
      const currentInventory = await this.getInventoryByDishId(dishId);
      
      if (!currentInventory) {
        throw new Error(`Inventory not found for dish: ${dishId}`);
      }
      
      const newStock = Math.max(0, currentInventory.stock + adjustment);
      
      const updatedItem = await this.updateDishStock(dishId, newStock, {
        adjustmentReason: reason,
        lastAdjustment: adjustment,
        lastAdjustmentDate: new Date().toISOString()
      });
      
      logger.info(`Adjusted stock for dish ${dishId} by ${adjustment} (reason: ${reason}). New stock: ${newStock}`);
      return updatedItem;
    } catch (error) {
      logger.error(`Error adjusting stock for dish ${dishId}:`, error);
      throw error;
    }
  }

  /**
   * Gets inventory summary statistics
   * @returns {Object} Inventory summary
   */
  async getInventorySummary() {
    try {
      const inventory = dataStore.readData(this.inventoryFile);
      const dishes = dataStore.readData(this.dishesFile);
      
      const totalItems = inventory.length;
      const totalStock = inventory.reduce((sum, item) => sum + item.stock, 0);
      const lowStockItems = inventory.filter(item => item.stock <= item.alertThreshold).length;
      const outOfStockItems = inventory.filter(item => item.stock === 0).length;
      const totalValue = inventory.reduce((sum, item) => sum + (item.stock * item.cost), 0);
      
      // Get expiring items (within 3 days)
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const expiringItems = inventory.filter(item => {
        if (!item.expiryDate) return false;
        const expiryDate = new Date(item.expiryDate);
        return expiryDate <= threeDaysFromNow && expiryDate >= new Date();
      }).length;
      
      const summary = {
        totalItems,
        totalStock,
        lowStockItems,
        outOfStockItems,
        expiringItems,
        totalValue: Math.round(totalValue * 100) / 100,
        averageStockPerItem: totalItems > 0 ? Math.round((totalStock / totalItems) * 100) / 100 : 0,
        stockStatus: {
          healthy: totalItems - lowStockItems - outOfStockItems,
          lowStock: lowStockItems,
          outOfStock: outOfStockItems
        },
        lastUpdated: new Date().toISOString()
      };
      
      logger.info('Generated inventory summary');
      return summary;
    } catch (error) {
      logger.error('Error generating inventory summary:', error);
      throw error;
    }
  }

  /**
   * Synchronizes inventory with dishes (ensures all dishes have inventory entries)
   * @returns {Object} Synchronization result
   */
  async synchronizeInventory() {
    try {
      const dishes = dataStore.readData(this.dishesFile);
      const inventory = dataStore.readData(this.inventoryFile);
      
      let created = 0;
      let updated = 0;
      
      for (const dish of dishes) {
        const existingInventory = inventory.find(item => item.dishId === dish.id);
        
        if (!existingInventory) {
          // Create new inventory entry
          const newInventoryItem = {
            dishId: dish.id,
            stock: dish.stock || 0,
            alertThreshold: 5,
            lastUpdated: new Date().toISOString(),
            supplier: '',
            cost: 0,
            expiryDate: null
          };
          
          inventory.push(newInventoryItem);
          created++;
        } else if (existingInventory.stock !== dish.stock) {
          // Update stock if different
          existingInventory.stock = dish.stock;
          existingInventory.lastUpdated = new Date().toISOString();
          updated++;
        }
      }
      
      if (created > 0 || updated > 0) {
        dataStore.writeData(this.inventoryFile, inventory);
      }
      
      const result = {
        created,
        updated,
        total: inventory.length,
        message: `Synchronized inventory: ${created} created, ${updated} updated`
      };
      
      logger.info(`Inventory synchronization completed: ${result.message}`);
      return result;
    } catch (error) {
      logger.error('Error synchronizing inventory:', error);
      throw error;
    }
  }
}

module.exports = new InventoryService();
