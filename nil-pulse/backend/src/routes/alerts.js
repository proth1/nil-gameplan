import express from 'express'
import { supabase } from '../server.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * GET /api/v1/alerts
 * Get user's alert configurations
 */
router.get('/', asyncHandler(async (req, res) => {
  const { data: alerts, error } = await supabase
    .from('nil_user_alerts')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Failed to fetch alerts:', error)
    throw new Error('Failed to fetch user alerts')
  }

  res.json({
    success: true,
    data: alerts || []
  })
}))

/**
 * GET /api/v1/alerts/:id
 * Get specific alert configuration
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params

  const { data: alert, error } = await supabase
    .from('nil_user_alerts')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single()

  if (error || !alert) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found'
    })
  }

  res.json({
    success: true,
    data: alert
  })
}))

/**
 * POST /api/v1/alerts
 * Create new alert
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    name,
    description,
    keywords = [],
    categories = [],
    jurisdictions = [],
    sports = [],
    deal_value_min,
    deal_value_max,
    importance_threshold = 50,
    content_types = [],
    source_ids = [],
    exclude_keywords = [],
    delivery_channels = { email: true },
    delivery_frequency = 'immediate',
    delivery_time,
    delivery_timezone = 'UTC'
  } = req.body

  // Validate required fields
  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Alert name is required'
    })
  }

  // Validate delivery channels
  if (!delivery_channels.email && !delivery_channels.sms && !delivery_channels.webhook && !delivery_channels.push) {
    return res.status(400).json({
      success: false,
      error: 'At least one delivery channel must be enabled'
    })
  }

  const { data: newAlert, error } = await supabase
    .from('nil_user_alerts')
    .insert({
      user_id: req.user.id,
      name,
      description,
      is_active: true,
      keywords,
      categories,
      jurisdictions,
      sports,
      deal_value_min,
      deal_value_max,
      importance_threshold,
      content_types,
      source_ids,
      exclude_keywords,
      delivery_channels,
      delivery_frequency,
      delivery_time,
      delivery_timezone,
      trigger_count: 0
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to create alert:', error)
    throw new Error('Failed to create alert')
  }

  logger.logActivity('alert_created', req.user.id, {
    alert_id: newAlert.id,
    alert_name: newAlert.name
  })

  res.status(201).json({
    success: true,
    data: newAlert
  })
}))

/**
 * PUT /api/v1/alerts/:id
 * Update alert configuration
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const updates = { ...req.body }

  // Remove fields that shouldn't be updated directly
  delete updates.id
  delete updates.user_id
  delete updates.created_at
  delete updates.trigger_count
  delete updates.last_triggered

  // Add update timestamp
  updates.updated_at = new Date().toISOString()

  const { data: updatedAlert, error } = await supabase
    .from('nil_user_alerts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single()

  if (error) {
    logger.error('Failed to update alert:', error)
    throw new Error('Failed to update alert')
  }

  if (!updatedAlert) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found'
    })
  }

  logger.logActivity('alert_updated', req.user.id, {
    alert_id: id,
    alert_name: updatedAlert.name
  })

  res.json({
    success: true,
    data: updatedAlert
  })
}))

/**
 * DELETE /api/v1/alerts/:id
 * Delete alert
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params

  // Get alert info before deletion
  const { data: alert } = await supabase
    .from('nil_user_alerts')
    .select('name')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single()

  const { error } = await supabase
    .from('nil_user_alerts')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id)

  if (error) {
    logger.error('Failed to delete alert:', error)
    throw new Error('Failed to delete alert')
  }

  logger.logActivity('alert_deleted', req.user.id, {
    alert_id: id,
    alert_name: alert?.name || 'Unknown'
  })

  res.json({
    success: true,
    message: 'Alert deleted successfully'
  })
}))

/**
 * GET /api/v1/alerts/:id/deliveries
 * Get alert delivery history
 */
router.get('/:id/deliveries', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { page = 1, limit = 20 } = req.query

  const offset = (parseInt(page) - 1) * parseInt(limit)

  // Verify user owns this alert
  const { data: alert } = await supabase
    .from('nil_user_alerts')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single()

  if (!alert) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found'
    })
  }

  const { data: deliveries, error, count } = await supabase
    .from('nil_alert_deliveries')
    .select(`
      id, channel, status, delivered_at, opened_at, clicked_at, created_at,
      alert_snapshot, content_snapshot,
      nil_content(title, url, published_at)
    `, { count: 'exact' })
    .eq('alert_id', id)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1)

  if (error) {
    logger.error('Failed to fetch alert deliveries:', error)
    throw new Error('Failed to fetch alert deliveries')
  }

  const totalPages = Math.ceil(count / parseInt(limit))

  res.json({
    success: true,
    data: {
      data: deliveries || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    }
  })
}))

