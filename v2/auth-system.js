// Production-Ready Authentication & Analytics System
// Using Supabase for backend services

class NILGamePlanAuth {
    constructor() {
        // Supabase configuration - replace with your actual project details
        this.supabaseUrl = 'https://your-project-id.supabase.co';
        this.supabaseKey = 'your-anon-key'; // This would be in environment variables in production
        
        // Initialize Supabase client (will be loaded from CDN)
        this.supabase = null;
        this.currentUser = null;
        
        this.init();
    }

    async init() {
        // Load Supabase from CDN
        if (!window.supabase) {
            await this.loadSupabase();
        }
        
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        
        // Check for existing session
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            await this.trackPageView();
        }
    }

    async loadSupabase() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Create user (admin only)
    async createUser(userData) {
        try {
            // First create the auth user
            const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true,
                user_metadata: {
                    name: userData.name,
                    role: userData.role,
                    access_level: userData.accessLevel || 'standard'
                }
            });

            if (authError) throw authError;

            // Then create user profile
            const { data: profileData, error: profileError } = await this.supabase
                .from('user_profiles')
                .insert({
                    id: authData.user.id,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role,
                    access_level: userData.accessLevel || 'standard',
                    created_at: new Date().toISOString(),
                    is_active: true
                });

            if (profileError) throw profileError;

            console.log('User created successfully:', authData.user.id);
            return { success: true, user: authData.user };

        } catch (error) {
            console.error('Error creating user:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Authenticate user
    async authenticate(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                return { success: false, error: error.message };
            }

            this.currentUser = data.user;

            // Get user profile
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            // Track login event
            await this.trackEvent('login', {
                user_id: data.user.id,
                email: data.user.email,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });

            return { 
                success: true, 
                user: data.user,
                profile: profile
            };

        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, error: 'Authentication failed' };
        }
    }

    // Check authentication status
    async isAuthenticated() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.currentUser = session.user;
                return session.user;
            }
            return null;
        } catch (error) {
            console.error('Auth check error:', error);
            return null;
        }
    }

    // Logout
    async logout() {
        try {
            if (this.currentUser) {
                await this.trackEvent('logout', {
                    user_id: this.currentUser.id,
                    timestamp: new Date().toISOString()
                });
            }

            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;

            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    // Track events
    async trackEvent(eventType, eventData) {
        try {
            if (!this.currentUser) return;

            const { error } = await this.supabase
                .from('analytics_events')
                .insert({
                    user_id: this.currentUser.id,
                    event_type: eventType,
                    event_data: eventData,
                    timestamp: new Date().toISOString(),
                    session_id: this.getSessionId(),
                    page_url: window.location.href,
                    referrer: document.referrer
                });

            if (error) throw error;

        } catch (error) {
            console.error('Event tracking error:', error);
        }
    }

    // Track page views
    async trackPageView() {
        await this.trackEvent('page_view', {
            page: window.location.pathname,
            title: document.title,
            user_agent: navigator.userAgent
        });
    }

    // Track presentation interactions
    async trackInteraction(action, data = {}) {
        await this.trackEvent('interaction', {
            action: action,
            ...data
        });
    }

    // Get session ID
    getSessionId() {
        let sessionId = sessionStorage.getItem('nil_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('nil_session_id', sessionId);
        }
        return sessionId;
    }

    // Get analytics (admin only)
    async getAnalytics(dateFrom = null, dateTo = null) {
        try {
            if (!this.currentUser) throw new Error('Not authenticated');

            // Check if user is admin
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('role')
                .eq('id', this.currentUser.id)
                .single();

            if (profile.role !== 'admin') {
                throw new Error('Unauthorized access');
            }

            // Build date filter
            let query = this.supabase.from('analytics_events').select('*');
            
            if (dateFrom) {
                query = query.gte('timestamp', dateFrom);
            }
            if (dateTo) {
                query = query.lte('timestamp', dateTo);
            }

            const { data: events, error } = await query.order('timestamp', { ascending: false });
            
            if (error) throw error;

            // Process analytics
            const analytics = this.processAnalytics(events);
            return { success: true, analytics };

        } catch (error) {
            console.error('Analytics error:', error);
            return { success: false, error: error.message };
        }
    }

    // Process raw events into analytics
    processAnalytics(events) {
        const analytics = {
            totalEvents: events.length,
            uniqueUsers: new Set(events.map(e => e.user_id)).size,
            uniqueSessions: new Set(events.map(e => e.session_id)).size,
            eventTypes: {},
            userActivity: {},
            pageViews: {},
            interactions: {},
            timeRange: {
                start: events.length > 0 ? events[events.length - 1].timestamp : null,
                end: events.length > 0 ? events[0].timestamp : null
            }
        };

        events.forEach(event => {
            // Event types
            analytics.eventTypes[event.event_type] = (analytics.eventTypes[event.event_type] || 0) + 1;

            // User activity
            if (!analytics.userActivity[event.user_id]) {
                analytics.userActivity[event.user_id] = {
                    totalEvents: 0,
                    firstSeen: event.timestamp,
                    lastSeen: event.timestamp,
                    sessions: new Set()
                };
            }
            analytics.userActivity[event.user_id].totalEvents++;
            analytics.userActivity[event.user_id].lastSeen = event.timestamp;
            analytics.userActivity[event.user_id].sessions.add(event.session_id);

            // Page views
            if (event.event_type === 'page_view') {
                const page = event.event_data?.page || 'unknown';
                analytics.pageViews[page] = (analytics.pageViews[page] || 0) + 1;
            }

            // Interactions
            if (event.event_type === 'interaction') {
                const action = event.event_data?.action || 'unknown';
                analytics.interactions[action] = (analytics.interactions[action] || 0) + 1;
            }
        });

        // Convert Sets to counts
        Object.keys(analytics.userActivity).forEach(userId => {
            analytics.userActivity[userId].sessionCount = analytics.userActivity[userId].sessions.size;
            delete analytics.userActivity[userId].sessions;
        });

        return analytics;
    }

    // Get user list (admin only)
    async getUserList() {
        try {
            if (!this.currentUser) throw new Error('Not authenticated');

            // Check if user is admin
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('role')
                .eq('id', this.currentUser.id)
                .single();

            if (profile.role !== 'admin') {
                throw new Error('Unauthorized access');
            }

            const { data: users, error } = await this.supabase
                .from('user_profiles')
                .select('id, email, name, role, access_level, created_at, is_active, last_login')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { success: true, users };

        } catch (error) {
            console.error('Get users error:', error);
            return { success: false, error: error.message };
        }
    }

    // Update user status (admin only)
    async updateUserStatus(userId, isActive) {
        try {
            if (!this.currentUser) throw new Error('Not authenticated');

            // Check if user is admin
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('role')
                .eq('id', this.currentUser.id)
                .single();

            if (profile.role !== 'admin') {
                throw new Error('Unauthorized access');
            }

            const { error } = await this.supabase
                .from('user_profiles')
                .update({ is_active: isActive })
                .eq('id', userId);

            if (error) throw error;

            return { success: true };

        } catch (error) {
            console.error('Update user error:', error);
            return { success: false, error: error.message };
        }
    }

    // Export analytics data
    async exportAnalytics(format = 'json') {
        try {
            const result = await this.getAnalytics();
            if (!result.success) throw new Error(result.error);

            const exportData = {
                exportDate: new Date().toISOString(),
                analytics: result.analytics,
                generatedBy: this.currentUser.email
            };

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                this.downloadFile(blob, `nil-gameplan-analytics-${new Date().toISOString().split('T')[0]}.json`);
            } else if (format === 'csv') {
                const csv = this.convertToCSV(result.analytics);
                const blob = new Blob([csv], { type: 'text/csv' });
                this.downloadFile(blob, `nil-gameplan-analytics-${new Date().toISOString().split('T')[0]}.csv`);
            }

            return { success: true };

        } catch (error) {
            console.error('Export error:', error);
            return { success: false, error: error.message };
        }
    }

    // Convert analytics to CSV
    convertToCSV(analytics) {
        const rows = [];
        
        // User activity CSV
        rows.push('User ID,Total Events,First Seen,Last Seen,Sessions');
        Object.entries(analytics.userActivity).forEach(([userId, data]) => {
            rows.push(`${userId},${data.totalEvents},${data.firstSeen},${data.lastSeen},${data.sessionCount}`);
        });

        rows.push(''); // Empty row
        rows.push('Page,Views');
        Object.entries(analytics.pageViews).forEach(([page, views]) => {
            rows.push(`${page},${views}`);
        });

        return rows.join('\n');
    }

    // Download file helper
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize global instance
window.nilAuth = new NILGamePlanAuth();

// Auto-track page views when authenticated
document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.nilAuth.isAuthenticated();
    if (user) {
        await window.nilAuth.trackPageView();
    }
});

// Track page visibility changes
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        const user = await window.nilAuth.isAuthenticated();
        if (user) {
            await window.nilAuth.trackEvent('page_focus', {
                timestamp: new Date().toISOString()
            });
        }
    }
});

// Track before page unload
window.addEventListener('beforeunload', async () => {
    const user = await window.nilAuth.isAuthenticated();
    if (user) {
        // Use sendBeacon for reliable tracking on page unload
        navigator.sendBeacon('/api/track', JSON.stringify({
            event_type: 'page_unload',
            user_id: user.id,
            timestamp: new Date().toISOString()
        }));
    }
});