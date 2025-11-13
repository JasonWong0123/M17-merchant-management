/**
 * Menu Routes
 * 
 * This module defines all routes for menu management operations including
 * categories and dishes. It connects HTTP endpoints to controller methods
 * and applies appropriate middleware.
 * 
 * Design decisions:
 * - Groups related routes logically (categories, dishes, uploads)
 * - Uses RESTful conventions for endpoint naming
 * - Applies error handling middleware to all routes
 * - Provides clear route documentation with examples
 */

const express = require('express');
const menuController = require('../controllers/menu.controller');
const { asyncErrorHandler } = require('../middleware/error.middleware');

const router = express.Router();

// ==================== CATEGORY ROUTES ====================

/**
 * @route GET /api/merchant/categories
 * @desc Get all categories with optional filtering and sorting
 * @query {boolean} isActive - Filter by active status
 * @query {string} sortBy - Sort field (name, sortOrder, createdAt, updatedAt)
 * @query {string} sortOrder - Sort direction (asc, desc)
 * @access Public
 * @example GET /api/merchant/categories?isActive=true&sortBy=sortOrder&sortOrder=asc
 */
router.get('/categories', asyncErrorHandler(menuController.getCategories));

/**
 * @route POST /api/merchant/category
 * @desc Create a new category
 * @body {string} name - Category name (required)
 * @body {string} description - Category description (optional)
 * @body {number} sortOrder - Sort order (optional)
 * @body {boolean} isActive - Active status (optional, default: true)
 * @access Public
 * @example POST /api/merchant/category
 * Body: { "name": "Appetizers", "description": "Light starters", "sortOrder": 1 }
 */
router.post('/category', asyncErrorHandler(menuController.createCategory));

/**
 * @route PUT /api/merchant/category/:id
 * @desc Update an existing category
 * @param {string} id - Category ID (format: cat_[number])
 * @body {string} name - Category name (optional)
 * @body {string} description - Category description (optional)
 * @body {number} sortOrder - Sort order (optional)
 * @body {boolean} isActive - Active status (optional)
 * @access Public
 * @example PUT /api/merchant/category/cat_1
 * Body: { "name": "Updated Appetizers", "description": "Fresh starters" }
 */
router.put('/category/:id', asyncErrorHandler(menuController.updateCategory));

/**
 * @route DELETE /api/merchant/category/:id
 * @desc Delete a category (soft delete - sets isActive to false)
 * @param {string} id - Category ID (format: cat_[number])
 * @access Public
 * @example DELETE /api/merchant/category/cat_1
 * @note Cannot delete categories that have associated dishes
 */
router.delete('/category/:id', asyncErrorHandler(menuController.deleteCategory));

/**
 * @route PUT /api/merchant/categories/sort
 * @desc Update the sort order of multiple categories
 * @body {Array} categories - Array of {id, sortOrder} objects
 * @access Public
 * @example PUT /api/merchant/categories/sort
 * Body: [{"id": "cat_1", "sortOrder": 2}, {"id": "cat_2", "sortOrder": 1}]
 */
router.put('/categories/sort', asyncErrorHandler(menuController.updateCategoriesSort));

// ==================== DISH ROUTES ====================

/**
 * @route GET /api/merchant/dishes
 * @desc Get all dishes with optional filtering and sorting
 * @query {string} categoryId - Filter by category ID
 * @query {string} status - Filter by status (on, off)
 * @query {boolean} isVegetarian - Filter by vegetarian status
 * @query {boolean} isSpicy - Filter by spicy status
 * @query {string} sortBy - Sort field (name, price, createdAt, updatedAt, stock)
 * @query {string} sortOrder - Sort direction (asc, desc)
 * @access Public
 * @example GET /api/merchant/dishes?categoryId=cat_1&status=on&sortBy=price&sortOrder=asc
 */
router.get('/dishes', asyncErrorHandler(menuController.getDishes));

/**
 * @route GET /api/merchant/dish/:id
 * @desc Get a single dish by ID
 * @param {string} id - Dish ID (format: dish_[number])
 * @access Public
 * @example GET /api/merchant/dish/dish_1
 */
router.get('/dish/:id', asyncErrorHandler(menuController.getDishById));

/**
 * @route POST /api/merchant/dish
 * @desc Create a new dish
 * @body {string} categoryId - Category ID (required, format: cat_[number])
 * @body {string} name - Dish name (required)
 * @body {string} description - Dish description (optional)
 * @body {number} price - Dish price (required, positive number)
 * @body {string} status - Dish status (optional, default: 'on')
 * @body {number} stock - Initial stock (optional, default: 0)
 * @body {string} imageUrl - Image URL (optional)
 * @body {Array} ingredients - Array of ingredients (optional)
 * @body {Array} allergens - Array of allergens (optional)
 * @body {number} preparationTime - Preparation time in minutes (optional)
 * @body {number} calories - Calorie count (optional)
 * @body {boolean} isSpicy - Spicy indicator (optional, default: false)
 * @body {boolean} isVegetarian - Vegetarian indicator (optional, default: false)
 * @access Public
 * @example POST /api/merchant/dish
 * Body: {
 *   "categoryId": "cat_1",
 *   "name": "Spicy Chicken Wings",
 *   "description": "Hot and crispy chicken wings",
 *   "price": 24.99,
 *   "ingredients": ["chicken", "spices", "sauce"],
 *   "isSpicy": true
 * }
 */
router.post('/dish', asyncErrorHandler(menuController.createDish));

