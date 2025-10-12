# SNF News Aggregator - Database Schema Design

## Overview
This document outlines the database schema for migrating from JSON files to a relational database.

## Technology Recommendation: **PostgreSQL**

### Why PostgreSQL over SQLite?

**Pros:**
- ✅ Better for production deployment (already using Render)
- ✅ JSONB support for nested AI analysis data
- ✅ Full-text search built-in (for article search)
- ✅ Better concurrent access handling
- ✅ Advanced indexing (GIN indexes for arrays, JSONB)
- ✅ Scalable as dataset grows

**Cons:**
- ⚠️ Requires separate database service
- ⚠️ Slightly more complex setup

**Alternative - SQLite:**
- ✅ Simple, single-file database
- ✅ No separate service needed
- ✅ Good for development
- ❌ Limited concurrent writes
- ❌ Not ideal for production at scale

**Decision: Start with SQLite for development, PostgreSQL for production**

---

## Database Schema

### **Table: articles**
Primary table storing all analyzed news articles.

```sql
CREATE TABLE articles (
    -- Identity
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(500) UNIQUE, -- For deduplication (hash of title+url)

    -- Basic Info
    title TEXT NOT NULL,
    summary TEXT,
    url TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    published_date TIMESTAMP NOT NULL,

    -- Categorization
    category VARCHAR(100) NOT NULL,
    impact VARCHAR(20) NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
    relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),

    -- Geographic
    scope VARCHAR(50) CHECK (scope IN ('National', 'State', 'Regional', 'Local', NULL)),
    states TEXT[], -- Array of 2-letter state codes

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- AI Analysis (stored as JSONB for flexibility)
    analysis JSONB,

    -- Indexes
    CONSTRAINT articles_url_unique UNIQUE(url)
);

-- Indexes for common queries
CREATE INDEX idx_articles_published_date ON articles(published_date DESC);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_impact ON articles(impact);
CREATE INDEX idx_articles_source ON articles(source);
CREATE INDEX idx_articles_scope ON articles(scope);
CREATE INDEX idx_articles_states ON articles USING GIN(states);
CREATE INDEX idx_articles_relevance ON articles(relevance_score DESC);
CREATE INDEX idx_articles_analysis ON articles USING GIN(analysis);

-- Full-text search index
CREATE INDEX idx_articles_search ON articles USING GIN(
    to_tsvector('english', title || ' ' || COALESCE(summary, ''))
);
```

**Analysis JSONB Structure:**
```json
{
  "keyInsights": ["insight1", "insight2"],
  "complianceTimeline": {
    "commentDeadline": "date or N/A",
    "effectiveDate": "date or N/A",
    "prepTime": "time estimate",
    "criticalDates": ["date1", "date2"]
  },
  "financialImpact": "description",
  "whoNeedsToKnow": [
    {"role": "Administrator", "reason": "explanation"}
  ],
  "actionItems": {
    "immediate": ["action1"],
    "shortTerm": ["action2"],
    "longTerm": ["action3"]
  },
  "risks": [
    {"level": "high", "description": "risk", "mitigation": "strategy"}
  ],
  "relevanceReasoning": "why this matters"
}
```

---

### **Table: article_tags**
Many-to-many relationship for tags.

```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE article_tags (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX idx_article_tags_article ON article_tags(article_id);
CREATE INDEX idx_article_tags_tag ON article_tags(tag_id);
```

---

### **Table: conferences**
Conference directory data.

```sql
CREATE TABLE conferences (
    id SERIAL PRIMARY KEY,

    -- Basic Info
    organization VARCHAR(255) NOT NULL,
    event_name TEXT NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE,

    -- Location
    location TEXT,
    state VARCHAR(2), -- 2-letter state code or NULL for national
    city VARCHAR(255),
    venue VARCHAR(255),

    -- Details
    website TEXT,
    status VARCHAR(50) DEFAULT 'confirmed',
    category VARCHAR(100), -- 'National Association', 'State Association', etc.

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_conferences_date_start ON conferences(date_start);
CREATE INDEX idx_conferences_state ON conferences(state);
CREATE INDEX idx_conferences_category ON conferences(category);
CREATE INDEX idx_conferences_status ON conferences(status);
```

