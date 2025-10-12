# SNF News Aggregator - Project Context

## Project Overview
**SNF News Aggregator** is a web application that aggregates, analyzes, and displays skilled nursing facility (SNF) industry news from multiple RSS feeds, using Claude AI to provide deep, actionable insights for SNF operators, administrators, and compliance professionals.

## Current Status
**Phase**: Active Development & Content Analysis
- Backend server successfully fetching from 9 RSS feeds (1 Skilled Nursing News + 8 Google News)
- AI analysis system operational with enhanced prompt including geographic scope detection
- Currently analyzing ~809 articles with Claude Sonnet 4
- Frontend displaying articles with filtering, search, and AI analysis features
- Conference directory feature added and functional

## Tech Stack

### Frontend
- **React 18** with Vite
- **React Router** for navigation
- **Lucide React** for icons
- **CSS** for styling
- Runs on port 5173

### Backend
- **Node.js** with ES modules
- **Express** server on port 3001
- **rss-parser** for RSS feed parsing
- **Anthropic Claude Sonnet 4** (claude-sonnet-4-20250514) for AI analysis
- **cors** for cross-origin requests

### Data Storage
- JSON files for persistent storage (no database)
- `server/data/analyzed-articles.json` - Main article storage with AI analysis
- `server/data/conferences.json` - Healthcare conference directory

## File Structure

```
snf-news-aggregator/
├── src/                          # React frontend
│   ├── App.jsx                   # Main app component with routing
│   ├── components/
│   │   ├── FilterPanel.jsx       # Search and filter controls
│   │   ├── ArticleList.jsx       # Article grid display
│   │   ├── ArticleCard.jsx       # Individual article cards
│   │   ├── ArticleDetail.jsx     # Full article modal
│   │   ├── AIAnalysis.jsx        # AI analysis modal
│   │   ├── TrendingTags.jsx      # Tag cloud component
│   │   └── ConferenceDirectory.jsx # Conference listings
│   └── services/
│       └── apiService.js         # API client for backend
├── server/
│   ├── index.js                  # Express server with RSS parsing & AI analysis
│   └── data/
│       ├── analyzed-articles.json # Analyzed articles storage
│       └── conferences.json      # Conference data
├── .env / server/.env            # ANTHROPIC_API_KEY configuration
├── CONTEXT.md                    # This file
├── PROJECT_LOG.md                # Action log
└── TODO.md                       # Task list
```

## Key Architecture Decisions

### 1. **RSS Feed Integration (Google News)**
**Why**: To dramatically expand article coverage beyond the single Skilled Nursing News feed. Uses 8 parallel Google News RSS feeds with SNF-related search terms.

**Search Terms**:
- "skilled nursing facility"
- "nursing home"
- "long-term care"
- "SNF Medicare"
- "nursing home regulation"
- "SNF staffing"
- "nursing home quality"
- "post-acute care"

### 2. **AI Analysis with Claude Sonnet 4**
**Why**: To provide actionable, context-rich analysis that goes beyond article summaries. Each article analyzed for:
- Key insights (4 bullet points)
- Compliance timeline (comment deadlines, effective dates)
- Financial impact assessment
- Who needs to know (by role)
- Action items (immediate, short-term, long-term)
- Risk assessment
- Relevance reasoning
- **Geographic scope** (National/State/Regional/Local)
- **State identification** (2-letter state codes)

### 3. **Enhanced JSON Parsing**
**Critical Fix**: Claude sometimes returns prose + JSON instead of pure JSON. Implemented robust JSON boundary detection:
- Emphatic JSON-only instructions at prompt start and end
- Extract content between first `{` and last `}`
- Validate JSON boundaries exist before parsing
- Filter out null values from failed analyses

### 4. **Article Deduplication**
**Why**: Multiple feeds may return duplicate articles. System uses URL-based Set comparison to identify and analyze only new articles.

### 5. **JSON File Storage**
**Why**: Simplicity for MVP phase. No database setup required. All data persists in JSON files that are easy to inspect and debug.

### 6. **Null Handling**
**Critical Fix**: When AI analysis fails, system returns null. Added filtering at two points:
- Before pushing to analyzed articles array
- When loading existing articles from file

This prevents crashes when trying to access properties on null values.

## How It Works

### Backend Flow
1. **Fetch RSS Feeds**: Fetches 9 feeds in parallel (1 primary + 8 Google News)
2. **Parse Articles**: Extracts title, summary, date, URL, source
3. **Deduplicate**: Compares new articles against existing using URL matching
4. **AI Analysis**: Sends each new article to Claude Sonnet 4 with comprehensive analysis prompt
5. **JSON Extraction**: Robustly extracts JSON from Claude's response
6. **Store**: Appends analyzed articles to `analyzed-articles.json`
7. **Serve**: Provides REST endpoints for frontend to fetch data

### Frontend Flow
1. **Fetch Articles**: Loads analyzed articles from backend API
2. **Display**: Shows articles in grid with category badges, impact levels, relevance scores
3. **Filter**: Client-side filtering by category, impact, source, date range, search term
4. **Trending Tags**: Displays most common tags across all articles
5. **AI Analysis Modal**: Shows full AI-generated analysis on demand
6. **Conference Directory**: Separate page listing healthcare conferences

## Important Notes & Gotchas

### 1. **Cache Clearing**
Backend uses `cache=false` parameter to force fresh RSS feed fetches on every startup. This ensures latest articles are always fetched.

### 2. **API Key Configuration**
Anthropic API key stored in `.env` and `server/.env`. Key format: `sk-ant-api03-...`

### 3. **Port Configuration**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- CORS enabled for cross-origin requests

### 4. **Analysis Rate**
~3 seconds per article. Batch of 809 articles takes ~40-45 minutes to complete.

### 5. **Article Array Size**
The analyzed-articles.json file pre-allocates 810 array slots. Initially filled with `null` values, then populated during analysis.

### 6. **Resume Capability**
If server stops mid-analysis, restart picks up where it left off. Deduplication prevents re-analyzing completed articles.

### 7. **Conference Data Error**
Non-critical error on startup: `conferences.json` file doesn't exist yet. Doesn't affect article analysis.

## Recent Significant Changes

### Session: 2025-10-10
1. **Added Geographic Scope Detection**: Enhanced AI prompt to identify scope (National/State/Regional/Local) and state codes
2. **Fixed JSON Parsing**: Added emphatic JSON-only instructions and robust boundary detection
3. **Fixed Null Handling**: Prevented null values from crashing deduplication logic
4. **Tested with 1 Article**: Successfully validated enhanced prompt before full batch
5. **Running Full Analysis**: Currently processing ~809 articles with enhanced prompt

## Current Priorities

### In Progress
1. **Complete AI Analysis**: ~302/809 articles analyzed with geographic scope detection
2. **Monitor Analysis Progress**: Ensure no errors during full batch processing

### Next Steps
1. Verify geographic scope/state data is correctly populated across all articles
2. Add state-based filtering to frontend UI
3. Consider adding geographic map visualization
4. Optimize analysis performance if needed

## Active Blockers
None currently. Analysis running smoothly with no errors.

---
*Last Updated: 2025-10-10 at 19:52 UTC*
