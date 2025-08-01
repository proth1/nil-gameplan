-- NIL Pulse Database Schema
-- Extends the existing NIL GamePlan schema with NIL intelligence platform tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================
-- CORE NIL PULSE TABLES
-- ====================================

-- Sources registry for NIL content harvesting
CREATE TABLE IF NOT EXISTS nil_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'api', 'web', 'manual', 'email', 'podcast')),
    category TEXT NOT NULL CHECK (category IN ('legal', 'news', 'deals', 'enforcement', 'academic', 'industry')),
    jurisdiction TEXT, -- State/Federal/National
    reliability_score INTEGER DEFAULT 50 CHECK (reliability_score >= 0 AND reliability_score <= 100),
    update_frequency INTEGER DEFAULT 3600, -- seconds
    last_harvested TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    harvest_config JSONB DEFAULT '{}'::jsonb, -- scraping rules, selectors, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Raw harvested content before processing
CREATE TABLE IF NOT EXISTS nil_content_raw (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id UUID REFERENCES nil_sources(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    author TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    harvested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content_hash TEXT NOT NULL, -- for deduplication
    metadata JSONB DEFAULT '{}'::jsonb,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed', 'duplicate')),
    processing_error TEXT
);

-- Processed and enriched NIL content
CREATE TABLE IF NOT EXISTS nil_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_content_id UUID REFERENCES nil_content_raw(id) ON DELETE CASCADE,
    source_id UUID REFERENCES nil_sources(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    author TEXT,
    url TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Content categorization
    primary_category TEXT NOT NULL CHECK (primary_category IN ('legislation', 'litigation', 'enforcement', 'deals', 'collectives', 'high_school', 'womens_sports', 'policy', 'compliance', 'market_analysis')),
    secondary_categories TEXT[] DEFAULT '{}',
    
    -- Geographic and entity data
    jurisdiction TEXT,
    states_mentioned TEXT[] DEFAULT '{}',
    entities_mentioned JSONB DEFAULT '[]'::jsonb, -- athletes, schools, brands, etc.
    
    -- Market and deal data
    deal_value DECIMAL(15,2),
    athlete_name TEXT,
    sport TEXT,
    school TEXT,
    brand TEXT,
    
    -- Content analysis
    sentiment_score DECIMAL(3,2), -- -1 to 1
    importance_score INTEGER DEFAULT 50 CHECK (importance_score >= 0 AND importance_score <= 100),
    trend_velocity DECIMAL(5,2) DEFAULT 0, -- rate of mentions/discussion
    
    -- Search and discovery
    search_vector tsvector,
    tags TEXT[] DEFAULT '{}',
    
    -- Metadata
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content relationships and citations
CREATE TABLE IF NOT EXISTS nil_content_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_content_id UUID REFERENCES nil_content(id) ON DELETE CASCADE,
    target_content_id UUID REFERENCES nil_content(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('cites', 'updates', 'contradicts', 'supports', 'follows')),
    strength DECIMAL(3,2) DEFAULT 0.5, -- 0 to 1
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- State NIL laws and regulations tracking
CREATE TABLE IF NOT EXISTS nil_state_laws (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    state_code TEXT NOT NULL, -- US state abbreviation
    state_name TEXT NOT NULL,
    
    -- Law details
    law_title TEXT NOT NULL,
    law_number TEXT, -- bill number, statute number
    status TEXT NOT NULL CHECK (status IN ('proposed', 'passed', 'active', 'amended', 'repealed')),
    effective_date DATE,
    last_updated DATE,
    
    -- Key provisions
    allows_high_school BOOLEAN DEFAULT false,
    disclosure_required BOOLEAN DEFAULT false,
    disclosure_threshold DECIMAL(10,2),
    collective_restrictions TEXT[],
    prohibited_categories TEXT[], -- alcohol, gambling, etc.
    
    -- Content and sources
    summary TEXT,
    full_text TEXT,
    source_url TEXT,
    related_content_ids UUID[],
    
    -- Timeline tracking
    version INTEGER DEFAULT 1,
    version_history JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(state_code, law_number)
);

-- NIL deals and market data
CREATE TABLE IF NOT EXISTS nil_deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Deal basics
    athlete_name TEXT NOT NULL,
    sport TEXT NOT NULL,
    school TEXT,
    conference TEXT,
    class_year TEXT,
    
    -- Deal details
    brand_name TEXT NOT NULL,
    deal_type TEXT CHECK (deal_type IN ('endorsement', 'appearance', 'social_media', 'licensing', 'collective', 'other')),
    deal_value DECIMAL(15,2),
    deal_value_type TEXT DEFAULT 'estimated' CHECK (deal_value_type IN ('confirmed', 'estimated', 'reported', 'minimum', 'maximum')),
    deal_duration_months INTEGER,
    
    -- Deal terms
    deal_terms JSONB DEFAULT '{}'::jsonb,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    
    -- Geographic and regulatory
    state_code TEXT,
    jurisdiction TEXT,
    compliance_status TEXT DEFAULT 'unknown' CHECK (compliance_status IN ('compliant', 'non_compliant', 'under_review', 'unknown')),
    
    -- Sourcing and verification
    source_id UUID REFERENCES nil_sources(id),
    source_url TEXT,
    confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('high', 'medium', 'low')),
    verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'partially_verified', 'unverified', 'disputed')),
    
    -- Market analysis
    market_impact_score INTEGER CHECK (market_impact_score >= 0 AND market_impact_score <= 100),
    trend_significance DECIMAL(3,2) DEFAULT 0,
    
    -- Metadata
    announced_date DATE,
    effective_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User alert configurations
