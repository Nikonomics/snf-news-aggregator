-- ============================================================
-- LEGISLATION TRACKING TABLES
-- Migration 003: Add bills and related tables
-- ============================================================

-- ============================================================
-- BILLS TABLE (Main legislation/regulation tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
    -- Identity
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(100) UNIQUE NOT NULL, -- e.g., "HR 1234", "S 567", "CMS-1234-F"
    external_id VARCHAR(500) UNIQUE, -- API-specific ID for deduplication

    -- Basic Info
    title TEXT NOT NULL,
    summary TEXT,
    full_text TEXT, -- Full bill/regulation text

    -- Source & Type
    source VARCHAR(50) NOT NULL, -- 'congress', 'federal_register', 'legiscan'
    jurisdiction VARCHAR(20) NOT NULL, -- 'federal', 'state'
    state VARCHAR(2), -- 2-letter state code (NULL for federal)
    document_type VARCHAR(50), -- 'bill', 'rule', 'proposed_rule', 'notice'

    -- Legislative Details
    status VARCHAR(100), -- 'introduced', 'passed_house', 'passed_senate', 'enacted', etc.
    sponsor VARCHAR(255),
    committee VARCHAR(255),
    introduced_date DATE,
    last_action_date DATE,

    -- URLs
    url TEXT NOT NULL,
    api_url TEXT, -- API endpoint for this bill
    pdf_url TEXT, -- PDF version if available

    -- AI Analysis Fields
    ai_relevance_score INTEGER CHECK (ai_relevance_score >= 0 AND ai_relevance_score <= 100),
    ai_impact_type VARCHAR(50), -- 'direct', 'indirect', 'compliance', 'operational'
    ai_explanation TEXT, -- Why this bill is relevant to SNFs
    ai_summary TEXT, -- One-line executive summary

    -- Impact Assessment
    financial_impact_pbpy DECIMAL(10,2), -- Per bed per year financial impact
    annual_facility_impact DECIMAL(12,2), -- Estimated annual impact for 100-bed facility
    reimbursement_risk INTEGER CHECK (reimbursement_risk >= 0 AND reimbursement_risk <= 100),
    staffing_risk INTEGER CHECK (staffing_risk >= 0 AND staffing_risk <= 100),
    compliance_risk INTEGER CHECK (compliance_risk >= 0 AND compliance_risk <= 100),
    quality_risk INTEGER CHECK (quality_risk >= 0 AND quality_risk <= 100),

    -- Operational Details
    operational_area VARCHAR(100), -- 'Staffing', 'Quality', 'Payment', 'Survey', etc.
    implementation_timeline VARCHAR(50), -- 'immediate', 'short_term', 'long_term'
    implementation_steps TEXT[],

    -- Regulatory Action Tracking
    has_comment_period BOOLEAN DEFAULT false,
    comment_deadline DATE,
    comment_url TEXT,
    effective_date DATE,

    -- Priority & Tracking
    priority VARCHAR(20) DEFAULT 'medium', -- 'urgent', 'high', 'medium', 'low'
    passage_likelihood INTEGER CHECK (passage_likelihood >= 0 AND passage_likelihood <= 100),
    tracking_enabled BOOLEAN DEFAULT true,

    -- Keywords & Topics
    topics TEXT[], -- Array of topic tags
    snf_keywords_matched TEXT[], -- Matched SNF-specific keywords

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analyzed_at TIMESTAMP, -- When AI analysis was run
    last_checked_at TIMESTAMP, -- Last time we checked for updates

    -- Full analysis (stored as JSONB for flexibility)
    analysis JSONB
);

-- Indexes for bills table
CREATE INDEX idx_bills_bill_number ON bills(bill_number);
CREATE INDEX idx_bills_source ON bills(source);
CREATE INDEX idx_bills_jurisdiction ON bills(jurisdiction);
CREATE INDEX idx_bills_state ON bills(state);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_relevance_score ON bills(ai_relevance_score DESC);
CREATE INDEX idx_bills_priority ON bills(priority);
CREATE INDEX idx_bills_comment_deadline ON bills(comment_deadline);
CREATE INDEX idx_bills_effective_date ON bills(effective_date);
CREATE INDEX idx_bills_last_action ON bills(last_action_date DESC);
CREATE INDEX idx_bills_topics ON bills USING GIN(topics);
CREATE INDEX idx_bills_keywords ON bills USING GIN(snf_keywords_matched);
CREATE INDEX idx_bills_analysis ON bills USING GIN(analysis);

