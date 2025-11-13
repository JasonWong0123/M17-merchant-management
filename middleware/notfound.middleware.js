/**
 * Not Found Middleware
 * 
 * This middleware handles requests to undefined routes and provides
 * consistent 404 responses. It should be placed after all route definitions
 * but before the error handling middleware.
 * 
 * Design decisions:
 * - Provides helpful error messages with available endpoints
 * - Logs 404 requests for monitoring and debugging
 * - Returns consistent JSON response format
 * - Includes suggestions for similar routes when possible
 */

const winston = require('winston');
const path = require('path');

// Configure logger for 404 middleware
const logger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../logs/app.log') })
  ]
});

/**
 * Available API endpoints for suggestions
 * This would typically be generated dynamically from route definitions
 */
const availableEndpoints = [
  // Category endpoints
  'GET /api/merchant/categories',
  'POST /api/merchant/category',
  'PUT /api/merchant/category/:id',
  'DELETE /api/merchant/category/:id',
  'PUT /api/merchant/categories/sort',
  
  // Dish endpoints
  'GET /api/merchant/dishes',
  'GET /api/merchant/dish/:id',
  'POST /api/merchant/dish',
  'PUT /api/merchant/dish/:id',
  'DELETE /api/merchant/dish/:id',
  'PUT /api/merchant/dish/:id/status',
  'PUT /api/merchant/dishes/batch-status',
  'POST /api/merchant/upload/dish-image',
  
  // Inventory endpoints
  'PUT /api/merchant/dish/:id/stock',
  'GET /api/merchant/dishes/low-stock',
  'GET /api/merchant/dishes/out-of-stock',
  'GET /api/merchant/dish/:id/inventory',
  'GET /api/merchant/inventory',
  'PUT /api/merchant/inventory/batch-update',
  'POST /api/merchant/dish/:id/adjust-stock',
  'PUT /api/merchant/dish/:id/alert-threshold',
  'GET /api/merchant/inventory/summary',
  'POST /api/merchant/inventory/sync',
  'GET /api/merchant/inventory/expiring',
  
  // Reports endpoints
  'GET /api/merchant/orders/statistics',
  'GET /api/merchant/promotions/statistics',
  'GET /api/merchant/promotion/:promotionId/analytics',
  'GET /api/merchant/reviews/statistics',
  'GET /api/merchant/reports/export',
  'POST /api/merchant/analytics/custom',
  'GET /api/merchant/dashboard/summary',
  'GET /api/merchant/performance/metrics',
  'GET /api/merchant/trends/analysis'
];

/**
 * Calculates string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1, where 1 is identical)
 */
const calculateSimilarity = (str1, str2) => {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  // Initialize matrix
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
};

/**
 * Finds similar endpoints based on the requested path
 * @param {string} requestedPath - The path that was requested
 * @param {string} method - HTTP method
 * @returns {Array} Array of similar endpoints
 */
const findSimilarEndpoints = (requestedPath, method) => {
  const requestedEndpoint = `${method} ${requestedPath}`;
  const similarities = availableEndpoints.map(endpoint => ({
    endpoint,
    similarity: calculateSimilarity(requestedEndpoint.toLowerCase(), endpoint.toLowerCase())
  }));

  // Return top 3 most similar endpoints with similarity > 0.3
  return similarities
    .filter(item => item.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map(item => item.endpoint);
};

/**
 * Categorizes endpoints by functionality
 * @returns {Object} Categorized endpoints
 */
const getCategorizedEndpoints = () => {
  return {
    'Menu Management': availableEndpoints.filter(endpoint => 
      endpoint.includes('/categories') || 
      endpoint.includes('/category') || 
      endpoint.includes('/dishes') || 
      endpoint.includes('/dish')
    ),
    'Inventory Management': availableEndpoints.filter(endpoint => 
      endpoint.includes('/stock') || 
      endpoint.includes('/inventory') || 
      endpoint.includes('/low-stock') || 
      endpoint.includes('/adjust-stock')
    ),
    'Reports & Analytics': availableEndpoints.filter(endpoint => 
      endpoint.includes('/statistics') || 
      endpoint.includes('/analytics') || 
      endpoint.includes('/reports') || 
      endpoint.includes('/dashboard') || 
      endpoint.includes('/performance') || 
      endpoint.includes('/trends')
    )
  };
};

/**
 * Main 404 middleware function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  const requestedPath = req.originalUrl || req.url;
  const method = req.method;
  
  // Log the 404 request
  logger.warn('404 Not Found:', {
    method: method,
    path: requestedPath,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    headers: req.headers
  });

  // Find similar endpoints
  const similarEndpoints = findSimilarEndpoints(requestedPath, method);
  
  // Prepare response
  const response = {
    error: {
      code: 'NOT_FOUND',
      message: `The requested endpoint '${method} ${requestedPath}' was not found`,
      details: `The endpoint you are trying to access does not exist on this server`,
      timestamp: new Date().toISOString(),
      requestId: req.id || `req_${Date.now()}`
    }
  };

  // Add suggestions if similar endpoints found
  if (similarEndpoints.length > 0) {
    response.suggestions = {
      message: 'Did you mean one of these endpoints?',
      endpoints: similarEndpoints
    };
  } else {
    // If no similar endpoints, provide categorized list
    response.availableEndpoints = {
      message: 'Here are the available endpoints organized by category:',
      categories: getCategorizedEndpoints()
    };
  }

  // Add API documentation link
  response.help = {
    message: 'For complete API documentation, please refer to the API guide',
    documentation: '/api/docs', // This would be your API documentation endpoint
    contact: 'For support, please contact the development team'
  };

  // Set appropriate headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Request-ID', req.id || `req_${Date.now()}`);
  
  // Send 404 response
  res.status(404).json(response);
};

/**
 * Health check endpoint middleware - REMOVED
 * Health checks should be handled by infrastructure/orchestration layer
 */

/**
 * API info endpoint middleware
 * Provides basic API information
 */
const apiInfoHandler = (req, res, next) => {
  if (req.path === '/api' || req.path === '/api/') {
    return res.status(200).json({
      service: 'M17 Merchant Management API',
      version: '1.0.0',
      description: 'REST API for merchant management operations including menu, inventory, and reports',
      endpoints: {
        categories: '/api/merchant/categories',
        dishes: '/api/merchant/dishes',
        inventory: '/api/merchant/inventory',
        reports: '/api/merchant/reports',
        statistics: '/api/merchant/orders/statistics'
      },
      documentation: '/api/docs',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

module.exports = {
  notFoundHandler,
  apiInfoHandler,
  
  // Utility functions (exported for testing)
  calculateSimilarity,
  findSimilarEndpoints,
  getCategorizedEndpoints
};
