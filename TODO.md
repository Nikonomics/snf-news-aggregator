# SNF News Aggregator - TODO List

## 🔴 High Priority

### Complete AI Analysis of All Articles
**Status**: In Progress (~302/809 articles analyzed)
**Why**: Need full dataset with geographic scope data before adding new features
**Blockers**: None - running smoothly
**Progress**: Server analyzing at ~3 articles/minute, ~29 minutes remaining

---

## 🟡 In Progress

### Monitor Analysis Completion
**Status**: Actively monitoring
**Why**: Ensure no errors occur during full batch processing
**Next Step**: Check progress periodically via server logs

---

## 🔵 Planned - Short Term

### Add State-Based Filtering to Frontend
**Why**: Users need to filter articles by state relevance for their facilities
**Dependencies**: Complete AI analysis with geographic scope data
**Tasks**:
- Add state dropdown to FilterPanel component
- Extract unique states from articles
- Implement state filter in filteredArticles logic
- Test filtering with real geographic data

### Verify Geographic Scope Data Quality
**Why**: Ensure AI correctly identified scope and state codes across all articles
**Tasks**:
- Review sample of analyzed articles
- Validate state codes are correct (2-letter format)
- Check scope classifications are appropriate
- Identify and fix any data quality issues

---

## 🔵 Planned - Medium Term

### Geographic Map Visualization
**Why**: Visual representation of article distribution by state would provide intuitive navigation
**Tasks**:
- Research React map libraries (leaflet, react-simple-maps)
- Design state-level choropleth showing article counts
- Implement click-to-filter functionality
- Add to dashboard as optional view

### Optimize Analysis Performance
**Why**: 3 seconds per article is slow for large batches
**Options**:
- Implement batch analysis (multiple articles per API call)
- Add caching for similar articles
- Consider parallel processing with rate limiting
**Decision Needed**: Evaluate cost/performance tradeoffs

### Add Article Refresh Scheduling
**Why**: Articles should update automatically without manual restart
**Tasks**:
- Implement cron-like scheduler in backend
- Add configurable refresh interval (e.g., hourly, daily)
- Ensure deduplication prevents re-analyzing existing articles
- Add last-updated timestamp to UI

---

## 🟢 Planned - Long Term

### Database Migration
**Why**: JSON files work for MVP but won't scale well
**Options**: PostgreSQL, MongoDB, or SQLite
**Tasks**:
- Design schema for articles, conferences, analysis data
- Implement migration script from JSON to DB
- Update backend to use database queries
- Add database connection pooling
**Blockers**: Not needed until scaling becomes an issue

### User Authentication & Personalization
**Why**: Users should be able to save preferences and favorite articles
**Features**:
- User accounts with login
- Saved article lists
- Custom state/category preferences
- Email digest subscriptions
**Blockers**: Need to determine if this is needed for target users

### Advanced Analytics Dashboard
**Why**: Show trends, patterns, and insights across articles over time
**Features**:
- Article volume trends
- Most active categories/states
- Impact level distribution
- Compliance deadline calendar
**Dependencies**: Requires larger dataset (multiple months of articles)

---

## 📋 Backlog

### Export Functionality
**Why**: Users may want to export filtered article lists
**Formats**: CSV, PDF report, email digest
**Priority**: Low - not requested yet

### Mobile App
**Why**: SNF administrators often on the go
**Platform**: React Native for cross-platform
**Priority**: Low - web responsive is sufficient for now

### Integration with Facility Management Systems
**Why**: Automatically alert relevant staff about high-impact articles
**Requires**: API partnerships, authentication
**Priority**: Future consideration

---

## ✅ Done

### 2025-10-10 - Automatic Documentation System
**Completed**: Created .claudemd, CONTEXT.md, PROJECT_LOG.md, TODO.md
**Result**: Project now has comprehensive documentation system for continuity

### 2025-10-10 - Enhanced Geographic Scope Detection
**Completed**: Added scope (National/State/Regional/Local) and state fields to AI analysis
**Result**: Articles now include geographic metadata for filtering

### 2025-10-10 - Fixed JSON Parsing Issues
**Completed**: Added emphatic JSON-only instructions and robust boundary detection
**Result**: Claude reliably returns parseable JSON

### 2025-10-10 - Fixed Null Handling Bug
**Completed**: Added null filtering to prevent crashes
**Result**: System resilient to failed AI analyses

### 2025-10-10 - Successful Test with 1 Article
**Completed**: Validated enhanced prompt before full batch
**Result**: Confirmed scope/state detection works correctly

### 2025-10-10 - Google News RSS Integration
**Completed**: Expanded from 1 to 9 RSS feeds
**Result**: Coverage increased from ~10 to ~810 articles

### 2025-10-10 - Conference Directory Feature
**Completed**: Added conference listings page with routing
**Result**: Users can browse healthcare industry events

### 2025-10-10 - Frontend with Filtering & Search
**Completed**: Built React UI with comprehensive filtering
**Result**: Users can search and filter articles by multiple criteria

### 2025-10-10 - Backend API with AI Analysis
**Completed**: Express server with Claude Sonnet 4 integration
**Result**: Articles automatically analyzed with actionable insights

### 2025-10-10 - Project Initialization
**Completed**: Set up React + Node.js project structure
**Result**: Working development environment

---

*Last Updated: 2025-10-10 at 19:52 UTC*
