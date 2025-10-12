-- Create state_summaries table for caching AI-generated state summaries
CREATE TABLE IF NOT EXISTS state_summaries (
    id SERIAL PRIMARY KEY,
    state VARCHAR(2) NOT NULL UNIQUE,
    summary JSONB NOT NULL,
    articles_analyzed INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_state_summaries_state ON state_summaries(state);
CREATE INDEX IF NOT EXISTS idx_state_summaries_updated ON state_summaries(updated_at DESC);

-- Create or replace the trigger function (in case it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_state_summaries_updated_at ON state_summaries;
CREATE TRIGGER update_state_summaries_updated_at
    BEFORE UPDATE ON state_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
