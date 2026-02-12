# snf-news-aggregator
## Technical Brief for Developers

**Project Type:** Industry News Intelligence Platform
**Status:** Advanced Development
**Codebase Size:** ~15,000+ lines
**Last Updated:** January 2025

---

## What This Project Does

SNF News Aggregator is an industry intelligence platform that:

1. **News Aggregation** - Collects articles from 9 RSS feeds (Skilled Nursing News + 8 Google News healthcare searches)
2. **AI Analysis** - Claude analyzes each article for key insights, compliance timelines, and risk assessment
3. **Regulatory Monitoring** - Tracks bills from Congress.gov and Federal Register
4. **Facility Research** - Integrates CMS facility data with deficiency tracking
5. **Project Management** - Excel-like task tracker for team coordination

**Target Users:** Healthcare analysts tracking SNF industry news and regulatory changes

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React 19)                    │
│                    http://localhost:5173                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ Article     │ │ State Maps  │ │ Project Tracker     │   │
│  │ List/Detail │ │ & Analytics │ │ (Task Management)   │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │ Axios HTTP
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Express)                         │
│                    http://localhost:5000                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ Collectors  │ │ AI Analysis │ │ Database            │   │
│  │ (RSS, CMS)  │ │ (Claude)    │ │ (PostgreSQL)        │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ RSS Feeds   │     │ Congress.gov│     │ CMS Data    │
│ (9 sources) │     │ Federal Reg │     │ (Facilities)│
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 19.2.0 |
| Build Tool | Vite | 7.1.9 |
| Styling | Tailwind CSS | 4.1.14 |
| Maps | D3.js + TopoJSON | - |
| Google Maps | @react-google-maps/api | - |
| Backend | Express | 5.1.0 |
| Database | PostgreSQL | 8.16.3 |
| AI | Claude API | 0.65.0 |
| RSS | rss-parser | 3.13.0 |
| Scraping | Cheerio | 1.1.2 |
| Scheduling | node-cron | 4.2.1 |

---

## Data Collectors

### News Sources (9 feeds)
1. **Skilled Nursing News** - Primary industry publication
2. **Google News: Skilled Nursing Facility** - General SNF news
3. **Google News: SNF Medicare Medicaid** - Reimbursement news
4. **Google News: Nursing Home Regulations** - Regulatory changes
5. **Google News: SNF Mergers Acquisitions** - M&A activity
6. **Google News: CMS Nursing Home** - Federal policy
7. **Google News: SNF Staffing Requirements** - Staffing rules
8. **Google News: Nursing Home Quality** - Quality metrics
9. **Google News: Long Term Care Policy** - LTC policy

### Regulatory Sources
- **Congress.gov** - Bill tracking (healthcare-related)
- **Federal Register** - Proposed and final rules
- **CMS.gov** - Facility data, deficiencies, quality measures

---

## Key Files to Know

### Backend

| File | Purpose |
|------|---------|
| `server/index.js` | Express entry point |
| `server/collectors/rssCollector.js` | RSS feed aggregation |
| `server/collectors/congressCollector.js` | Bill tracking |
| `server/collectors/cmsCollector.js` | CMS data import |
| `server/services/aiAnalysis.js` | Claude article analysis |
| `server/services/deduplication.js` | Article deduplication |
| `server/database/schema.sql` | PostgreSQL schema |

### Frontend

| File | Purpose |
|------|---------|
| `src/components/ArticleList.jsx` | Main article view |
| `src/components/ArticleDetail.jsx` | Article + AI analysis |
| `src/components/StateMap.jsx` | Interactive US map |
| `src/components/ProjectTracker.jsx` | Task management |
| `src/components/FacilityTable.jsx` | Facility research |
| `src/components/MedicaidChatbot.jsx` | Embedded chatbot |

---

## AI Analysis Pipeline

Claude analyzes each article and extracts:

```json
{
  "key_insights": [
    "CMS proposes new staffing minimums...",
    "Implementation deadline is July 2025..."
  ],
  "compliance_timeline": {
    "effective_date": "2025-07-01",
    "comment_period_ends": "2025-03-15"
  },
  "financial_impact": {
    "severity": "high",
    "description": "Estimated $10B industry-wide cost..."
  },
  "action_items": [
    "Review current staffing levels",
    "Submit public comments by March 15"
  ],
  "risk_assessment": {
    "level": "medium",
    "factors": ["Regulatory", "Financial"]
  },
  "geographic_scope": "national",
  "relevance_score": 0.85
}
```

---

## Database Schema (Key Tables)

### Articles
```sql
articles (
  id, title, url, source, published_at,
  content, summary, geographic_scope,
  ai_analysis (JSONB), analyzed_at,
  relevance_score, created_at
)
```

### Facilities
```sql
facilities (
  id, ccn, name, address, city, state, zip,
  beds, rating, latitude, longitude,
  created_at, updated_at
)
```

### Deficiencies
```sql
deficiencies (
  id, facility_id, survey_date, citation,
  scope_severity, fine_amount, corrected,
  created_at
)
```

### Bills
```sql
bills (
  id, bill_number, title, sponsor,
  introduced_date, status, summary,
  full_text_url, relevance_score
)
```

