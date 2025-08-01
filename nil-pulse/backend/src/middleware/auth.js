import jwt from 'jsonwebtoken'
import { supabase } from '../server.js'
import { logger } from '../utils/logger.js'

/**
 * Authentication middleware for protected routes
 * Validates JWT tokens and user sessions
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authorization header provided',
        code: 'NO_AUTH_HEADER'
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      logger.warn(`Authentication failed: ${error?.message || 'No user found'}`)
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      })
    }

    // Get user profile with role information
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      logger.warn(`User profile not found for user ${user.id}`)
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User profile not found',
        code: 'NO_PROFILE'
      })
    }

    if (!profile.is_active) {
      logger.warn(`Inactive user attempted access: ${user.id}`)
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is inactive',
        code: 'ACCOUNT_INACTIVE'
      })
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      access_level: profile.access_level,
      name: profile.name,
      profile: profile
    }

    next()
  } catch (error) {
    logger.error('Authentication middleware error:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    })
  }
}

/**
 * Admin-only middleware
 * Requires user to have admin role
 */
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    })
  }

  if (req.user.role !== 'admin') {
    logger.warn(`Non-admin user attempted admin access: ${req.user.id} (${req.user.role})`)
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin privileges required',
      code: 'ADMIN_REQUIRED'
    })
  }

  next()
}

/**
 * Role-based access middleware
 * Allows access to users with specified roles
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Insufficient role for access: ${req.user.id} (${req.user.role}) attempted ${allowedRoles.join(', ')} access`)
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access requires one of: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_ROLE'
      })
    }

    next()
  }
}

/**
 * Access level middleware
 * Allows access based on subscription/access level
 */
export const requireAccessLevel = (minLevel) => {
  const levelHierarchy = {
    'standard': 1,
    'premium': 2,
    'enterprise': 3
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      })
    }

    const userLevel = levelHierarchy[req.user.access_level] || 0
    const requiredLevel = levelHierarchy[minLevel] || 1

    if (userLevel < requiredLevel) {
      logger.warn(`Insufficient access level: ${req.user.id} (${req.user.access_level}) needs ${minLevel}`)
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access requires ${minLevel} subscription or higher`,
        code: 'INSUFFICIENT_ACCESS_LEVEL'
      })
    }

    next()
  }
}

/**
 * Rate limiting by user ID
 * Additional rate limiting based on user activity
 */
export const userRateLimit = (maxRequests, windowMs) => {
  const userRequests = new Map()

  return (req, res, next) => {
    if (!req.user) {
      return next()
    }

    const userId = req.user.id
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean old entries
    if (userRequests.has(userId)) {
      const requests = userRequests.get(userId).filter(time => time > windowStart)
      userRequests.set(userId, requests)
    } else {
      userRequests.set(userId, [])
    }

    const requests = userRequests.get(userId)

    if (requests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded: ${maxRequests} requests per ${windowMs}ms`,
        code: 'USER_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((requests[0] + windowMs - now) / 1000)
      })
    }

    requests.push(now)
    next()
  }
}