/**
 * POST /api/v1/alerts/:id/test
 * Test alert configuration
 */
router.post('/:id/test', asyncHandler(async (req, res) => {
  const { id } = req.params

  const { data: alert, error } = await supabase
    .from('nil_user_alerts')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single()

  if (error || !alert) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found'
    })
  }

  if (!alert.is_active) {
    return res.status(400).json({
      success: false,
      error: 'Cannot test inactive alert'
    })
  }

  // Find recent content that would match this alert
  let query = supabase
    .from('nil_content')
    .select('id, title, summary, published_at, primary_category, importance_score')
    .eq('is_active', true)
    .gte('published_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .gte('importance_score', alert.importance_threshold)
    .limit(1)

  // Apply alert filters
  if (alert.categories.length > 0) {
    query = query.in('primary_category', alert.categories)
  }

  if (alert.jurisdictions.length > 0) {
    query = query.in('jurisdiction', alert.jurisdictions)
  }

  if (alert.keywords.length > 0) {
    const keywordConditions = alert.keywords.map(keyword => 
      `title.ilike.%${keyword}%,summary.ilike.%${keyword}%,content.ilike.%${keyword}%`
    ).join(',')
    query = query.or(keywordConditions)
  }

  const { data: matchingContent } = await query

  const testResult = {
    alert_name: alert.name,
    test_timestamp: new Date().toISOString(),
    would_trigger: matchingContent && matchingContent.length > 0,
    matching_content: matchingContent?.[0] || null,
    delivery_channels: alert.delivery_channels,
    message: matchingContent && matchingContent.length > 0 
      ? 'Alert would trigger with current configuration'
      : 'No matching content found with current configuration'
  }

  logger.logActivity('alert_tested', req.user.id, {
    alert_id: id,
    alert_name: alert.name,
    would_trigger: testResult.would_trigger
  })

  res.json({
    success: true,
    data: testResult
  })
}))

/**
 * GET /api/v1/alerts/meta/options
 * Get available options for alert configuration
 */
router.get('/meta/options', asyncHandler(async (req, res) => {
  const [
    { data: categories },
    { data: jurisdictions },
    { data: sources }
  ] = await Promise.all([
    // Get available categories
    supabase
      .from('nil_content')
      .select('primary_category')
      .eq('is_active', true),

    // Get available jurisdictions
    supabase
      .from('nil_content')
      .select('jurisdiction')
      .eq('is_active', true)
      .not('jurisdiction', 'is', null),

    // Get available sources
    supabase
      .from('nil_sources')
      .select('id, name, category')
      .eq('is_active', true)
  ])

  // Process unique values
  const uniqueCategories = [...new Set(categories?.map(c => c.primary_category))].filter(Boolean)
  const uniqueJurisdictions = [...new Set(jurisdictions?.map(j => j.jurisdiction))].filter(Boolean)

  const categoryOptions = [
    { value: 'legislation', label: 'Legislation' },
    { value: 'litigation', label: 'Litigation' },
    { value: 'enforcement', label: 'Enforcement' },
    { value: 'deals', label: 'Deals' },
    { value: 'collectives', label: 'Collectives' },
    { value: 'high_school', label: 'High School' },
    { value: 'womens_sports', label: "Women's Sports" },
    { value: 'policy', label: 'Policy' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'market_analysis', label: 'Market Analysis' }
  ].filter(option => uniqueCategories.includes(option.value))

  const commonSports = [
    'football', 'basketball', 'baseball', 'soccer', 'tennis', 
    'golf', 'track', 'swimming', 'gymnastics', 'volleyball'
  ]

  res.json({
    success: true,
    data: {
      categories: categoryOptions,
      jurisdictions: uniqueJurisdictions.map(j => ({ value: j, label: j })),
      sports: commonSports.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
      sources: sources?.map(s => ({ value: s.id, label: s.name, category: s.category })) || [],
      delivery_frequencies: [
        { value: 'immediate', label: 'Immediate' },
        { value: 'hourly', label: 'Hourly' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' }
      ],
      delivery_channels: [
        { value: 'email', label: 'Email', enabled: true },
        { value: 'sms', label: 'SMS', enabled: false },
        { value: 'webhook', label: 'Webhook', enabled: false },
        { value: 'push', label: 'Push Notification', enabled: false }
      ]
    }
  })
}))

export default router