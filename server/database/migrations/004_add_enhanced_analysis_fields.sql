-- Migration: Add enhanced analysis fields from article prompt
-- Description: Adds urgency scoring, implementation complexity, impact factors,
--              entities, temporal signals, market forces, competitive intelligence

-- Add urgency and complexity fields
ALTER TABLE bills ADD COLUMN IF NOT EXISTS urgency_score INTEGER;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS implementation_complexity VARCHAR(50);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS competitive_intelligence TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS strategic_implications TEXT;

-- Add structured impact factors (JSON)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS impact_factors JSONB;

-- Add structured entities (JSON)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS entities JSONB;

-- Add temporal signals (JSON)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS temporal_signals JSONB;

-- Add market forces (JSON array)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS market_forces JSONB;

-- Add compliance timeline details
ALTER TABLE bills ADD COLUMN IF NOT EXISTS compliance_timeline JSONB;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_bills_urgency_score ON bills(urgency_score);
CREATE INDEX IF NOT EXISTS idx_bills_implementation_complexity ON bills(implementation_complexity);
