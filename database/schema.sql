-- NIL GamePlan Database Schema
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'investor', 'partner', 'board', 'advisor', 'demo')),
    access_level TEXT DEFAULT 'standard' CHECK (access_level IN ('standard', 'premium', 'enterprise')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    page_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user sessions table for better session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_id TEXT UNIQUE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    pages_visited INTEGER DEFAULT 0,
    interactions_count INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Create presentation access logs
CREATE TABLE IF NOT EXISTS presentation_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    presentation_type TEXT NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_seconds INTEGER,
    slides_viewed INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    device_type TEXT,
    browser TEXT,
    ip_address INET
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_presentation_access_user_id ON presentation_access(user_id);
CREATE INDEX IF NOT EXISTS idx_presentation_access_accessed_at ON presentation_access(accessed_at);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_access ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- User profiles: Users can only see their own profile, admins can see all
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Analytics events: Users can only insert their own events, admins can view all
CREATE POLICY "Users can insert own events" ON analytics_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all events" ON analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- User sessions: Users can manage their own sessions, admins can view all
CREATE POLICY "Users can manage own sessions" ON user_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Presentation access: Users can insert their own access logs, admins can view all
CREATE POLICY "Users can log own access" ON presentation_access
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all access" ON presentation_access
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create functions for common queries

-- Function to get user analytics summary
CREATE OR REPLACE FUNCTION get_user_analytics_summary(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_events', COUNT(*),
        'unique_sessions', COUNT(DISTINCT session_id),
        'first_activity', MIN(timestamp),
        'last_activity', MAX(timestamp),
        'page_views', COUNT(*) FILTER (WHERE event_type = 'page_view'),
        'interactions', COUNT(*) FILTER (WHERE event_type = 'interaction'),
        'total_time_spent', COALESCE(SUM(
            CASE 
                WHEN event_type = 'session_end' THEN 
                    EXTRACT(EPOCH FROM (event_data->>'duration')::INTERVAL)
                ELSE 0 
            END
        ), 0)
    ) INTO result
    FROM analytics_events 
    WHERE user_id = target_user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get presentation completion stats
CREATE OR REPLACE FUNCTION get_presentation_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_accesses', COUNT(*),
        'unique_users', COUNT(DISTINCT user_id),
        'avg_completion', AVG(completion_percentage),
        'avg_duration', AVG(duration_seconds),
        'presentations_by_type', (
            SELECT json_object_agg(presentation_type, count)
            FROM (
                SELECT presentation_type, COUNT(*) as count
                FROM presentation_access
                GROUP BY presentation_type
            ) t
        )
    ) INTO result
    FROM presentation_access;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic updates

-- Update last_login when user signs in
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles 
    SET last_login = NOW(), updated_at = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_login
    AFTER INSERT ON analytics_events
    FOR EACH ROW
    WHEN (NEW.event_type = 'login')
    EXECUTE FUNCTION update_last_login();

-- Auto-update session duration when session ends
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_duration
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_duration();

-- Insert sample admin user (run this after setting up auth)
-- Note: This should be done through the Supabase dashboard or auth API
/*
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin@nilgameplan.com',
    crypt('NIL2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
);
*/

-- Create view for analytics dashboard
CREATE OR REPLACE VIEW analytics_dashboard AS
SELECT 
    u.name,
    u.email,
    u.role,
    u.created_at as user_created,
    u.last_login,
    COUNT(e.id) as total_events,
    COUNT(DISTINCT e.session_id) as unique_sessions,
    MIN(e.timestamp) as first_activity,
    MAX(e.timestamp) as last_activity,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view') as page_views,
    COUNT(*) FILTER (WHERE e.event_type = 'interaction') as interactions,
    COUNT(*) FILTER (WHERE e.event_type = 'login') as login_count
FROM user_profiles u
LEFT JOIN analytics_events e ON u.id = e.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name, u.email, u.role, u.created_at, u.last_login
ORDER BY last_activity DESC NULLS LAST;