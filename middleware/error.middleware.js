/**
 * Error Middleware
 * 
 * This middleware handles all errors that occur in the application, providing
 * consistent error responses and logging. It catches both synchronous and
 * asynchronous errors and formats them appropriately.
 * 
 * Design decisions:
 * - Provides consistent error response format across all endpoints
 * - Logs errors with appropriate severity levels
 * - Handles different types of errors (validation, business logic, system)
 * - Sanitizes error messages in production to avoid information leakage
 * - Includes request context for better debugging
 */

const winston = require('winston');
const path = require('path');

// Configure logger for error middleware
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/app.log'),
      level: 'error'
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Main error handling middleware
 * This should be the last middleware in the chain
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Log error with request context
  const errorContext = {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    timestamp: new Date().toISOString()
  };

  logger.error('Application error occurred:', errorContext);

  // Determine error type and status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An internal server error occurred';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.details || err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_FORMAT';
    message = 'Invalid data format';
    details = `Invalid ${err.path}: ${err.value}`;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Access denied';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = 'Resource conflict';
  } else if (err.name === 'TooManyRequestsError') {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests';
  } else if (err.code === 'ENOENT') {
    statusCode = 404;
    errorCode = 'FILE_NOT_FOUND';
    message = 'File not found';
  } else if (err.code === 'EACCES') {
    statusCode = 403;
    errorCode = 'ACCESS_DENIED';
    message = 'Access denied';
  } else if (err.code === 'EMFILE' || err.code === 'ENFILE') {
    statusCode = 503;
    errorCode = 'SERVICE_UNAVAILABLE';
    message = 'Service temporarily unavailable';
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Invalid JSON format';
    details = 'Request body contains invalid JSON';
  }

  // Handle custom application errors
  if (err.statusCode) {
    statusCode = err.statusCode;
  }
  if (err.code && typeof err.code === 'string') {
    errorCode = err.code;
  }
  if (err.message && statusCode < 500) {
    message = err.message;
  }

  // In production, don't expose internal error details
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && statusCode >= 500) {
    details = null;
    message = 'An internal server error occurred';
  } else if (!isProduction) {
    details = details || err.message;
  }

  // Construct error response
  const errorResponse = {
    error: {
      code: errorCode,
      message: message,
      ...(details && { details: details }),
      timestamp: new Date().toISOString(),
      requestId: req.id || generateRequestId()
    }
  };

  // Add stack trace in development
  if (!isProduction && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Creates custom error classes for different error types
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Generates a unique request ID for error tracking
 * @returns {string} Unique request ID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Request ID middleware
 * Adds a unique ID to each request for tracking
 */
const requestIdMiddleware = (req, res, next) => {
  req.id = generateRequestId();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Unhandled promise rejection handler
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString()
  });
  
  // In production, you might want to gracefully shutdown
  if (process.env.NODE_ENV === 'production') {
    console.error('Unhandled Promise Rejection. Shutting down gracefully...');
    process.exit(1);
  }
});

/**
 * Uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    timestamp: new Date().toISOString()
  });
  
  console.error('Uncaught Exception. Shutting down...');
  process.exit(1);
});

module.exports = {
  errorHandler,
  asyncErrorHandler,
  requestIdMiddleware,
  
  // Custom error classes
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError
};
