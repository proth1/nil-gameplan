# NIL Pulse - Real-time NIL Intelligence Platform

NIL Pulse is a comprehensive intelligence platform that provides real-time insights into the U.S. Name, Image, and Likeness (NIL) market. The platform automates the collection, analysis, and reporting of NIL-related news, legal developments, market trends, and regulatory changes.

## 🏗️ Architecture Overview

NIL Pulse is built with a modern, scalable architecture:

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Data Harvesting**: Puppeteer + Cheerio + RSS Parser
- **Real-time Updates**: WebSocket connections
- **Caching**: Redis (optional)
- **Monitoring**: Winston logging + Sentry

## 🚀 Features

### Core Intelligence Features
- **Real-time Content Harvesting**: Automated collection from 100+ NIL sources
- **Smart Categorization**: AI-powered content classification and tagging
- **Pulse Indicators**: Live market activity scoring (0-100)
- **Trend Analysis**: Velocity tracking and emerging topic detection
- **State Law Tracking**: Interactive map with legislative timeline
- **Deal Database**: Comprehensive NIL deal tracking and analysis
- **Custom Alerts**: User-defined notifications with multi-channel delivery
- **Semantic Search**: Natural language search across all content
- **Market Gap Analysis**: Identification of coverage blind spots

### User Experience
- **Modern Dashboard**: Real-time visualizations and insights
- **Role-based Access**: Admin, premium, and standard user tiers
- **Mobile Responsive**: Optimized for all device sizes
- **Dark Theme**: Professional NIL-focused design
- **Accessibility**: WCAG 2.1 compliant interface

### Administrative Tools
- **Source Management**: Configure and monitor content sources
- **User Management**: Role and permission administration
- **System Health**: Performance monitoring and analytics
- **Export Tools**: PDF, CSV, and JSON data export

## 📁 Project Structure

```
nil-pulse/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic services
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Main server file
│   ├── logs/               # Application logs
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-specific pages
│   │   ├── services/       # API client services
│   │   ├── stores/         # State management (Zustand)
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Frontend utilities
│   ├── public/             # Static assets
│   └── package.json
├── database/               # Database schemas and migrations
│   └── schema.sql          # Complete database schema
└── docs/                   # Documentation
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+ (or Supabase account)
- Redis (optional, for caching)

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**
   ```bash
   # Run the database schema
   psql -f ../database/schema.sql your_database_url
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema

The platform uses a comprehensive PostgreSQL schema with the following key tables:

### Core Tables
- `nil_sources` - Content source registry
- `nil_content_raw` - Raw harvested content
- `nil_content` - Processed and enriched content
- `nil_state_laws` - State NIL legislation tracking
- `nil_deals` - NIL deal database
- `nil_user_alerts` - Custom user alert configurations
- `nil_trends` - Trend analysis data
- `nil_market_gaps` - Market coverage analysis

### Existing Integration
- `user_profiles` - User accounts and roles
- `analytics_events` - User activity tracking
- `user_sessions` - Session management

## 🔧 API Documentation

### Authentication
All API endpoints require authentication via JWT tokens:

```bash
Authorization: Bearer <your_jwt_token>
```

### Key Endpoints

#### Dashboard
- `GET /api/v1/dashboard/summary` - Dashboard overview data
- `GET /api/v1/dashboard/pulse` - Real-time pulse indicators
- `GET /api/v1/dashboard/timeline` - Recent major events

#### Content
- `GET /api/v1/content` - Paginated content with filtering
- `GET /api/v1/content/:id` - Specific content item
- `POST /api/v1/content` - Create content (admin only)

#### Deals
- `GET /api/v1/deals` - NIL deals with filtering
- `GET /api/v1/deals/leaderboard` - Top deals ranking

#### States
- `GET /api/v1/states` - All state laws
- `GET /api/v1/states/:code` - Specific state law
- `GET /api/v1/states/:code/timeline` - State law timeline

#### Alerts
- `GET /api/v1/alerts` - User's alert configurations
- `POST /api/v1/alerts` - Create new alert
- `PUT /api/v1/alerts/:id` - Update alert
- `DELETE /api/v1/alerts/:id` - Delete alert

## 🎯 Data Harvesting System

The platform includes a sophisticated content harvesting system:

### Supported Source Types
- **RSS Feeds**: Automated feed parsing
- **Web Scraping**: Configurable page scraping with Puppeteer  
- **API Integration**: REST API data collection
- **Manual Upload**: Admin content submission

