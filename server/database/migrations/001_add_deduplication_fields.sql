-- Migration: Add deduplication fields and indexes
-- Date: 2025-10-11
-- Description: Adds content_hash, last_content_update fields and fuzzy search indexes for improved deduplication

BEGIN;

-- Add new columns for enhanced deduplication
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS last_content_update TIMESTAMP;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS duplicate_check_count INTEGER DEFAULT 0;

-- Install pg_trgm extension for fuzzy text matching (trigram similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add indexes for fast duplicate detection

-- Index for content hash lookup (Stage 2: Content fingerprint)
CREATE INDEX IF NOT EXISTS idx_articles_content_hash ON articles(content_hash);

-- Index for fuzzy title search (Stage 3: Find similar candidates)
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm ON articles USING gin(title gin_trgm_ops);

-- Composite index for date proximity + content searches
CREATE INDEX IF NOT EXISTS idx_articles_published_date_hash ON articles(published_date, content_hash);

-- Backfill content_hash for all existing articles
-- Formula: MD5(normalized_title + first_500_chars_of_summary)
UPDATE articles
SET content_hash = md5(
    LOWER(REGEXP_REPLACE(COALESCE(title, ''), '\s+', ' ', 'g')) ||
    '|' ||
    SUBSTRING(COALESCE(summary, ''), 1, 500)
)
WHERE content_hash IS NULL;

-- Set last_content_update to updated_at for existing articles
UPDATE articles
SET last_content_update = updated_at
WHERE last_content_update IS NULL;

COMMIT;

-- Verify migration
SELECT
    COUNT(*) as total_articles,
    COUNT(content_hash) as articles_with_hash,
    COUNT(last_content_update) as articles_with_update_time
FROM articles;
