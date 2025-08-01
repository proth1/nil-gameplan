import express from 'express'
import { supabase } from '../server.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { adminOnly, requireAccessLevel } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * GET /api/v1/analytics/overview
 * Get comprehensive analytics overview
 */
router.get('/overview', requireAccessLevel('premium'), asyncHandler(async (req, res) => {
  const { timeframe = '30d' } = req.query
  
  let startDate = null
  let compareStartDate = null
  
  if (timeframe === '7d') {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    compareStartDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '30d') {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    compareStartDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '90d') {
    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    compareStartDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
  } else {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    compareStartDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  }

  const [
    { count: totalContent },
    { count: recentContent },
    { count: compareContent },
    { count: totalDeals },
    { count: recentDeals },
    { count: compareDeals },
    { data: contentByCategory },
    { data: dealsByValue },
    { data: topSources },
    { data: trendingTopics }
  ] = await Promise.all([
    // Total content
    supabase
      .from('nil_content')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Recent content
    supabase
      .from('nil_content')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('published_at', startDate),

    // Compare period content
    supabase
      .from('nil_content')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('published_at', compareStartDate)
      .lt('published_at', startDate),

    // Total deals
    supabase
      .from('nil_deals')
      .select('id', { count: 'exact', head: true }),

    // Recent deals
    supabase
      .from('nil_deals')
      .select('id', { count: 'exact', head: true })
      .gte('announced_date', startDate),

    // Compare period deals
    supabase
      .from('nil_deals')
      .select('id', { count: 'exact', head: true })
      .gte('announced_date', compareStartDate)
      .lt('announced_date', startDate),

    // Content by category
    supabase
      .from('nil_content')
      .select('primary_category')
      .eq('is_active', true)
      .gte('published_at', startDate),

    // Deal value distribution
    supabase
      .from('nil_deals')
      .select('deal_value, sport')
      .not('deal_value', 'is', null)
      .gte('announced_date', startDate),

    // Top performing sources
    supabase
      .from('nil_content')
      .select('source_id, importance_score, nil_sources(name)')
      .eq('is_active', true)
      .gte('published_at', startDate)
      .gte('importance_score', 70),

    // Trending topics/keywords
    supabase
      .from('nil_content')
      .select('tags, entities_mentioned, trend_velocity')
      .eq('is_active', true)
      .gte('published_at', startDate)
      .gte('trend_velocity', 1)
  ])

  // Process content growth
  const contentGrowth = {
    current: recentContent || 0,
    previous: compareContent || 0,
    change: recentContent && compareContent ? ((recentContent - compareContent) / compareContent * 100) : 0
  }

  // Process deal growth
  const dealGrowth = {
    current: recentDeals || 0,
    previous: compareDeals || 0,
    change: recentDeals && compareDeals ? ((recentDeals - compareDeals) / compareDeals * 100) : 0
  }

  // Process category breakdown
  const categoryStats = {}
  contentByCategory?.forEach(item => {
    categoryStats[item.primary_category] = (categoryStats[item.primary_category] || 0) + 1
  })

  // Process deal value stats
  const dealValues = dealsByValue?.map(d => d.deal_value).filter(Boolean) || []
  const totalDealValue = dealValues.reduce((sum, val) => sum + val, 0)
  const avgDealValue = dealValues.length > 0 ? Math.round(totalDealValue / dealValues.length) : 0

  // Process sport-wise deal breakdown
  const sportStats = {}
  dealsByValue?.forEach(deal => {
    if (deal.sport && deal.deal_value) {
      if (!sportStats[deal.sport]) {
        sportStats[deal.sport] = { count: 0, total_value: 0 }
      }
      sportStats[deal.sport].count += 1
      sportStats[deal.sport].total_value += deal.deal_value
    }
  })

  // Process top sources
  const sourcePerformance = {}
  topSources?.forEach(content => {
    if (content.nil_sources?.name) {
      if (!sourcePerformance[content.nil_sources.name]) {
        sourcePerformance[content.nil_sources.name] = { count: 0, avg_importance: 0, total_importance: 0 }
      }
      sourcePerformance[content.nil_sources.name].count += 1
      sourcePerformance[content.nil_sources.name].total_importance += content.importance_score
    }
  })

  // Calculate average importance for sources
  Object.keys(sourcePerformance).forEach(sourceName => {
    const source = sourcePerformance[sourceName]
    source.avg_importance = Math.round(source.total_importance / source.count)
  })

  // Process trending topics
  const topicFrequency = {}
  trendingTopics?.forEach(content => {
    // Process tags
    content.tags?.forEach(tag => {
      topicFrequency[tag] = (topicFrequency[tag] || 0) + (content.trend_velocity || 1)
    })
    // Process entities
    content.entities_mentioned?.forEach(entity => {
      topicFrequency[entity] = (topicFrequency[entity] || 0) + (content.trend_velocity || 1)
    })
  })

  res.json({
    success: true,
    data: {
      timeframe,
      summary: {
        total_content: totalContent || 0,
        total_deals: totalDeals || 0,
        content_growth: contentGrowth,
        deal_growth: dealGrowth
      },
      content_analytics: {
        by_category: Object.entries(categoryStats)
          .sort(([,a], [,b]) => b - a)
          .map(([category, count]) => ({ category, count })),
        top_sources: Object.entries(sourcePerformance)
          .sort(([,a], [,b]) => b.avg_importance - a.avg_importance)
          .slice(0, 5)
          .map(([name, stats]) => ({ source_name: name, ...stats, total_importance: undefined }))
      },
      deal_analytics: {
        total_value: totalDealValue,
        avg_value: avgDealValue,
        deal_count: dealValues.length,
        by_sport: Object.entries(sportStats)
          .sort(([,a], [,b]) => b.total_value - a.total_value)
          .slice(0, 5)
          .map(([sport, stats]) => ({ sport, ...stats, avg_value: Math.round(stats.total_value / stats.count) }))
      },
      trending_topics: Object.entries(topicFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([topic, velocity]) => ({ topic, velocity }))
    }
  })
}))

