/**
 * Inventory Routes
 * 
 * This module defines all routes for inventory management operations including
 * stock updates, low stock alerts, and inventory analytics. It connects HTTP
 * endpoints to controller methods and applies appropriate middleware.
 * 
 * Design decisions:
 * - Groups routes by functionality (stock management, alerts, analytics)
 * - Uses RESTful conventions with clear resource identification
 * - Provides comprehensive query parameter support
 * - Includes batch operations for efficiency
 */

const express = require('express');
const inventoryController = require('../controllers/inventory.controller');
const { asyncErrorHandler } = require('../middleware/error.middleware');

const router = express.Router();

// ==================== STOCK MANAGEMENT ROUTES ====================

/**
 * @route PUT /api/merchant/dish/:id/stock
 * @desc Update stock for a specific dish
 * @param {string} id - Dish ID (format: dish_[number])
 * @body {number} stock - New stock amount (required, non-negative integer)
 * @body {number} alertThreshold - Alert threshold (optional, non-negative integer)
 * @body {string} supplier - Supplier name (optional)
 * @body {number} cost - Cost per unit (optional, non-negative number)
 * @body {string} expiryDate - Expiry date in ISO format (optional)
 * @access Public
 * @example PUT /api/merchant/dish/dish_1/stock
 * Body: {
 *   "stock": 25,
 *   "alertThreshold": 5,
 *   "supplier": "Fresh Ingredients Co.",
 *   "cost": 15.50,
 *   "expiryDate": "2024-11-20T23:59:59Z"
 * }
 */
router.put('/dish/:id/stock', asyncErrorHandler(inventoryController.updateDishStock));

/**
 * @route POST /api/merchant/dish/:id/adjust-stock
 * @desc Adjust stock (add or subtract)
 * @param {string} id - Dish ID (format: dish_[number])
 * @body {number} adjustment - Adjustment amount (required, positive to add, negative to subtract)
 * @body {string} reason - Reason for adjustment (optional)
 * @access Public
 * @example POST /api/merchant/dish/dish_1/adjust-stock
 * Body: {
 *   "adjustment": -5,
 *   "reason": "Damaged items removed"
 * }
 */
router.post('/dish/:id/adjust-stock', asyncErrorHandler(inventoryController.adjustStock));

/**
 * @route PUT /api/merchant/inventory/batch-update
 * @desc Update stock for multiple dishes in batch
 * @body {Array} updates - Array of stock update objects
 * @body {string} updates[].dishId - Dish ID (required, format: dish_[number])
 * @body {number} updates[].stock - New stock amount (required, non-negative integer)
 * @body {number} updates[].alertThreshold - Alert threshold (optional)
 * @body {string} updates[].supplier - Supplier name (optional)
 * @body {number} updates[].cost - Cost per unit (optional)
 * @body {string} updates[].expiryDate - Expiry date (optional)
 * @access Public
 * @example PUT /api/merchant/inventory/batch-update
 * Body: [
 *   {
 *     "dishId": "dish_1",
 *     "stock": 30,
 *     "alertThreshold": 5,
 *     "cost": 15.50
 *   },
 *   {
 *     "dishId": "dish_2",
 *     "stock": 20,
 *     "alertThreshold": 3,
 *     "cost": 18.00
 *   }
 * ]
 */
router.put('/inventory/batch-update', asyncErrorHandler(inventoryController.batchUpdateStock));

// ==================== INVENTORY QUERY ROUTES ====================

/**
 * @route GET /api/merchant/inventory
 * @desc Get all inventory with optional filtering
 * @query {boolean} lowStock - Filter for low stock items
 * @query {boolean} outOfStock - Filter for out of stock items
 * @query {string} supplier - Filter by supplier name
 * @query {string} sortBy - Sort field (dishId, stock, alertThreshold, lastUpdated, supplier, cost, expiryDate)
 * @query {string} sortOrder - Sort direction (asc, desc)
 * @query {number} expiringWithinDays - Filter items expiring within specified days
 * @access Public
 * @example GET /api/merchant/inventory?lowStock=true&sortBy=stock&sortOrder=asc
 */
router.get('/inventory', asyncErrorHandler(inventoryController.getInventory));

/**
 * @route GET /api/merchant/dish/:id/inventory
 * @desc Get inventory for a specific dish
 * @param {string} id - Dish ID (format: dish_[number])
 * @access Public
 * @example GET /api/merchant/dish/dish_1/inventory
 */
router.get('/dish/:id/inventory', asyncErrorHandler(inventoryController.getDishInventory));

/**
 * @route GET /api/merchant/dishes/low-stock
 * @desc Get dishes with low stock
 * @query {number} threshold - Custom threshold for low stock (optional)
 * @access Public
 * @example GET /api/merchant/dishes/low-stock?threshold=10
 */
router.get('/dishes/low-stock', asyncErrorHandler(inventoryController.getLowStockDishes));

/**
 * @route GET /api/merchant/dishes/out-of-stock
 * @desc Get dishes that are out of stock
 * @access Public
 * @example GET /api/merchant/dishes/out-of-stock
 */
router.get('/dishes/out-of-stock', asyncErrorHandler(inventoryController.getOutOfStockDishes));

// ==================== ALERT MANAGEMENT ROUTES ====================

