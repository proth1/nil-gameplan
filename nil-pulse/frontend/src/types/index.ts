// ==================================
// Core Domain Types
// ==================================

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  access_level: AccessLevel
  created_at: string
  last_login: string | null
  is_active: boolean
  metadata?: Record<string, any>
}

export type UserRole = 'admin' | 'investor' | 'partner' | 'board' | 'advisor' | 'demo'
export type AccessLevel = 'standard' | 'premium' | 'enterprise'

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at: number
}

export interface LoginCredentials {
  email: string
  password: string
}

// ==================================
// NIL Content Types
// ==================================

export interface NILContent {
  id: string
  title: string
  summary?: string
  content: string
  author?: string
  url: string
  published_at: string
  processed_at: string
  
  // Categorization
  primary_category: ContentCategory
  secondary_categories: ContentCategory[]
  
  // Geographic and entity data
  jurisdiction?: string
  states_mentioned: string[]
  entities_mentioned: EntityMention[]
  
  // Market data
  deal_value?: number
  athlete_name?: string
  sport?: string
  school?: string
  brand?: string
  
  // Analysis
  sentiment_score?: number
  importance_score: number
  trend_velocity: number
  
  // Metadata
  tags: string[]
  source: NILSource
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ContentCategory = 
  | 'legislation' 
  | 'litigation' 
  | 'enforcement' 
  | 'deals' 
  | 'collectives' 
  | 'high_school' 
  | 'womens_sports' 
  | 'policy' 
  | 'compliance' 
  | 'market_analysis'

export interface EntityMention {
  name: string
  type: 'athlete' | 'school' | 'brand' | 'collective' | 'person' | 'organization'
  confidence: number
}

export interface NILSource {
  id: string
  name: string
  description?: string
  url: string
  source_type: SourceType
  category: SourceCategory
  jurisdiction?: string
  reliability_score: number
  is_active: boolean
}

export type SourceType = 'rss' | 'api' | 'web' | 'manual' | 'email' | 'podcast'
export type SourceCategory = 'legal' | 'news' | 'deals' | 'enforcement' | 'academic' | 'industry'

// ==================================
// State Laws Types
// ==================================

export interface StateLaw {
  id: string
  state_code: string
  state_name: string
  law_title: string
  law_number?: string
  status: LawStatus
  effective_date?: string
  last_updated: string
  
  // Key provisions
  allows_high_school: boolean
  disclosure_required: boolean
  disclosure_threshold?: number
  collective_restrictions: string[]
  prohibited_categories: string[]
  
  // Content
  summary?: string
  full_text?: string
  source_url?: string
  
  // History
  version: number
  version_history: LawVersion[]
  
  created_at: string
  updated_at: string
}

export type LawStatus = 'proposed' | 'passed' | 'active' | 'amended' | 'repealed'

export interface LawVersion {
  version: number
  changes: string
  updated_at: string
  updated_by?: string
}

// ==================================
// NIL Deals Types
// ==================================

export interface NILDeal {
  id: string
  athlete_name: string
  sport: string
  school?: string
  conference?: string
  class_year?: string
  
  brand_name: string
  deal_type: DealType
  deal_value?: number
  deal_value_type: DealValueType
  deal_duration_months?: number
  
  deal_terms?: Record<string, any>
  performance_metrics?: Record<string, any>
  
  state_code?: string
  jurisdiction?: string
  compliance_status: ComplianceStatus
  
  source_id?: string
  source_url?: string
  confidence_level: ConfidenceLevel
  verification_status: VerificationStatus
  
  market_impact_score?: number
  trend_significance: number
  
  announced_date?: string
  effective_date?: string
  created_at: string
  updated_at: string
}

export type DealType = 'endorsement' | 'appearance' | 'social_media' | 'licensing' | 'collective' | 'other'
export type DealValueType = 'confirmed' | 'estimated' | 'reported' | 'minimum' | 'maximum'
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'under_review' | 'unknown'
export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type VerificationStatus = 'verified' | 'partially_verified' | 'unverified' | 'disputed'

// ==================================
// Alerts Types
// ==================================

export interface UserAlert {
  id: string
  user_id: string
  name: string
  description?: string
  is_active: boolean
  
  // Trigger conditions
  keywords: string[]
  categories: ContentCategory[]
  jurisdictions: string[]
  sports: string[]
  deal_value_min?: number
  deal_value_max?: number
  importance_threshold: number
  
  // Advanced filters
  content_types: string[]
  source_ids: string[]
  exclude_keywords: string[]
  
  // Delivery settings
  delivery_channels: DeliveryChannels
  delivery_frequency: DeliveryFrequency
  delivery_time?: string
  delivery_timezone: string
  
  // Tracking
  last_triggered?: string
  trigger_count: number
  