/**
 * GET /api/v1/analytics/content-performance
 * Get detailed content performance analytics
 */
router.get('/content-performance', requireAccessLevel('premium'), asyncHandler(async (req, res) => {
  const { 
    timeframe = '30d',
    category,
    source_id,
    limit = 50
  } = req.query

  let startDate = null
  if (timeframe === '7d') {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '30d') {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '90d') {
    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  }

  let query = supabase
    .from('nil_content')
    .select(`
      id, title, published_at, importance_score, sentiment_score, trend_velocity,
      primary_category, jurisdiction, states_mentioned, tags,
      nil_sources(name, category)
    `)
    .eq('is_active', true)
    .order('importance_score', { ascending: false })
    .limit(parseInt(limit))

  if (startDate) {
    query = query.gte('published_at', startDate)
  }

  if (category) {
    query = query.eq('primary_category', category)
  }

  if (source_id) {
    query = query.eq('source_id', source_id)
  }

  const { data: content, error } = await query

  if (error) {
    logger.error('Failed to fetch content performance:', error)
    throw new Error('Failed to fetch content performance')
  }

  // Calculate performance metrics
  const totalContent = content?.length || 0
  const avgImportance = totalContent > 0 
    ? Math.round(content.reduce((sum, item) => sum + (item.importance_score || 0), 0) / totalContent)
    : 0
  const avgSentiment = totalContent > 0
    ? Math.round(content.reduce((sum, item) => sum + (item.sentiment_score || 0), 0) / totalContent * 100) / 100
    : 0
  const avgVelocity = totalContent > 0
    ? Math.round(content.reduce((sum, item) => sum + (item.trend_velocity || 0), 0) / totalContent * 100) / 100
    : 0

  // Top performing content
  const topContent = content?.slice(0, 10) || []

  // Performance by jurisdiction
  const jurisdictionStats = {}
  content?.forEach(item => {
    if (item.jurisdiction) {
      if (!jurisdictionStats[item.jurisdiction]) {
        jurisdictionStats[item.jurisdiction] = {
          count: 0,
          avg_importance: 0,
          total_importance: 0
        }
      }
      jurisdictionStats[item.jurisdiction].count += 1
      jurisdictionStats[item.jurisdiction].total_importance += item.importance_score || 0
    }
  })

  Object.keys(jurisdictionStats).forEach(jurisdiction => {
    const stats = jurisdictionStats[jurisdiction]
    stats.avg_importance = Math.round(stats.total_importance / stats.count)
    delete stats.total_importance
  })

  res.json({
    success: true,
    data: {
      timeframe,
      filters: { category, source_id },
      summary: {
        total_content: totalContent,
        avg_importance_score: avgImportance,
        avg_sentiment_score: avgSentiment,
        avg_trend_velocity: avgVelocity
      },
      top_performing_content: topContent,
      performance_by_jurisdiction: Object.entries(jurisdictionStats)
        .sort(([,a], [,b]) => b.avg_importance - a.avg_importance)
        .map(([jurisdiction, stats]) => ({ jurisdiction, ...stats }))
    }
  })
}))

