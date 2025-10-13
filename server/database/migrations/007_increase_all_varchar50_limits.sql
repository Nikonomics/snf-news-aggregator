-- Migration 007: Increase all VARCHAR(50) limits that could be exceeded by AI analysis
-- Created: 2025-10-13
-- Purpose: Fix remaining "value too long for type character varying(50)" errors

-- Drop views
DROP VIEW IF EXISTS urgent_bills CASCADE;
DROP VIEW IF EXISTS recent_federal_bills CASCADE;
DROP VIEW IF EXISTS active_state_bills CASCADE;

-- Increase all potentially problematic VARCHAR(50) columns
ALTER TABLE bills ALTER COLUMN ai_impact_type TYPE VARCHAR(255);
ALTER TABLE bills ALTER COLUMN implementation_timeline TYPE VARCHAR(255);
ALTER TABLE bills ALTER COLUMN document_type TYPE VARCHAR(100);

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
