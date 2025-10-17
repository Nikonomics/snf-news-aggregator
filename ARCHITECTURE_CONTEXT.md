# SNF News Aggregator - Architecture Context

## 🏗️ Project Overview

The SNF News Aggregator is a comprehensive web application designed to collect, analyze, and present news and data related to Skilled Nursing Facilities (SNFs). The system combines RSS feed aggregation, AI-powered analysis, and interactive project management capabilities.

## 📊 System Architecture

### Frontend Architecture (React 18 + Vite)

```
src/
├── components/
│   ├── ProjectTracker.jsx          # Excel-like project management interface
│   ├── ProjectTracker.css          # Spreadsheet styling with nested navigation
│   ├── ArticleList.jsx             # Article display components
│   ├── FilterPanel.jsx             # Advanced filtering system
│   ├── AIAnalysis.jsx              # AI insights dashboard
│   ├── StateDashboard.jsx          # Geographic data visualization
│   ├── ConferenceDirectory.jsx     # Conference tracking
│   ├── WeeklyInsights.jsx              # Trend analysis
│   ├── MASection.jsx              # M&A tracking
│   ├── PriorityFeed.jsx           # Priority news feed
│   ├── RegulatoryFeed.jsx         # Regulatory updates
│   ├── MedicaidChatbot.jsx        # AI chatbot for Medicaid queries
│   ├── IdahoALFChatbot.jsx        # AI chatbot for Idaho ALF regulations
│   ├── FacilityResearch.jsx       # Facility research tools
│   ├── OwnershipResearch.jsx      # Ownership analysis
│   └── ProjectManagement.jsx      # Legacy project management
├── services/
│   └── apiService.js              # API communication layer
├── App.jsx                        # Main application router
└── App.css                        # Global styles
```

### Backend Architecture (Node.js + Express)

```
server/
├── index.js                       # Main Express server
├── database/
│   ├── schema.sql                 # PostgreSQL schema
│   ├── migrations/                # Database migrations
│   └── utils/                     # Database utilities
├── collectors/                    # Data collection scripts
│   ├── blsCollector.js           # Bureau of Labor Statistics
│   ├── censusCollector.js        # US Census data
│   ├── cmsCollector.js           # CMS data collection
│   ├── congressCollector.js      # Congressional data
│   └── federalRegisterCollector.js # Federal Register
├── routes/
│   ├── api-monitoring.js         # API monitoring endpoints
│   └── medicaid.js               # Medicaid-specific routes
├── services/
│   ├── aiService.js              # AI analysis service
│   ├── deduplication.js          # Article deduplication
│   ├── stateAnalysis.js          # State-level analysis
│   └── vectorSearch.js           # Vector search capabilities
└── utils/
    └── db.js                     # Database connection utilities
```

## 🎯 Core Features

### 1. News Aggregation System
- **RSS Feed Collection**: Automated collection from 50+ healthcare news sources
- **AI-Powered Analysis**: Claude AI and OpenAI GPT-4o for content analysis
- **Deduplication**: Intelligent duplicate detection and removal
- **Categorization**: Automatic categorization by impact, scope, and relevance

### 2. Project Tracker (New Excel-like Interface)
- **Hierarchical Organization**: Categories → Subcategories → Tasks → Details
- **Interactive Navigation**: Click to expand/collapse at each level
- **Task Completion**: Checkbox-only completion with user authentication
- **Progress Tracking**: Real-time completion statistics and progress bars
- **Detailed Information**: Comprehensive task details with data sources and implementation

### 3. Data Visualization
- **Geographic Maps**: US state-level data visualization
- **Facility Mapping**: Interactive facility location mapping
- **State Comparison**: Side-by-side state analysis tools
- **KPI Dashboards**: Key performance indicator visualization
- **Interactive Charts**: Drill-down data exploration

### 4. AI-Powered Features
- **Medicaid Chatbot**: AI assistant for Medicaid policy queries
- **Idaho ALF Chatbot**: Specialized chatbot for Idaho ALF regulations
- **Content Analysis**: Automated relevance scoring and categorization
- **Trend Analysis**: Weekly insights and trend identification

## 🗄️ Data Architecture

### Database Schema (PostgreSQL)
```sql
-- Core Tables
articles (id, title, content, url, published_date, source, category, impact, scope, ai_analysis)
facilities (id, name, address, state, quality_rating, ownership_type)
deficiencies (id, facility_id, date, severity, description)
metrics (id, facility_id, metric_type, value, date)
bills (id, title, status, chamber, committee, relevance_score)
conferences (id, name, date, location, description, relevance)

-- User Data
saved_articles (user_id, article_id, saved_date)
task_completions (task_id, user_name, completed_at, completion_data)
```

### Data Sources Integration
- **Federal Sources**: Congress.gov, Federal Register, CMS.gov
- **State Sources**: 50 state Medicaid agencies, state legislatures
- **Industry Sources**: Healthcare news, regulatory updates
- **API Integrations**: BLS, Census, CMS APIs

## 🔄 Data Flow Architecture

```
RSS Feeds → Data Collection → AI Analysis → Database Storage → Frontend Display
    ↓              ↓              ↓              ↓              ↓
50+ Sources → Deduplication → Categorization → PostgreSQL → React UI
    ↓              ↓              ↓              ↓              ↓
Real-time → Content Analysis → Relevance Scoring → API Layer → User Interface
```

