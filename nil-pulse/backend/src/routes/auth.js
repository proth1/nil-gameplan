import express from 'express'
import { supabase } from '../server.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authMiddleware } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * POST /api/v1/auth/login
 * User login with email and password
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Email and password are required'
    })
  }

  // Authenticate with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    logger.logSecurityEvent('login_failed', email, {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
    
    return res.status(401).json({
      success: false,
      error: 'Authentication Failed',
      message: 'Invalid email or password'
    })
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    logger.error('User profile not found after login:', profileError)
    return res.status(500).json({
      success: false,
      error: 'Profile Error',
      message: 'User profile not found'
    })
  }

  if (!profile.is_active) {
    logger.logSecurityEvent('inactive_user_login_attempt', data.user.id, {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
    
    return res.status(403).json({
      success: false,
      error: 'Account Inactive',
      message: 'Your account has been deactivated. Please contact support.'
    })
  }

  // Log successful login
  logger.logActivity('user_login', data.user.id, {
    email,
    role: profile.role,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Update last login
  await supabase
    .from('user_profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', data.user.id)

  res.json({
    success: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile.name,
        role: profile.role,
        access_level: profile.access_level,
        last_login: profile.last_login
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    }
  })
}))

/**
 * POST /api/v1/auth/logout
 * User logout
 */
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    logger.error('Logout error:', error)
    return res.status(500).json({
      success: false,
      error: 'Logout Error',
      message: 'Failed to log out'
    })
  }

  logger.logActivity('user_logout', req.user.id, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  res.json({
    success: true,
    message: 'Logged out successfully'
  })
}))

/**
 * GET /api/v1/auth/me
 * Get current user information
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  // Get fresh profile data
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', req.user.id)
    .single()

  if (error) {
    logger.error('Failed to get user profile:', error)
    throw new Error('Failed to get user profile')
  }

  // Get user's alert count
  const { data: alerts } = await supabase
    .from('nil_user_alerts')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('is_active', true)

  // Get recent activity stats
  const { data: recentActivity } = await supabase
    .from('analytics_events')
    .select('event_type')
    .eq('user_id', req.user.id)
    .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const activityStats = {}
  recentActivity?.forEach(activity => {
    activityStats[activity.event_type] = (activityStats[activity.event_type] || 0) + 1
  })

  res.json({
    success: true,
    data: {
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        access_level: profile.access_level,
        created_at: profile.created_at,
        last_login: profile.last_login,
        is_active: profile.is_active,
        metadata: profile.metadata
      },
      stats: {
        active_alerts: alerts?.length || 0,
        recent_activity: activityStats,
        session_started: new Date().toISOString()
      }
    }
  })
}))

/**
 * POST /api/v1/auth/refresh
 * Refresh authentication token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body

  if (!refresh_token) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Refresh token is required'
    })
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token
  })

  if (error) {
    logger.logSecurityEvent('token_refresh_failed', 'unknown', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
    
    return res.status(401).json({
      success: false,
      error: 'Token Refresh Failed',
      message: 'Invalid or expired refresh token'
    })
  }

  logger.logActivity('token_refreshed', data.user.id, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  res.json({
    success: true,
    data: {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    }
  })
}))

/**
 * POST /api/v1/auth/change-password
 * Change user password
 */
router.post('/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body

  if (!current_password || !new_password) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Current password and new password are required'
    })
  }

  if (new_password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'New password must be at least 8 characters long'
    })
  }

  // Verify current password by attempting to sign in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password: current_password
  })

  if (verifyError) {
    logger.logSecurityEvent('password_change_failed', req.user.id, {
      reason: 'invalid_current_password',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
    
    return res.status(400).json({
      success: false,
      error: 'Authentication Failed',
      message: 'Current password is incorrect'
    })
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: new_password
  })

  if (updateError) {
    logger.error('Password update error:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Password Update Failed',
      message: 'Failed to update password'
    })
  }

  logger.logSecurityEvent('password_changed', req.user.id, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  res.json({
    success: true,
    message: 'Password updated successfully'
  })
}))

/**
 * POST /api/v1/auth/update-profile
 * Update user profile information
 */
router.post('/update-profile', authMiddleware, asyncHandler(async (req, res) => {
  const { name, metadata } = req.body
  const updates = {}

  if (name) {
    updates.name = name.trim()
  }

  if (metadata && typeof metadata === 'object') {
    // Merge with existing metadata
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('metadata')
      .eq('id', req.user.id)
      .single()

    updates.metadata = {
      ...currentProfile?.metadata,
      ...metadata
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'No valid updates provided'
    })
  }

  updates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', req.user.id)

  if (error) {
    logger.error('Profile update error:', error)
    throw new Error('Failed to update profile')
  }

  logger.logActivity('profile_updated', req.user.id, {
    updates: Object.keys(updates),
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  res.json({
    success: true,
    message: 'Profile updated successfully'
  })
}))

export default router