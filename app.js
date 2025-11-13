/**
 * Express Application Configuration
 * 
 * This file configures the Express application with all necessary middleware,
 * routes, and error handling. It sets up the core application structure
 * for the M17 Merchant Management API.
 * 
 * Design decisions:
 * - Uses modular route organization for better maintainability
 * - Implements comprehensive middleware stack for security and logging
 * - Provides consistent error handling and response formatting
 * - Includes CORS support for cross-origin requests
 * - Implements request logging with Morgan and Winston
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const winston = require('winston');
const path = require('path');

// Import routes
const menuRoutes = require('./routes/menu.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const reportsRoutes = require('./routes/reports.routes');

// Import middleware
const { errorHandler, requestIdMiddleware } = require('./middleware/error.middleware');
const { notFoundHandler, apiInfoHandler } = require('./middleware/notfound.middleware');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs/app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Create Express application
const app = express();

// ==================== MIDDLEWARE CONFIGURATION ====================

// Trust proxy (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// Request ID middleware (must be first)
app.use(requestIdMiddleware);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Request logging with Morgan
const morganFormat = process.env.NODE_ENV === 'production' 
  ? 'combined' 
  : ':method :url :status :res[content-length] - :response-time ms';

app.use(morgan(morganFormat, {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  },
  skip: (req, res) => {
    // Skip logging for health checks in production
    return process.env.NODE_ENV === 'production' && req.path === '/health';
  }
}));

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  
  // Log request start
  logger.info('Request started', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - req.startTime;
    
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: JSON.stringify(data).length
    });
    
    return originalJson.call(this, data);
  };
  
  next();
});

// ==================== ROUTE CONFIGURATION ====================

// API info (before other routes)
app.use(apiInfoHandler);

// API routes with versioning
app.use('/api/merchant', menuRoutes);
app.use('/api/merchant', inventoryRoutes);
app.use('/api/merchant', reportsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'M17 Merchant Management API',
    version: '1.0.0',
    description: 'REST API for merchant management operations including menu, inventory, and reports',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      api: '/api',
      menu: '/api/merchant/categories, /api/merchant/dishes',
      inventory: '/api/merchant/inventory, /api/merchant/dishes/low-stock',
      reports: '/api/merchant/orders/statistics, /api/merchant/reports/export'
    },
    documentation: {
      menu: '/api/merchant/menu/docs',
      inventory: '/api/merchant/inventory/docs',
      reports: '/api/merchant/reports/docs'
    }
  });
});

// API version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    apiVersion: 'v1',
    buildDate: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ==================== GRACEFUL SHUTDOWN ====================

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Close server
  if (app.server) {
    app.server.close((err) => {
      if (err) {
        logger.error('Error during server shutdown:', err);
        process.exit(1);
      }
      
      logger.info('Server closed successfully');
      
      // Close database connections, cleanup resources, etc.
      // In this case, we're using file-based storage, so no cleanup needed
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// ==================== APPLICATION METADATA ====================

// Add application metadata
app.locals = {
  title: 'M17 Merchant Management API',
  version: '1.0.0',
  description: 'REST API for merchant management operations',
  author: 'Development Team',
  license: 'MIT',
  repository: 'https://github.com/company/m17-merchant-management',
  documentation: 'https://api-docs.company.com/m17-merchant-management',
  support: 'support@company.com'
};

// Export the Express application
module.exports = app;
