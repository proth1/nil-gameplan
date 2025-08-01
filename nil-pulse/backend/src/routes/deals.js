import express from 'express'
import { supabase } from '../server.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { adminOnly } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * GET /api/v1/deals
 * Get NIL deals with filtering and pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sport,
    athlete,
    school,
    brand,
    min_value,
    max_value,
    state_code,
    deal_type,
    announced_after,
    announced_before,
    sort_by = 'announced_date',
    sort_order = 'desc'
  } = req.query

  const offset = (parseInt(page) - 1) * parseInt(limit)

  let query = supabase
    .from('nil_deals')
    .select('*', { count: 'exact' })
    .range(offset, offset + parseInt(limit) - 1)

  // Apply filters
  if (sport) {
    query = query.eq('sport', sport)
  }

  if (athlete) {
    query = query.ilike('athlete_name', `%${athlete}%`)
  }

  if (school) {
    query = query.ilike('school', `%${school}%`)
  }

  if (brand) {
    query = query.ilike('brand', `%${brand}%`)
  }

  if (min_value) {
    query = query.gte('deal_value', parseInt(min_value))
  }

  if (max_value) {
    query = query.lte('deal_value', parseInt(max_value))
  }

  if (state_code) {
    query = query.eq('state_code', state_code.toUpperCase())
  }

  if (deal_type) {
    query = query.eq('deal_type', deal_type)
  }

  if (announced_after) {
    query = query.gte('announced_date', announced_after)
  }

  if (announced_before) {
    query = query.lte('announced_date', announced_before)
  }

  // Apply sorting
  const validSortFields = ['announced_date', 'deal_value', 'athlete_name', 'brand', 'school']
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'announced_date'
  const sortDirection = sort_order === 'asc' ? 'asc' : 'desc'
  
  query = query.order(sortField, { ascending: sortDirection === 'asc' })

  const { data: deals, error, count } = await query

  if (error) {
    logger.error('Failed to fetch deals:', error)
    throw new Error('Failed to fetch deals')
  }

  const totalPages = Math.ceil(count / parseInt(limit))

  res.json({
    success: true,
    data: {
      data: deals || [],
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
 * GET /api/v1/deals/leaderboard
 * Get deal leaderboard with various rankings
 */
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const {
    type = 'athlete',
    timeframe = 'all',
    sport,
    limit = 10
  } = req.query

  let startDate = null
  if (timeframe === '30d') {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '7d') {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '1y') {
    startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  }

  let query = supabase
    .from('nil_deals')
    .select('*')
    .not('deal_value', 'is', null)
    .order('deal_value', { ascending: false })
    .limit(parseInt(limit))

  if (startDate) {
    query = query.gte('announced_date', startDate)
  }

  if (sport) {
    query = query.eq('sport', sport)
  }

  const { data: deals, error } = await query

  if (error) {
    logger.error('Failed to fetch deal leaderboard:', error)
    throw new Error('Failed to fetch deal leaderboard')
  }

  // Process data based on leaderboard type
  let leaderboard = []

  if (type === 'athlete') {
    // Group by athlete and sum deal values
    const athleteMap = {}
    deals?.forEach(deal => {
      const key = deal.athlete_name
      if (!athleteMap[key]) {
        athleteMap[key] = {
          athlete_name: deal.athlete_name,
          sport: deal.sport,
          school: deal.school,
          total_value: 0,
          deal_count: 0,
          avg_deal_value: 0,
          biggest_deal: 0,
          deals: []
        }
      }
      athleteMap[key].total_value += deal.deal_value
      athleteMap[key].deal_count += 1
      athleteMap[key].biggest_deal = Math.max(athleteMap[key].biggest_deal, deal.deal_value)
      athleteMap[key].deals.push({
        id: deal.id,
        brand: deal.brand,
        deal_value: deal.deal_value,
        announced_date: deal.announced_date
      })
    })

    leaderboard = Object.values(athleteMap).map(athlete => ({
      ...athlete,
      avg_deal_value: Math.round(athlete.total_value / athlete.deal_count)
    })).sort((a, b) => b.total_value - a.total_value)

  } else if (type === 'school') {
    // Group by school
    const schoolMap = {}
    deals?.forEach(deal => {
      const key = deal.school
      if (!schoolMap[key]) {
        schoolMap[key] = {
          school: deal.school,
          state_code: deal.state_code,
          total_value: 0,
          deal_count: 0,
          athlete_count: new Set(),
          avg_deal_value: 0
        }
      }
      schoolMap[key].total_value += deal.deal_value
      schoolMap[key].deal_count += 1
      schoolMap[key].athlete_count.add(deal.athlete_name)
    })

    leaderboard = Object.values(schoolMap).map(school => ({
      ...school,
      athlete_count: school.athlete_count.size,
      avg_deal_value: Math.round(school.total_value / school.deal_count)
    })).sort((a, b) => b.total_value - a.total_value)

  } else if (type === 'brand') {
    // Group by brand
    const brandMap = {}
    deals?.forEach(deal => {
      const key = deal.brand
      if (!brandMap[key]) {
        brandMap[key] = {
          brand: deal.brand,
          total_value: 0,
          deal_count: 0,
          athlete_count: new Set(),
          avg_deal_value: 0
        }
      }
      brandMap[key].total_value += deal.deal_value
      brandMap[key].deal_count += 1
      brandMap[key].athlete_count.add(deal.athlete_name)
    })

    leaderboard = Object.values(brandMap).map(brand => ({
      ...brand,
      athlete_count: brand.athlete_count.size,
      avg_deal_value: Math.round(brand.total_value / brand.deal_count)
    })).sort((a, b) => b.total_value - a.total_value)

  } else {
    // Default: individual deals
    leaderboard = deals || []
  }

  res.json({
    success: true,
    data: {
      type,
      timeframe,
      leaderboard: leaderboard.slice(0, parseInt(limit))
    }
  })
}))

