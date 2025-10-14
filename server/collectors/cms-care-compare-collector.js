import fetch from 'node-fetch'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
})

/**
 * CMS Care Compare Quality Ratings Collector
 * Collects detailed quality metrics from CMS Care Compare
 *
 * API Docs: https://data.cms.gov/provider-data/api-docs
 * Dataset: Provider Information (Nursing Home Compare)
 * Dataset ID: 4pq5-n9py
 * Update Frequency: Monthly
 */

const CMS_API_BASE = 'https://data.cms.gov/provider-data/api/1/datastore/query'
const DATASET_ID = '4pq5-n9py'
const CMS_API_URL = `${CMS_API_BASE}/${DATASET_ID}/0`

/**
 * Fetch Care Compare data from CMS API with pagination
 */
async function fetchCareCompareData(limit = 1000, offset = 0) {
  const url = `${CMS_API_URL}?limit=${limit}&offset=${offset}`

  console.log(`🌐 Fetching Care Compare ratings ${offset}-${offset + limit}...`)

  try {
    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Response:`, errorText)
      throw new Error(`CMS API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.results || []

  } catch (error) {
    console.error(`Error fetching CMS Care Compare data:`, error.message)
    throw error
  }
}

/**
 * Parse numeric values safely
 */
function parseNum(val) {
  if (val === null || val === undefined || val === '' || val === 'N/A' || val === 'Not Available') {
    return null
  }
  const num = parseFloat(val)
  return isNaN(num) ? null : num
}

/**
 * Parse integer values safely
 */
function parseIntSafe(val) {
  if (val === null || val === undefined || val === '' || val === 'N/A' || val === 'Not Available') {
    return null
  }
  const num = parseFloat(val)
  return isNaN(num) ? null : Math.floor(num)
}

/**
 * Transform CMS Care Compare data to database format
 */
function transformCareCompareData(cmsRecord) {
  return {
    federalProviderNumber: cmsRecord.cms_certification_number_ccn || cmsRecord.federal_provider_number,

    // Overall star rating
    overallRating: parseIntSafe(cmsRecord.overall_rating),

    // Component ratings
    qualityRating: parseIntSafe(cmsRecord.qm_rating),
    staffingRating: parseIntSafe(cmsRecord.staffing_rating),
    healthInspectionRating: parseIntSafe(cmsRecord.health_inspection_rating),

    // Survey scores
    totalWeightedHealthSurveyScore: parseNum(cmsRecord.total_weighted_health_survey_score),

    // Incidents and complaints
    numberOfFacilityReportedIncidents: parseIntSafe(cmsRecord.number_of_facility_reported_incidents),
    numberOfSubstantiatedComplaints: parseIntSafe(cmsRecord.number_of_substantiated_complaints),

    // Staffing details (hours per resident day)
    reportedRnStaffingHours: parseNum(cmsRecord.reported_rn_staffing_hours_per_resident_per_day),
    reportedLpnStaffingHours: parseNum(cmsRecord.reported_lpn_staffing_hours_per_resident_per_day),
    reportedCnaStaffingHours: parseNum(cmsRecord.reported_nurse_aide_staffing_hours_per_resident_per_day),
    reportedTotalNurseStaffingHours: parseNum(cmsRecord.reported_total_nurse_staffing_hours_per_resident_per_day),
    reportedPhysicalTherapistStaffingHours: parseNum(cmsRecord.reported_physical_therapist_staffing_hours_per_resident_per_day),

    // Quality measures (percentages)
    percentOfResidentsExperiencingFallsWithMajorInjury: parseNum(cmsRecord.percent_of_residents_experiencing_one_or_more_falls_with_major_injury),
    percentageOfResidentsWithPressureUlcers: parseNum(cmsRecord.percentage_of_short_stay_residents_who_newly_received_an_antipsychotic_medication),
    percentageOfResidentsAssessedAndGivenPneumococcalVaccine: parseNum(cmsRecord.percentage_of_residents_assessed_and_appropriately_given_the_pneumococcal_vaccine),
    percentageOfResidentsAssessedAndGivenInfluenzaVaccine: parseNum(cmsRecord.percentage_of_residents_assessed_and_appropriately_given_the_seasonal_influenza_vaccine),
    percentageOfShortStayResidentsWhoImprovedInFunction: parseNum(cmsRecord.percentage_of_short_stay_residents_who_made_improvements_in_function),

    // Additional quality indicators
    percentageOfResidentsWithDepressiveSymptoms: parseNum(cmsRecord.percentage_of_long_stay_residents_who_have_depressive_symptoms),
    percentageOfResidentsExperiencingOutpatientEmergencyDepartmentVisits: parseNum(cmsRecord.percentage_of_long_stay_residents_experiencing_one_or_more_falls_with_major_injury),
    percentageOfResidentsWithAntipsychoticMedication: parseNum(cmsRecord.percentage_of_long_stay_residents_who_received_an_antipsychotic_medication),

    // Special programs
    specialFocusFacility: cmsRecord.special_focus_status === 'Y' || cmsRecord.special_focus_status === true,
    abuseIcon: cmsRecord.abuse_icon === 'Y' || cmsRecord.abuse_icon === true,

    // Data collection date
    dataCollectionDate: new Date()
  }
}

