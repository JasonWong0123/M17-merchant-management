/**
 * Server Entry Point
 * 
 * This file starts the HTTP server and handles server-level configuration.
 * It imports the Express application and starts listening on the specified port.
 * 
 * Design decisions:
 * - Separates server startup from application configuration
 * - Provides flexible port configuration via environment variables
 * - Implements proper error handling for server startup
 * - Includes server monitoring and health checks
 * - Supports graceful shutdown procedures
 */

const app = require('./app');
const winston = require('winston');
const path = require('path');

// Configure logger for server operations
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

// ==================== SERVER CONFIGURATION ====================

// Server configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate environment
if (!PORT || isNaN(PORT) || PORT < 1 || PORT > 65535) {
  logger.error('Invalid PORT configuration. PORT must be a number between 1 and 65535');
  process.exit(1);
}

// ==================== SERVER STARTUP ====================

/**
 * Start the HTTP server
 */
const startServer = () => {
  try {
    const server = app.listen(PORT, HOST, () => {
      logger.info('='.repeat(50));
      logger.info('🚀 M17 Merchant Management API Server Started');
      logger.info('='.repeat(50));
      logger.info(`📍 Server running on: http://${HOST}:${PORT}`);
      logger.info(`🌍 Environment: ${NODE_ENV}`);
      logger.info(`📅 Started at: ${new Date().toISOString()}`);
      logger.info(`🔧 Node.js version: ${process.version}`);
      logger.info(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
      logger.info('='.repeat(50));
      logger.info('📋 Available endpoints:');
      logger.info(`   • Health Check: http://${HOST}:${PORT}/health`);
      logger.info(`   • API Info: http://${HOST}:${PORT}/api`);
      logger.info(`   • Menu Management: http://${HOST}:${PORT}/api/merchant/categories`);
      logger.info(`   • Inventory Management: http://${HOST}:${PORT}/api/merchant/inventory`);
      logger.info(`   • Reports & Analytics: http://${HOST}:${PORT}/api/merchant/orders/statistics`);
      logger.info('='.repeat(50));
      logger.info('📖 Documentation:');
      logger.info(`   • Menu API: http://${HOST}:${PORT}/api/merchant/menu/docs`);
      logger.info(`   • Inventory API: http://${HOST}:${PORT}/api/merchant/inventory/docs`);
      logger.info(`   • Reports API: http://${HOST}:${PORT}/api/merchant/reports/docs`);
      logger.info('='.repeat(50));
      
      if (NODE_ENV === 'development') {
        logger.info('🔧 Development mode features:');
        logger.info('   • Detailed error messages');
        logger.info('   • Request/response logging');
        logger.info('   • Hot reload support');
        logger.info('='.repeat(50));
      }
    });

    // Store server reference for graceful shutdown
    app.server = server;

    // Server error handling
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        case 'ENOTFOUND':
          logger.error(`Host ${HOST} not found`);
          process.exit(1);
          break;
        default:
          logger.error('Server error:', error);
          throw error;
      }
    });

    // Handle server close
    server.on('close', () => {
      logger.info('Server closed');
    });

    // Handle client connections
    server.on('connection', (socket) => {
      logger.debug('New client connection established');
      
      socket.on('close', () => {
        logger.debug('Client connection closed');
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ==================== HEALTH MONITORING ====================

/**
 * Monitor server health and performance
 */
const startHealthMonitoring = () => {
  const monitoringInterval = 60000; // 1 minute
  
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    logger.debug('Server health check:', {
      uptime: `${Math.floor(uptime / 60)} minutes`,
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`
      },
      cpu: process.cpuUsage(),
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    });
    
    // Alert if memory usage is high (over 500MB)
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) {
      logger.warn('High memory usage detected:', {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      });
    }
  }, monitoringInterval);
};

// ==================== ENVIRONMENT VALIDATION ====================

/**
 * Validate required environment variables and configuration
 */
const validateEnvironment = () => {
  logger.info('Validating environment configuration...');
  
  const requiredDirs = ['logs', 'data'];
  const fs = require('fs');
  
  // Create required directories if they don't exist
  requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
  
  // Validate data files exist
  const requiredDataFiles = [
    'categories.json',
    'dishes.json',
    'inventory.json',
    'orders.stats.json',
    'promotions.stats.json',
    'reviews.stats.json'
  ];
  
  const dataDir = path.join(__dirname, 'data');
  const missingFiles = requiredDataFiles.filter(file => {
    return !fs.existsSync(path.join(dataDir, file));
  });
  
  if (missingFiles.length > 0) {
    logger.warn('Missing data files:', missingFiles);
    logger.info('The application will create default data files on first run');
  }
  
  logger.info('Environment validation completed');
};

// ==================== STARTUP SEQUENCE ====================

/**
 * Main startup sequence
 */
const main = async () => {
  try {
    logger.info('Starting M17 Merchant Management API...');
    
    // Validate environment
    validateEnvironment();
    
    // Start server
    const server = startServer();
    
    // Start health monitoring in development
    if (NODE_ENV === 'development') {
      startHealthMonitoring();
    }
    
    // Log successful startup
    logger.info('Server startup completed successfully');
    
    return server;
  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
};

// ==================== DEVELOPMENT HELPERS ====================

// Development mode helpers
if (NODE_ENV === 'development') {
  // Log unhandled promise rejections in development
  process.on('unhandledRejection', (reason, promise) => {
    logger.warn('Unhandled Promise Rejection:', {
      reason: reason,
      promise: promise
    });
  });
  
  // Log uncaught exceptions in development
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
  });
}

// ==================== EXPORT AND STARTUP ====================

// Start the server if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error during startup:', error);
    process.exit(1);
  });
}

// Export for testing purposes
module.exports = {
  startServer,
  validateEnvironment,
  PORT,
  HOST
};
