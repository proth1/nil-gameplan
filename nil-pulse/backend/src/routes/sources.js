import express from 'express'
import { supabase } from '../server.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { adminOnly } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * GET /api/v1/sources
 * Get all NIL content sources with filtering
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    is_active,
    reliability_min,
    search,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query

  const offset = (parseInt(page) - 1) * parseInt(limit)

  let query = supabase
    .from('nil_sources')
    .select('*', { count: 'exact' })
    .range(offset, offset + parseInt(limit) - 1)

  // Apply filters
  if (category) {
    query = query.eq('category', category)
  }

  if (is_active !== undefined) {
    query = query.eq('is_active', is_active === 'true')
  }

  if (reliability_min) {
    query = query.gte('reliability_score', parseInt(reliability_min))
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,url.ilike.%${search}%`)
  }

  // Apply sorting
  const validSortFields = ['created_at', 'updated_at', 'name', 'reliability_score', 'last_crawled']
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at'
  const sortDirection = sort_order === 'asc' ? 'asc' : 'desc'
  
  query = query.order(sortField, { ascending: sortDirection === 'asc' })

  const { data: sources, error, count } = await query

  if (error) {
    logger.error('Failed to fetch sources:', error)
    throw new Error('Failed to fetch sources')
  }

  const totalPages = Math.ceil(count / parseInt(limit))

  res.json({
    success: true,
    data: {
      data: sources || [],
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
 * GET /api/v1/sources/:id
 * Get specific source details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params

  const { data: source, error } = await supabase
    .from('nil_sources')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !source) {
    return res.status(404).json({
      success: false,
      error: 'Source not found'
    })
  }

  // Get recent content from this source
  const { data: recentContent } = await supabase
    .from('nil_content')
    .select('id, title, published_at, importance_score, primary_category')
    .eq('source_id', id)
    .eq('is_active', true)
    .order('published_at', { ascending: false })
    .limit(10)

  // Get source performance stats
  const [
    { count: totalContent },
    { count: recentContent24h },
    { data: avgImportance }
  ] = await Promise.all([
    supabase
      .from('nil_content')
      .select('id', { count: 'exact', head: true })
      .eq('source_id', id)
      .eq('is_active', true),

    supabase
      .from('nil_content')
      .select('id', { count: 'exact', head: true })
      .eq('source_id', id)
      .eq('is_active', true)
      .gte('published_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

    supabase
      .from('nil_content')
      .select('importance_score')
      .eq('source_id', id)
      .eq('is_active', true)
      .gte('published_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  ])

  const avgScore = avgImportance?.length > 0 
    ? Math.round(avgImportance.reduce((sum, item) => sum + (item.importance_score || 0), 0) / avgImportance.length)
    : 0

  res.json({
    success: true,
    data: {
      ...source,
      stats: {
        total_content: totalContent || 0,
        content_24h: recentContent24h || 0,
        avg_importance_score: avgScore
      },
      recent_content: recentContent || []
    }
  })
}))

/**
 * POST /api/v1/sources
 * Create new content source (admin only)
 */
router.post('/', adminOnly, asyncHandler(async (req, res) => {
  const {
    name,
    description,
    url,
    category,
    crawl_config = {},
    headers = {},
    auth_config = {},
    reliability_score = 50,
    crawl_frequency = 'hourly',
    content_selectors = {},
    is_active = true
  } = req.body

  // Validate required fields
  if (!name || !url || !category) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, url, category'
    })
  }

  // Validate category
  const validCategories = ['news', 'blog', 'social', 'official', 'rss', 'api', 'other']
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
    })
  }

  // Validate crawl frequency
  const validFrequencies = ['manual', 'hourly', 'daily', 'weekly']
  if (!validFrequencies.includes(crawl_frequency)) {
    return res.status(400).json({
      success: false,
      error: `Invalid crawl frequency. Must be one of: ${validFrequencies.join(', ')}`
    })
  }

  const { data: newSource, error } = await supabase
    .from('nil_sources')
    .insert({
      name,
      description,
      url,
      category,
      crawl_config,
      headers,
      auth_config,
      reliability_score,
      crawl_frequency,
      content_selectors,
      is_active,
      created_by: req.user.id,
      last_crawled: null,
      crawl_status: 'pending'
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to create source:', error)
    throw new Error('Failed to create source')
  }

  logger.logActivity('source_created', req.user.id, {
    source_id: newSource.id,
    source_name: newSource.name,
    source_url: newSource.url
  })

  res.status(201).json({
    success: true,
    data: newSource
  })
}))

/**
 * PUT /api/v1/sources/:id
 * Update content source (admin only)
 */
router.put('/:id', adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params
  const updates = { ...req.body }

  // Remove fields that shouldn't be updated directly
  delete updates.id
  delete updates.created_at
  delete updates.created_by
  delete updates.last_crawled
  delete updates.crawl_status

  // Add update timestamp
  updates.updated_at = new Date().toISOString()

  const { data: updatedSource, error } = await supabase
    .from('nil_sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('Failed to update source:', error)
    throw new Error('Failed to update source')
  }

  if (!updatedSource) {
    return res.status(404).json({
      success: false,
      error: 'Source not found'
    })
  }

  logger.logActivity('source_updated', req.user.id, {
    source_id: id,
    source_name: updatedSource.name
  })

  res.json({
    success: true,
    data: updatedSource
  })
}))

/**
 * DELETE /api/v1/sources/:id
 * Delete content source (admin only)
 */
router.delete('/:id', adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params

  // Get source info before deletion
  const { data: source } = await supabase
    .from('nil_sources')
    .select('name')
    .eq('id', id)
    .single()

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('nil_sources')
    .update({ 
      is_active: false, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)

  if (error) {
    logger.error('Failed to delete source:', error)
    throw new Error('Failed to delete source')
  }

  logger.logActivity('source_deleted', req.user.id, {
    source_id: id,
    source_name: source?.name || 'Unknown'
  })

  res.json({
    success: true,
    message: 'Source deleted successfully'
  })
}))

/**
 * POST /api/v1/sources/:id/crawl
 * Trigger manual crawl of specific source (admin only)
 */
router.post('/:id/crawl', adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params

  const { data: source, error } = await supabase
    .from('nil_sources')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !source) {
    return res.status(404).json({
      success: false,
      error: 'Active source not found'
    })
  }

  // Update crawl status to indicate manual crawl initiated
  const { error: updateError } = await supabase
    .from('nil_sources')
    .update({
      crawl_status: 'in_progress',
      last_crawl_initiated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (updateError) {
    logger.error('Failed to update source crawl status:', updateError)
    throw new Error('Failed to initiate crawl')
  }

  logger.logActivity('source_crawl_initiated', req.user.id, {
    source_id: id,
    source_name: source.name,
    crawl_type: 'manual'
  })

  res.json({
    success: true,
    message: 'Manual crawl initiated',
    data: {
      source_id: id,
      source_name: source.name,
      crawl_initiated_at: new Date().toISOString()
    }
  })
}))

/**
 * GET /api/v1/sources/meta/categories
 * Get available source categories
 */
router.get('/meta/categories', asyncHandler(async (req, res) => {
  const categories = [
    { value: 'news', label: 'News Website', description: 'Traditional news websites and publications' },
    { value: 'blog', label: 'Blog/Editorial', description: 'Personal blogs and editorial sites' },
    { value: 'social', label: 'Social Media', description: 'Social media platforms and feeds' },
    { value: 'official', label: 'Official Source', description: 'Official institutional sources' },
    { value: 'rss', label: 'RSS Feed', description: 'RSS/XML feeds' },
    { value: 'api', label: 'API Endpoint', description: 'REST API or data feed' },
    { value: 'other', label: 'Other', description: 'Other types of sources' }
  ]

  res.json({
    success: true,
    data: categories
  })
}))

/**
 * GET /api/v1/sources/meta/stats
 * Get source statistics
 */
router.get('/meta/stats', asyncHandler(async (req, res) => {
  const { timeframe = '24h' } = req.query
  const hoursBack = timeframe === '7d' ? 168 : timeframe === '30d' ? 720 : 24

  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

  const [
    { data: totalSources, count: totalCount },
    { data: activeSources, count: activeCount },
    { data: categoryBreakdown },
    { data: crawlStats },
    { data: contentStats }
  ] = await Promise.all([
    // Total sources
    supabase
      .from('nil_sources')
      .select('id', { count: 'exact', head: true }),

    // Active sources
    supabase
      .from('nil_sources')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Category breakdown
    supabase
      .from('nil_sources')
      .select('category')
      .eq('is_active', true),

    // Crawl status
    supabase
      .from('nil_sources')
      .select('crawl_status, last_crawled')
      .eq('is_active', true),

    // Content generation stats
    supabase
      .from('nil_content')
      .select('source_id, nil_sources(name)')
      .eq('is_active', true)
      .gte('published_at', startTime)
  ])

  // Process category stats
  const categoryStats = {}
  categoryBreakdown?.forEach(source => {
    categoryStats[source.category] = (categoryStats[source.category] || 0) + 1
  })

  // Process crawl stats
  const crawlStatusStats = {}
  const recentlyCrawled = crawlStats?.filter(source => {
    if (source.crawl_status) {
      crawlStatusStats[source.crawl_status] = (crawlStatusStats[source.crawl_status] || 0) + 1
    }
    return source.last_crawled && new Date(source.last_crawled) > new Date(startTime)
  }).length || 0

  // Process content generation stats
  const sourceContentStats = {}
  contentStats?.forEach(content => {
    if (content.nil_sources?.name) {
      sourceContentStats[content.nil_sources.name] = (sourceContentStats[content.nil_sources.name] || 0) + 1
    }
  })

  res.json({
    success: true,
    data: {
      timeframe,
      total_sources: totalCount || 0,
      active_sources: activeCount || 0,
      recently_crawled: recentlyCrawled,
      category_breakdown: categoryStats,
      crawl_status_breakdown: crawlStatusStats,
      top_content_generators: Object.entries(sourceContentStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ source_name: name, content_count: count }))
    }
  })
}))

export default router