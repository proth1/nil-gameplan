import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Import route modules
import authRoutes from './routes/auth.js'
import contentRoutes from './routes/content.js'
import alertsRoutes from './routes/alerts.js'
import trendsRoutes from './routes/trends.js'
import stateRoutes from './routes/states.js'
import dealsRoutes from './routes/deals.js'
import sourcesRoutes from './routes/sources.js'
import dashboardRoutes from './routes/dashboard.js'
import analyticsRoutes from './routes/analytics.js'
import searchRoutes from './routes/search.js'

// Import middleware
import { authMiddleware } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './utils/logger.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Initialize Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.SUPABASE_URL]
    }
  }
}))

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://nilpulse.com', 'https://www.nilpulse.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
})

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // strict limit for sensitive endpoints
  message: 'Rate limit exceeded for sensitive operation',
  standardHeaders: true,
  legacyHeaders: false
})

app.use('/api/', limiter)

// General middleware
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API routes with versioning
const API_PREFIX = '/api/v1'

// Authentication routes (public)
app.use(`${API_PREFIX}/auth`, authRoutes)

// Protected routes - require authentication
app.use(`${API_PREFIX}/dashboard`, authMiddleware, dashboardRoutes)
app.use(`${API_PREFIX}/content`, authMiddleware, contentRoutes)
app.use(`${API_PREFIX}/alerts`, authMiddleware, alertsRoutes)
app.use(`${API_PREFIX}/trends`, authMiddleware, trendsRoutes)
app.use(`${API_PREFIX}/states`, authMiddleware, stateRoutes)
app.use(`${API_PREFIX}/deals`, authMiddleware, dealsRoutes)
app.use(`${API_PREFIX}/search`, authMiddleware, searchRoutes)
app.use(`${API_PREFIX}/analytics`, authMiddleware, analyticsRoutes)

// Admin-only routes
app.use(`${API_PREFIX}/sources`, authMiddleware, strictLimiter, sourcesRoutes)

// API documentation endpoint
app.get(`${API_PREFIX}/docs`, (req, res) => {
  res.json({
    name: 'NIL Pulse API',
    version: '1.0.0',
    description: 'Real-time NIL intelligence platform API',
    endpoints: {
      authentication: {
        'POST /auth/login': 'User login',
        'POST /auth/logout': 'User logout',
        'GET /auth/me': 'Get current user info'
      },
      dashboard: {
        'GET /dashboard/summary': 'Get dashboard summary data',
        'GET /dashboard/pulse': 'Get real-time pulse data'
      },
      content: {
        'GET /content': 'Get NIL content with filtering',
        'GET /content/:id': 'Get specific content item',
        'POST /content': 'Create new content (admin)',
        'PUT /content/:id': 'Update content (admin)',
        'DELETE /content/:id': 'Delete content (admin)'
      },
      alerts: {
        'GET /alerts': 'Get user alerts',
        'POST /alerts': 'Create new alert',
        'PUT /alerts/:id': 'Update alert',
        'DELETE /alerts/:id': 'Delete alert',
        'GET /alerts/:id/deliveries': 'Get alert delivery history'
      },
      trends: {
        'GET /trends': 'Get trend analysis',
        'GET /trends/hot': 'Get hot topics',
        'GET /trends/velocity': 'Get velocity trends',
        'GET /trends/gaps': 'Get market gaps analysis'
      },
      states: {
        'GET /states': 'Get all state laws',
        'GET /states/:code': 'Get specific state law',
        'GET /states/:code/timeline': 'Get state law timeline'
      },
      deals: {
        'GET /deals': 'Get NIL deals with filtering',
        'GET /deals/leaderboard': 'Get deal leaderboard',
        'GET /deals/:id': 'Get specific deal',
        'POST /deals': 'Create new deal (admin)'
      },
      search: {
        'GET /search': 'Search content with natural language',
        'GET /search/autocomplete': 'Get search suggestions'
      },
      analytics: {
        'GET /analytics/overview': 'Get analytics overview',
        'GET /analytics/export': 'Export analytics data'
      }
    }
  })
})

// Catch 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  })
})

// Global error handler
app.use(errorHandler)

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
    process.exit(0)
  })
})

// Start server
const server = app.listen(PORT, () => {
  logger.info(`NIL Pulse API server running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`API Documentation: http://localhost:${PORT}${API_PREFIX}/docs`)
})

export default app