### Other Tables
- `conferences` - Industry events
- `demographics` - County-level population data
- `regulations` - Federal Register entries
- `tasks` - Project tracker items

---

## API Endpoints

### Articles
```
GET  /api/articles                     # List with pagination/filters
GET  /api/articles/:id                 # Article detail
POST /api/articles/analyze/:id         # Trigger AI analysis
GET  /api/articles/stats               # Aggregated statistics
```

### Facilities
```
GET  /api/facilities                   # Search facilities
GET  /api/facilities/:ccn              # Facility detail
GET  /api/facilities/:ccn/deficiencies # Deficiency history
GET  /api/facilities/map               # Facilities with coordinates
```

### Bills & Regulations
```
GET  /api/bills                        # List tracked bills
GET  /api/bills/:id                    # Bill detail
GET  /api/regulations                  # Federal Register entries
```

### Analytics
```
GET  /api/analytics/states             # State-level metrics
GET  /api/analytics/trends             # Time-series trends
GET  /api/analytics/weekly-insights    # Weekly summary
```

---

## Project Tracker Feature

Excel-like task management with:

### Hierarchy
```
Category (e.g., "Regulatory")
  └── Subcategory (e.g., "CMS Rules")
        └── Task (e.g., "Review staffing mandate")
              └── Details (assignee, due date, status)
```

### Team Members (12 predefined)
- Operations, compliance, finance, legal roles
- Workload tracking per person
- Due date urgency indicators

### Persistence
- Local storage (no backend required)
- Export/import JSON capability

---

## Running Locally

```bash
# Option 1: Full stack
cd snf-news-aggregator
npm install
npm run dev:all       # Frontend + Backend concurrently

# Option 2: Separate terminals
# Terminal 1 - Backend
npm run server        # Runs on http://localhost:5000

# Terminal 2 - Frontend
npm run dev           # Runs on http://localhost:5173
```

### Environment Variables
```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...

# Optional
OPENAI_API_KEY=sk-proj-...
GOOGLE_MAPS_API_KEY=AIza...
CONGRESS_API_KEY=...           # For bill tracking
```

---

## Collector Scripts

### Run Individual Collectors
```bash
# Collect RSS articles
node server/collectors/rssCollector.js

# Import CMS facility data
node server/collectors/cmsCollector.js

# Track Congress bills
node server/collectors/congressCollector.js

# Run AI analysis on unanalyzed articles
node server/services/runAnalysis.js
```

### Scheduled Collection (node-cron)
```javascript
// In server/index.js
cron.schedule('0 */6 * * *', collectRSS);    // Every 6 hours
cron.schedule('0 0 * * *', collectCMS);       // Daily
cron.schedule('0 */12 * * *', collectBills);  // Every 12 hours
```

---

## Current Status & What Needs Work

### Fully Complete
- RSS aggregation from 9 sources (1,461+ articles)
- AI analysis pipeline with Claude
- Article list/detail views with filtering
- Interactive US state maps
- Project tracker with Excel-like interface
- Facility research with CMS data
- Bill tracking from Congress.gov
- Medicaid and ALF chatbots embedded

### In Progress
- AI analysis completion (302/809 articles analyzed)
- State-based filtering refinements
- Performance optimization for large datasets

### Not Yet Done
- User authentication
- Real-time updates (WebSocket)
- Advanced predictive analytics
- Mobile application
- Email digest/newsletter

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Articles collected | 1,461+ |
| Articles analyzed | ~302 |
| Facilities in DB | 15,000+ |
| Deficiency records | 500,000+ |
| Bills tracked | 1,000+ |
| Database size | ~2.2 GB |

---

## Geographic Scope Classification

AI categorizes each article's scope:

| Scope | Description |
|-------|-------------|
| **National** | Affects all states (federal policy) |
| **Regional** | Multiple states (e.g., "Western states") |
| **State** | Single state mentioned |
| **Local** | City/county level |

Used for filtering and map visualization.

---

## State Map Visualization

Interactive choropleth map showing:
- Article count per state
- Facility density
- Average quality ratings
- Deficiency trends

Built with D3.js + TopoJSON for state boundaries.

---

## Deduplication Logic

Articles are deduplicated by:
1. URL normalization (remove tracking params)
2. Title similarity (Levenshtein distance)
3. Content hash comparison
4. Publication date proximity

Prevents duplicate articles from multiple Google News feeds.

---

## Related Projects

- **pac-advocate** - Shares facility/CMS data sources
- **senior-chatbots** - Medicaid chatbot embedded in this app
- **snfalyze** - News may inform deal evaluation

---

## Performance Targets

| Metric | Target |
|--------|--------|
| API response | <200ms |
| Page load | <2 seconds |
| AI analysis | ~3 seconds/article |
| Uptime | 99.9% |
| Concurrent users | 1000+ |

---

## Deployment (Render)

```yaml
services:
  - type: web
    name: snf-news-backend
    env: node
    buildCommand: npm install
    startCommand: node server/index.js
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: snf-news-db
          property: connectionString

  - type: web
    name: snf-news-frontend
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: dist

databases:
  - name: snf-news-db
    plan: starter
```

---

*For complete architecture details, see ARCHITECTURE_CONTEXT.md*
