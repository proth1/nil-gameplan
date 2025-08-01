import express from 'express'
import { supabase } from '../server.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { adminOnly } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * GET /api/v1/states
 * Get all state NIL laws
 */
router.get('/', asyncHandler(async (req, res) => {
  const { status, allows_high_school } = req.query

  let query = supabase
    .from('nil_state_laws')
    .select('*')
    .order('state_name')

  if (status) {
    query = query.eq('status', status)
  }

  if (allows_high_school !== undefined) {
    query = query.eq('allows_high_school', allows_high_school === 'true')
  }

  const { data: stateLaws, error } = await query

  if (error) {
    logger.error('Failed to fetch state laws:', error)
    throw new Error('Failed to fetch state laws')
  }

  res.json({
    success: true,
    data: stateLaws || []
  })
}))

/**
 * GET /api/v1/states/:code
 * Get specific state law by state code
 */
router.get('/:code', asyncHandler(async (req, res) => {
  const { code } = req.params

  const { data: stateLaw, error } = await supabase
    .from('nil_state_laws')
    .select('*')
    .eq('state_code', code.toUpperCase())
    .single()

  if (error || !stateLaw) {
    return res.status(404).json({
      success: false,
      error: 'State law not found'
    })
  }

  // Get related content for this state
  const { data: relatedContent } = await supabase
    .from('nil_content')
    .select('id, title, published_at, importance_score, primary_category, url')
    .contains('states_mentioned', [code.toUpperCase()])
    .eq('is_active', true)
    .order('published_at', { ascending: false })
    .limit(10)

  res.json({
    success: true,
    data: {
      ...stateLaw,
      related_content: relatedContent || []
    }
  })
}))

/**
 * GET /api/v1/states/:code/timeline
 * Get timeline of changes for specific state law
 */
router.get('/:code/timeline', asyncHandler(async (req, res) => {
  const { code } = req.params

  const { data: stateLaw, error } = await supabase
    .from('nil_state_laws')
    .select('state_name, version_history, created_at, updated_at, effective_date')
    .eq('state_code', code.toUpperCase())
    .single()

  if (error || !stateLaw) {
    return res.status(404).json({
      success: false,
      error: 'State law not found'
    })
  }

  // Build timeline from version history and key dates
  const timeline = []

  // Add creation date
  timeline.push({
    date: stateLaw.created_at,
    event_type: 'created',
    title: 'Law Record Created',
    description: `${stateLaw.state_name} NIL law information added to database`
  })

  // Add effective date if available
  if (stateLaw.effective_date) {
    timeline.push({
      date: stateLaw.effective_date,
      event_type: 'effective',
      title: 'Law Became Effective',
      description: `${stateLaw.state_name} NIL law took effect`
    })
  }

  // Add version history
  if (stateLaw.version_history && Array.isArray(stateLaw.version_history)) {
    stateLaw.version_history.forEach(version => {
      timeline.push({
        date: version.updated_at,
        event_type: 'amended',
        title: `Version ${version.version} Amendment`,
        description: version.changes,
        updated_by: version.updated_by
      })
    })
  }

  // Add last update if different from creation
  if (stateLaw.updated_at !== stateLaw.created_at) {
    timeline.push({
      date: stateLaw.updated_at,
      event_type: 'updated',
      title: 'Information Updated',
      description: 'Law information was updated in the database'
    })
  }

  // Get related content timeline
  const { data: contentTimeline } = await supabase
    .from('nil_content')
    .select('published_at, title, primary_category, url, importance_score')
    .contains('states_mentioned', [code.toUpperCase()])
    .eq('is_active', true)
    .gte('importance_score', 70) // Only significant content
    .order('published_at', { ascending: false })
    .limit(20)

  // Add content to timeline
  contentTimeline?.forEach(content => {
    timeline.push({
      date: content.published_at,
      event_type: 'news',
      title: content.title,
      description: `${content.primary_category.replace('_', ' ')} coverage`,
      url: content.url,
      importance_score: content.importance_score
    })
  })

  // Sort timeline by date (most recent first)
  timeline.sort((a, b) => new Date(b.date) - new Date(a.date))

  res.json({
    success: true,
    data: {
      state_code: code.toUpperCase(),
      state_name: stateLaw.state_name,
      timeline
    }
  })
}))

/**
 * PUT /api/v1/states/:code
 * Update state law (admin only)
 */
router.put('/:code', adminOnly, asyncHandler(async (req, res) => {
  const { code } = req.params
  const updates = { ...req.body }

  // Get current version for history tracking
  const { data: currentLaw } = await supabase
    .from('nil_state_laws')
    .select('version, version_history')
    .eq('state_code', code.toUpperCase())
    .single()

  if (!currentLaw) {
    return res.status(404).json({
      success: false,
      error: 'State law not found'
    })
  }

  // Prepare version history entry
  const newVersion = currentLaw.version + 1
  const versionEntry = {
    version: newVersion,
    changes: updates.change_description || 'Law information updated',
    updated_at: new Date().toISOString(),
    updated_by: req.user.name || req.user.email
  }

  // Update version history
  const newVersionHistory = [...(currentLaw.version_history || []), versionEntry]

  // Remove change_description from updates as it's not a field
  delete updates.change_description
  
  // Add version tracking fields
  updates.version = newVersion
  updates.version_history = newVersionHistory
  updates.last_updated = new Date().toISOString().split('T')[0] // Date only
  updates.updated_at = new Date().toISOString()

  const { data: updatedLaw, error } = await supabase
    .from('nil_state_laws')
    .update(updates)
    .eq('state_code', code.toUpperCase())
    .select()
    .single()

  if (error) {
    logger.error('Failed to update state law:', error)
    throw new Error('Failed to update state law')
  }

  logger.logActivity('state_law_updated', req.user.id, {
    state_code: code.toUpperCase(),
    state_name: updatedLaw.state_name,
    version: newVersion
  })

  res.json({
    success: true,
    data: updatedLaw
  })
}))

