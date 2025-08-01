// Authentication and Tracking Configuration
// Using a mock service for demonstration - replace with actual service

class AuthTracker {
    constructor() {
        this.apiEndpoint = 'https://api.nilgameplan.com'; // Replace with actual endpoint
        this.localStorageKey = 'nilGameplanSession';
        
        // Mock user database - in production, this would be server-side
        this.users = [
            { id: 'usr_001', username: 'investor_1', password: 'Invest2024!', name: 'John Smith', role: 'investor', active: true },
            { id: 'usr_002', username: 'partner_alpha', password: 'Alpha2024!', name: 'Alpha Capital', role: 'partner', active: true },
            { id: 'usr_003', username: 'board_member', password: 'Board2024!', name: 'Sarah Johnson', role: 'board', active: true },
            { id: 'usr_004', username: 'advisor_1', password: 'Advise2024!', name: 'Mike Wilson', role: 'advisor', active: true },
            { id: 'usr_005', username: 'demo_user', password: 'Demo2024!', name: 'Demo Account', role: 'demo', active: true },
            // Admin account
            { id: 'usr_admin', username: 'MyNILGamePlan', password: 'NIL2025!', name: 'NIL GamePlan Admin', role: 'admin', active: true }
        ];
    }

    // Generate unique session ID
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Authenticate user
    async authenticate(username, password) {
        try {
            // Find user in mock database
            const user = this.users.find(u => 
                u.username === username && 
                u.password === password && 
                u.active
            );

            if (!user) {
                return { success: false, error: 'Invalid credentials' };
            }

            // Create session
            const session = {
                sessionId: this.generateSessionId(),
                userId: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                loginTime: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            };

            // Store session locally
            localStorage.setItem(this.localStorageKey, JSON.stringify(session));

            // Track login event
            await this.trackEvent('login', {
                userId: user.id,
                username: user.username,
                role: user.role,
                timestamp: session.loginTime,
                userAgent: navigator.userAgent,
                ip: await this.getClientIP()
            });

            return { success: true, user: session };

        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, error: 'Authentication failed' };
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        const session = localStorage.getItem(this.localStorageKey);
        if (!session) return false;

        try {
            const sessionData = JSON.parse(session);
            const now = new Date();
            const loginTime = new Date(sessionData.loginTime);
            
            // Session expires after 24 hours
            const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            
            if (now - loginTime > sessionDuration) {
                this.logout();
                return false;
            }

            return sessionData;
        } catch (error) {
            this.logout();
            return false;
        }
    }

    // Update last activity
    updateActivity() {
        const session = this.isAuthenticated();
        if (session) {
            session.lastActivity = new Date().toISOString();
            localStorage.setItem(this.localStorageKey, JSON.stringify(session));
        }
    }

    // Logout user
    logout() {
        const session = this.isAuthenticated();
        if (session) {
            this.trackEvent('logout', {
                userId: session.userId,
                username: session.username,
                sessionDuration: new Date() - new Date(session.loginTime),
                timestamp: new Date().toISOString()
            });
        }
        localStorage.removeItem(this.localStorageKey);
    }

    // Track page view
    async trackPageView(page) {
        const session = this.isAuthenticated();
        if (!session) return;

        await this.trackEvent('page_view', {
            userId: session.userId,
            username: session.username,
            page: page,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            referrer: document.referrer
        });

        this.updateActivity();
    }

    // Track presentation interaction
    async trackInteraction(action, data = {}) {
        const session = this.isAuthenticated();
        if (!session) return;

        await this.trackEvent('interaction', {
            userId: session.userId,
            username: session.username,
            action: action,
            data: data,
            timestamp: new Date().toISOString(),
            page: window.location.pathname
        });

        this.updateActivity();
    }

    // Generic event tracking
    async trackEvent(eventType, eventData) {
        try {
            // Store event locally (in production, send to server)
            const events = JSON.parse(localStorage.getItem('nilGameplanEvents') || '[]');
            const event = {
                id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                type: eventType,
                data: eventData,
                timestamp: new Date().toISOString()
            };
            
            events.push(event);
            
            // Keep only last 1000 events locally
            if (events.length > 1000) {
                events.splice(0, events.length - 1000);
            }
            
            localStorage.setItem('nilGameplanEvents', JSON.stringify(events));

            // In production, also send to server
            // await this.sendToServer(event);

            console.log('Event tracked:', eventType, eventData);
        } catch (error) {
            console.error('Event tracking error:', error);
        }
    }

    // Get client IP (mock implementation)
    async getClientIP() {
        try {
            // In production, use a service like ipapi.co
            return 'unknown';
        } catch {
            return 'unknown';
        }
    }

    // Get analytics data (admin only)
    getAnalytics() {
        const session = this.isAuthenticated();
        if (!session || session.role !== 'admin') {
            throw new Error('Unauthorized access to analytics');
        }

        const events = JSON.parse(localStorage.getItem('nilGameplanEvents') || '[]');
        
        // Process analytics
        const analytics = {
            totalEvents: events.length,
            uniqueUsers: [...new Set(events.map(e => e.data.userId).filter(Boolean))].length,
            eventsByType: {},
            userActivity: {},
            pageViews: {},
            timeSpent: {}
        };

        events.forEach(event => {
            // Count by event type
            analytics.eventsByType[event.type] = (analytics.eventsByType[event.type] || 0) + 1;

            // User activity
            if (event.data.userId) {
                if (!analytics.userActivity[event.data.userId]) {
                    analytics.userActivity[event.data.userId] = {
                        username: event.data.username,
                        totalEvents: 0,
                        lastActivity: event.timestamp,
                        firstActivity: event.timestamp
                    };
                }
                analytics.userActivity[event.data.userId].totalEvents++;
                analytics.userActivity[event.data.userId].lastActivity = event.timestamp;
            }

            // Page views
            if (event.type === 'page_view' && event.data.page) {
                analytics.pageViews[event.data.page] = (analytics.pageViews[event.data.page] || 0) + 1;
            }
        });

        return analytics;
    }

    // Export analytics data
    exportAnalytics() {
        const session = this.isAuthenticated();
        if (!session || session.role !== 'admin') {
            throw new Error('Unauthorized access to analytics');
        }

        const analytics = this.getAnalytics();
        const events = JSON.parse(localStorage.getItem('nilGameplanEvents') || '[]');
        
        const exportData = {
            exportDate: new Date().toISOString(),
            analytics: analytics,
            events: events,
            users: this.users.map(u => ({
                id: u.id,
                username: u.username,
                name: u.name,
                role: u.role,
                active: u.active
            }))
        };

        // Create and download JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nil-gameplan-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Global instance
window.authTracker = new AuthTracker();

// Auto-track page views
document.addEventListener('DOMContentLoaded', () => {
    if (window.authTracker.isAuthenticated()) {
        window.authTracker.trackPageView(window.location.pathname);
    }
});

// Track page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.authTracker.isAuthenticated()) {
        window.authTracker.updateActivity();
    }
});