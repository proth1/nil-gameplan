import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
}

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
}

winston.addColors(colors)

// Custom format for logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    if (info.stack) {
      return `${info.timestamp} ${info.level}: ${info.message}\n${info.stack}`
    }
    return `${info.timestamp} ${info.level}: ${info.message}`
  })
)

// Custom format for file logs (no colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info) => {
    if (typeof info.message === 'object') {
      info.message = JSON.stringify(info.message, null, 2)
    }
    if (info.stack) {
      return `${info.timestamp} ${info.level}: ${info.message}\n${info.stack}`
    }
    return `${info.timestamp} ${info.level}: ${info.message}`
  })
)

// Define which transports to use based on environment
const transports = []

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: customFormat
    })
  )
} else {
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  )
}

// File transports for all environments
const logsDir = path.join(__dirname, '../../logs')

// Error logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true
  })
)

// Combined logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true
  })
)

// HTTP logs for API requests
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    format: fileFormat,
    maxSize: '20m',
    maxFiles: '7d',
    zippedArchive: true
  })
)

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'stack'] })
  ),
  transports,
  exitOnError: false
})

// Add structured logging methods
logger.logError = (message, error, context = {}) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...context
  })
}

logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous'
  }

  if (res.statusCode >= 400) {
    logger.warn('HTTP Error', logData)
  } else {
    logger.http('HTTP Request', logData)
  }
}

logger.logActivity = (action, userId, context = {}) => {
  logger.info('User Activity', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...context
  })
}

logger.logSecurityEvent = (event, userId, context = {}) => {
  logger.warn('Security Event', {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ip: context.ip,
    userAgent: context.userAgent,
    ...context
  })
}

logger.logPerformance = (operation, duration, context = {}) => {
  const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug'
  logger[level]('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...context
  })
}

// Stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim())
  }
}

export default logger