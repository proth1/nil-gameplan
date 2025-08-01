import express from 'express'
import { supabase } from '../server.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { adminOnly } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * GET /api/v1/content
 * Get paginated NIL content with filtering
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    jurisdiction,
    importance_min,
    search,
    sort_by = 'published_at',
    sort_order = 'desc'
  } = req.query

  const offset = (parseInt(page) - 1) * parseInt(limit)

  let query = supabase
    .from('nil_content')
    .select(`
      id, title, summary, author, url, published_at, processed_at,
      primary_category, secondary_categories, jurisdiction, states_mentioned,
      sentiment_score, importance_score, trend_velocity, tags,
      nil_sources(name, category)
    `, { count: 'exact' })
    .eq('is_active', true)
    .range(offset, offset + parseInt(limit) - 1)

  // Apply filters
  if (category) {
    query = query.eq('primary_category', category)
  }

  if (jurisdiction) {
    query = query.eq('jurisdiction', jurisdiction)
  }

  if (importance_min) {
    query = query.gte('importance_score', parseInt(importance_min))
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%,content.ilike.%${search}%`)
  }

  // Apply sorting
  const validSortFields = ['published_at', 'processed_at', 'importance_score', 'trend_velocity']
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'published_at'
  const sortDirection = sort_order === 'asc' ? 'asc' : 'desc'
  
  query = query.order(sortField, { ascending: sortDirection === 'asc' })

  const { data: content, error, count } = await query

  if (error) {
    logger.error('Failed to fetch content:', error)
    throw new Error('Failed to fetch content')
  }

  const totalPages = Math.ceil(count / parseInt(limit))

  res.json({
    success: true,
    data: {
      data: content || [],
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
 * GET /api/v1/content/:id
 * Get specific content item
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params

  const { data: content, error } = await supabase
    .from('nil_content')
    .select(`
      *, 
      nil_sources(name, description, url, category, reliability_score)
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !content) {
    return res.status(404).json({
      success: false,
      error: 'Content not found'
    })
  }

  // Log content view
  logger.logActivity('content_viewed', req.user.id, {
    content_id: id,
    content_title: content.title
  })

  res.json({
    success: true,
    data: content
  })
}))

/**
 * POST /api/v1/content
 * Create new content (admin only)
 */
router.post('/', adminOnly, asyncHandler(async (req, res) => {
  const {
    title,
    summary,
    content,
    author,
    url,
    published_at,
    source_id,
    primary_category,
    secondary_categories = [],
    jurisdiction,
    states_mentioned = [],
    entities_mentioned = [],
    deal_value,
    athlete_name,
    sport,
    school,
    brand,
    sentiment_score,
    importance_score = 50,
    tags = []
  } = req.body

  // Validate required fields
  if (!title || !content || !url || !primary_category) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: title, content, url, primary_category'
    })
  }

  const { data: newContent, error } = await supabase
    .from('nil_content')
    .insert({
      title,
      summary,
      content,
      author,
      url,
      published_at: published_at || new Date().toISOString(),
      processed_at: new Date().toISOString(),
      source_id,
      primary_category,
      secondary_categories,
      jurisdiction,
      states_mentioned,
      entities_mentioned,
      deal_value,
      athlete_name,
      sport,
      school,
      brand,
      sentiment_score,
      importance_score,
      trend_velocity: 0,
      tags,
      version: 1,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to create content:', error)
    throw new Error('Failed to create content')
  }

  logger.logActivity('content_created', req.user.id, {
    content_id: newContent.id,
    content_title: newContent.title
  })

  res.status(201).json({
    success: true,
    data: newContent
  })
}))

/**
 * PUT /api/v1/content/:id
 * Update content (admin only)
 */
router.put('/:id', adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params
  const updates = { ...req.body }

  // Remove fields that shouldn't be updated directly
  delete updates.id
  delete updates.created_at
  delete updates.raw_content_id
  delete updates.version

  // Add update timestamp
  updates.updated_at = new Date().toISOString()

  const { data: updatedContent, error } = await supabase
    .from('nil_content')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('Failed to update content:', error)
    throw new Error('Failed to update content')
  }

  if (!updatedContent) {
    return res.status(404).json({
      success: false,
      error: 'Content not found'
    })
  }

  logger.logActivity('content_updated', req.user.id, {
    content_id: id,
    content_title: updatedContent.title
  })

  res.json({
    success: true,
    data: updatedContent
  })
}))

/**
 * DELETE /api/v1/content/:id
 * Delete content (admin only)
 */
router.delete('/:id', adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params

  // Get content info before deletion
  const { data: content } = await supabase
    .from('nil_content')
    .select('title')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('nil_content')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    logger.error('Failed to delete content:', error)
    throw new Error('Failed to delete content')
  }

  logger.logActivity('content_deleted', req.user.id, {
    content_id: id,
    content_title: content?.title || 'Unknown'
  })

  res.json({
    success: true,
    message: 'Content deleted successfully'
  })
}))

/**
 * GET /api/v1/content/categories
 * Get available content categories
 */
router.get('/meta/categories', asyncHandler(async (req, res) => {
  const categories = [
    { value: 'legislation', label: 'Legislation', description: 'Laws and bills related to NIL' },
    { value: 'litigation', label: 'Litigation', description: 'Legal cases and court decisions' },
    { value: 'enforcement', label: 'Enforcement', description: 'Violations and penalties' },
    { value: 'deals', label: 'Deals', description: 'NIL endorsement deals and partnerships' },
    { value: 'collectives', label: 'Collectives', description: 'NIL collective organizations' },
    { value: 'high_school', label: 'High School', description: 'High school NIL activities' },
    { value: 'womens_sports', label: "Women's Sports", description: 'Women\'s athletics NIL' },
    { value: 'policy', label: 'Policy', description: 'Institutional and organizational policies' },
    { value: 'compliance', label: 'Compliance', description: 'NIL compliance and requirements' },
    { value: 'market_analysis', label: 'Market Analysis', description: 'Market trends and analysis' }
  ]

  res.json({
    success: true,
    data: categories
  })
}))

/**
 * GET /api/v1/content/stats
 * Get content statistics
 */
router.get('/meta/stats', asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || '24h'
  const hoursBack = timeframe === '7d' ? 168 : timeframe === '30d' ? 720 : 24

  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

  const [
    { data: totalContent },
    { data: recentContent },
    { data: categoryStats },
    { data: topSources }
  ] = await Promise.all([
    // Total content count
    supabase
      .from('nil_content')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Recent content count
    supabase
      .from('nil_content')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('published_at', startTime),

    // Category breakdown
    supabase
      .from('nil_content')
      .select('primary_category')
      .eq('is_active', true)
      .gte('published_at', startTime),

    // Top sources
    supabase
      .from('nil_content')
      .select(`
        source_id,
        nil_sources(name)
      `)
      .eq('is_active', true)
      .gte('published_at', startTime)
  ])

  // Process category stats
  const categoryBreakdown = {}
  categoryStats?.forEach(item => {
    categoryBreakdown[item.primary_category] = (categoryBreakdown[item.primary_category] || 0) + 1
  })

  // Process source stats
  const sourceBreakdown = {}
  topSources?.forEach(item => {
    if (item.nil_sources?.name) {
      sourceBreakdown[item.nil_sources.name] = (sourceBreakdown[item.nil_sources.name] || 0) + 1
    }
  })

  res.json({
    success: true,
    data: {
      total_content: totalContent?.length || 0,
      recent_content: recentContent?.length || 0,
      timeframe,
      category_breakdown: categoryBreakdown,
      top_sources: Object.entries(sourceBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
    }
  })
}))

export default router