/**
 * @route PUT /api/merchant/dish/:id
 * @desc Update an existing dish
 * @param {string} id - Dish ID (format: dish_[number])
 * @body {string} categoryId - Category ID (optional, format: cat_[number])
 * @body {string} name - Dish name (optional)
 * @body {string} description - Dish description (optional)
 * @body {number} price - Dish price (optional, positive number)
 * @body {string} status - Dish status (optional)
 * @body {number} stock - Stock amount (optional)
 * @body {string} imageUrl - Image URL (optional)
 * @body {Array} ingredients - Array of ingredients (optional)
 * @body {Array} allergens - Array of allergens (optional)
 * @body {number} preparationTime - Preparation time in minutes (optional)
 * @body {number} calories - Calorie count (optional)
 * @body {boolean} isSpicy - Spicy indicator (optional)
 * @body {boolean} isVegetarian - Vegetarian indicator (optional)
 * @access Public
 * @example PUT /api/merchant/dish/dish_1
 * Body: { "name": "Updated Dish Name", "price": 29.99 }
 */
router.put('/dish/:id', asyncErrorHandler(menuController.updateDish));

/**
 * @route DELETE /api/merchant/dish/:id
 * @desc Delete a dish (soft delete - sets status to 'off')
 * @param {string} id - Dish ID (format: dish_[number])
 * @access Public
 * @example DELETE /api/merchant/dish/dish_1
 */
router.delete('/dish/:id', asyncErrorHandler(menuController.deleteDish));

// ==================== DISH STATUS ROUTES ====================

/**
 * @route PUT /api/merchant/dish/:id/status
 * @desc Update dish status (on/off)
 * @param {string} id - Dish ID (format: dish_[number])
 * @body {string} status - New status ('on' or 'off')
 * @access Public
 * @example PUT /api/merchant/dish/dish_1/status
 * Body: { "status": "off" }
 */
router.put('/dish/:id/status', asyncErrorHandler(menuController.updateDishStatus));

/**
 * @route PUT /api/merchant/dishes/batch-status
 * @desc Update multiple dishes status in batch
 * @body {Array} dishIds - Array of dish IDs (format: dish_[number])
 * @body {string} status - New status for all dishes ('on' or 'off')
 * @access Public
 * @example PUT /api/merchant/dishes/batch-status
 * Body: {
 *   "dishIds": ["dish_1", "dish_2", "dish_3"],
 *   "status": "off"
 * }
 */
router.put('/dishes/batch-status', asyncErrorHandler(menuController.updateDishesStatusBatch));

// ==================== IMAGE UPLOAD ROUTES ====================

/**
 * @route POST /api/merchant/upload/dish-image
 * @desc Upload dish image (simulated)
 * @body {string} dishId - Dish ID (required, format: dish_[number])
 * @body {string} filename - Image filename (optional)
 * @body {string} mimetype - Image MIME type (optional)
 * @body {number} size - Image size in bytes (optional)
 * @access Public
 * @example POST /api/merchant/upload/dish-image
 * Body: {
 *   "dishId": "dish_1",
 *   "filename": "chicken_wings.jpg",
 *   "mimetype": "image/jpeg",
 *   "size": 1024000
 * }
 * @note This is a simulated upload endpoint for demo purposes
 */
router.post('/upload/dish-image', asyncErrorHandler(menuController.uploadDishImage));

// ==================== ROUTE DOCUMENTATION ====================

/**
 * @route GET /api/merchant/menu/docs
 * @desc Get menu API documentation
 * @access Public
 */
router.get('/menu/docs', (req, res) => {
  res.json({
    title: 'Menu Management API Documentation',
    version: '1.0.0',
    description: 'API endpoints for managing restaurant menu categories and dishes',
    baseUrl: '/api/merchant',
    endpoints: {
      categories: {
        'GET /categories': 'Get all categories with optional filtering',
        'POST /category': 'Create a new category',
        'PUT /category/:id': 'Update an existing category',
        'DELETE /category/:id': 'Delete a category (soft delete)',
        'PUT /categories/sort': 'Update categories sort order'
      },
      dishes: {
        'GET /dishes': 'Get all dishes with optional filtering',
        'GET /dish/:id': 'Get a single dish by ID',
        'POST /dish': 'Create a new dish',
        'PUT /dish/:id': 'Update an existing dish',
        'DELETE /dish/:id': 'Delete a dish (soft delete)',
        'PUT /dish/:id/status': 'Update dish status',
        'PUT /dishes/batch-status': 'Update multiple dishes status'
      },
      uploads: {
        'POST /upload/dish-image': 'Upload dish image (simulated)'
      }
    },
    examples: {
      createCategory: {
        method: 'POST',
        url: '/api/merchant/category',
        body: {
          name: 'Main Dishes',
          description: 'Traditional main course dishes',
          sortOrder: 1,
          isActive: true
        }
      },
      createDish: {
        method: 'POST',
        url: '/api/merchant/dish',
        body: {
          categoryId: 'cat_1',
          name: 'Kung Pao Chicken',
          description: 'Spicy stir-fried chicken with peanuts',
          price: 38.00,
          ingredients: ['chicken', 'peanuts', 'vegetables'],
          isSpicy: true,
          isVegetarian: false
        }
      }
    },
    responseFormat: {
      success: {
        data: '// Response data',
        meta: {
          message: 'Operation completed successfully',
          timestamp: '2024-11-13T03:30:00Z'
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
    }
  });
});

module.exports = router;