### Content Processing Pipeline
1. **Raw Collection**: Content harvested from sources
2. **Deduplication**: Hash-based duplicate detection
3. **NIL Relevance**: Keyword-based filtering
4. **Entity Extraction**: Athletes, schools, brands identification
5. **Categorization**: Automated content classification
6. **Sentiment Analysis**: Positive/negative scoring
7. **Importance Scoring**: Content significance ranking
8. **Trend Tracking**: Velocity and momentum calculation

### Scheduling
- **High-frequency sources**: Every 15 minutes
- **Medium-frequency sources**: Every hour
- **Low-frequency sources**: Every 6 hours

## 👥 User Roles & Permissions

### Role Hierarchy
1. **Admin**: Full system access and management
2. **Premium**: Advanced features and analytics
3. **Standard**: Basic dashboard and content access
4. **Demo**: Limited read-only access

### Access Levels
- **Enterprise**: All features + custom integrations
- **Premium**: Advanced analytics + exports
- **Standard**: Basic dashboard + alerts

## 🔔 Alert System

Users can create custom alerts with:

### Trigger Conditions
- **Keywords**: Specific terms or phrases
- **Categories**: Content type filtering
- **Jurisdictions**: State/federal focus
- **Deal Values**: Minimum transaction thresholds
- **Importance**: Content significance levels

### Delivery Channels
- **Email**: Formatted HTML notifications
- **SMS**: Text message alerts (Twilio)
- **Webhooks**: API integrations
- **Push Notifications**: Browser notifications

### Frequency Options
- **Immediate**: Real-time delivery
- **Hourly**: Batched hourly summaries
- **Daily**: End-of-day digest
- **Weekly**: Weekly roundup

## 📊 Analytics & Reporting

### Real-time Metrics
- **Pulse Score**: Market activity level (0-100)
- **Content Volume**: Articles/updates per hour
- **Deal Activity**: Transaction frequency and values
- **State Coverage**: Geographic distribution
- **Trend Velocity**: Topic momentum tracking

### Export Formats
- **PDF**: Formatted reports with charts
- **CSV**: Raw data for external analysis
- **JSON**: Structured data for integrations

## 🚀 Deployment

### Environment Setup
1. **Production Database**: PostgreSQL or Supabase
2. **Redis Cache**: Optional performance enhancement
3. **File Storage**: AWS S3 or compatible
4. **Email Service**: SMTP configuration
5. **Monitoring**: Sentry for error tracking

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
```bash
# Backend
cd backend
npm run build
npm start

# Frontend  
cd frontend
npm run build
# Serve dist/ with your web server
```

## 🔒 Security Features

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Request sanitization
- **SQL Injection Protection**: Parameterized queries  
- **XSS Prevention**: Content sanitization
- **HTTPS**: TLS encryption for all communications
- **Audit Logging**: Comprehensive activity tracking

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
npm run test:coverage
```

### Frontend Testing
```bash
cd frontend  
npm test
npm run test:ui
```

## 📈 Performance Optimization

### Backend Optimizations
- **Database Indexing**: Optimized query performance
- **Caching**: Redis for frequently accessed data
- **Connection Pooling**: Database connection management
- **Compression**: Gzip response compression
- **Rate Limiting**: Resource usage control

### Frontend Optimizations
- **Code Splitting**: Lazy loading for routes
- **Bundle Optimization**: Tree shaking and minification
- **Image Optimization**: WebP format with fallbacks
- **Caching**: Browser and CDN caching strategies
- **Performance Monitoring**: Core Web Vitals tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- **Email**: support@nilpulse.com
- **Documentation**: [docs.nilpulse.com](https://docs.nilpulse.com)
- **Issues**: GitHub Issues tab

## 🚧 Roadmap

### Phase 1 (Current)
- ✅ Core platform infrastructure
- ✅ Basic content harvesting
- ✅ Dashboard and user interface
- ✅ Authentication and user management

### Phase 2 (Next)
- 🔄 Advanced trend analytics
- 🔄 Interactive state law mapping
- 🔄 Enhanced deal tracking
- 🔄 Mobile application

### Phase 3 (Future)
- ⏳ Machine learning content classification
- ⏳ Predictive market analytics
- ⏳ Third-party API integrations
- ⏳ Advanced visualization tools

---

**Built with ❤️ by the NIL Gameplan team**