import express from 'express'
import { supabase } from '../server.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * GET /api/v1/trends
 * Get trending topics and analysis
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    trend_type = 'topic',
    period_hours = 24,
    limit = 20
  } = req.query

  const periodStart = new Date(Date.now() - parseInt(period_hours) * 60 * 60 * 1000).toISOString()

  const { data: trends, error } = await supabase
    .from('nil_trends')
    .select('*')
    .eq('trend_type', trend_type)
    .gte('period_start', periodStart)
    .order('velocity', { ascending: false })
    .limit(parseInt(limit))

  if (error) {
    logger.error('Failed to fetch trends:', error)
    throw new Error('Failed to fetch trends')
  }

  res.json({
    success: true,
    data: trends || []
  })
}))

/**
 * GET /api/v1/trends/hot
 * Get current hot topics
 */
router.get('/hot', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query

  // Get trending topics from the last 24 hours
  const { data: hotTopics, error } = await supabase
    .from('nil_trends')
    .select('*')
    .gte('period_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .gt('velocity', 0.5) // Only topics with significant velocity
    .order('velocity', { ascending: false })
    .limit(parseInt(limit))

  if (error) {
    logger.error('Failed to fetch hot topics:', error)
    throw new Error('Failed to fetch hot topics')
  }

  // If no trends in database, generate from recent content
  if (!hotTopics || hotTopics.length === 0) {
    const { data: recentContent } = await supabase
      .from('nil_content')
      .select('tags, primary_category, importance_score')
      .gte('published_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .gte('importance_score', 60)
      .limit(100)

    // Analyze tags frequency
    const tagFrequency = {}
    recentContent?.forEach(content => {
      content.tags?.forEach(tag => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + (content.importance_score / 100)
      })
    })

    // Convert to hot topics format
    const generatedTopics = Object.entries(tagFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, parseInt(limit))
      .map(([topic, score], index) => ({
        id: `generated-${index}`,
        trend_type: 'topic',
        trend_key: topic,
        mention_count: Math.round(score),
        velocity: score / 10,
        acceleration: 0,
        created_at: new Date().toISOString()
      }))

    return res.json({
      success: true,
      data: generatedTopics
    })
  }

  res.json({
    success: true,
    data: hotTopics
  })
}))

/**
 * GET /api/v1/trends/velocity
 * Get velocity trends over time
 */
router.get('/velocity', asyncHandler(async (req, res) => {
  const { timeframe = '7d' } = req.query
  
  const hours = timeframe === '1d' ? 24 : 
                timeframe === '7d' ? 168 : 
                timeframe === '30d' ? 720 : 168

  const periodStart = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  // Get content velocity over time periods
  const { data: contentByPeriod, error } = await supabase
    .rpc('get_content_velocity_by_period', {
      start_time: periodStart,
      period_hours: Math.max(1, Math.floor(hours / 24))
    })
    .or(
      // Fallback query if RPC doesn't exist
      supabase
        .from('nil_content')
        .select('published_at, importance_score, primary_category')
        .gte('published_at', periodStart)
        .order('published_at')
    )

  if (error) {
    // Fallback: calculate velocity from content
    const { data: content } = await supabase
      .from('nil_content')
      .select('published_at, importance_score, primary_category')
      .gte('published_at', periodStart)
      .order('published_at')

    // Group by time periods
    const periodSize = Math.max(1, Math.floor(hours / 24)) * 60 * 60 * 1000 // Convert to milliseconds
    const velocityData = {}

    content?.forEach(item => {
      const periodKey = new Date(Math.floor(new Date(item.published_at).getTime() / periodSize) * periodSize)
      const key = periodKey.toISOString()
      
      if (!velocityData[key]) {
        velocityData[key] = {
          timestamp: key,
          content_count: 0,
          avg_importance: 0,
          category_breakdown: {}
        }
      }
      
      velocityData[key].content_count += 1
      velocityData[key].avg_importance += item.importance_score
      velocityData[key].category_breakdown[item.primary_category] = 
        (velocityData[key].category_breakdown[item.primary_category] || 0) + 1
    })

    // Calculate averages and velocity
    const velocityPoints = Object.values(velocityData).map(period => ({
      ...period,
      avg_importance: period.content_count > 0 ? period.avg_importance / period.content_count : 0,
      velocity: period.content_count / (periodSize / (60 * 60 * 1000)) // per hour
    }))

    return res.json({
      success: true,
      data: {
        timeframe,
        period_hours: hours,
        velocity_points: velocityPoints
      }
    })
  }

  res.json({
    success: true,
    data: contentByPeriod || []
  })
}))

/**
 * GET /api/v1/trends/gaps
 * Get market gaps analysis
 */