/**
 * GET /api/v1/states/map/activity
 * Get state activity data for map visualization
 */
router.get('/map/activity', asyncHandler(async (req, res) => {
  const { period_days = 7 } = req.query
  
  const periodStart = new Date(Date.now() - parseInt(period_days) * 24 * 60 * 60 * 1000).toISOString()

  // Get content activity by state
  const { data: contentActivity } = await supabase
    .from('nil_content')
    .select('states_mentioned, importance_score, primary_category')
    .gte('published_at', periodStart)
    .eq('is_active', true)
    .not('states_mentioned', 'is', null)

  // Get deal activity by state
  const { data: dealActivity } = await supabase
    .from('nil_deals')
    .select('state_code, deal_value')
    .gte('announced_date', periodStart)
    .not('state_code', 'is', null)

  // Process state activity
  const stateActivity = {}

  // Process content mentions
  contentActivity?.forEach(content => {
    content.states_mentioned?.forEach(state => {
      if (!stateActivity[state]) {
        stateActivity[state] = {
          state_code: state,
          content_count: 0,
          deal_count: 0,
          total_deal_value: 0,
          avg_importance: 0,
          total_importance: 0,
          categories: {}
        }
      }
      
      stateActivity[state].content_count += 1
      stateActivity[state].total_importance += content.importance_score
      stateActivity[state].categories[content.primary_category] = 
        (stateActivity[state].categories[content.primary_category] || 0) + 1
    })
  })

  // Process deal activity
  dealActivity?.forEach(deal => {
    const state = deal.state_code
    if (!stateActivity[state]) {
      stateActivity[state] = {
        state_code: state,
        content_count: 0,
        deal_count: 0,
        total_deal_value: 0,
        avg_importance: 0,
        total_importance: 0,
        categories: {}
      }
    }
    
    stateActivity[state].deal_count += 1
    if (deal.deal_value) {
      stateActivity[state].total_deal_value += deal.deal_value
    }
  })

  // Calculate averages and activity scores
  Object.values(stateActivity).forEach(state => {
    state.avg_importance = state.content_count > 0 ? 
      state.total_importance / state.content_count : 0
    
    // Calculate activity score (0-100)
    state.activity_score = Math.min(100, 
      (state.content_count * 5) + 
      (state.deal_count * 10) + 
      (state.avg_importance * 0.5)
    )
    
    // Clean up totals
    delete state.total_importance
  })

  // Get state law information for map
  const { data: stateLaws } = await supabase
    .from('nil_state_laws')
    .select('state_code, state_name, status, allows_high_school, effective_date')

  // Merge state law info with activity
  const stateMap = {}
  stateLaws?.forEach(law => {
    stateMap[law.state_code] = {
      ...law,
      ...(stateActivity[law.state_code] || {
        content_count: 0,
        deal_count: 0,
        total_deal_value: 0,
        avg_importance: 0,
        activity_score: 0,
        categories: {}
      })
    }
  })

  // Add states with activity but no law info
  Object.keys(stateActivity).forEach(stateCode => {
    if (!stateMap[stateCode]) {
      stateMap[stateCode] = {
        state_code: stateCode,
        state_name: getStateName(stateCode),
        status: 'unknown',
        allows_high_school: null,
        effective_date: null,
        ...stateActivity[stateCode]
      }
    }
  })

  res.json({
    success: true,
    data: {
      period_days: parseInt(period_days),
      states: Object.values(stateMap),
      summary: {
        total_states_with_activity: Object.keys(stateActivity).length,
        total_content_items: Object.values(stateActivity).reduce((sum, s) => sum + s.content_count, 0),
        total_deals: Object.values(stateActivity).reduce((sum, s) => sum + s.deal_count, 0),
        most_active_state: Object.values(stateMap).sort((a, b) => b.activity_score - a.activity_score)[0]
      }
    }
  })
}))

/**
 * GET /api/v1/states/summary
 * Get summary statistics for all states
 */
router.get('/meta/summary', asyncHandler(async (req, res) => {
  const { data: stateLaws } = await supabase
    .from('nil_state_laws')
    .select('status, allows_high_school, effective_date')

  const summary = {
    total_states: stateLaws?.length || 0,
    by_status: {},
    high_school_allowed: 0,
    with_effective_date: 0,
    recent_changes: 0
  }

  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  stateLaws?.forEach(law => {
    // Count by status
    summary.by_status[law.status] = (summary.by_status[law.status] || 0) + 1
    
    // Count high school allowances
    if (law.allows_high_school) {
      summary.high_school_allowed += 1
    }
    
    // Count with effective dates
    if (law.effective_date) {
      summary.with_effective_date += 1
    }
    
    // Count recent changes
    if (law.effective_date && new Date(law.effective_date) > oneMonthAgo) {
      summary.recent_changes += 1
    }
  })

  res.json({
    success: true,
    data: summary
  })
}))

/**
 * Helper function to get state name from code
 */
function getStateName(stateCode) {
  const stateNames = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  }
  
  return stateNames[stateCode] || stateCode
}

export default router