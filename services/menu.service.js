/**
 * Menu Service
 * 
 * This service handles all menu-related business logic including categories and dishes management.
 * It provides CRUD operations for both categories and dishes, handles sorting, status management,
 * and integrates with inventory data.
 * 
 * Design decisions:
 * - Separates categories and dishes into different JSON files for better organization
 * - Maintains referential integrity between categories and dishes
 * - Implements soft delete by changing status instead of removing records
 * - Provides batch operations for efficiency
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

class MenuService {
  constructor() {
    this.categoriesFile = 'categories';
    this.dishesFile = 'dishes';
    this.inventoryFile = 'inventory';
  }

  // ==================== CATEGORY OPERATIONS ====================

  /**
   * Gets all categories with optional filtering and sorting
   * @param {Object} options - Query options (filter, sort, etc.)
   * @returns {Array} Array of categories
   */
  async getCategories(options = {}) {
    try {
      let categories = dataStore.readData(this.categoriesFile);
      
      // Apply filters if provided
      if (options.isActive !== undefined) {
        categories = categories.filter(cat => cat.isActive === options.isActive);
      }
      
      // Sort by sortOrder by default, or by specified field
      categories = dataStore.sortData(categories, options.sortBy || 'sortOrder', options.sortOrder || 'asc');
      
      logger.info(`Retrieved ${categories.length} categories`);
      return categories;
    } catch (error) {
      logger.error('Error getting categories:', error);
      throw error;
    }
  }

  /**
   * Gets a single category by ID
   * @param {string} categoryId - Category ID
   * @returns {Object|null} Category object or null if not found
   */
  async getCategoryById(categoryId) {
    try {
      const categories = dataStore.readData(this.categoriesFile);
      const category = dataStore.findById(categories, categoryId);
      
      if (category) {
        logger.info(`Retrieved category: ${categoryId}`);
      } else {
        logger.warn(`Category not found: ${categoryId}`);
      }
      
      return category;
    } catch (error) {
      logger.error(`Error getting category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Creates a new category
   * @param {Object} categoryData - Category data
   * @returns {Object} Created category
   */
  async createCategory(categoryData) {
    try {
      const categories = dataStore.readData(this.categoriesFile);
      
      // Validate required fields
      dataStore.validateRequiredFields(categoryData, ['name']);
      
      // Generate new ID
      const newId = dataStore.generateId('cat_', categories);
      
      // Create new category with defaults
      const newCategory = {
        id: newId,
        name: categoryData.name,
        description: categoryData.description || '',
        sortOrder: categoryData.sortOrder || categories.length + 1,
        isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
        ...dataStore.addTimestamps({})
      };
      
      categories.push(newCategory);
      dataStore.writeData(this.categoriesFile, categories);
      
      logger.info(`Created new category: ${newId}`);
      return newCategory;
    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Updates an existing category
   * @param {string} categoryId - Category ID
   * @param {Object} updateData - Data to update
   * @returns {Object|null} Updated category or null if not found
   */
  async updateCategory(categoryId, updateData) {
    try {
      const categories = dataStore.readData(this.categoriesFile);
      const categoryIndex = dataStore.findIndexById(categories, categoryId);
      
      if (categoryIndex === -1) {
        logger.warn(`Category not found for update: ${categoryId}`);
        return null;
      }
      
      // Update category with new data
      const updatedCategory = {
        ...categories[categoryIndex],
        ...updateData,
        id: categoryId, // Ensure ID doesn't change
        ...dataStore.addTimestamps({}, true)
      };
      
      categories[categoryIndex] = updatedCategory;
      dataStore.writeData(this.categoriesFile, categories);
      
      logger.info(`Updated category: ${categoryId}`);
      return updatedCategory;
    } catch (error) {
      logger.error(`Error updating category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a category (soft delete by setting isActive to false)
   * @param {string} categoryId - Category ID
   * @returns {boolean} True if deleted, false if not found
   */
  async deleteCategory(categoryId) {
    try {
      // Check if category has dishes
      const dishes = dataStore.readData(this.dishesFile);
      const categoryDishes = dishes.filter(dish => dish.categoryId === categoryId);
      
      if (categoryDishes.length > 0) {
        throw new Error(`Cannot delete category with existing dishes. Found ${categoryDishes.length} dishes in this category.`);
      }
      
      const result = await this.updateCategory(categoryId, { isActive: false });
      
      if (result) {
        logger.info(`Deleted category: ${categoryId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error deleting category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Updates the sort order of categories
   * @param {Array} sortData - Array of {id, sortOrder} objects
   * @returns {Array} Updated categories
   */
  async updateCategoriesSort(sortData) {
    try {
      const categories = dataStore.readData(this.categoriesFile);
      
      // Update sort order for each category
      sortData.forEach(item => {
        const categoryIndex = dataStore.findIndexById(categories, item.id);
        if (categoryIndex !== -1) {
          categories[categoryIndex].sortOrder = item.sortOrder;
          categories[categoryIndex] = dataStore.addTimestamps(categories[categoryIndex], true);
        }
      });
      
      dataStore.writeData(this.categoriesFile, categories);
      
      logger.info(`Updated sort order for ${sortData.length} categories`);
      return categories.sort((a, b) => a.sortOrder - b.sortOrder);
    } catch (error) {
      logger.error('Error updating categories sort order:', error);
      throw error;
    }
  }

  // ==================== DISH OPERATIONS ====================

  /**
   * Gets all dishes with optional filtering and sorting
   * @param {Object} options - Query options
   * @returns {Array} Array of dishes
   */
  async getDishes(options = {}) {
    try {
      let dishes = dataStore.readData(this.dishesFile);
      
      // Apply filters
      if (options.categoryId) {
        dishes = dishes.filter(dish => dish.categoryId === options.categoryId);
      }
      
      if (options.status) {
        dishes = dishes.filter(dish => dish.status === options.status);
      }
      
      if (options.isVegetarian !== undefined) {
        dishes = dishes.filter(dish => dish.isVegetarian === options.isVegetarian);
      }
      
      if (options.isSpicy !== undefined) {
        dishes = dishes.filter(dish => dish.isSpicy === options.isSpicy);
      }
      
      // Sort dishes
      dishes = dataStore.sortData(dishes, options.sortBy || 'name', options.sortOrder || 'asc');
      
      logger.info(`Retrieved ${dishes.length} dishes`);
      return dishes;
    } catch (error) {
      logger.error('Error getting dishes:', error);
      throw error;
    }
  }

  /**
   * Gets a single dish by ID
   * @param {string} dishId - Dish ID
   * @returns {Object|null} Dish object or null if not found
   */
  async getDishById(dishId) {
    try {
      const dishes = dataStore.readData(this.dishesFile);
      const dish = dataStore.findById(dishes, dishId);
      
      if (dish) {
        logger.info(`Retrieved dish: ${dishId}`);
      } else {
        logger.warn(`Dish not found: ${dishId}`);
      }
      
      return dish;
    } catch (error) {
      logger.error(`Error getting dish ${dishId}:`, error);
      throw error;
    }
  }

  /**
   * Creates a new dish
   * @param {Object} dishData - Dish data
   * @returns {Object} Created dish
   */
  async createDish(dishData) {
    try {
      const dishes = dataStore.readData(this.dishesFile);
      
      // Validate required fields
      dataStore.validateRequiredFields(dishData, ['name', 'categoryId', 'price']);
      
      // Validate category exists
      const category = await this.getCategoryById(dishData.categoryId);
      if (!category) {
        throw new Error(`Category not found: ${dishData.categoryId}`);
      }
      
      // Generate new ID
      const newId = dataStore.generateId('dish_', dishes);
      
      // Create new dish with defaults
      const newDish = {
        id: newId,
        categoryId: dishData.categoryId,
        name: dishData.name,
        description: dishData.description || '',
        price: parseFloat(dishData.price),
        status: dishData.status || 'on',
        stock: dishData.stock || 0,
        imageUrl: dishData.imageUrl || '',
        ingredients: dishData.ingredients || [],
        allergens: dishData.allergens || [],
        preparationTime: dishData.preparationTime || 0,
        calories: dishData.calories || 0,
        isSpicy: dishData.isSpicy || false,
        isVegetarian: dishData.isVegetarian || false,
        ...dataStore.addTimestamps({})
      };
      
      dishes.push(newDish);
      dataStore.writeData(this.dishesFile, dishes);
      
      // Create inventory entry
      await this.createInventoryEntry(newId, dishData.stock || 0);
      
      logger.info(`Created new dish: ${newId}`);
      return newDish;
    } catch (error) {
      logger.error('Error creating dish:', error);
      throw error;
    }
  }

  /**
   * Updates an existing dish
   * @param {string} dishId - Dish ID
   * @param {Object} updateData - Data to update
   * @returns {Object|null} Updated dish or null if not found
   */
  async updateDish(dishId, updateData) {
    try {
      const dishes = dataStore.readData(this.dishesFile);
      const dishIndex = dataStore.findIndexById(dishes, dishId);
      
      if (dishIndex === -1) {
        logger.warn(`Dish not found for update: ${dishId}`);
        return null;
      }
      
      // Validate category if being updated
      if (updateData.categoryId) {
        const category = await this.getCategoryById(updateData.categoryId);
        if (!category) {
          throw new Error(`Category not found: ${updateData.categoryId}`);
        }
      }
      
      // Update dish with new data
      const updatedDish = {
        ...dishes[dishIndex],
        ...updateData,
        id: dishId, // Ensure ID doesn't change
        price: updateData.price ? parseFloat(updateData.price) : dishes[dishIndex].price,
        ...dataStore.addTimestamps({}, true)
      };
      
      dishes[dishIndex] = updatedDish;
      dataStore.writeData(this.dishesFile, dishes);
      
      logger.info(`Updated dish: ${dishId}`);
      return updatedDish;
    } catch (error) {
      logger.error(`Error updating dish ${dishId}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a dish (soft delete by setting status to 'off')
   * @param {string} dishId - Dish ID
   * @returns {boolean} True if deleted, false if not found
   */
  async deleteDish(dishId) {
    try {
      const result = await this.updateDish(dishId, { status: 'off' });
      
      if (result) {
        logger.info(`Deleted dish: ${dishId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error deleting dish ${dishId}:`, error);
      throw error;
    }
  }

  /**
   * Updates dish status (on/off)
   * @param {string} dishId - Dish ID
   * @param {string} status - New status ('on' or 'off')
   * @returns {Object|null} Updated dish or null if not found
   */
  async updateDishStatus(dishId, status) {
    try {
      if (!['on', 'off'].includes(status)) {
        throw new Error('Status must be either "on" or "off"');
      }
      
      const result = await this.updateDish(dishId, { status });
      
      if (result) {
        logger.info(`Updated dish status: ${dishId} -> ${status}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error updating dish status ${dishId}:`, error);
      throw error;
    }
  }

  /**
   * Updates multiple dishes status in batch
   * @param {Array} dishIds - Array of dish IDs
   * @param {string} status - New status ('on' or 'off')
   * @returns {Array} Array of updated dishes
   */
  async updateDishesStatusBatch(dishIds, status) {
    try {
      if (!['on', 'off'].includes(status)) {
        throw new Error('Status must be either "on" or "off"');
      }
      
      const updatedDishes = [];
      
      for (const dishId of dishIds) {
        const updatedDish = await this.updateDish(dishId, { status });
        if (updatedDish) {
          updatedDishes.push(updatedDish);
        }
      }
      
      logger.info(`Updated status for ${updatedDishes.length} dishes to ${status}`);
      return updatedDishes;
    } catch (error) {
      logger.error('Error updating dishes status in batch:', error);
      throw error;
    }
  }

  // ==================== INVENTORY INTEGRATION ====================

  /**
   * Creates an inventory entry for a new dish
   * @param {string} dishId - Dish ID
   * @param {number} initialStock - Initial stock amount
   */
  async createInventoryEntry(dishId, initialStock = 0) {
    try {
      const inventory = dataStore.readData(this.inventoryFile);
      
      // Check if inventory entry already exists
      const existingEntry = inventory.find(item => item.dishId === dishId);
      if (existingEntry) {
        return; // Entry already exists
      }
      
      const newInventoryEntry = {
        dishId,
        stock: initialStock,
        alertThreshold: 5, // Default threshold
        lastUpdated: new Date().toISOString(),
        supplier: '',
        cost: 0,
        expiryDate: null
      };
      
      inventory.push(newInventoryEntry);
      dataStore.writeData(this.inventoryFile, inventory);
      
      logger.info(`Created inventory entry for dish: ${dishId}`);
    } catch (error) {
      logger.error(`Error creating inventory entry for dish ${dishId}:`, error);
      // Don't throw error here as it's a secondary operation
    }
  }

  /**
   * Simulates image upload (returns mock URL)
   * @param {string} dishId - Dish ID
   * @param {Object} fileData - Mock file data
   * @returns {Object} Upload result with URL
   */
  async uploadDishImage(dishId, fileData) {
    try {
      // Simulate image processing and upload
      const mockImageUrl = `/images/dishes/${dishId}_${Date.now()}.jpg`;
      
      // Update dish with new image URL
      const updatedDish = await this.updateDish(dishId, { imageUrl: mockImageUrl });
      
      if (!updatedDish) {
        throw new Error(`Dish not found: ${dishId}`);
      }
      
      logger.info(`Uploaded image for dish: ${dishId}`);
      
      return {
        success: true,
        imageUrl: mockImageUrl,
        message: 'Image uploaded successfully'
      };
    } catch (error) {
      logger.error(`Error uploading image for dish ${dishId}:`, error);
      throw error;
    }
  }
}

module.exports = new MenuService();
