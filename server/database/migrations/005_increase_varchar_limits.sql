-- Migration 005: Increase VARCHAR limits for fields that commonly exceed 100 characters
-- Created: 2025-10-13
-- Purpose: Fix "value too long for type character varying(100)" errors

-- Drop views that depend on these columns
DROP VIEW IF EXISTS urgent_bills CASCADE;
DROP VIEW IF EXISTS recent_federal_bills CASCADE;
DROP VIEW IF EXISTS active_state_bills CASCADE;

-- Increase impact_type from VARCHAR(100) to VARCHAR(255)
ALTER TABLE bills ALTER COLUMN impact_type TYPE VARCHAR(255);

-- Increase financial_impact_description from VARCHAR(100) to TEXT (unlimited)
ALTER TABLE bills ALTER COLUMN financial_impact_description TYPE TEXT;

-- Also increase operational_area in case it's too small
ALTER TABLE bills ALTER COLUMN operational_area TYPE VARCHAR(255);

-- And status field in case it's too descriptive
ALTER TABLE bills ALTER COLUMN status TYPE VARCHAR(255);

-- Recreate views
CREATE OR REPLACE VIEW urgent_bills AS
SELECT
  b.*,
  CASE
    WHEN b.priority = 'critical' THEN 1
    WHEN b.priority = 'high' THEN 2
    WHEN b.priority = 'medium' THEN 3
    ELSE 4
  END as priority_rank
FROM bills b
WHERE
  b.priority IN ('critical', 'high')
  OR (b.has_comment_period = true AND b.comment_deadline <= CURRENT_DATE + INTERVAL '7 days')
  OR b.ai_relevance_score >= 80
ORDER BY priority_rank, b.last_action_date DESC;

CREATE OR REPLACE VIEW recent_federal_bills AS
SELECT *
FROM bills
WHERE jurisdiction = 'federal'
  AND last_action_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY last_action_date DESC;

CREATE OR REPLACE VIEW active_state_bills AS
SELECT *
FROM bills
WHERE jurisdiction = 'state'
  AND status NOT IN ('dead', 'failed', 'vetoed')
  AND last_action_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY state, last_action_date DESC;
