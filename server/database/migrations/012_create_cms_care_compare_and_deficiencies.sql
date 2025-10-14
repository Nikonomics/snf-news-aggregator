-- Migration 012: Create CMS Care Compare and Deficiencies tables
-- Created: 2025-10-13
-- Purpose: Store detailed CMS Care Compare quality metrics and facility deficiency records

-- ============================================================
-- CMS CARE COMPARE RATINGS TABLE
-- Detailed quality metrics from CMS Care Compare dataset (4pq5-n9py)
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_care_compare_ratings (
    id SERIAL PRIMARY KEY,

    -- Facility identifier (links to snf_facilities)
    federal_provider_number VARCHAR(10) NOT NULL,

    -- Overall star rating
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),

    -- Component ratings (1-5 stars each)
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    staffing_rating INTEGER CHECK (staffing_rating BETWEEN 1 AND 5),
    health_inspection_rating INTEGER CHECK (health_inspection_rating BETWEEN 1 AND 5),

    -- Survey/Inspection scores
    total_weighted_health_survey_score DECIMAL(8,2),

    -- Incident and complaint tracking
    number_of_facility_reported_incidents INTEGER DEFAULT 0,
    number_of_substantiated_complaints INTEGER DEFAULT 0,

    -- Staffing details (hours per resident day)
    reported_rn_staffing_hours DECIMAL(6,2),
    reported_lpn_staffing_hours DECIMAL(6,2),
    reported_cna_staffing_hours DECIMAL(6,2),
    reported_total_nurse_staffing_hours DECIMAL(6,2),
    reported_physical_therapist_staffing_hours DECIMAL(6,2),

    -- Quality measures (various percentages)
    percent_of_residents_experiencing_one_or_more_falls_with_major_injury DECIMAL(5,2),
    percentage_of_residents_with_pressure_ulcers DECIMAL(5,2),
    percentage_of_residents_assessed_and_given_pneumococcal_vaccine DECIMAL(5,2),
    percentage_of_residents_assessed_and_given_influenza_vaccine DECIMAL(5,2),
    percentage_of_short_stay_residents_who_improved_in_function DECIMAL(5,2),

    -- Additional quality indicators
    percentage_of_residents_with_depressive_symptoms DECIMAL(5,2),
    percentage_of_residents_experiencing_outpatient_emergency_department_visits DECIMAL(5,2),
    percentage_of_residents_with_antipsychotic_medication DECIMAL(5,2),

    -- Special programs and certifications
    special_focus_facility BOOLEAN DEFAULT false,
    abuse_icon BOOLEAN DEFAULT false,

    -- Data source tracking
    data_collection_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one record per facility (can be updated monthly)
    UNIQUE(federal_provider_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_care_compare_provider ON cms_care_compare_ratings(federal_provider_number);
CREATE INDEX IF NOT EXISTS idx_care_compare_overall_rating ON cms_care_compare_ratings(overall_rating);
CREATE INDEX IF NOT EXISTS idx_care_compare_quality_rating ON cms_care_compare_ratings(quality_rating);
CREATE INDEX IF NOT EXISTS idx_care_compare_staffing_rating ON cms_care_compare_ratings(staffing_rating);
CREATE INDEX IF NOT EXISTS idx_care_compare_inspection_rating ON cms_care_compare_ratings(health_inspection_rating);
CREATE INDEX IF NOT EXISTS idx_care_compare_incidents ON cms_care_compare_ratings(number_of_facility_reported_incidents);
CREATE INDEX IF NOT EXISTS idx_care_compare_complaints ON cms_care_compare_ratings(number_of_substantiated_complaints);

-- ============================================================
-- CMS FACILITY DEFICIENCIES TABLE
-- Deficiency records from CMS Deficiencies dataset (r5ix-sfxw)
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_facility_deficiencies (
    id SERIAL PRIMARY KEY,

    -- Facility identifier (links to snf_facilities)
    federal_provider_number VARCHAR(10) NOT NULL,

    -- Survey/Inspection details
    survey_date DATE NOT NULL,
    survey_type VARCHAR(50), -- 'Health', 'Fire Safety', 'Complaint', etc.

    -- Deficiency details
    deficiency_tag VARCHAR(10) NOT NULL, -- e.g., 'F689', 'F880'
    deficiency_prefix VARCHAR(5), -- 'F' for federal requirements
    scope_severity VARCHAR(5), -- e.g., 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'

    -- Deficiency description
    deficiency_text TEXT,

    -- Correction status
    correction_date DATE,
    is_corrected BOOLEAN DEFAULT false,

    -- Data source tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deficiencies_provider ON cms_facility_deficiencies(federal_provider_number);
CREATE INDEX IF NOT EXISTS idx_deficiencies_survey_date ON cms_facility_deficiencies(survey_date DESC);
CREATE INDEX IF NOT EXISTS idx_deficiencies_tag ON cms_facility_deficiencies(deficiency_tag);
CREATE INDEX IF NOT EXISTS idx_deficiencies_scope_severity ON cms_facility_deficiencies(scope_severity);
CREATE INDEX IF NOT EXISTS idx_deficiencies_corrected ON cms_facility_deficiencies(is_corrected);
CREATE INDEX IF NOT EXISTS idx_deficiencies_provider_date ON cms_facility_deficiencies(federal_provider_number, survey_date DESC);

-- Composite index for common query pattern (facility + date range)
CREATE INDEX IF NOT EXISTS idx_deficiencies_provider_date_tag ON cms_facility_deficiencies(federal_provider_number, survey_date DESC, deficiency_tag);

-- ============================================================
-- VIEWS
-- ============================================================

-- Facility deficiency summary
CREATE OR REPLACE VIEW facility_deficiency_summary AS
SELECT
    federal_provider_number,
    COUNT(*) as total_deficiencies,
    COUNT(DISTINCT deficiency_tag) as unique_deficiency_types,
    COUNT(CASE WHEN scope_severity IN ('J', 'K', 'L') THEN 1 END) as serious_deficiencies,
    COUNT(CASE WHEN is_corrected = false THEN 1 END) as uncorrected_deficiencies,
    MAX(survey_date) as last_survey_date,
    MIN(survey_date) as first_survey_date
FROM cms_facility_deficiencies
GROUP BY federal_provider_number;

-- Most common deficiency tags across all facilities
CREATE OR REPLACE VIEW common_deficiency_tags AS
SELECT
    deficiency_tag,
    COUNT(*) as occurrence_count,
    COUNT(DISTINCT federal_provider_number) as facility_count,
    ROUND(AVG(CASE WHEN is_corrected THEN 1 ELSE 0 END)::NUMERIC * 100, 2) as correction_rate_pct
FROM cms_facility_deficiencies
GROUP BY deficiency_tag
ORDER BY occurrence_count DESC;

-- Recent high-severity deficiencies
CREATE OR REPLACE VIEW recent_serious_deficiencies AS
SELECT
    d.federal_provider_number,
    f.facility_name,
    f.state,
    f.city,
    d.survey_date,
    d.deficiency_tag,
    d.scope_severity,
    d.deficiency_text,
    d.is_corrected,
    d.correction_date
FROM cms_facility_deficiencies d
LEFT JOIN snf_facilities f ON d.federal_provider_number = f.federal_provider_number
WHERE d.scope_severity IN ('J', 'K', 'L')
    AND d.survey_date >= CURRENT_DATE - INTERVAL '12 months'
ORDER BY d.survey_date DESC, d.scope_severity DESC;

-- Combined quality metrics view (joins facilities with care compare ratings)
CREATE OR REPLACE VIEW facility_quality_overview AS
SELECT
    f.federal_provider_number,
    f.facility_name,
    f.state,
    f.city,
    f.county,
    f.ownership_type,
    f.total_beds,
    f.occupancy_rate,
    cc.overall_rating,
    cc.quality_rating,
    cc.staffing_rating,
    cc.health_inspection_rating,
    cc.number_of_facility_reported_incidents,
    cc.number_of_substantiated_complaints,
    cc.reported_total_nurse_staffing_hours,
    ds.total_deficiencies,
    ds.serious_deficiencies,
    ds.uncorrected_deficiencies,
    ds.last_survey_date
FROM snf_facilities f
LEFT JOIN cms_care_compare_ratings cc ON f.federal_provider_number = cc.federal_provider_number
LEFT JOIN facility_deficiency_summary ds ON f.federal_provider_number = ds.federal_provider_number
WHERE f.active = true;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update timestamps
DROP TRIGGER IF EXISTS update_cms_care_compare_ratings_updated_at ON cms_care_compare_ratings;
CREATE TRIGGER update_cms_care_compare_ratings_updated_at
    BEFORE UPDATE ON cms_care_compare_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cms_facility_deficiencies_updated_at ON cms_facility_deficiencies;
CREATE TRIGGER update_cms_facility_deficiencies_updated_at
    BEFORE UPDATE ON cms_facility_deficiencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-mark deficiency as corrected if correction_date is set
CREATE OR REPLACE FUNCTION mark_deficiency_corrected()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.correction_date IS NOT NULL AND OLD.correction_date IS NULL THEN
        NEW.is_corrected = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_mark_deficiency_corrected ON cms_facility_deficiencies;
CREATE TRIGGER auto_mark_deficiency_corrected
    BEFORE UPDATE ON cms_facility_deficiencies
    FOR EACH ROW
    EXECUTE FUNCTION mark_deficiency_corrected();