CREATE TABLE IF NOT EXISTS nil_user_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Alert configuration
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Trigger conditions
    keywords TEXT[] DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    jurisdictions TEXT[] DEFAULT '{}',
    sports TEXT[] DEFAULT '{}',
    deal_value_min DECIMAL(15,2),
    deal_value_max DECIMAL(15,2),
    importance_threshold INTEGER DEFAULT 50,
    
    -- Advanced filters
    content_types TEXT[] DEFAULT '{}',
    source_ids UUID[] DEFAULT '{}',
    exclude_keywords TEXT[] DEFAULT '{}',
    
    -- Delivery settings
    delivery_channels JSONB NOT NULL DEFAULT '{"email": true}'::jsonb,
    delivery_frequency TEXT DEFAULT 'immediate' CHECK (delivery_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
    delivery_time TIME, -- for scheduled delivery
    delivery_timezone TEXT DEFAULT 'UTC',
    
    -- Tracking
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert deliveries log
CREATE TABLE IF NOT EXISTS nil_alert_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_id UUID REFERENCES nil_user_alerts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    content_id UUID REFERENCES nil_content(id) ON DELETE CASCADE,
    
    -- Delivery details
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'webhook', 'push')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Content snapshot
    alert_snapshot JSONB NOT NULL, -- snapshot of alert config at time of delivery
    content_snapshot JSONB NOT NULL, -- snapshot of content at time of delivery
    
    -- Tracking
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trend analysis and market intelligence
CREATE TABLE IF NOT EXISTS nil_trends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Trend identification
    trend_type TEXT NOT NULL CHECK (trend_type IN ('topic', 'entity', 'category', 'jurisdiction', 'market')),
    trend_key TEXT NOT NULL, -- the trending term/entity/category
    trend_category TEXT,
    
    -- Trend metrics
    mention_count INTEGER DEFAULT 0,
    unique_sources INTEGER DEFAULT 0,
    velocity DECIMAL(10,4) DEFAULT 0, -- mentions per hour
    acceleration DECIMAL(10,4) DEFAULT 0, -- change in velocity
    peak_velocity DECIMAL(10,4) DEFAULT 0,
    
    -- Time windows
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Analysis
    sentiment_avg DECIMAL(3,2),
    importance_avg DECIMAL(5,2),
    related_trends TEXT[] DEFAULT '{}',
    
    -- Geographic and demographic
    top_jurisdictions JSONB DEFAULT '[]'::jsonb,
    top_sources JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(trend_type, trend_key, period_start, period_end)
);