/**
 * Upsert Care Compare ratings to database
 */
async function upsertCareCompareRating(rating) {
  const query = `
    INSERT INTO cms_care_compare_ratings (
      federal_provider_number,
      overall_rating,
      quality_rating,
      staffing_rating,
      health_inspection_rating,
      total_weighted_health_survey_score,
      number_of_facility_reported_incidents,
      number_of_substantiated_complaints,
      reported_rn_staffing_hours,
      reported_lpn_staffing_hours,
      reported_cna_staffing_hours,
      reported_total_nurse_staffing_hours,
      reported_physical_therapist_staffing_hours,
      percent_of_residents_experiencing_one_or_more_falls_with_major_injury,
      percentage_of_residents_with_pressure_ulcers,
      percentage_of_residents_assessed_and_given_pneumococcal_vaccine,
      percentage_of_residents_assessed_and_given_influenza_vaccine,
      percentage_of_short_stay_residents_who_improved_in_function,
      percentage_of_residents_with_depressive_symptoms,
      percentage_of_residents_experiencing_outpatient_emergency_department_visits,
      percentage_of_residents_with_antipsychotic_medication,
      special_focus_facility,
      abuse_icon,
      data_collection_date
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24
    )
    ON CONFLICT (federal_provider_number)
    DO UPDATE SET
      overall_rating = EXCLUDED.overall_rating,
      quality_rating = EXCLUDED.quality_rating,
      staffing_rating = EXCLUDED.staffing_rating,
      health_inspection_rating = EXCLUDED.health_inspection_rating,
      total_weighted_health_survey_score = EXCLUDED.total_weighted_health_survey_score,
      number_of_facility_reported_incidents = EXCLUDED.number_of_facility_reported_incidents,
      number_of_substantiated_complaints = EXCLUDED.number_of_substantiated_complaints,
      reported_rn_staffing_hours = EXCLUDED.reported_rn_staffing_hours,
      reported_lpn_staffing_hours = EXCLUDED.reported_lpn_staffing_hours,
      reported_cna_staffing_hours = EXCLUDED.reported_cna_staffing_hours,
      reported_total_nurse_staffing_hours = EXCLUDED.reported_total_nurse_staffing_hours,
      reported_physical_therapist_staffing_hours = EXCLUDED.reported_physical_therapist_staffing_hours,
      percent_of_residents_experiencing_one_or_more_falls_with_major_injury = EXCLUDED.percent_of_residents_experiencing_one_or_more_falls_with_major_injury,
      percentage_of_residents_with_pressure_ulcers = EXCLUDED.percentage_of_residents_with_pressure_ulcers,
      percentage_of_residents_assessed_and_given_pneumococcal_vaccine = EXCLUDED.percentage_of_residents_assessed_and_given_pneumococcal_vaccine,
      percentage_of_residents_assessed_and_given_influenza_vaccine = EXCLUDED.percentage_of_residents_assessed_and_given_influenza_vaccine,
      percentage_of_short_stay_residents_who_improved_in_function = EXCLUDED.percentage_of_short_stay_residents_who_improved_in_function,
      percentage_of_residents_with_depressive_symptoms = EXCLUDED.percentage_of_residents_with_depressive_symptoms,
      percentage_of_residents_experiencing_outpatient_emergency_department_visits = EXCLUDED.percentage_of_residents_experiencing_outpatient_emergency_department_visits,
      percentage_of_residents_with_antipsychotic_medication = EXCLUDED.percentage_of_residents_with_antipsychotic_medication,
      special_focus_facility = EXCLUDED.special_focus_facility,
      abuse_icon = EXCLUDED.abuse_icon,
      data_collection_date = EXCLUDED.data_collection_date,
      updated_at = CURRENT_TIMESTAMP
  `

  const values = [
    rating.federalProviderNumber,
    rating.overallRating,
    rating.qualityRating,
    rating.staffingRating,
    rating.healthInspectionRating,
    rating.totalWeightedHealthSurveyScore,
    rating.numberOfFacilityReportedIncidents,
    rating.numberOfSubstantiatedComplaints,
    rating.reportedRnStaffingHours,
    rating.reportedLpnStaffingHours,
    rating.reportedCnaStaffingHours,
    rating.reportedTotalNurseStaffingHours,
    rating.reportedPhysicalTherapistStaffingHours,
    rating.percentOfResidentsExperiencingFallsWithMajorInjury,
    rating.percentageOfResidentsWithPressureUlcers,
    rating.percentageOfResidentsAssessedAndGivenPneumococcalVaccine,
    rating.percentageOfResidentsAssessedAndGivenInfluenzaVaccine,
    rating.percentageOfShortStayResidentsWhoImprovedInFunction,
    rating.percentageOfResidentsWithDepressiveSymptoms,
    rating.percentageOfResidentsExperiencingOutpatientEmergencyDepartmentVisits,
    rating.percentageOfResidentsWithAntipsychoticMedication,
    rating.specialFocusFacility,
    rating.abuseIcon,
    rating.dataCollectionDate
  ]

  await pool.query(query, values)
}