  created_at: string
  updated_at: string
}

export interface DeliveryChannels {
  email: boolean
  sms?: boolean
  webhook?: boolean
  push?: boolean
}

export type DeliveryFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly'

export interface AlertDelivery {
  id: string
  alert_id: string
  user_id: string
  content_id: string
  channel: keyof DeliveryChannels
  status: DeliveryStatus
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  created_at: string
}

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'

// ==================================
// Trends and Analytics Types
// ==================================

export interface Trend {
  id: string
  trend_type: TrendType
  trend_key: string
  trend_category?: string
  
  // Metrics
  mention_count: number
  unique_sources: number
  velocity: number
  acceleration: number
  peak_velocity: number
  
  // Time windows
  period_start: string
  period_end: string
  
  // Analysis
  sentiment_avg?: number
  importance_avg: number
  related_trends: string[]
  
  // Geographic data
  top_jurisdictions: JurisdictionActivity[]
  top_sources: SourceActivity[]
  
  created_at: string
}

export type TrendType = 'topic' | 'entity' | 'category' | 'jurisdiction' | 'market'

export interface JurisdictionActivity {
  jurisdiction: string
  activity_count: number
  percentage: number
}

export interface SourceActivity {
  source_id: string
  source_name: string
  activity_count: number
  percentage: number
}

export interface MarketGap {
  id: string
  gap_type: GapType
  gap_description: string
  expected_coverage: number
  actual_coverage: number
  coverage_gap: number
  severity: GapSeverity
  
  related_trends: string[]
  affected_jurisdictions: string[]
  missing_sources: string[]
  
  status: GapStatus
  resolution_notes?: string
  
  detected_at: string
  resolved_at?: string
  created_at: string
}

export type GapType = 'geographic' | 'temporal' | 'source' | 'category' | 'entity'
export type GapSeverity = 'low' | 'medium' | 'high' | 'critical'
export type GapStatus = 'identified' | 'investigating' | 'resolved' | 'ignored'

// ==================================
// Dashboard and UI Types
// ==================================

export interface DashboardSummary {
  summary: {
    new_laws: number
    big_deals: number
    total_content: number
    hot_topics: HotTopic[]
    active_states: number
    top_athletes: TopAthlete[]
  }
  recentContent: NILContent[]
  userAlerts: {
    active: number
    triggered_today: number
  }
  trendingTopics: Trend[]
  stateActivity: StateActivity[]
  metadata: {
    generated_at: string
    period_hours: number
    user_role: UserRole
    user_access_level: AccessLevel
  }
}

export interface HotTopic {
  topic: string
  velocity: number
}

export interface TopAthlete {
  name: string
  deals: number
}

export interface StateActivity {
  state: string
  activity: number
}

export interface PulseData {
  pulse: {
    score: number
    level: PulseLevel
    generated_at: string
    window_minutes: number
  }
  indicators: {
    content_volume: number
    trend_intensity: number
    deal_activity: number
    market_gaps: number
  }
  hot_trends: Trend[]
  breaking_news: NILContent[]
  big_deals: NILDeal[]
  market_gaps: MarketGap[]
}

export type PulseLevel = 'minimal' | 'low' | 'medium' | 'high'

// ==================================
// API Response Types
// ==================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
  timestamp?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface SearchResponse {
  results: NILContent[]
  total: number
  facets: SearchFacets
  suggestions: string[]
  query_time_ms: number
}

export interface SearchFacets {
  categories: FacetCount[]
  jurisdictions: FacetCount[]
  sources: FacetCount[]
  sports: FacetCount[]
  date_ranges: FacetCount[]
}

export interface FacetCount {
  value: string
  count: number
}

export interface SearchFilters {
  query?: string
  categories?: ContentCategory[]
  jurisdictions?: string[]
  sources?: string[]
  sports?: string[]
  date_from?: string
  date_to?: string
  importance_min?: number
  sort_by?: SearchSortField
  sort_order?: 'asc' | 'desc'
}

export type SearchSortField = 'relevance' | 'published_at' | 'importance_score' | 'trend_velocity'

// ==================================
// Chart and Visualization Types
// ==================================

export interface ChartDataPoint {
  name: string
  value: number
  date?: string
  category?: string
  [key: string]: any
}

export interface TimeSeriesPoint {
  timestamp: string
  value: number
  label?: string
}

export interface LeaderboardEntry {
  rank: number
  name: string
  value: number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  metadata?: Record<string, any>
}

// ==================================
// Form and Input Types
// ==================================

export interface FormErrors {
  [key: string]: string | string[] | undefined
}

export interface FilterOption {
  label: string
  value: string
  count?: number
  disabled?: boolean
}

export interface DateRange {
  start: Date | null
  end: Date | null
}

// ==================================
// System and Utility Types
// ==================================

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error'
  timestamp: string
  uptime: number
  memory: NodeJS.MemoryUsage
  version: string
}

export interface NotificationSettings {
  email_enabled: boolean
  push_enabled: boolean
  frequency: DeliveryFrequency
  quiet_hours: {
    enabled: boolean
    start: string
    end: string
    timezone: string
  }
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf'
  date_range: DateRange
  filters: SearchFilters
  include_metadata: boolean
}

// ==================================
// Error Types
// ==================================

export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: string
  requestId?: string
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'