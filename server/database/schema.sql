-- SNF News Aggregator Database Schema
-- PostgreSQL

-- ============================================================
-- ARTICLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
    -- Identity
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(500) UNIQUE, -- For deduplication (hash of title+url)

    -- Basic Info
    title TEXT NOT NULL,
    summary TEXT,
    url TEXT NOT NULL UNIQUE,
    source VARCHAR(255) NOT NULL,
    published_date TIMESTAMP NOT NULL,

    -- Categorization
    category VARCHAR(100) NOT NULL,
    impact VARCHAR(20) NOT NULL CHECK (impact IN ('high', 'medium', 'low', 'all')),
    relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),

    -- Geographic
    scope VARCHAR(50) CHECK (scope IN ('National', 'State', 'Regional', 'Local')),
    states TEXT[], -- Array of 2-letter state codes

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- AI Analysis (stored as JSONB for flexibility)
    analysis JSONB,

    -- Deduplication fields (added 2025-10-11)
    content_hash VARCHAR(64),
    last_content_update TIMESTAMP,
    duplicate_check_count INTEGER DEFAULT 0
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
CREATE INDEX idx_articles_external_id ON articles(external_id);

-- Deduplication indexes (added 2025-10-11)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_articles_content_hash ON articles(content_hash);
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm ON articles USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_published_date_hash ON articles(published_date, content_hash);

-- Full-text search index
CREATE INDEX idx_articles_search ON articles USING GIN(
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(summary, ''))
);

-- ============================================================
-- TAGS TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS article_tags (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX idx_article_tags_article ON article_tags(article_id);
CREATE INDEX idx_article_tags_tag ON article_tags(tag_id);

-- ============================================================
-- CONFERENCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS conferences (
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

-- ============================================================
-- USER TABLES (for future features)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
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

CREATE TABLE IF NOT EXISTS user_bookmarks (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, article_id)
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conferences_updated_at BEFORE UPDATE ON conferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEWS (for common queries)
-- ============================================================

-- Recent high-impact articles
CREATE OR REPLACE VIEW recent_high_impact AS
SELECT
    id, title, summary, url, source, published_date,
    category, impact, scope, states
FROM articles
WHERE impact = 'high'
    AND published_date > CURRENT_DATE - INTERVAL '30 days'
ORDER BY published_date DESC;

-- Upcoming conferences
CREATE OR REPLACE VIEW upcoming_conferences AS
SELECT *
FROM conferences
WHERE date_start >= CURRENT_DATE
    AND status = 'confirmed'
ORDER BY date_start ASC;