/**
 * GET /api/v1/deals/:id
 * Get specific deal details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params

  const { data: deal, error } = await supabase
    .from('nil_deals')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !deal) {
    return res.status(404).json({
      success: false,
      error: 'Deal not found'
    })
  }

  // Get related content about this deal
  const { data: relatedContent } = await supabase
    .from('nil_content')
    .select('id, title, url, published_at, importance_score')
    .or(`athlete_name.ilike.%${deal.athlete_name}%,brand.ilike.%${deal.brand}%`)
    .eq('is_active', true)
    .order('published_at', { ascending: false })
    .limit(5)

  // Log deal view
  logger.logActivity('deal_viewed', req.user.id, {
    deal_id: id,
    athlete_name: deal.athlete_name,
    brand: deal.brand
  })

  res.json({
    success: true,
    data: {
      ...deal,
      related_content: relatedContent || []
    }
  })
}))

/**
 * POST /api/v1/deals
 * Create new deal (admin only)
 */
router.post('/', adminOnly, asyncHandler(async (req, res) => {
  const {
    athlete_name,
    sport,
    school,
    state_code,
    brand,
    deal_type,
    deal_value,
    deal_description,
    announced_date,
    effective_date,
    duration_months,
    verified_status = 'unverified',
    source_url,
    tags = []
  } = req.body

  // Validate required fields
  if (!athlete_name || !sport || !school || !brand || !deal_type) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: athlete_name, sport, school, brand, deal_type'
    })
  }

  const { data: newDeal, error } = await supabase
    .from('nil_deals')
    .insert({
      athlete_name,
      sport,
      school,
      state_code: state_code?.toUpperCase(),
      brand,
      deal_type,
      deal_value,
      deal_description,
      announced_date: announced_date || new Date().toISOString().split('T')[0],
      effective_date,
      duration_months,
      verified_status,
      source_url,
      tags,
      created_by: req.user.id
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to create deal:', error)
    throw new Error('Failed to create deal')
  }

  logger.logActivity('deal_created', req.user.id, {
    deal_id: newDeal.id,
    athlete_name: newDeal.athlete_name,
    brand: newDeal.brand,
    deal_value: newDeal.deal_value
  })

  res.status(201).json({
    success: true,
    data: newDeal
  })
}))

/**
 * PUT /api/v1/deals/:id
 * Update deal (admin only)
 */
router.put('/:id', adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params
  const updates = { ...req.body }

  // Remove fields that shouldn't be updated directly
  delete updates.id
  delete updates.created_at
  delete updates.created_by

  // Add update timestamp
  updates.updated_at = new Date().toISOString()

  const { data: updatedDeal, error } = await supabase
    .from('nil_deals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('Failed to update deal:', error)
    throw new Error('Failed to update deal')
  }

  if (!updatedDeal) {
    return res.status(404).json({
      success: false,
      error: 'Deal not found'
    })
  }

  logger.logActivity('deal_updated', req.user.id, {
    deal_id: id,
    athlete_name: updatedDeal.athlete_name,
    brand: updatedDeal.brand
  })

  res.json({
    success: true,
    data: updatedDeal
  })
}))

/**
 * GET /api/v1/deals/meta/options
 * Get available options for deal filtering
 */
