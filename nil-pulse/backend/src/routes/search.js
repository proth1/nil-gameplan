import express from 'express'
import { supabase } from '../server.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * GET /api/v1/search
 * Comprehensive search across content, deals, and other entities
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    q: query,
    type = 'all',
    page = 1,
    limit = 20,
    category,
    timeframe,
    importance_min,
    deal_value_min,
    deal_value_max,
    sport,
    jurisdiction,
    sort_by = 'relevance',
    sort_order = 'desc'
  } = req.query

  if (!query || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Search query is required'
    })
  }

  const searchQuery = query.trim()
  const offset = (parseInt(page) - 1) * parseInt(limit)

  // Set up date filters based on timeframe
  let dateFilter = null
  if (timeframe) {
    if (timeframe === '24h') {
      dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    } else if (timeframe === '7d') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    } else if (timeframe === '30d') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    } else if (timeframe === '90d') {
      dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  const results = {
    content: [],
    deals: [],
    total_results: 0
  }

  // Search content if type is 'all' or 'content'
  if (type === 'all' || type === 'content') {
    let contentQuery = supabase
      .from('nil_content')
      .select(`
        id, title, summary, author, url, published_at, processed_at,
        primary_category, jurisdiction, importance_score, sentiment_score,
        trend_velocity, tags, entities_mentioned,
        nil_sources(name, category)
      `, { count: 'exact' })
      .eq('is_active', true)
      .or(`title.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,tags.cs.{${searchQuery}},entities_mentioned.cs.{${searchQuery}}`)

    // Apply filters
    if (category) {
      contentQuery = contentQuery.eq('primary_category', category)
    }

    if (jurisdiction) {
      contentQuery = contentQuery.eq('jurisdiction', jurisdiction)
    }

    if (importance_min) {
      contentQuery = contentQuery.gte('importance_score', parseInt(importance_min))
    }

    if (dateFilter) {
      contentQuery = contentQuery.gte('published_at', dateFilter)
    }

    // Apply sorting for content
    if (sort_by === 'relevance') {
      // For relevance, prioritize title matches, then importance score
      contentQuery = contentQuery.order('importance_score', { ascending: false })
    } else if (sort_by === 'date') {
      contentQuery = contentQuery.order('published_at', { ascending: sort_order === 'asc' })
    } else if (sort_by === 'importance') {
      contentQuery = contentQuery.order('importance_score', { ascending: sort_order === 'asc' })
    } else {
      contentQuery = contentQuery.order('published_at', { ascending: false })
    }

    if (type === 'content') {
      // If searching only content, apply pagination
      contentQuery = contentQuery.range(offset, offset + parseInt(limit) - 1)
    } else {
      // If searching all, limit content results
      contentQuery = contentQuery.limit(Math.ceil(parseInt(limit) / 2))
    }

    const { data: contentResults, error: contentError } = await contentQuery

    if (contentError) {
      logger.error('Content search failed:', contentError)
    } else {
      results.content = contentResults || []
    }
  }

  // Search deals if type is 'all' or 'deals'
  if (type === 'all' || type === 'deals') {
    let dealsQuery = supabase
      .from('nil_deals')
      .select('*', { count: 'exact' })
      .or(`athlete_name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,school.ilike.%${searchQuery}%,deal_description.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)

    // Apply filters
    if (sport) {
      dealsQuery = dealsQuery.eq('sport', sport)
    }

    if (deal_value_min) {
      dealsQuery = dealsQuery.gte('deal_value', parseInt(deal_value_min))
    }

    if (deal_value_max) {
      dealsQuery = dealsQuery.lte('deal_value', parseInt(deal_value_max))
    }

    if (dateFilter) {
      dealsQuery = dealsQuery.gte('announced_date', dateFilter)
    }

    // Apply sorting for deals
    if (sort_by === 'relevance' || sort_by === 'value') {
      dealsQuery = dealsQuery.order('deal_value', { ascending: sort_order === 'asc', nullsLast: true })
    } else if (sort_by === 'date') {
      dealsQuery = dealsQuery.order('announced_date', { ascending: sort_order === 'asc' })
    } else {
      dealsQuery = dealsQuery.order('announced_date', { ascending: false })
    }

    if (type === 'deals') {
      // If searching only deals, apply pagination
      dealsQuery = dealsQuery.range(offset, offset + parseInt(limit) - 1)
    } else {
      // If searching all, limit deal results
      dealsQuery = dealsQuery.limit(Math.ceil(parseInt(limit) / 2))
    }

    const { data: dealsResults, error: dealsError } = await dealsQuery

    if (dealsError) {
      logger.error('Deals search failed:', dealsError)
    } else {
      results.deals = dealsResults || []
    }
  }

  // Calculate total results
  results.total_results = results.content.length + results.deals.length

  // If searching all types, combine and sort results
  if (type === 'all') {
    const combinedResults = []
    
    // Add content results with search score
    results.content.forEach(item => {
      let score = 0
      const titleMatch = item.title?.toLowerCase().includes(searchQuery.toLowerCase())
      const summaryMatch = item.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      
      if (titleMatch) score += 10
      if (summaryMatch) score += 5
      score += (item.importance_score || 0) / 10
      
      combinedResults.push({
        type: 'content',
        score,
        data: item
      })
    })

    // Add deals results with search score
    results.deals.forEach(item => {
      let score = 0
      const athleteMatch = item.athlete_name?.toLowerCase().includes(searchQuery.toLowerCase())
      const brandMatch = item.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      const schoolMatch = item.school?.toLowerCase().includes(searchQuery.toLowerCase())
      
      if (athleteMatch) score += 10
      if (brandMatch) score += 8
      if (schoolMatch) score += 5
      if (item.deal_value) score += Math.log10(item.deal_value) / 2
      
      combinedResults.push({
        type: 'deal',
        score,
        data: item
      })
    })

    // Sort by relevance score and apply pagination
    combinedResults.sort((a, b) => b.score - a.score)
    const paginatedResults = combinedResults.slice(offset, offset + parseInt(limit))

    // Separate back into content and deals
    results.content = paginatedResults.filter(r => r.type === 'content').map(r => r.data)
    results.deals = paginatedResults.filter(r => r.type === 'deal').map(r => r.data)
  }

  // Log search activity
  logger.logActivity('search_performed', req.user.id, {
    query: searchQuery,
    search_type: type,
    filters: { category, timeframe, importance_min, sport, jurisdiction },
    results_count: results.total_results
  })

  const totalPages = Math.ceil(results.total_results / parseInt(limit))

  res.json({
    success: true,
    data: {
      query: searchQuery,
      type,
      ...results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_results: results.total_results,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      filters_applied: {
        category,
        timeframe,
        importance_min,
        deal_value_min,
        deal_value_max,
        sport,
        jurisdiction
      }
    }
  })
}))

/**
 * GET /api/v1/search/autocomplete
 * Get search suggestions and autocomplete
 */
router.get('/autocomplete', asyncHandler(async (req, res) => {
  const { q: query, limit = 10 } = req.query

  if (!query || query.trim().length < 2) {
    return res.json({
      success: true,
      data: {
        suggestions: []
      }
    })
  }

  const searchQuery = query.trim()

  const [
    { data: contentSuggestions },
    { data: dealSuggestions },
    { data: tagSuggestions },
    { data: entitySuggestions }
  ] = await Promise.all([
    // Content title suggestions
    supabase
      .from('nil_content')
      .select('title')
      .eq('is_active', true)
      .ilike('title', `%${searchQuery}%`)
      .limit(5),

    // Deal-related suggestions (athletes, brands, schools)
    supabase
      .from('nil_deals')
      .select('athlete_name, brand, school')
      .or(`athlete_name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,school.ilike.%${searchQuery}%`)
      .limit(5),

    // Popular tags
    supabase
      .from('nil_content')
      .select('tags')
      .eq('is_active', true)
      .not('tags', 'is', null)
      .limit(20), // Get more to filter later

    // Popular entities
    supabase
      .from('nil_content')
      .select('entities_mentioned')
      .eq('is_active', true)
      .not('entities_mentioned', 'is', null)
      .limit(20) // Get more to filter later
  ])

  const suggestions = []

  // Add content title suggestions
  contentSuggestions?.forEach(item => {
    if (item.title && suggestions.length < parseInt(limit)) {
      suggestions.push({
        type: 'content_title',
        text: item.title,
        category: 'Content'
      })
    }
  })

  // Add deal-related suggestions
  dealSuggestions?.forEach(deal => {
    if (deal.athlete_name?.toLowerCase().includes(searchQuery.toLowerCase()) && suggestions.length < parseInt(limit)) {
      suggestions.push({
        type: 'athlete',
        text: deal.athlete_name,
        category: 'Athlete'
      })
    }
    if (deal.brand?.toLowerCase().includes(searchQuery.toLowerCase()) && suggestions.length < parseInt(limit)) {
      suggestions.push({
        type: 'brand',
        text: deal.brand,
        category: 'Brand'
      })
    }
    if (deal.school?.toLowerCase().includes(searchQuery.toLowerCase()) && suggestions.length < parseInt(limit)) {
      suggestions.push({
        type: 'school',
        text: deal.school,
        category: 'School'
      })
    }
  })

  // Process and add tag suggestions
  const tagFrequency = {}
  tagSuggestions?.forEach(item => {
    item.tags?.forEach(tag => {
      if (tag.toLowerCase().includes(searchQuery.toLowerCase())) {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1
      }
    })
  })

  Object.entries(tagFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .forEach(([tag]) => {
      if (suggestions.length < parseInt(limit)) {
        suggestions.push({
          type: 'tag',
          text: tag,
          category: 'Topic'
        })
      }
    })

  // Process and add entity suggestions
  const entityFrequency = {}
  entitySuggestions?.forEach(item => {
    item.entities_mentioned?.forEach(entity => {
      if (entity.toLowerCase().includes(searchQuery.toLowerCase())) {
        entityFrequency[entity] = (entityFrequency[entity] || 0) + 1
      }
    })
  })

  Object.entries(entityFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .forEach(([entity]) => {
      if (suggestions.length < parseInt(limit)) {
        suggestions.push({
          type: 'entity',
          text: entity,
          category: 'Entity'
        })
      }
    })

  // Remove duplicates and limit results
  const uniqueSuggestions = suggestions
    .filter((suggestion, index, self) => 
      index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
    )
    .slice(0, parseInt(limit))

  res.json({
    success: true,
    data: {
      query: searchQuery,
      suggestions: uniqueSuggestions
    }
  })
}))

/**
 * GET /api/v1/search/trending
 * Get trending search terms and popular queries
 */
router.get('/trending', asyncHandler(async (req, res) => {
  const { timeframe = '24h', limit = 10 } = req.query

  let startDate = null
  if (timeframe === '1h') {
    startDate = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  } else if (timeframe === '24h') {
    startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '7d') {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }

  const [
    { data: recentContent },
    { data: recentDeals },
    { data: highVelocityContent }
  ] = await Promise.all([
    // Recent high-importance content for trending topics
    supabase
      .from('nil_content')
      .select('tags, entities_mentioned, primary_category, importance_score')
      .eq('is_active', true)
      .gte('published_at', startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .gte('importance_score', 60)
      .limit(50),

    // Recent high-value deals
    supabase
      .from('nil_deals')
      .select('athlete_name, brand, school, sport, deal_value')
      .gte('announced_date', startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not('deal_value', 'is', null)
      .gte('deal_value', 10000)
      .limit(20),

    // High trend velocity content
    supabase
      .from('nil_content')
      .select('tags, entities_mentioned, trend_velocity')
      .eq('is_active', true)
      .gte('published_at', startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .gte('trend_velocity', 2)
      .limit(30)
  ])

  // Process trending topics from content
  const trendingTerms = {}

  // Weight terms from high-importance content
  recentContent?.forEach(content => {
    const weight = (content.importance_score || 50) / 50

    content.tags?.forEach(tag => {
      trendingTerms[tag] = (trendingTerms[tag] || 0) + weight
    })

    content.entities_mentioned?.forEach(entity => {
      trendingTerms[entity] = (trendingTerms[entity] || 0) + weight
    })
  })

  // Weight terms from high trend velocity content
  highVelocityContent?.forEach(content => {
    const weight = content.trend_velocity || 1

    content.tags?.forEach(tag => {
      trendingTerms[tag] = (trendingTerms[tag] || 0) + weight
    })

    content.entities_mentioned?.forEach(entity => {
      trendingTerms[entity] = (trendingTerms[entity] || 0) + weight
    })
  })

  // Add trending terms from recent deals
  recentDeals?.forEach(deal => {
    const weight = deal.deal_value ? Math.log10(deal.deal_value) / 3 : 1

    if (deal.athlete_name) {
      trendingTerms[deal.athlete_name] = (trendingTerms[deal.athlete_name] || 0) + weight
    }
    if (deal.brand) {
      trendingTerms[deal.brand] = (trendingTerms[deal.brand] || 0) + weight
    }
    if (deal.school) {
      trendingTerms[deal.school] = (trendingTerms[deal.school] || 0) + weight
    }
  })

  // Sort and format trending terms
  const trendingList = Object.entries(trendingTerms)
    .sort(([,a], [,b]) => b - a)
    .slice(0, parseInt(limit))
    .map(([term, score], index) => ({
      rank: index + 1,
      term,
      score: Math.round(score * 100) / 100,
      category: 'trending'
    }))

  // Get popular categories
  const categoryFrequency = {}
  recentContent?.forEach(content => {
    if (content.primary_category) {
      categoryFrequency[content.primary_category] = (categoryFrequency[content.primary_category] || 0) + 1
    }
  })

  const trendingCategories = Object.entries(categoryFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category, count], index) => ({
      rank: index + 1,
      term: category,
      count,
      category: 'content_category'
    }))

  res.json({
    success: true,
    data: {
      timeframe,
      trending_terms: trendingList,
      trending_categories: trendingCategories,
      generated_at: new Date().toISOString()
    }
  })
}))

/**
 * POST /api/v1/search/save
 * Save a search query for later reference
 */
router.post('/save', asyncHandler(async (req, res) => {
  const {
    name,
    query,
    filters = {},
    description
  } = req.body

  if (!name || !query) {
    return res.status(400).json({
      success: false,
      error: 'Search name and query are required'
    })
  }

  const { data: savedSearch, error } = await supabase
    .from('nil_saved_searches')
    .insert({
      user_id: req.user.id,
      name,
      query,
      filters,
      description,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to save search:', error)
    throw new Error('Failed to save search')
  }

  logger.logActivity('search_saved', req.user.id, {
    search_id: savedSearch.id,
    search_name: name,
    query
  })

  res.status(201).json({
    success: true,
    data: savedSearch
  })
}))

/**
 * GET /api/v1/search/saved
 * Get user's saved searches
 */
router.get('/saved', asyncHandler(async (req, res) => {
  const { data: savedSearches, error } = await supabase
    .from('nil_saved_searches')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Failed to fetch saved searches:', error)
    throw new Error('Failed to fetch saved searches')
  }

  res.json({
    success: true,
    data: savedSearches || []
  })
}))

export default router