/**
 * GET /api/v1/analytics/deal-trends
 * Get NIL deal trend analysis
 */
router.get('/deal-trends', requireAccessLevel('premium'), asyncHandler(async (req, res) => {
  const { 
    timeframe = '30d',
    sport,
    state_code,
    group_by = 'month'
  } = req.query

  let startDate = null
  if (timeframe === '7d') {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '30d') {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '90d') {
    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '1y') {
    startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  }

  let query = supabase
    .from('nil_deals')
    .select('*')
    .order('announced_date', { ascending: true })

  if (startDate) {
    query = query.gte('announced_date', startDate)
  }

  if (sport) {
    query = query.eq('sport', sport)
  }

  if (state_code) {
    query = query.eq('state_code', state_code.toUpperCase())
  }

  const { data: deals, error } = await query

  if (error) {
    logger.error('Failed to fetch deal trends:', error)
    throw new Error('Failed to fetch deal trends')
  }

  // Process time-series data
  const timeSeriesData = {}
  const dealValueData = {}
  const sportTrends = {}

  deals?.forEach(deal => {
    const date = new Date(deal.announced_date)
    let timeKey = ''

    if (group_by === 'day') {
      timeKey = date.toISOString().split('T')[0]
    } else if (group_by === 'week') {
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay())
      timeKey = startOfWeek.toISOString().split('T')[0]
    } else { // month
      timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    }

    // Deal count trends
    if (!timeSeriesData[timeKey]) {
      timeSeriesData[timeKey] = { count: 0, total_value: 0, avg_value: 0 }
    }
    timeSeriesData[timeKey].count += 1

    // Deal value trends
    if (deal.deal_value) {
      timeSeriesData[timeKey].total_value += deal.deal_value
      timeSeriesData[timeKey].avg_value = Math.round(timeSeriesData[timeKey].total_value / timeSeriesData[timeKey].count)
    }

    // Sport trends
    if (deal.sport) {
      if (!sportTrends[deal.sport]) {
        sportTrends[deal.sport] = {}
      }
      if (!sportTrends[deal.sport][timeKey]) {
        sportTrends[deal.sport][timeKey] = { count: 0, total_value: 0 }
      }
      sportTrends[deal.sport][timeKey].count += 1
      if (deal.deal_value) {
        sportTrends[deal.sport][timeKey].total_value += deal.deal_value
      }
    }
  })

  // Format time series for response
  const formattedTimeSeries = Object.entries(timeSeriesData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({ period, ...data }))

  // Format sport trends
  const formattedSportTrends = Object.entries(sportTrends).map(([sport, periods]) => ({
    sport,
    data: Object.entries(periods)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({ period, ...data }))
  }))

  res.json({
    success: true,
    data: {
      timeframe,
      group_by,
      filters: { sport, state_code },
      time_series: formattedTimeSeries,
      sport_trends: formattedSportTrends.slice(0, 5), // Top 5 sports
      summary: {
        total_deals: deals?.length || 0,
        total_value: deals?.reduce((sum, deal) => sum + (deal.deal_value || 0), 0) || 0,
        avg_deal_value: deals?.filter(d => d.deal_value).length > 0 
          ? Math.round(deals.filter(d => d.deal_value).reduce((sum, deal) => sum + deal.deal_value, 0) / deals.filter(d => d.deal_value).length)
          : 0
      }
    }
  })
}))

