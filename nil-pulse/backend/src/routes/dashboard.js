import express from 'express'
import { supabase } from '../server.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * GET /api/v1/dashboard/summary
 * Get comprehensive dashboard summary with pulse data
 */
router.get('/summary', asyncHandler(async (req, res) => {
  const hoursBack = parseInt(req.query.hours) || 24
  
  logger.logActivity('dashboard_summary_viewed', req.user.id, { hoursBack })

  // Call the database function to get NIL Pulse summary
  const { data: summary, error } = await supabase
    .rpc('get_nil_pulse_summary', { hours_back: hoursBack })

  if (error) {
    logger.error('Failed to get dashboard summary:', error)
    throw new Error('Failed to fetch dashboard summary')
  }

  // Get additional metrics
  const [
    { data: recentContent },
    { data: activeAlerts },
    { data: trendingTopics },
    { data: stateActivity }
  ] = await Promise.all([
    // Recent high-impact content
    supabase
      .from('nil_content')
      .select('id, title, published_at, importance_score, primary_category, url')
      .gte('published_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .gte('importance_score', 70)
      .order('importance_score', { ascending: false })
      .limit(10),

    // User's active alerts count
    supabase
      .from('nil_user_alerts')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('is_active', true),

    // Top trending topics
    supabase
      .from('nil_trends')
      .select('trend_key, velocity, mention_count')
      .gte('period_start', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .order('velocity', { ascending: false })
      .limit(5),

    // State activity summary
    supabase
      .from('nil_content')
      .select('states_mentioned')
      .gte('published_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .not('states_mentioned', 'is', null)
  ])

  // Process state activity
  const stateActivityMap = {}
  if (stateActivity) {
    stateActivity.forEach(item => {
      if (item.states_mentioned) {
        item.states_mentioned.forEach(state => {
          stateActivityMap[state] = (stateActivityMap[state] || 0) + 1
        })
      }
    })
  }

  const response = {
    summary: summary || {
      new_laws: 0,
      big_deals: 0,
      total_content: 0,
      hot_topics: [],
      active_states: 0,
      top_athletes: []
    },
    recentContent: recentContent || [],
    userAlerts: {
      active: activeAlerts?.length || 0,
      triggered_today: 0 // Would need separate query
    },
    trendingTopics: trendingTopics || [],
    stateActivity: Object.entries(stateActivityMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([state, count]) => ({ state, activity: count })),
    metadata: {
      generated_at: new Date().toISOString(),
      period_hours: hoursBack,
      user_role: req.user.role,
      user_access_level: req.user.access_level
    }
  }

  res.json({
    success: true,
    data: response
  })
}))

/**
 * GET /api/v1/dashboard/pulse
 * Get real-time pulse indicators and alerts
 */
router.get('/pulse', asyncHandler(async (req, res) => {
  const windowMinutes = parseInt(req.query.window) || 60

  // Get recent high-velocity trends
  const { data: hotTrends } = await supabase
    .from('nil_trends')
    .select('trend_key, velocity, acceleration, mention_count, trend_category')
    .gte('period_start', new Date(Date.now() - windowMinutes * 60 * 1000).toISOString())
    .gt('velocity', 1) // Only trends with significant velocity
    .order('acceleration', { ascending: false })
    .limit(10)

  // Get breaking news (high importance, recent)
  const { data: breakingNews } = await supabase
    .from('nil_content')
    .select('id, title, summary, published_at, importance_score, primary_category, url, source_id')
    .gte('published_at', new Date(Date.now() - windowMinutes * 60 * 1000).toISOString())
    .gte('importance_score', 80)
    .order('published_at', { ascending: false })
    .limit(5)

  // Get market gaps that need attention
  const { data: marketGaps } = await supabase
    .from('nil_market_gaps')
    .select('gap_type, gap_description, severity, detected_at')
    .eq('status', 'identified')
    .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('severity', { ascending: false })
    .limit(5)

  // Get recent big deals
  const { data: bigDeals } = await supabase
    .from('nil_deals')
    .select('athlete_name, brand_name, deal_value, sport, announced_date')
    .gte('announced_date', new Date(Date.now() - windowMinutes * 60 * 1000).toISOString())
    .gte('deal_value', 100000)
    .order('deal_value', { ascending: false })
    .limit(5)

  // Calculate pulse score (0-100 based on activity levels)
  const contentVolume = breakingNews?.length || 0
  const trendIntensity = hotTrends?.reduce((sum, trend) => sum + trend.velocity, 0) || 0
  const dealActivity = bigDeals?.length || 0
  const gapSeverity = marketGaps?.filter(gap => gap.severity === 'high').length || 0

  const pulseScore = Math.min(100, Math.round(
    (contentVolume * 10) + 
    (trendIntensity * 2) + 
    (dealActivity * 15) + 
    (gapSeverity * 20)
  ))

  const pulseLevel = pulseScore >= 80 ? 'high' : 
                    pulseScore >= 50 ? 'medium' : 
                    pulseScore >= 20 ? 'low' : 'minimal'

  res.json({
    success: true,
    data: {
      pulse: {
        score: pulseScore,
        level: pulseLevel,
        generated_at: new Date().toISOString(),
        window_minutes: windowMinutes
      },
      indicators: {
        content_volume: contentVolume,
        trend_intensity: Math.round(trendIntensity * 100) / 100,
        deal_activity: dealActivity,
        market_gaps: marketGaps?.length || 0
      },
      hot_trends: hotTrends || [],
      breaking_news: breakingNews || [],
      big_deals: bigDeals || [],
      market_gaps: marketGaps || []
    }
  })
}))

/**
 * GET /api/v1/dashboard/timeline
 * Get timeline of recent major events
 */
router.get('/timeline', asyncHandler(async (req, res) => {
  const daysBack = parseInt(req.query.days) || 7
  const category = req.query.category // optional filter

  let query = supabase
    .from('nil_content')
    .select(`
      id, title, summary, published_at, importance_score, 
      primary_category, url, author, entities_mentioned,
      nil_sources(name, category)
    `)
    .gte('published_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
    .gte('importance_score', 60)
    .order('published_at', { ascending: false })
    .limit(50)

  if (category) {
    query = query.eq('primary_category', category)
  }

  const { data: timelineEvents, error } = await query

  if (error) {
    logger.error('Failed to get timeline:', error)
    throw new Error('Failed to fetch timeline')
  }

  // Group events by date
  const groupedEvents = {}
  timelineEvents?.forEach(event => {
    const date = new Date(event.published_at).toISOString().split('T')[0]
    if (!groupedEvents[date]) {
      groupedEvents[date] = []
    }
    groupedEvents[date].push(event)
  })

  res.json({
    success: true,
    data: {
      timeline: groupedEvents,
      total_events: timelineEvents?.length || 0,
      period_days: daysBack,
      categories_available: [
        'legislation', 'litigation', 'enforcement', 'deals', 
        'collectives', 'high_school', 'womens_sports', 'policy', 
        'compliance', 'market_analysis'
      ]
    }
  })
}))

/**
 * GET /api/v1/dashboard/widgets/:widgetId/data
 * Get data for specific dashboard widgets
 */
router.get('/widgets/:widgetId/data', asyncHandler(async (req, res) => {
  const { widgetId } = req.params
  const timeframe = req.query.timeframe || '24h'

  // Convert timeframe to hours
  const hours = timeframe === '7d' ? 168 : 
                timeframe === '30d' ? 720 : 
                timeframe === '1h' ? 1 : 24

  let widgetData = {}

  switch (widgetId) {
    case 'deals-leaderboard':
      const { data: deals } = await supabase
        .from('nil_deals')
        .select('athlete_name, brand_name, deal_value, sport, announced_date')
        .gte('announced_date', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('deal_value', { ascending: false })
        .limit(10)
      
      widgetData = { deals: deals || [] }
      break

    case 'state-activity-map':
      const { data: stateData } = await supabase
        .from('nil_content')
        .select('states_mentioned')
        .gte('published_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .not('states_mentioned', 'is', null)
      
      const stateActivity = {}
      stateData?.forEach(item => {
        item.states_mentioned?.forEach(state => {
          stateActivity[state] = (stateActivity[state] || 0) + 1
        })
      })
      
      widgetData = { stateActivity }
      break

    case 'trending-topics':
      const { data: trends } = await supabase
        .from('nil_trends')
        .select('trend_key, velocity, mention_count, trend_category')
        .gte('period_start', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('velocity', { ascending: false })
        .limit(10)
      
      widgetData = { trends: trends || [] }
      break

    default:
      return res.status(404).json({
        success: false,
        error: 'Widget not found',
        message: `Widget '${widgetId}' does not exist`
      })
  }

  res.json({
    success: true,
    data: {
      widget_id: widgetId,
      timeframe,
      generated_at: new Date().toISOString(),
      ...widgetData
    }
  })
}))

export default router