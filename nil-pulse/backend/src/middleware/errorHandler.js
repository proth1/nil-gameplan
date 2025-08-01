import { logger } from '../utils/logger.js'

/**
 * Global error handling middleware
 * Catches and formats all application errors
 */
export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous'
  })

  // Don't log password in request body
  const sanitizedBody = { ...req.body }
  if (sanitizedBody.password) {
    sanitizedBody.password = '[REDACTED]'
  }

  // Default error response
  let statusCode = 500
  let errorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || generateRequestId()
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400
    errorResponse = {
      error: 'Validation Error',
      message: err.message,
      code: 'VALIDATION_ERROR',
      details: err.details || null,
      timestamp: new Date().toISOString()
    }
  } else if (err.name === 'UnauthorizedError' || err.status === 401) {
    statusCode = 401
    errorResponse = {
      error: 'Unauthorized',
      message: 'Authentication required',
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    }
  } else if (err.name === 'ForbiddenError' || err.status === 403) {
    statusCode = 403
    errorResponse = {
      error: 'Forbidden',
      message: 'Insufficient permissions',
      code: 'FORBIDDEN',
      timestamp: new Date().toISOString()
    }
  } else if (err.name === 'NotFoundError' || err.status === 404) {
    statusCode = 404
    errorResponse = {
      error: 'Not Found',
      message: err.message || 'Resource not found',
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    }
  } else if (err.name === 'ConflictError' || err.status === 409) {
    statusCode = 409
    errorResponse = {
      error: 'Conflict',
      message: err.message,
      code: 'CONFLICT',
      timestamp: new Date().toISOString()
    }
  } else if (err.name === 'TooManyRequestsError' || err.status === 429) {
    statusCode = 429
    errorResponse = {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: err.retryAfter || 60,
      timestamp: new Date().toISOString()
    }
  } else if (err.name === 'PayloadTooLargeError' || err.status === 413) {
    statusCode = 413
    errorResponse = {
      error: 'Payload Too Large',
      message: 'Request payload exceeds size limit',
      code: 'PAYLOAD_TOO_LARGE',
      timestamp: new Date().toISOString()
    }
  }

  // Handle Supabase errors
  if (err.code && err.code.startsWith('23')) { // PostgreSQL error codes
    if (err.code === '23505') { // Unique violation
      statusCode = 409
      errorResponse = {
        error: 'Conflict',
        message: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
        timestamp: new Date().toISOString()
      }
    } else if (err.code === '23503') { // Foreign key violation
      statusCode = 400
      errorResponse = {
        error: 'Bad Request',
        message: 'Referenced resource does not exist',
        code: 'INVALID_REFERENCE',
        timestamp: new Date().toISOString()
      }
    } else if (err.code === '23502') { // Not null violation
      statusCode = 400
      errorResponse = {
        error: 'Bad Request',
        message: 'Required field is missing',
        code: 'MISSING_REQUIRED_FIELD',
        timestamp: new Date().toISOString()
      }
    }
  }

  // Handle Joi validation errors
  if (err.isJoi) {
    statusCode = 400
    errorResponse = {
      error: 'Validation Error',
      message: 'Invalid request data',
      code: 'VALIDATION_ERROR',
      details: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      })),
      timestamp: new Date().toISOString()
    }
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400
    errorResponse = {
      error: 'Bad Request',
      message: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
      timestamp: new Date().toISOString()
    }
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.message = 'An unexpected error occurred'
    delete errorResponse.stack
  } else if (process.env.NODE_ENV !== 'production') {
    // Include stack trace in development
    errorResponse.stack = err.stack
    errorResponse.details = {
      ...errorResponse.details,
      originalError: err.message
    }
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * Async error wrapper for route handlers
 * Automatically catches and forwards async errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Create a custom error with status code
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.status = statusCode < 500 ? 'fail' : 'error'
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Create a validation error
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    this.details = details
  }
}

/**
 * Create a not found error
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

/**
 * Create an unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

/**
 * Create a forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}