-- Migration: Add ecosystem intelligence fields to bills table
-- Description: Adds direct_relevance_score, ecosystem_relevance_score, impact_type,
--              and related fields for Federal Register ecosystem analysis

-- Add relevance score breakdown
ALTER TABLE bills ADD COLUMN IF NOT EXISTS direct_relevance_score INTEGER;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS ecosystem_relevance_score INTEGER;

-- Add impact type classification
ALTER TABLE bills ADD COLUMN IF NOT EXISTS impact_type VARCHAR(100);

-- Add ecosystem impact details (JSON)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS ecosystem_impact JSONB;

-- Add strategic actions (JSON array)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS strategic_actions JSONB;

-- Add affected operators description
ALTER TABLE bills ADD COLUMN IF NOT EXISTS affected_operators TEXT;

-- Add key impact description
ALTER TABLE bills ADD COLUMN IF NOT EXISTS key_impact TEXT;

-- Add financial impact description
ALTER TABLE bills ADD COLUMN IF NOT EXISTS financial_impact_description VARCHAR(100);

-- Add action required flag
ALTER TABLE bills ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false;

-- Add publication and effective dates
ALTER TABLE bills ADD COLUMN IF NOT EXISTS publication_date DATE;

-- Add categories (JSON array)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS categories JSONB;

-- Add agencies (JSON array)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS agencies JSONB;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_bills_impact_type ON bills(impact_type);
CREATE INDEX IF NOT EXISTS idx_bills_direct_relevance ON bills(direct_relevance_score);
CREATE INDEX IF NOT EXISTS idx_bills_ecosystem_relevance ON bills(ecosystem_relevance_score);
CREATE INDEX IF NOT EXISTS idx_bills_action_required ON bills(action_required);
CREATE INDEX IF NOT EXISTS idx_bills_publication_date ON bills(publication_date);