## 🎨 User Interface Architecture

### Project Tracker Interface (Excel-like)
```
📊 Category Header (click to expand/collapse)
  ↳ Subcategory Name (click to expand/collapse) ▶️
    ↳↳ Task Name [checkbox] (click for details)
      ↳↳↳ Task Details (description, data sources, implementation)
```

### Navigation Hierarchy
1. **Categories**: Top-level project organization
2. **Subcategories**: Logical grouping within categories
3. **Tasks**: Individual work items with completion tracking
4. **Task Details**: Comprehensive information including:
   - Description
   - Data Sources
   - Implementation Details
   - Dependencies
   - Deliverables
   - Update Frequency

## 🔐 Authentication & Security

### Task Completion Security
- **User Authentication**: Required name entry for task completion
- **Completion Tracking**: Records who completed what and when
- **Data Persistence**: localStorage for completion state
- **Audit Trail**: Complete history of task completions

### API Security
- **Rate Limiting**: Prevents API abuse
- **CORS Configuration**: Secure cross-origin requests
- **Environment Variables**: Secure API key management

## 📱 Responsive Design

### Mobile-First Approach
- **CSS Grid Layout**: Responsive spreadsheet interface
- **Touch-Friendly**: Optimized for mobile interaction
- **Progressive Enhancement**: Works on all device sizes
- **Accessibility**: WCAG compliance features

## 🚀 Performance Optimization

### Frontend Performance
- **Code Splitting**: Lazy loading of components
- **Bundle Optimization**: Vite build optimization
- **Caching**: Intelligent data caching
- **Virtual Scrolling**: Efficient large dataset rendering

### Backend Performance
- **Database Indexing**: Optimized query performance
- **Caching Layer**: Redis-based caching system
- **Background Jobs**: Asynchronous data processing
- **Rate Limiting**: API protection and fair usage

## 🔧 Development Environment

### Technology Stack
- **Frontend**: React 18, Vite, React Router, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express, PostgreSQL
- **AI Services**: Anthropic Claude, OpenAI GPT-4o
- **Data Collection**: RSS Parser, Web Scraping, API Integration
- **Deployment**: Render.com (Production), Local Development

### Development Workflow
```bash
# Development
npm run dev:all          # Start both frontend and backend
npm run dev             # Frontend only (port 5173)
npm run server          # Backend only (port 5000)

# Production
npm run build           # Build frontend
npm run start           # Start production server
```

## 📊 Project Management Features

### Task Management
- **Hierarchical Organization**: Categories → Subcategories → Tasks
- **Progress Tracking**: Real-time completion statistics
- **User Authentication**: Secure task completion
- **Detailed Information**: Comprehensive task documentation
- **Excel-like Interface**: Familiar spreadsheet navigation

### Data Integration
- **Comprehensive Metrics**: 12 categories of industry metrics
- **Data Source Tracking**: Complete data source inventory
- **Implementation Details**: Technical implementation guidance
- **Dependency Management**: Task dependency tracking

## 🎯 Success Metrics

### Technical Metrics
- **Performance**: < 2s page load time
- **Reliability**: 99.9% uptime
- **Scalability**: Handle 1000+ concurrent users
- **Data Quality**: 95%+ accuracy in AI analysis

### Business Metrics
- **User Engagement**: Daily active users
- **Task Completion**: Project progress tracking
- **Data Coverage**: Comprehensive industry data
- **User Satisfaction**: Feature adoption rates

## 🔮 Future Enhancements

### Planned Features
- **Microservices Architecture**: Scalable backend services
- **Real-time Updates**: WebSocket integration
- **Advanced Analytics**: Predictive modeling
- **Mobile App**: Native mobile application
- **API Marketplace**: Third-party integrations

### Technical Roadmap
- **Database Migration**: Enhanced data modeling
- **AI Improvements**: Advanced analysis capabilities
- **Performance Optimization**: Caching and CDN integration
- **Security Enhancements**: Advanced authentication
- **Monitoring**: Comprehensive system monitoring

## 📋 Configuration

### Environment Variables
```bash
# API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# Database
DATABASE_URL=postgresql://...

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...

# Local Development
VITE_API_URL=http://localhost:5000
```

### Port Configuration
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000
- **Database**: PostgreSQL (Render.com)

## 🎉 Key Achievements

### Technical Accomplishments
- ✅ **Excel-like Project Tracker**: Professional spreadsheet interface
- ✅ **Nested Navigation**: Hierarchical task organization
- ✅ **User Authentication**: Secure task completion
- ✅ **Comprehensive Data**: 200+ tasks with detailed information
- ✅ **Responsive Design**: Mobile-optimized interface
- ✅ **Real-time Updates**: Live progress tracking

### Business Value
- ✅ **Project Visibility**: Clear project status and progress
- ✅ **Task Accountability**: User authentication and tracking
- ✅ **Data Organization**: Logical categorization and hierarchy
- ✅ **User Experience**: Intuitive, professional interface
- ✅ **Scalability**: Ready for team collaboration
- ✅ **Maintainability**: Clean, documented codebase

---

*This architecture document provides a comprehensive overview of the SNF News Aggregator system, including the newly implemented Project Tracker functionality. The system is designed for scalability, maintainability, and user experience excellence.*