/**
 * Main collection function
 */
export async function collectCareCompareRatings() {
  try {
    console.log('======================================================================')
    console.log('  CMS CARE COMPARE QUALITY RATINGS COLLECTOR')
    console.log('======================================================================')
    console.log(`  Dataset: CMS Care Compare - Provider Quality Ratings`)
    console.log(`  Dataset ID: ${DATASET_ID}`)
    console.log(`  Update Frequency: Monthly`)
    console.log('======================================================================\n')

    // Step 1: Fetch all ratings with pagination
    console.log('📥 Fetching Care Compare ratings from CMS API...\n')

    let allRecords = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true

    while (hasMore) {
      const batch = await fetchCareCompareData(batchSize, offset)

      if (batch.length === 0) {
        hasMore = false
      } else {
        allRecords = allRecords.concat(batch)
        offset += batchSize
        console.log(`  ✓ Fetched ${allRecords.length} records so far...`)

        // Stop if we got less than a full batch
        if (batch.length < batchSize) {
          hasMore = false
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    console.log(`\n✓ Fetched ${allRecords.length} total Care Compare records from CMS\n`)

    // Step 2: Transform and save to database
    console.log('💾 Saving Care Compare ratings to database...\n')

    let savedCount = 0
    let errorCount = 0

    for (let i = 0; i < allRecords.length; i++) {
      const cmsRecord = allRecords[i]

      try {
        const rating = transformCareCompareData(cmsRecord)

        // Skip if no provider number
        if (!rating.federalProviderNumber) {
          errorCount++
          continue
        }

        await upsertCareCompareRating(rating)

        savedCount++

        if (savedCount % 100 === 0) {
          console.log(`  ✓ Saved ${savedCount}/${allRecords.length} ratings...`)
        }

      } catch (error) {
        errorCount++
        if (errorCount <= 10) { // Only log first 10 errors
          console.error(`  ✗ Error saving ${cmsRecord.cms_certification_number_ccn || cmsRecord.federal_provider_number}: ${error.message}`)
        }
      }
    }

    console.log(`\n✓ Saved ${savedCount} Care Compare ratings to database\n`)

    console.log('======================================================================')
    console.log('  COLLECTION SUMMARY')
    console.log('======================================================================')
    console.log(`  Total records fetched: ${allRecords.length}`)
    console.log(`  Successfully saved: ${savedCount}`)
    console.log(`  Errors: ${errorCount}`)
    console.log('======================================================================\n')

    console.log('✅ CMS Care Compare ratings collection complete!\n')

    await pool.end()

    return {
      success: true,
      totalRecords: allRecords.length,
      savedCount,
      errorCount
    }

  } catch (error) {
    console.error('❌ Error collecting CMS Care Compare ratings:', error)
    await pool.end()
    throw error
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectCareCompareRatings()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export default { collectCareCompareRatings }
