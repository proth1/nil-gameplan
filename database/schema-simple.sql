-- NIL GamePlan Database Schema (Simplified)
-- Run this in your Supabase SQL editor

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