router.get('/gaps', asyncHandler(async (req, res) => {
  const { severity } = req.query

  let query = supabase
    .from('nil_market_gaps')
    .select('*')
    .eq('status', 'identified')
    .order('detected_at', { ascending: false })

  if (severity) {
    query = query.eq('severity', severity)
  }

  const { data: gaps, error } = await query.limit(20)

  if (error) {
    logger.error('Failed to fetch market gaps:', error)
    throw new Error('Failed to fetch market gaps')
  }

  // If no gaps in database, perform basic gap analysis
  if (!gaps || gaps.length === 0) {
    const detectedGaps = await performGapAnalysis()
    
    return res.json({
      success: true,
      data: detectedGaps,
      generated: true
    })
  }

  res.json({
    success: true,
    data: gaps
  })
}))

/**
 * GET /api/v1/trends/categories
 * Get trend analysis by category
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const { period_hours = 24 } = req.query
  
  const periodStart = new Date(Date.now() - parseInt(period_hours) * 60 * 60 * 1000).toISOString()

  const { data: categoryTrends, error } = await supabase
    .from('nil_content')
    .select('primary_category, importance_score, published_at')
    .gte('published_at', periodStart)
    .order('published_at')

  if (error) {
    logger.error('Failed to fetch category trends:', error)
    throw new Error('Failed to fetch category trends')
  }

  // Analyze trends by category
  const categoryAnalysis = {}
  categoryTrends?.forEach(content => {
    const category = content.primary_category
    if (!categoryAnalysis[category]) {
      categoryAnalysis[category] = {
        category,
        content_count: 0,
        total_importance: 0,
        avg_importance: 0,
        trend_direction: 'stable',
        recent_activity: []
      }
    }
    
    categoryAnalysis[category].content_count += 1
    categoryAnalysis[category].total_importance += content.importance_score
    categoryAnalysis[category].recent_activity.push({
      timestamp: content.published_at,
      importance: content.importance_score
    })
  })

  // Calculate averages and trends
  Object.values(categoryAnalysis).forEach(analysis => {
    analysis.avg_importance = analysis.total_importance / analysis.content_count
    
    // Simple trend calculation based on recent vs earlier content
    const midpoint = analysis.recent_activity.length / 2
    const earlierAvg = analysis.recent_activity.slice(0, midpoint)
      .reduce((sum, item) => sum + item.importance, 0) / midpoint
    const recentAvg = analysis.recent_activity.slice(midpoint)
      .reduce((sum, item) => sum + item.importance, 0) / (analysis.recent_activity.length - midpoint)
    
    if (recentAvg > earlierAvg * 1.1) {
      analysis.trend_direction = 'up'
    } else if (recentAvg < earlierAvg * 0.9) {
      analysis.trend_direction = 'down'
    }
    
    delete analysis.total_importance
    delete analysis.recent_activity
  })

  res.json({
    success: true,
    data: Object.values(categoryAnalysis).sort((a, b) => b.avg_importance - a.avg_importance)
  })
}))

/**
 * Helper function to perform basic gap analysis
 */
async function performGapAnalysis() {
  const gaps = []
  
  // Check for geographic gaps
  const { data: stateActivity } = await supabase
    .from('nil_content')
    .select('states_mentioned')
    .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .not('states_mentioned', 'is', null)

  const stateCount = {}
  stateActivity?.forEach(content => {
    content.states_mentioned?.forEach(state => {
      stateCount[state] = (stateCount[state] || 0) + 1
    })
  })

  // Identify states with low coverage
  const allStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']
  
  allStates.forEach(state => {
    const count = stateCount[state] || 0
    if (count < 2) { // Less than 2 mentions in a week
      gaps.push({
        id: `geographic-${state}`,
        gap_type: 'geographic',
        gap_description: `Low NIL coverage for ${state} - only ${count} mentions in the past week`,
        severity: count === 0 ? 'high' : 'medium',
        detected_at: new Date().toISOString()
      })
    }
  })

  // Check for temporal gaps (periods with low activity)
  const { data: recentContent } = await supabase
    .from('nil_content')
    .select('published_at')
    .gte('published_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('published_at')

  const hourlyActivity = {}
  recentContent?.forEach(content => {
    const hour = new Date(content.published_at).getHours()
    hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1
  })

  const avgHourlyActivity = Object.values(hourlyActivity).reduce((sum, count) => sum + count, 0) / 24
  
  for (let hour = 0; hour < 24; hour++) {
    const activity = hourlyActivity[hour] || 0
    if (activity < avgHourlyActivity * 0.3) {
      gaps.push({
        id: `temporal-${hour}`,
        gap_type: 'temporal',
        gap_description: `Low activity during hour ${hour}:00 - only ${activity} items vs average ${avgHourlyActivity.toFixed(1)}`,
        severity: activity === 0 ? 'medium' : 'low',
        detected_at: new Date().toISOString()
      })
    }
  }

  return gaps.slice(0, 10) // Return top 10 gaps
}

export default router