-- Migration 010: Add County Indexes and Enhancements
-- Improve performance for county-based queries and add county FIPS to facilities

-- Add index on county field in facilities table for faster queries
CREATE INDEX IF NOT EXISTS idx_snf_facilities_county ON snf_facilities(county);
CREATE INDEX IF NOT EXISTS idx_snf_facilities_state_county ON snf_facilities(state, county);

-- Add county_fips field to facilities table to enable joins with county demographics
ALTER TABLE snf_facilities
ADD COLUMN IF NOT EXISTS county_fips VARCHAR(5);

-- Create index on the new county_fips field
CREATE INDEX IF NOT EXISTS idx_snf_facilities_county_fips ON snf_facilities(county_fips);

-- Create a view that joins facilities with county demographics
CREATE OR REPLACE VIEW facilities_with_county_demographics AS
SELECT
    f.*,
    cd.total_population as county_total_population,
    cd.population_65_plus as county_population_65_plus,
    cd.population_85_plus as county_population_85_plus,
    cd.percent_65_plus as county_percent_65_plus,
    cd.percent_85_plus as county_percent_85_plus,
    cd.projected_65_plus_2030 as county_projected_65_plus_2030,
    cd.projected_85_plus_2030 as county_projected_85_plus_2030
FROM snf_facilities f
LEFT JOIN county_demographics cd ON f.county_fips = cd.county_fips;

-- Create a view that shows county-level facility aggregations
CREATE OR REPLACE VIEW county_facility_summary AS
SELECT
    cd.state_code,
    cd.state_name,
    cd.county_fips,
    cd.county_name,
    cd.total_population,
    cd.population_65_plus,
    cd.population_85_plus,
    cd.percent_65_plus,
    cd.percent_85_plus,
    COUNT(f.id) as facility_count,
    SUM(f.total_beds) as total_beds,
    AVG(f.overall_rating) as avg_facility_rating,
    AVG(f.occupancy_rate) as avg_occupancy_rate,
    ROUND(SUM(f.total_beds)::numeric / NULLIF(cd.population_65_plus, 0) * 1000, 2) as beds_per_1000_seniors
FROM county_demographics cd
LEFT JOIN snf_facilities f ON cd.county_fips = f.county_fips AND f.active = true
GROUP BY
    cd.state_code, cd.state_name, cd.county_fips, cd.county_name,
    cd.total_population, cd.population_65_plus, cd.population_85_plus,
    cd.percent_65_plus, cd.percent_85_plus
ORDER BY cd.state_code, cd.county_name;

-- Add comments
COMMENT ON COLUMN snf_facilities.county_fips IS 'Five-digit FIPS code linking to county_demographics table';
COMMENT ON VIEW facilities_with_county_demographics IS 'Facilities enriched with county demographic data';
COMMENT ON VIEW county_facility_summary IS 'County-level aggregation of facilities and demographics';