/**
 * GET /api/v1/analytics/user-engagement
 * Get user engagement analytics (admin only)
 */
router.get('/user-engagement', adminOnly, asyncHandler(async (req, res) => {
  const { timeframe = '30d' } = req.query

  let startDate = null
  if (timeframe === '7d') {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '30d') {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '90d') {
    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  }

  const [
    { count: totalUsers },
    { count: activeUsers },
    { data: alertStats },
    { data: activityStats }
  ] = await Promise.all([
    // Total users
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Active users in timeframe
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('last_active', startDate || '2021-01-01'),

    // Alert engagement
    supabase
      .from('nil_user_alerts')
      .select('user_id, is_active, trigger_count, created_at')
      .gte('created_at', startDate || '2021-01-01'),

    // User activity log (if available)
    supabase
      .from('user_activity_log')
      .select('user_id, activity_type, created_at')
      .gte('created_at', startDate || '2021-01-01')
      .limit(10000)
  ])

  // Process alert engagement
  let alertEngagement = {
    total_alerts: alertStats?.length || 0,
    active_alerts: alertStats?.filter(alert => alert.is_active).length || 0,
    avg_triggers_per_alert: 0
  }

  if (alertStats?.length > 0) {
    const totalTriggers = alertStats.reduce((sum, alert) => sum + (alert.trigger_count || 0), 0)
    alertEngagement.avg_triggers_per_alert = Math.round(totalTriggers / alertStats.length * 100) / 100
  }

  // Process activity types
  const activityBreakdown = {}
  activityStats?.forEach(activity => {
    activityBreakdown[activity.activity_type] = (activityBreakdown[activity.activity_type] || 0) + 1
  })

  res.json({
    success: true,
    data: {
      timeframe,
      user_metrics: {
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        engagement_rate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100 * 100) / 100 : 0
      },
      alert_engagement: alertEngagement,
      activity_breakdown: Object.entries(activityBreakdown)
        .sort(([,a], [,b]) => b - a)
        .map(([activity_type, count]) => ({ activity_type, count }))
    }
  })
}))

/**
 * GET /api/v1/analytics/export
 * Export analytics data (admin only)
 */
router.get('/export', adminOnly, asyncHandler(async (req, res) => {
  const { 
    type = 'content',
    timeframe = '30d',
    format = 'json'
  } = req.query

  let startDate = null
  if (timeframe === '7d') {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '30d') {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframe === '90d') {
    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  }

  let data = []
  let filename = `nil-pulse-${type}-export-${new Date().toISOString().split('T')[0]}`

  if (type === 'content') {
    const { data: content, error } = await supabase
      .from('nil_content')
      .select(`
        id, title, summary, author, url, published_at, processed_at,
        primary_category, secondary_categories, jurisdiction, states_mentioned,
        sentiment_score, importance_score, trend_velocity, tags,
        nil_sources(name, category)
      `)
      .eq('is_active', true)
      .gte('published_at', startDate || '2021-01-01')
      .order('published_at', { ascending: false })

    if (error) {
      throw new Error('Failed to export content data')
    }

    data = content || []
  } else if (type === 'deals') {
    const { data: deals, error } = await supabase
      .from('nil_deals')
      .select('*')
      .gte('announced_date', startDate || '2021-01-01')
      .order('announced_date', { ascending: false })

    if (error) {
      throw new Error('Failed to export deals data')
    }

    data = deals || []
    filename = `nil-pulse-deals-export-${new Date().toISOString().split('T')[0]}`
  }

  logger.logActivity('analytics_exported', req.user.id, {
    export_type: type,
    timeframe,
    format,
    record_count: data.length
  })

  if (format === 'csv') {
    // Convert to CSV format
    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No data available for export'
      })
    }

    const headers = Object.keys(data[0]).filter(key => typeof data[0][key] !== 'object')
    const csvData = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
    res.send(csvData)
  } else {
    // JSON format
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`)
    res.json({
      success: true,
      export_info: {
        type,
        timeframe,
        exported_at: new Date().toISOString(),
        record_count: data.length
      },
      data
    })
  }
}))

export default router