-- Full-text search index for bills
CREATE INDEX idx_bills_search ON bills USING GIN(
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(bill_number, ''))
);

-- ============================================================
-- BILL VERSIONS TABLE (Track changes over time)
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_versions (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,

    -- Snapshot of bill data at this version
    title TEXT,
    summary TEXT,
    full_text TEXT,
    status VARCHAR(100),

    -- Change tracking
    changes_summary TEXT,
    change_significance VARCHAR(20), -- 'minor', 'moderate', 'significant', 'critical'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(bill_id, version_number)
);

CREATE INDEX idx_bill_versions_bill_id ON bill_versions(bill_id);
CREATE INDEX idx_bill_versions_created ON bill_versions(created_at DESC);

-- ============================================================
-- BILL CHANGES TABLE (Detailed change detection)
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_changes (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,

    -- Change details
    change_type VARCHAR(50) NOT NULL, -- 'status', 'text', 'title', 'sponsor', 'committee'
    change_severity VARCHAR(20), -- 'minor', 'moderate', 'significant', 'critical'
    old_value TEXT,
    new_value TEXT,
    diff_summary TEXT,

    -- AI-generated change description
    change_description TEXT,
    impact_assessment TEXT,

    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bill_changes_bill_id ON bill_changes(bill_id);
CREATE INDEX idx_bill_changes_type ON bill_changes(change_type);
CREATE INDEX idx_bill_changes_severity ON bill_changes(change_severity);
CREATE INDEX idx_bill_changes_detected ON bill_changes(detected_at DESC);

-- ============================================================
-- KEYWORDS TABLE (SNF-specific search terms)
-- ============================================================
CREATE TABLE IF NOT EXISTS keywords (
    id SERIAL PRIMARY KEY,
    term VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100), -- 'payment', 'staffing', 'quality', 'compliance', etc.
    importance_weight DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
    synonyms TEXT[], -- Alternative terms
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_keywords_category ON keywords(category);
CREATE INDEX idx_keywords_term ON keywords(term);

-- ============================================================
-- BILL KEYWORD MATCHES (Many-to-many relationship)
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_keyword_matches (
    bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
    keyword_id INTEGER REFERENCES keywords(id) ON DELETE CASCADE,
    match_count INTEGER DEFAULT 1,
    match_locations TEXT[], -- Where in the bill the keyword appears
    confidence_score DECIMAL(3,2), -- 0.0 to 1.0
    context_snippet TEXT,

    PRIMARY KEY (bill_id, keyword_id)
);

CREATE INDEX idx_bill_keyword_bill ON bill_keyword_matches(bill_id);
CREATE INDEX idx_bill_keyword_keyword ON bill_keyword_matches(keyword_id);

-- ============================================================
-- ALERTS TABLE (User notifications for bill changes)
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_alerts (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,

    -- Alert details
    alert_type VARCHAR(50) NOT NULL, -- 'status_change', 'new_version', 'comment_deadline', etc.
    priority VARCHAR(20) DEFAULT 'medium', -- 'urgent', 'high', 'medium', 'low'
    title TEXT NOT NULL,
    message TEXT NOT NULL,

    -- Tracking
    is_read BOOLEAN DEFAULT false,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,

    -- Deduplication
    dedup_hash VARCHAR(64) -- Prevent duplicate alerts
);

CREATE INDEX idx_bill_alerts_bill_id ON bill_alerts(bill_id);
CREATE INDEX idx_bill_alerts_priority ON bill_alerts(priority);
CREATE INDEX idx_bill_alerts_is_read ON bill_alerts(is_read);
CREATE INDEX idx_bill_alerts_triggered ON bill_alerts(triggered_at DESC);
CREATE INDEX idx_bill_alerts_dedup ON bill_alerts(dedup_hash);

-- ============================================================
-- COLLECTION LOGS (Track data collection runs)
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL, -- 'congress', 'federal_register', 'legiscan'
    collection_type VARCHAR(50), -- 'full', 'incremental', 'manual'

    -- Results
    bills_collected INTEGER DEFAULT 0,
    bills_updated INTEGER DEFAULT 0,
    bills_analyzed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,

    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,

    -- Status
    status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed'
    error_message TEXT,

    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_collection_logs_source ON collection_logs(source);
CREATE INDEX idx_collection_logs_started ON collection_logs(started_at DESC);
CREATE INDEX idx_collection_logs_status ON collection_logs(status);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at for bills
CREATE TRIGGER update_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA: SNF Keywords
-- ============================================================
INSERT INTO keywords (term, category, importance_weight) VALUES
    -- Payment & Reimbursement
    ('PDPM', 'payment', 1.0),
    ('PPS', 'payment', 1.0),
    ('Medicare Part A', 'payment', 1.0),
    ('Medicaid', 'payment', 1.0),
    ('reimbursement', 'payment', 0.9),
    ('payment rate', 'payment', 0.9),
    ('case mix', 'payment', 0.8),
    ('RUG', 'payment', 0.8),

    -- Quality & Compliance
    ('Five-Star', 'quality', 1.0),
    ('star rating', 'quality', 1.0),
    ('quality measure', 'quality', 0.9),
    ('QAPI', 'quality', 0.9),
    ('deficiency', 'compliance', 0.8),
    ('survey', 'compliance', 0.8),
    ('citation', 'compliance', 0.7),

    -- Staffing
    ('staffing ratio', 'staffing', 1.0),
    ('minimum staffing', 'staffing', 1.0),
    ('RN hours', 'staffing', 0.9),
    ('LPN hours', 'staffing', 0.9),
    ('CNA', 'staffing', 0.8),
    ('nurse aide', 'staffing', 0.8),

    -- Documentation & Assessment
    ('MDS', 'documentation', 1.0),
    ('assessment', 'documentation', 0.7),
    ('care plan', 'documentation', 0.7),

    -- Facility Types
    ('SNF', 'facility_type', 1.0),
    ('skilled nursing', 'facility_type', 1.0),
    ('nursing facility', 'facility_type', 1.0),
    ('nursing home', 'facility_type', 1.0),
    ('long-term care', 'facility_type', 0.9),
    ('post-acute', 'facility_type', 0.8),

    -- Agencies
    ('CMS', 'agency', 1.0),
    ('Centers for Medicare', 'agency', 1.0)
ON CONFLICT (term) DO NOTHING;

-- ============================================================
-- VIEWS
-- ============================================================

-- High-priority bills requiring action
CREATE OR REPLACE VIEW urgent_bills AS
SELECT
    id, bill_number, title, source, jurisdiction, state,
    ai_relevance_score, priority, comment_deadline, effective_date,
    status, last_action_date
FROM bills
WHERE (priority IN ('urgent', 'high') OR
       (has_comment_period = true AND comment_deadline >= CURRENT_DATE AND comment_deadline <= CURRENT_DATE + INTERVAL '30 days'))
    AND tracking_enabled = true
ORDER BY
    CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
    END,
    comment_deadline ASC NULLS LAST,
    last_action_date DESC;

-- Recent federal legislation
CREATE OR REPLACE VIEW recent_federal_bills AS
SELECT *
FROM bills
WHERE jurisdiction = 'federal'
    AND introduced_date > CURRENT_DATE - INTERVAL '90 days'
ORDER BY introduced_date DESC;

-- State-specific active bills
CREATE OR REPLACE VIEW active_state_bills AS
SELECT *
FROM bills
WHERE jurisdiction = 'state'
    AND status NOT IN ('dead', 'vetoed', 'withdrawn')
    AND tracking_enabled = true
ORDER BY state, last_action_date DESC;