---

### **Table: user_preferences** (Future)
For saving user filters, favorites, etc.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Saved filters
    favorite_states TEXT[],
    favorite_categories TEXT[],
    favorite_sources TEXT[],

    -- Notifications
    email_alerts BOOLEAN DEFAULT false,
    alert_frequency VARCHAR(50), -- 'daily', 'weekly', 'immediate'

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_bookmarks (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, article_id)
);
```

---

## Common Queries

### 1. Get paginated articles with filters
```sql
SELECT * FROM articles
WHERE
    category = 'Regulatory'
    AND impact = 'high'
    AND published_date > NOW() - INTERVAL '30 days'
    AND 'CA' = ANY(states)
ORDER BY published_date DESC
LIMIT 50 OFFSET 0;
```

### 2. Full-text search
```sql
SELECT *, ts_rank(
    to_tsvector('english', title || ' ' || COALESCE(summary, '')),
    plainto_tsquery('english', 'Medicare reimbursement')
) AS rank
FROM articles
WHERE to_tsvector('english', title || ' ' || summary) @@
      plainto_tsquery('english', 'Medicare reimbursement')
ORDER BY rank DESC, published_date DESC
LIMIT 50;
```

### 3. Get trending tags
```sql
SELECT t.name, COUNT(*) as count
FROM tags t
JOIN article_tags at ON t.id = at.tag_id
JOIN articles a ON at.article_id = a.id
WHERE a.published_date > NOW() - INTERVAL '7 days'
GROUP BY t.name
ORDER BY count DESC
LIMIT 10;
```

### 4. Check for duplicate articles
```sql
SELECT external_id, COUNT(*)
FROM articles
GROUP BY external_id
HAVING COUNT(*) > 1;
```

---

## Migration Strategy

### Phase 1: Setup (Day 1)
1. Install PostgreSQL (local + Render)
2. Create database schema
3. Add database library (`pg` for Node.js)
4. Test connection

### Phase 2: Dual-Write (Day 1-2)
1. Write to both JSON AND database
2. Keep JSON as backup
3. Verify data consistency

### Phase 3: Migration Script (Day 2)
1. Read all JSON articles
2. Insert into database with deduplication
3. Migrate conferences

### Phase 4: Switch to Database (Day 3)
1. Update all API endpoints to read from DB
2. Remove JSON file reads
3. Keep JSON writes as backup (optional)

### Phase 5: Cleanup (Day 4)
1. Remove JSON file operations
2. Monitor performance
3. Optimize slow queries

---

## Database Connection Setup

### Environment Variables
```env
# Local Development
DATABASE_URL=postgresql://localhost:5432/snf_news_dev

# Production (Render)
DATABASE_URL=postgresql://user:password@host:5432/snf_news_prod
```

### Connection Pool Config
```javascript
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})
```

---

## Estimated Performance Improvements

| Operation | JSON Files | PostgreSQL | Improvement |
|-----------|-----------|------------|-------------|
| Load all articles | ~50-100ms | ~5-10ms | 10x faster |
| Paginated query | ~50-100ms | ~2-5ms | 20x faster |
| Filtered search | ~100-200ms | ~5-15ms | 15x faster |
| Insert new article | ~50-100ms | ~2-5ms | 20x faster |
| Check duplicates | ~100ms | ~1-2ms | 50x faster |

---

## Next Steps

1. ✅ Review and approve this schema
2. ⏳ Choose: SQLite (quick start) or PostgreSQL (production-ready)
3. ⏳ Set up local database
4. ⏳ Create migration script
5. ⏳ Update server code
6. ⏳ Test and deploy