-- Market gaps and blind spots analysis
CREATE TABLE IF NOT EXISTS nil_market_gaps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Gap identification
    gap_type TEXT NOT NULL CHECK (gap_type IN ('geographic', 'temporal', 'source', 'category', 'entity')),
    gap_description TEXT NOT NULL,
    
    -- Gap metrics
    expected_coverage INTEGER,
    actual_coverage INTEGER,
    coverage_gap DECIMAL(5,2), -- percentage
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Context
    related_trends UUID[] DEFAULT '{}',
    affected_jurisdictions TEXT[] DEFAULT '{}',
    missing_sources TEXT[] DEFAULT '{}',
    
    -- Resolution tracking
    status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'investigating', 'resolved', 'ignored')),
    resolution_notes TEXT,
    
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- INDEXES FOR PERFORMANCE
-- ====================================

-- Content indexes
CREATE INDEX IF NOT EXISTS idx_nil_content_published_at ON nil_content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_nil_content_primary_category ON nil_content(primary_category);
CREATE INDEX IF NOT EXISTS idx_nil_content_jurisdiction ON nil_content(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_nil_content_importance ON nil_content(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_nil_content_search_vector ON nil_content USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_nil_content_states_mentioned ON nil_content USING gin(states_mentioned);
CREATE INDEX IF NOT EXISTS idx_nil_content_tags ON nil_content USING gin(tags);

-- Deals indexes
CREATE INDEX IF NOT EXISTS idx_nil_deals_athlete_name ON nil_deals(athlete_name);
CREATE INDEX IF NOT EXISTS idx_nil_deals_sport ON nil_deals(sport);
CREATE INDEX IF NOT EXISTS idx_nil_deals_deal_value ON nil_deals(deal_value DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_nil_deals_announced_date ON nil_deals(announced_date DESC);
CREATE INDEX IF NOT EXISTS idx_nil_deals_state_code ON nil_deals(state_code);

-- Sources indexes
CREATE INDEX IF NOT EXISTS idx_nil_sources_source_type ON nil_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_nil_sources_category ON nil_sources(category);
CREATE INDEX IF NOT EXISTS idx_nil_sources_jurisdiction ON nil_sources(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_nil_sources_is_active ON nil_sources(is_active);

-- Raw content indexes
CREATE INDEX IF NOT EXISTS idx_nil_content_raw_content_hash ON nil_content_raw(content_hash);
CREATE INDEX IF NOT EXISTS idx_nil_content_raw_processing_status ON nil_content_raw(processing_status);
CREATE INDEX IF NOT EXISTS idx_nil_content_raw_harvested_at ON nil_content_raw(harvested_at DESC);

-- State laws indexes
CREATE INDEX IF NOT EXISTS idx_nil_state_laws_state_code ON nil_state_laws(state_code);
CREATE INDEX IF NOT EXISTS idx_nil_state_laws_status ON nil_state_laws(status);
CREATE INDEX IF NOT EXISTS idx_nil_state_laws_effective_date ON nil_state_laws(effective_date);

-- Alerts indexes
CREATE INDEX IF NOT EXISTS idx_nil_user_alerts_user_id ON nil_user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_nil_user_alerts_is_active ON nil_user_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_nil_alert_deliveries_user_id ON nil_alert_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_nil_alert_deliveries_delivered_at ON nil_alert_deliveries(delivered_at);

-- Trends indexes
CREATE INDEX IF NOT EXISTS idx_nil_trends_trend_type ON nil_trends(trend_type);
CREATE INDEX IF NOT EXISTS idx_nil_trends_trend_key ON nil_trends(trend_key);
CREATE INDEX IF NOT EXISTS idx_nil_trends_period_start ON nil_trends(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_nil_trends_velocity ON nil_trends(velocity DESC);

-- ====================================
-- SEARCH CONFIGURATION
-- ====================================

-- Update search vector trigger
CREATE OR REPLACE FUNCTION update_nil_content_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector = to_tsvector('english', 
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.summary, '') || ' ' ||
        coalesce(NEW.content, '') || ' ' ||
        coalesce(NEW.author, '') || ' ' ||
        coalesce(array_to_string(NEW.tags, ' '), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nil_content_search_vector
    BEFORE INSERT OR UPDATE OF title, summary, content, author, tags
    ON nil_content
    FOR EACH ROW
    EXECUTE FUNCTION update_nil_content_search_vector();

-- ====================================
-- ROW LEVEL SECURITY
-- ====================================

-- Enable RLS on new tables
ALTER TABLE nil_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE nil_content_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE nil_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE nil_content_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE nil_state_laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE nil_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nil_user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nil_alert_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nil_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE nil_market_gaps ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on access requirements)

-- Sources: Admins can manage, others can read active sources
CREATE POLICY "Admins can manage nil_sources" ON nil_sources
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can read active nil_sources" ON nil_sources
    FOR SELECT USING (is_active = true);

-- Content: Admins can manage, others can read active content
CREATE POLICY "Admins can manage nil_content" ON nil_content
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can read active nil_content" ON nil_content
    FOR SELECT USING (is_active = true);

-- User alerts: Users can manage their own alerts
CREATE POLICY "Users can manage own nil_user_alerts" ON nil_user_alerts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all nil_user_alerts" ON nil_user_alerts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Alert deliveries: Users can view their own deliveries
CREATE POLICY "Users can view own nil_alert_deliveries" ON nil_alert_deliveries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all nil_alert_deliveries" ON nil_alert_deliveries
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Other tables: readable by authenticated users, manageable by admins
CREATE POLICY "Users can read nil_state_laws" ON nil_state_laws
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read nil_deals" ON nil_deals
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read nil_trends" ON nil_trends
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage system tables" ON nil_state_laws
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage nil_deals" ON nil_deals
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage nil_trends" ON nil_trends
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage nil_market_gaps" ON nil_market_gaps
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ====================================
-- UTILITY FUNCTIONS
-- ====================================

-- Function to calculate trend velocity
CREATE OR REPLACE FUNCTION calculate_trend_velocity(
    trend_key_param TEXT,
    window_hours INTEGER DEFAULT 24
)
RETURNS DECIMAL AS $$
DECLARE
    current_count INTEGER;
    previous_count INTEGER;
    velocity DECIMAL;
BEGIN
    -- Get current period count
    SELECT COUNT(*) INTO current_count
    FROM nil_content
    WHERE (title ILIKE '%' || trend_key_param || '%' 
           OR content ILIKE '%' || trend_key_param || '%'
           OR trend_key_param = ANY(tags))
    AND published_at >= NOW() - (window_hours || ' hours')::INTERVAL;
    
    -- Get previous period count
    SELECT COUNT(*) INTO previous_count
    FROM nil_content
    WHERE (title ILIKE '%' || trend_key_param || '%' 
           OR content ILIKE '%' || trend_key_param || '%'
           OR trend_key_param = ANY(tags))
    AND published_at >= NOW() - (window_hours * 2 || ' hours')::INTERVAL
    AND published_at < NOW() - (window_hours || ' hours')::INTERVAL;
    
    -- Calculate velocity (mentions per hour)
    velocity = current_count::DECIMAL / window_hours;
    
    RETURN velocity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect content gaps
CREATE OR REPLACE FUNCTION detect_market_gaps()
RETURNS TABLE(gap_type TEXT, description TEXT, severity TEXT) AS $$
BEGIN
    -- Detect geographic gaps (states with low coverage)
    RETURN QUERY
    SELECT 
        'geographic'::TEXT,
        'Low coverage in state: ' || state_code,
        CASE 
            WHEN content_count < 5 THEN 'high'
            WHEN content_count < 15 THEN 'medium'
            ELSE 'low'
        END::TEXT
    FROM (
        SELECT 
            unnest(states_mentioned) as state_code,
            COUNT(*) as content_count
        FROM nil_content
        WHERE published_at >= NOW() - INTERVAL '7 days'
        GROUP BY unnest(states_mentioned)
        HAVING COUNT(*) < 20
    ) state_coverage;
    
    -- Detect temporal gaps (periods with unusually low activity)
    RETURN QUERY
    SELECT 
        'temporal'::TEXT,
        'Low activity period detected: ' || period_start::TEXT,
        'medium'::TEXT
    FROM (
        SELECT 
            date_trunc('hour', published_at) as period_start,
            COUNT(*) as hourly_count
        FROM nil_content
        WHERE published_at >= NOW() - INTERVAL '24 hours'
        GROUP BY date_trunc('hour', published_at)
        HAVING COUNT(*) < (
            SELECT AVG(hourly_count) * 0.3
            FROM (
                SELECT COUNT(*) as hourly_count
                FROM nil_content
                WHERE published_at >= NOW() - INTERVAL '7 days'
                GROUP BY date_trunc('hour', published_at)
            ) avg_calc
        )
    ) temporal_gaps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get NIL Pulse dashboard summary
CREATE OR REPLACE FUNCTION get_nil_pulse_summary(
    hours_back INTEGER DEFAULT 24
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'new_laws', (
            SELECT COUNT(*) FROM nil_state_laws 
            WHERE updated_at >= NOW() - (hours_back || ' hours')::INTERVAL
        ),
        'big_deals', (
            SELECT COUNT(*) FROM nil_deals 
            WHERE deal_value > 100000 
            AND announced_date >= NOW() - (hours_back || ' hours')::INTERVAL
        ),
        'total_content', (
            SELECT COUNT(*) FROM nil_content 
            WHERE published_at >= NOW() - (hours_back || ' hours')::INTERVAL
        ),
        'hot_topics', (
            SELECT json_agg(json_build_object('topic', trend_key, 'velocity', velocity))
            FROM nil_trends 
            WHERE period_start >= NOW() - (hours_back || ' hours')::INTERVAL
            ORDER BY velocity DESC 
            LIMIT 5
        ),
        'active_states', (
            SELECT COUNT(DISTINCT unnest(states_mentioned))
            FROM nil_content
            WHERE published_at >= NOW() - (hours_back || ' hours')::INTERVAL
        ),
        'top_athletes', (
            SELECT json_agg(json_build_object('name', athlete_name, 'deals', deal_count))
            FROM (
                SELECT athlete_name, COUNT(*) as deal_count
                FROM nil_deals
                WHERE announced_date >= NOW() - (hours_back || ' hours')::INTERVAL
                GROUP BY athlete_name
                ORDER BY deal_count DESC
                LIMIT 5
            ) top_athletes_subq
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial seed data for testing
INSERT INTO nil_sources (name, description, url, source_type, category, jurisdiction) VALUES
('NCAA.org', 'Official NCAA website and policy updates', 'https://www.ncaa.org', 'web', 'legal', 'National'),
('ESPN NIL News', 'ESPN NIL coverage and deal reporting', 'https://www.espn.com/college-sports/nil/', 'rss', 'news', 'National'),
('On3 NIL Database', 'On3 NIL deal tracking and valuation', 'https://www.on3.com/nil/', 'api', 'deals', 'National'),
('State Legislature Tracker', 'Multi-state legislative tracking service', 'https://example.com/state-tracker', 'api', 'legal', 'Multi-State');

-- Initial state law entries (sample)
INSERT INTO nil_state_laws (state_code, state_name, law_title, status, allows_high_school, disclosure_required, disclosure_threshold) VALUES
('FL', 'Florida', 'Florida NIL Law', 'active', false, true, 600.00),
('TX', 'Texas', 'Texas Name, Image, and Likeness Act', 'active', true, true, 500.00),
('CA', 'California', 'Fair Pay to Play Act', 'active', false, false, null),
('NY', 'New York', 'New York NIL Legislation', 'proposed', false, true, 1000.00);