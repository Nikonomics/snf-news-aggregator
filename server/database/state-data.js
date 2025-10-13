import pool from './db.js'

/**
 * STATE DEMOGRAPHICS FUNCTIONS
 */

/**
 * Get demographic data for a specific state
 */
export async function getStateDemographics(stateCode) {
  const result = await pool.query(
    'SELECT * FROM state_demographics WHERE state_code = $1',
    [stateCode.toUpperCase()]
  )
  return result.rows[0] || null
}

/**
 * Get demographics for all states
 */
export async function getAllStateDemographics() {
  const result = await pool.query(
    'SELECT * FROM state_demographics ORDER BY state_name'
  )
  return result.rows
}

/**
 * Insert or update state demographic data
 */
export async function upsertStateDemographics(demographics) {
  const {
    stateCode,
    stateName,
    totalPopulation,
    population65Plus,
    population85Plus,
    percent65Plus,
    percent85Plus,
    projected65Plus2030,
    projected85Plus2030,
    growthRate65Plus,
    growthRate85Plus,
    dataSource,
    dataYear
  } = demographics

  const result = await pool.query(
    `INSERT INTO state_demographics (
      state_code, state_name, total_population, population_65_plus, population_85_plus,
      percent_65_plus, percent_85_plus, projected_65_plus_2030, projected_85_plus_2030,
      growth_rate_65_plus, growth_rate_85_plus, data_source, data_year
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (state_code) DO UPDATE SET
      state_name = EXCLUDED.state_name,
      total_population = EXCLUDED.total_population,
      population_65_plus = EXCLUDED.population_65_plus,
      population_85_plus = EXCLUDED.population_85_plus,
      percent_65_plus = EXCLUDED.percent_65_plus,
      percent_85_plus = EXCLUDED.percent_85_plus,
      projected_65_plus_2030 = EXCLUDED.projected_65_plus_2030,
      projected_85_plus_2030 = EXCLUDED.projected_85_plus_2030,
      growth_rate_65_plus = EXCLUDED.growth_rate_65_plus,
      growth_rate_85_plus = EXCLUDED.growth_rate_85_plus,
      data_source = EXCLUDED.data_source,
      data_year = EXCLUDED.data_year,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [stateCode, stateName, totalPopulation, population65Plus, population85Plus,
     percent65Plus, percent85Plus, projected65Plus2030, projected85Plus2030,
     growthRate65Plus, growthRate85Plus, dataSource, dataYear]
  )
  return result.rows[0]
}

/**
 * SNF FACILITIES FUNCTIONS
 */

/**
 * Get all facilities for a specific state
 */
export async function getFacilitiesByState(stateCode, options = {}) {
  const {
    active = true,
    minRating = null,
    ownershipType = null,
    chain = null,
    limit = 1000,
    offset = 0
  } = options

  let query = 'SELECT * FROM snf_facilities WHERE state = $1'
  const params = [stateCode.toUpperCase()]
  let paramIndex = 2

  if (active !== null) {
    query += ` AND active = $${paramIndex}`
    params.push(active)
    paramIndex++
  }

  if (minRating) {
    query += ` AND overall_rating >= $${paramIndex}`
    params.push(minRating)
    paramIndex++
  }

  if (ownershipType) {
    query += ` AND ownership_type = $${paramIndex}`
    params.push(ownershipType)
    paramIndex++
  }

  if (chain) {
    query += ` AND ownership_chain = $${paramIndex}`
    params.push(chain)
    paramIndex++
  }

  query += ` ORDER BY facility_name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
  params.push(limit, offset)

  const result = await pool.query(query, params)
  return result.rows
}

/**
 * Get a single facility by federal provider number
 */
export async function getFacilityByProviderNumber(providerNumber) {
  const result = await pool.query(
    'SELECT * FROM snf_facilities WHERE federal_provider_number = $1',
    [providerNumber]
  )
  return result.rows[0] || null
}

/**
 * Search facilities by name or organization
 */
export async function searchFacilities(searchTerm, stateCode = null) {
  let query = `
    SELECT * FROM snf_facilities
    WHERE to_tsvector('english',
      COALESCE(facility_name, '') || ' ' || COALESCE(parent_organization, '')
    ) @@ plainto_tsquery('english', $1)
  `
  const params = [searchTerm]

  if (stateCode) {
    query += ' AND state = $2'
    params.push(stateCode.toUpperCase())
  }

  query += ' ORDER BY overall_rating DESC, facility_name LIMIT 50'

  const result = await pool.query(query, params)
  return result.rows
}

/**
 * Get facilities by chain/parent organization
 */
export async function getFacilitiesByChain(chainName, stateCode = null) {
  let query = 'SELECT * FROM snf_facilities WHERE ownership_chain = $1'
  const params = [chainName]

  if (stateCode) {
    query += ' AND state = $2'
    params.push(stateCode.toUpperCase())
  }

  query += ' ORDER BY state, facility_name'

  const result = await pool.query(query, params)
  return result.rows
}

/**
 * Get facilities within a geographic radius (requires lat/long)
 */
export async function getFacilitiesNearLocation(latitude, longitude, radiusMiles = 25) {
  // Using the Haversine formula for distance calculation
  const query = `
    SELECT *,
      (3959 * acos(
        cos(radians($1)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude))
      )) AS distance_miles
    FROM snf_facilities
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND active = true
    HAVING distance_miles <= $3
    ORDER BY distance_miles
    LIMIT 100
  `

  const result = await pool.query(query, [latitude, longitude, radiusMiles])
  return result.rows
}

/**
 * Insert or update facility data
 */
export async function upsertFacility(facility) {
  const {
    federalProviderNumber,
    cmsCertificationNumber,
    facilityName,
    address,
    city,
    state,
    zipCode,
    county,
    phone,
    latitude,
    longitude,
    ownershipType,
    providerType,
    totalBeds,
    certifiedBeds,
    occupiedBeds,
    occupancyRate,
    legalBusinessName,
    parentOrganization,
    ownershipChain,
    multiFacilityChain,
    overallRating,
    healthInspectionRating,
    qualityMeasureRating,
    staffingRating,
    rnStaffingHours,
    totalNurseStaffingHours,
    reportedCnaStaffingHours,
    healthDeficiencies,
    fireSafetyDeficiencies,
    complaintDeficiencies,
    totalPenaltiesAmount,
    penaltyCount,
    acceptsMedicare,
    acceptsMedicaid,
    participatingInQrp,
    specialFocusFacility,
    abuseIcon,
    continuingCareRetirementCommunity,
    averageDailyRate,
    medicareRate,
    medicaidRate,
    active,
    dateCertified,
    dateClosed,
    certificationStatus,
    dataSource,
    lastCmsUpdate
  } = facility

  const result = await pool.query(
    `INSERT INTO snf_facilities (
      federal_provider_number, cms_certification_number, facility_name, address, city, state, zip_code, county, phone,
      latitude, longitude, ownership_type, provider_type, total_beds, certified_beds, occupied_beds, occupancy_rate,
      legal_business_name, parent_organization, ownership_chain, multi_facility_chain,
      overall_rating, health_inspection_rating, quality_measure_rating, staffing_rating,
      rn_staffing_hours, total_nurse_staffing_hours, reported_cna_staffing_hours,
      health_deficiencies, fire_safety_deficiencies, complaint_deficiencies,
      total_penalties_amount, penalty_count,
      accepts_medicare, accepts_medicaid, participating_in_qrp,
      special_focus_facility, abuse_icon, continuing_care_retirement_community,
      average_daily_rate, medicare_rate, medicaid_rate,
      active, date_certified, date_closed, certification_status, data_source, last_cms_update
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
      $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42,
      $43, $44, $45, $46, $47, $48
    )
    ON CONFLICT (federal_provider_number) DO UPDATE SET
      cms_certification_number = EXCLUDED.cms_certification_number,
      facility_name = EXCLUDED.facility_name,
      address = EXCLUDED.address,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      zip_code = EXCLUDED.zip_code,
      county = EXCLUDED.county,
      phone = EXCLUDED.phone,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      ownership_type = EXCLUDED.ownership_type,
      provider_type = EXCLUDED.provider_type,
      total_beds = EXCLUDED.total_beds,
      certified_beds = EXCLUDED.certified_beds,
      occupied_beds = EXCLUDED.occupied_beds,
      occupancy_rate = EXCLUDED.occupancy_rate,
      legal_business_name = EXCLUDED.legal_business_name,
      parent_organization = EXCLUDED.parent_organization,
      ownership_chain = EXCLUDED.ownership_chain,
      multi_facility_chain = EXCLUDED.multi_facility_chain,
      overall_rating = EXCLUDED.overall_rating,
      health_inspection_rating = EXCLUDED.health_inspection_rating,
      quality_measure_rating = EXCLUDED.quality_measure_rating,
      staffing_rating = EXCLUDED.staffing_rating,
      rn_staffing_hours = EXCLUDED.rn_staffing_hours,
      total_nurse_staffing_hours = EXCLUDED.total_nurse_staffing_hours,
      reported_cna_staffing_hours = EXCLUDED.reported_cna_staffing_hours,
      health_deficiencies = EXCLUDED.health_deficiencies,
      fire_safety_deficiencies = EXCLUDED.fire_safety_deficiencies,
      complaint_deficiencies = EXCLUDED.complaint_deficiencies,
      total_penalties_amount = EXCLUDED.total_penalties_amount,
      penalty_count = EXCLUDED.penalty_count,
      accepts_medicare = EXCLUDED.accepts_medicare,
      accepts_medicaid = EXCLUDED.accepts_medicaid,
      participating_in_qrp = EXCLUDED.participating_in_qrp,
      special_focus_facility = EXCLUDED.special_focus_facility,
      abuse_icon = EXCLUDED.abuse_icon,
      continuing_care_retirement_community = EXCLUDED.continuing_care_retirement_community,
      average_daily_rate = EXCLUDED.average_daily_rate,
      medicare_rate = EXCLUDED.medicare_rate,
      medicaid_rate = EXCLUDED.medicaid_rate,
      active = EXCLUDED.active,
      date_certified = EXCLUDED.date_certified,
      date_closed = EXCLUDED.date_closed,
      certification_status = EXCLUDED.certification_status,
      data_source = EXCLUDED.data_source,
      last_cms_update = EXCLUDED.last_cms_update,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      federalProviderNumber, cmsCertificationNumber, facilityName, address, city, state, zipCode, county, phone,
      latitude, longitude, ownershipType, providerType, totalBeds, certifiedBeds, occupiedBeds, occupancyRate,
      legalBusinessName, parentOrganization, ownershipChain, multiFacilityChain,
      overallRating, healthInspectionRating, qualityMeasureRating, staffingRating,
      rnStaffingHours, totalNurseStaffingHours, reportedCnaStaffingHours,
      healthDeficiencies, fireSafetyDeficiencies, complaintDeficiencies,
      totalPenaltiesAmount, penaltyCount,
      acceptsMedicare, acceptsMedicaid, participatingInQrp,
      specialFocusFacility, abuseIcon, continuingCareRetirementCommunity,
      averageDailyRate, medicareRate, medicaidRate,
      active, dateCertified, dateClosed, certificationStatus, dataSource, lastCmsUpdate
    ]
  )
  return result.rows[0]
}

/**
 * STATE MARKET METRICS FUNCTIONS
 */

/**
 * Get market metrics for a specific state
 */
export async function getStateMarketMetrics(stateCode) {
  const result = await pool.query(
    'SELECT * FROM state_market_metrics WHERE state_code = $1',
    [stateCode.toUpperCase()]
  )
  return result.rows[0] || null
}

/**
 * Calculate and update market metrics for a state
 */
export async function calculateStateMarketMetrics(stateCode) {
  const query = `
    INSERT INTO state_market_metrics (
      state_code,
      total_facilities,
      for_profit_facilities,
      nonprofit_facilities,
      government_facilities,
      chain_owned_facilities,
      independent_facilities,
      total_beds,
      average_beds_per_facility,
      total_occupied_beds,
      average_occupancy_rate,
      avg_overall_rating,
      avg_health_inspection_rating,
      avg_staffing_rating,
      avg_rn_hours,
      avg_total_nurse_hours,
      avg_cna_hours,
      avg_health_deficiencies,
      facilities_with_penalties,
      total_penalties_amount,
      special_focus_facilities,
      facilities_with_abuse_icon,
      calculation_date
    )
    SELECT
      $1 as state_code,
      COUNT(*) as total_facilities,
      COUNT(*) FILTER (WHERE ownership_type = 'For profit') as for_profit_facilities,
      COUNT(*) FILTER (WHERE ownership_type = 'Non-profit') as nonprofit_facilities,
      COUNT(*) FILTER (WHERE ownership_type = 'Government') as government_facilities,
      COUNT(*) FILTER (WHERE multi_facility_chain = true) as chain_owned_facilities,
      COUNT(*) FILTER (WHERE multi_facility_chain = false) as independent_facilities,
      SUM(total_beds) as total_beds,
      AVG(total_beds) as average_beds_per_facility,
      SUM(occupied_beds) as total_occupied_beds,
      AVG(occupancy_rate) as average_occupancy_rate,
      AVG(overall_rating) as avg_overall_rating,
      AVG(health_inspection_rating) as avg_health_inspection_rating,
      AVG(staffing_rating) as avg_staffing_rating,
      AVG(rn_staffing_hours) as avg_rn_hours,
      AVG(total_nurse_staffing_hours) as avg_total_nurse_hours,
      AVG(reported_cna_staffing_hours) as avg_cna_hours,
      AVG(health_deficiencies) as avg_health_deficiencies,
      COUNT(*) FILTER (WHERE penalty_count > 0) as facilities_with_penalties,
      SUM(total_penalties_amount) as total_penalties_amount,
      COUNT(*) FILTER (WHERE special_focus_facility = true) as special_focus_facilities,
      COUNT(*) FILTER (WHERE abuse_icon = true) as facilities_with_abuse_icon,
      CURRENT_DATE as calculation_date
    FROM snf_facilities
    WHERE state = $1 AND active = true
    ON CONFLICT (state_code) DO UPDATE SET
      total_facilities = EXCLUDED.total_facilities,
      for_profit_facilities = EXCLUDED.for_profit_facilities,
      nonprofit_facilities = EXCLUDED.nonprofit_facilities,
      government_facilities = EXCLUDED.government_facilities,
      chain_owned_facilities = EXCLUDED.chain_owned_facilities,
      independent_facilities = EXCLUDED.independent_facilities,
      total_beds = EXCLUDED.total_beds,
      average_beds_per_facility = EXCLUDED.average_beds_per_facility,
      total_occupied_beds = EXCLUDED.total_occupied_beds,
      average_occupancy_rate = EXCLUDED.average_occupancy_rate,
      avg_overall_rating = EXCLUDED.avg_overall_rating,
      avg_health_inspection_rating = EXCLUDED.avg_health_inspection_rating,
      avg_staffing_rating = EXCLUDED.avg_staffing_rating,
      avg_rn_hours = EXCLUDED.avg_rn_hours,
      avg_total_nurse_hours = EXCLUDED.avg_total_nurse_hours,
      avg_cna_hours = EXCLUDED.avg_cna_hours,
      avg_health_deficiencies = EXCLUDED.avg_health_deficiencies,
      facilities_with_penalties = EXCLUDED.facilities_with_penalties,
      total_penalties_amount = EXCLUDED.total_penalties_amount,
      special_focus_facilities = EXCLUDED.special_focus_facilities,
      facilities_with_abuse_icon = EXCLUDED.facilities_with_abuse_icon,
      calculation_date = EXCLUDED.calculation_date,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `

  const result = await pool.query(query, [stateCode.toUpperCase()])
  return result.rows[0]
}

/**
 * Get comprehensive state overview (demographics + market + facilities)
 */
export async function getStateOverview(stateCode) {
  const [demographics, metrics, facilities] = await Promise.all([
    getStateDemographics(stateCode),
    getStateMarketMetrics(stateCode),
    getFacilitiesByState(stateCode, { limit: 10, active: true }) // Top 10 for preview
  ])

  return {
    demographics,
    metrics,
    facilitiesPreview: facilities,
    facilitiesCount: metrics?.total_facilities || 0
  }
}

/**
 * UTILITY FUNCTIONS
 */

/**
 * Get facility statistics by ownership type for a state
 */
export async function getFacilityOwnershipBreakdown(stateCode) {
  const result = await pool.query(
    `SELECT
      ownership_type,
      COUNT(*) as count,
      AVG(overall_rating) as avg_rating,
      AVG(occupancy_rate) as avg_occupancy,
      SUM(total_beds) as total_beds
    FROM snf_facilities
    WHERE state = $1 AND active = true
    GROUP BY ownership_type
    ORDER BY count DESC`,
    [stateCode.toUpperCase()]
  )
  return result.rows
}

/**
 * Get top chains by market share in a state
 */
export async function getTopChainsByState(stateCode, limit = 10) {
  const result = await pool.query(
    `SELECT
      ownership_chain,
      COUNT(*) as facility_count,
      SUM(total_beds) as total_beds,
      AVG(overall_rating) as avg_rating,
      ROUND((COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100), 2) as market_share_pct
    FROM snf_facilities
    WHERE state = $1
      AND active = true
      AND ownership_chain IS NOT NULL
    GROUP BY ownership_chain
    ORDER BY facility_count DESC
    LIMIT $2`,
    [stateCode.toUpperCase(), limit]
  )
  return result.rows
}

export default {
  // Demographics
  getStateDemographics,
  getAllStateDemographics,
  upsertStateDemographics,

  // Facilities
  getFacilitiesByState,
  getFacilityByProviderNumber,
  searchFacilities,
  getFacilitiesByChain,
  getFacilitiesNearLocation,
  upsertFacility,

  // Market Metrics
  getStateMarketMetrics,
  calculateStateMarketMetrics,
  getStateOverview,

  // Utilities
  getFacilityOwnershipBreakdown,
  getTopChainsByState
}

/**
 * COUNTY DEMOGRAPHICS FUNCTIONS
 */

/**
 * Get demographic data for a specific county
 */
export async function getCountyDemographics(countyFips) {
  const result = await pool.query(
    'SELECT * FROM county_demographics WHERE county_fips = $1',
    [countyFips]
  )
  return result.rows[0] || null
}

/**
 * Get demographics for all counties in a state
 */
export async function getCountiesByState(stateCode) {
  const result = await pool.query(
    'SELECT * FROM county_demographics WHERE state_code = $1 ORDER BY county_name',
    [stateCode.toUpperCase()]
  )
  return result.rows
}

/**
 * Get demographics for all counties
 */
export async function getAllCountyDemographics() {
  const result = await pool.query(
    'SELECT * FROM county_demographics ORDER BY state_code, county_name'
  )
  return result.rows
}

/**
 * Insert or update county demographic data
 */
export async function upsertCountyDemographics(demographics) {
  const {
    stateCode,
    stateName,
    countyFips,
    countyName,
    totalPopulation,
    population65Plus,
    population85Plus,
    percent65Plus,
    percent85Plus,
    projected65Plus2030,
    projected85Plus2030,
    growthRate65Plus,
    growthRate85Plus,
    dataSource,
    dataYear
  } = demographics

  const result = await pool.query(
    `INSERT INTO county_demographics (
      state_code, state_name, county_fips, county_name, total_population, population_65_plus, population_85_plus,
      percent_65_plus, percent_85_plus, projected_65_plus_2030, projected_85_plus_2030,
      growth_rate_65_plus, growth_rate_85_plus, data_source, data_year
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (county_fips) DO UPDATE SET
      state_code = EXCLUDED.state_code,
      state_name = EXCLUDED.state_name,
      county_name = EXCLUDED.county_name,
      total_population = EXCLUDED.total_population,
      population_65_plus = EXCLUDED.population_65_plus,
      population_85_plus = EXCLUDED.population_85_plus,
      percent_65_plus = EXCLUDED.percent_65_plus,
      percent_85_plus = EXCLUDED.percent_85_plus,
      projected_65_plus_2030 = EXCLUDED.projected_65_plus_2030,
      projected_85_plus_2030 = EXCLUDED.projected_85_plus_2030,
      growth_rate_65_plus = EXCLUDED.growth_rate_65_plus,
      growth_rate_85_plus = EXCLUDED.growth_rate_85_plus,
      data_source = EXCLUDED.data_source,
      data_year = EXCLUDED.data_year,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      stateCode, stateName, countyFips, countyName, totalPopulation, population65Plus, population85Plus,
      percent65Plus, percent85Plus, projected65Plus2030, projected85Plus2030,
      growthRate65Plus, growthRate85Plus, dataSource, dataYear
    ]
  )

  return result.rows[0]
}