/**
 * @route PUT /api/merchant/dish/:id/alert-threshold
 * @desc Update alert threshold for a dish
 * @param {string} id - Dish ID (format: dish_[number])
 * @body {number} alertThreshold - New alert threshold (required, non-negative integer)
 * @access Public
 * @example PUT /api/merchant/dish/dish_1/alert-threshold
 * Body: { "alertThreshold": 10 }
 */
router.put('/dish/:id/alert-threshold', asyncErrorHandler(inventoryController.updateAlertThreshold));

// ==================== INVENTORY ANALYTICS ROUTES ====================

/**
 * @route GET /api/merchant/inventory/summary
 * @desc Get inventory summary statistics
 * @access Public
 * @example GET /api/merchant/inventory/summary
 * @returns {Object} Summary with total items, stock levels, value, and alerts
 */
router.get('/inventory/summary', asyncErrorHandler(inventoryController.getInventorySummary));

/**
 * @route GET /api/merchant/inventory/expiring
 * @desc Get items expiring within specified days
 * @query {number} days - Number of days to check for expiry (default: 7, max: 365)
 * @access Public
 * @example GET /api/merchant/inventory/expiring?days=3
 */
router.get('/inventory/expiring', asyncErrorHandler(inventoryController.getExpiringItems));

// ==================== INVENTORY SYNCHRONIZATION ROUTES ====================

/**
 * @route POST /api/merchant/inventory/sync
 * @desc Synchronize inventory with dishes (ensures all dishes have inventory entries)
 * @access Public
 * @example POST /api/merchant/inventory/sync
 * @returns {Object} Synchronization result with created/updated counts
 */
router.post('/inventory/sync', asyncErrorHandler(inventoryController.synchronizeInventory));

// ==================== ROUTE DOCUMENTATION ====================

/**
 * @route GET /api/merchant/inventory/docs
 * @desc Get inventory API documentation
 * @access Public
 */
router.get('/inventory/docs', (req, res) => {
  res.json({
    title: 'Inventory Management API Documentation',
    version: '1.0.0',
    description: 'API endpoints for managing restaurant inventory including stock levels, alerts, and analytics',
    baseUrl: '/api/merchant',
    endpoints: {
      stockManagement: {
        'PUT /dish/:id/stock': 'Update stock for a specific dish',
        'POST /dish/:id/adjust-stock': 'Adjust stock (add or subtract)',
        'PUT /inventory/batch-update': 'Update stock for multiple dishes in batch'
      },
      inventoryQueries: {
        'GET /inventory': 'Get all inventory with optional filtering',
        'GET /dish/:id/inventory': 'Get inventory for a specific dish',
        'GET /dishes/low-stock': 'Get dishes with low stock',
        'GET /dishes/out-of-stock': 'Get dishes that are out of stock'
      },
      alertManagement: {
        'PUT /dish/:id/alert-threshold': 'Update alert threshold for a dish'
      },
      analytics: {
        'GET /inventory/summary': 'Get inventory summary statistics',
        'GET /inventory/expiring': 'Get items expiring within specified days'
      },
      synchronization: {
        'POST /inventory/sync': 'Synchronize inventory with dishes'
      }
    },
    examples: {
      updateStock: {
        method: 'PUT',
        url: '/api/merchant/dish/dish_1/stock',
        body: {
          stock: 25,
          alertThreshold: 5,
          supplier: 'Fresh Ingredients Co.',
          cost: 15.50,
          expiryDate: '2024-11-20T23:59:59Z'
        }
      },
      adjustStock: {
        method: 'POST',
        url: '/api/merchant/dish/dish_1/adjust-stock',
        body: {
          adjustment: -3,
          reason: 'Items sold during lunch rush'
        }
      },
      batchUpdate: {
        method: 'PUT',
        url: '/api/merchant/inventory/batch-update',
        body: [
          {
            dishId: 'dish_1',
            stock: 30,
            alertThreshold: 5
          },
          {
            dishId: 'dish_2',
            stock: 20,
            alertThreshold: 3
          }
        ]
      }
    },
    queryParameters: {
      inventoryFilters: {
        lowStock: 'boolean - Filter for low stock items',
        outOfStock: 'boolean - Filter for out of stock items',
        supplier: 'string - Filter by supplier name',
        sortBy: 'string - Sort field (dishId, stock, alertThreshold, lastUpdated, supplier, cost, expiryDate)',
        sortOrder: 'string - Sort direction (asc, desc)',
        expiringWithinDays: 'number - Filter items expiring within specified days (1-365)'
      },
      lowStockFilters: {
        threshold: 'number - Custom threshold for low stock determination'
      },
      expiringFilters: {
        days: 'number - Number of days to check for expiry (default: 7, max: 365)'
      }
    },
    responseFormat: {
      success: {
        data: '// Response data (inventory items, summary, etc.)',
        meta: {
          total: '// Total number of items (for list endpoints)',
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
    },
    businessRules: {
      stockUpdates: [
        'Stock values must be non-negative integers',
        'Alert thresholds must be non-negative integers',
        'Expiry dates must be in the future',
        'Cost values must be non-negative numbers'
      ],
      stockAdjustments: [
        'Adjustments cannot result in negative stock',
        'Negative adjustments represent stock reduction',
        'Positive adjustments represent stock addition',
        'Reason field is optional but recommended for audit trail'
      ],
      alerts: [
        'Low stock alerts trigger when stock <= alert threshold',
        'Out of stock alerts trigger when stock = 0',
        'Alert thresholds can be customized per dish',
        'Default alert threshold is 5 units'
      ]
    }
  });
});

module.exports = router;