router.get('/meta/options', asyncHandler(async (req, res) => {
  const [
    { data: sports },
    { data: schools },
    { data: brands },
    { data: states }
  ] = await Promise.all([
    // Get available sports
    supabase
      .from('nil_deals')
      .select('sport')
      .not('sport', 'is', null),

    // Get available schools
    supabase
      .from('nil_deals')
      .select('school')
      .not('school', 'is', null),

    // Get available brands
    supabase
      .from('nil_deals')
      .select('brand')
      .not('brand', 'is', null),

    // Get available states
    supabase
      .from('nil_deals')
      .select('state_code')
      .not('state_code', 'is', null)
  ])

  const uniqueSports = [...new Set(sports?.map(s => s.sport))].filter(Boolean).sort()
  const uniqueSchools = [...new Set(schools?.map(s => s.school))].filter(Boolean).sort()
  const uniqueBrands = [...new Set(brands?.map(b => b.brand))].filter(Boolean).sort()
  const uniqueStates = [...new Set(states?.map(s => s.state_code))].filter(Boolean).sort()

  const dealTypes = [
    { value: 'endorsement', label: 'Endorsement' },
    { value: 'appearance', label: 'Appearance' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'autograph', label: 'Autograph Session' },
    { value: 'camp', label: 'Camp/Clinic' },
    { value: 'merchandise', label: 'Merchandise' },
    { value: 'other', label: 'Other' }
  ]

  res.json({
    success: true,
    data: {
      sports: uniqueSports.map(s => ({ value: s, label: s })),
      schools: uniqueSchools.map(s => ({ value: s, label: s })),
      brands: uniqueBrands.map(b => ({ value: b, label: b })),
      states: uniqueStates.map(s => ({ value: s, label: s })),
      deal_types: dealTypes,
      verified_statuses: [
        { value: 'verified', label: 'Verified' },
        { value: 'pending', label: 'Pending Verification' },
        { value: 'unverified', label: 'Unverified' },
        { value: 'disputed', label: 'Disputed' }
      ]
    }
  })
}))

/**
 * GET /api/v1/deals/stats
 * Get deal statistics
 */
router.get('/meta/stats', asyncHandler(async (req, res) => {
  const { timeframe = '30d' } = req.query
  
  let startDate = null
  if (timeframe === '7d') {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '30d') {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '1y') {
    startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  }

  const [
    { data: totalDeals, count: totalCount },
    { data: recentDeals, count: recentCount },
    { data: dealValues },
    { data: sportBreakdown },
    { data: stateBreakdown }
  ] = await Promise.all([
    // Total deals
    supabase
      .from('nil_deals')
      .select('id', { count: 'exact', head: true }),

    // Recent deals  
    supabase
      .from('nil_deals')
      .select('id', { count: 'exact', head: true })
      .gte('announced_date', startDate || '2021-01-01'),

    // Deal value stats
    supabase
      .from('nil_deals')
      .select('deal_value')
      .not('deal_value', 'is', null)
      .gte('announced_date', startDate || '2021-01-01'),

    // Sport breakdown
    supabase
      .from('nil_deals')  
      .select('sport')
      .gte('announced_date', startDate || '2021-01-01'),

    // State breakdown
    supabase
      .from('nil_deals')
      .select('state_code')
      .not('state_code', 'is', null)
      .gte('announced_date', startDate || '2021-01-01')
  ])

  // Calculate value statistics
  const values = dealValues?.map(d => d.deal_value).filter(Boolean) || []
  const totalValue = values.reduce((sum, val) => sum + val, 0)
  const avgValue = values.length > 0 ? Math.round(totalValue / values.length) : 0
  const maxValue = values.length > 0 ? Math.max(...values) : 0
  const minValue = values.length > 0 ? Math.min(...values) : 0

  // Process sport breakdown
  const sportStats = {}
  sportBreakdown?.forEach(deal => {
    if (deal.sport) {
      sportStats[deal.sport] = (sportStats[deal.sport] || 0) + 1
    }
  })

  // Process state breakdown
  const stateStats = {}
  stateBreakdown?.forEach(deal => {
    if (deal.state_code) {
      stateStats[deal.state_code] = (stateStats[deal.state_code] || 0) + 1
    }
  })

  res.json({
    success: true,
    data: {
      timeframe,
      total_deals: totalCount || 0,
      recent_deals: recentCount || 0,
      deal_values: {
        total_value: totalValue,
        avg_value: avgValue,
        max_value: maxValue,
        min_value: minValue,
        deals_with_value: values.length
      },
      sport_breakdown: Object.entries(sportStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([sport, count]) => ({ sport, count })),
      state_breakdown: Object.entries(stateStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([state, count]) => ({ state, count }))
    }
  })
}))

export default router