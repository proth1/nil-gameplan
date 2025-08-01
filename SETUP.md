# NIL GamePlan Production Setup Guide

## Overview
This system provides production-ready user authentication and analytics tracking for the NIL GamePlan presentation platform using Supabase as the backend.

## Features
- ✅ Secure user authentication with JWT tokens
- ✅ Individual user credentials with role-based access
- ✅ Real-time analytics and event tracking
- ✅ Admin dashboard with user management
- ✅ Data export capabilities (JSON/CSV)
- ✅ Row-level security and data encryption
- ✅ Session management and timeout handling

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key
3. Go to the SQL Editor in your Supabase dashboard
4. Copy and run the SQL from `database/schema.sql`

### 2. Configure Environment Variables

Update the configuration in `v2/auth-system.js`:

```javascript
// Replace these with your actual Supabase credentials
this.supabaseUrl = 'https://your-project-id.supabase.co';
this.supabaseKey = 'your-anon-key';
```

### 3. Set Up Authentication

In your Supabase dashboard:
1. Go to Authentication > Settings
2. Enable email auth
3. Set up email templates (optional)
4. Configure security settings

### 4. Create Admin User

In the Supabase dashboard SQL Editor:

```sql
-- Create admin user through Supabase Auth
-- Then add profile
INSERT INTO user_profiles (id, email, name, role, is_active)
VALUES (
    'your-admin-user-id', -- Get this from auth.users table
    'admin@nilgameplan.com',
    'NIL GamePlan Admin',
    'admin',
    true
);
```

### 5. Update Presentation Files

Replace the authentication logic in each presentation file:

```html
<!-- Replace the existing auth-config.js with auth-system.js -->
<script src="auth-system.js"></script>
```

Update the authentication form handler:

```javascript
// Replace existing auth logic with:
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('username').value; // Now expects email
    const password = document.getElementById('password').value;
    
    const result = await window.nilAuth.authenticate(email, password);
    
    if (result.success) {
        authOverlay.classList.add('hidden');
        presentationContainer.classList.add('active');
        
        // Track presentation access
        await window.nilAuth.trackEvent('presentation_access', {
            presentation_type: 'image-slides', // or whatever type
            timestamp: new Date().toISOString()
        });
    } else {
        // Show error
        document.getElementById('authError').textContent = result.error;
        document.getElementById('authError').style.display = 'block';
    }
});
```

## User Management

### Creating Users

Users can be created through:

1. **Admin Dashboard**: Go to `/admin/dashboard.html`
2. **Programmatically**: Use the `createUser` function
3. **Supabase Dashboard**: Direct database/auth management

### User Roles

- `admin`: Full access to dashboard and analytics
- `investor`: Access to investor-specific content
- `partner`: Access to partner presentations
- `board`: Board member access level
- `advisor`: Advisor access level
- `demo`: Limited demo access

### Sample Users

Create these sample users for testing:

```javascript
const sampleUsers = [
    {
        email: 'investor@example.com',
        password: 'SecurePass123!',
        name: 'John Investor',
        role: 'investor'
    },
    {
        email: 'partner@example.com',
        password: 'SecurePass123!',
        name: 'Strategic Partner',
        role: 'partner'
    },
    {
        email: 'demo@example.com',
        password: 'DemoPass123!',
        name: 'Demo User',
        role: 'demo'
    }
];
```

## Analytics Features

### Tracked Events

- `login`: User authentication
- `logout`: User session end
- `page_view`: Page/presentation access
- `interaction`: User interactions (clicks, navigation)
- `presentation_access`: Presentation viewing
- `slide_change`: Slide navigation
- `export`: Data export actions

### Available Metrics

- Total users and active users
- Session duration and frequency
- Page views and interaction rates
- Presentation completion rates
- User engagement patterns
- Export and sharing activity

### Data Export

Admins can export data in multiple formats:
- JSON: Complete analytics data
- CSV: Tabular format for spreadsheets
- Real-time dashboard views

## Security Features

### Row Level Security (RLS)
- Users can only access their own data
- Admins have full access with proper verification
- All queries are automatically filtered by user permissions

### Data Encryption
- All data encrypted at rest in Supabase
- JWT tokens for secure authentication
- HTTPS-only connections

### Session Management
- Automatic session timeout (24 hours)
- Activity tracking for session renewal
- Secure logout with event tracking

## Deployment

### GitHub Pages Deployment

1. Update all file references to use the new auth system
2. Ensure all environment variables are properly set
3. Test authentication flow thoroughly
4. Deploy to GitHub Pages

### Custom Domain (Optional)

1. Set up custom domain in GitHub Pages settings
2. Update CORS settings in Supabase for your domain
3. Update any hardcoded URLs in the codebase

## Monitoring & Maintenance

### Regular Tasks

1. **Monitor User Activity**: Check dashboard weekly
2. **Export Analytics**: Monthly data exports for reporting
3. **Update User Access**: Add/remove users as needed
4. **Security Review**: Quarterly security audit

### Troubleshooting

Common issues and solutions:

1. **Authentication Fails**: Check Supabase project status and credentials
2. **Analytics Not Tracking**: Verify user permissions and event structure
3. **Dashboard Not Loading**: Check admin role assignment
4. **Export Fails**: Verify user has admin privileges

## API Reference

### Authentication Methods

```javascript
// Authenticate user
await window.nilAuth.authenticate(email, password);

// Check authentication status
await window.nilAuth.isAuthenticated();

// Logout user
await window.nilAuth.logout();
```

### Analytics Methods

```javascript
// Track custom event
await window.nilAuth.trackEvent('custom_event', { data: 'value' });

// Track page view (automatic)
await window.nilAuth.trackPageView();

// Track interaction
await window.nilAuth.trackInteraction('button_click', { button: 'download' });
```

### Admin Methods

```javascript
// Get analytics data
await window.nilAuth.getAnalytics(dateFrom, dateTo);

// Get user list
await window.nilAuth.getUserList();

// Create new user
await window.nilAuth.createUser(userData);

// Update user status
await window.nilAuth.updateUserStatus(userId, isActive);
```

## Support

For technical support:
- Check the browser console for error messages
- Verify Supabase project status
- Ensure all credentials are properly configured
- Review the database logs in Supabase dashboard

## Cost Considerations

Supabase free tier includes:
- Up to 50,000 monthly active users
- 500MB database storage
- 2GB bandwidth
- 100MB file storage

For production use with higher limits, consider Supabase Pro plan.