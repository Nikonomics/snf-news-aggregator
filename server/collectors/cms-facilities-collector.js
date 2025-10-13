import fetch from 'node-fetch'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { upsertFacility, calculateStateMarketMetrics } from '../database/state-data.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

/**
 * CMS Nursing Home Compare Facilities Collector
 * Collects all SNF facility data from CMS Nursing Home Compare
 *
 * API Docs: https://data.cms.gov/provider-data/api-docs
 * Dataset: Provider Information (Nursing Home Compare)
 * Dataset ID: 4pq5-n9py
 */

const CMS_API_BASE = 'https://data.cms.gov/provider-data/api/1/datastore/query'
const DATASET_ID = '4pq5-n9py'
const CMS_API_URL = `${CMS_API_BASE}/${DATASET_ID}/0`

/**
 * Fetch facility data from CMS API with pagination
 */
async function fetchCMSFacilities(limit = 1000, offset = 0) {
  // Simple pagination without filters - API doesn't support complex conditions well
  const url = `${CMS_API_URL}?limit=${limit}&offset=${offset}`

  console.log(`🌐 Fetching facilities ${offset}-${offset + limit}...`)

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
    console.error(`Error fetching CMS data:`, error.message)
    throw error
  }
}

/**
 * Map ownership type codes to readable names
 */
function mapOwnershipType(code) {
  const ownershipMap = {
    '01': 'Voluntary Non-Profit - Church',
    '02': 'Voluntary Non-Profit - Other',
    '03': 'Proprietary - Individual',
    '04': 'Proprietary - Corporation',
    '05': 'Proprietary - Partnership',
    '06': 'Proprietary - Other',
    '07': 'Governmental - Federal',
    '08': 'Governmental - City/County',
    '09': 'Governmental - State',
    '10': 'Governmental - Hospital District',
    '11': 'Governmental - City',
    '12': 'Governmental - County',
    '13': 'Governmental - Other'
  }

  return ownershipMap[code] || 'Unknown'
}

/**
 * Simplify ownership to three main categories
 */
function simplifyOwnership(detailedOwnership) {
  if (detailedOwnership.includes('Non-Profit')) return 'Non-profit'
  if (detailedOwnership.includes('Proprietary')) return 'For profit'
  if (detailedOwnership.includes('Governmental')) return 'Government'
  return 'Unknown'
}

/**
 * Transform CMS Nursing Home Compare data to our database format
 */
function transformFacilityData(cmsRecord) {
  // Parse numeric values safely
  const parseNum = (val) => val && !isNaN(val) ? parseFloat(val) : null
  const parseIntSafe = (val) => val && !isNaN(val) ? Math.floor(parseFloat(val)) : null

  return {
    federalProviderNumber: cmsRecord.cms_certification_number_ccn,
    cmsCertificationNumber: cmsRecord.cms_certification_number_ccn,
    facilityName: cmsRecord.provider_name,
    address: cmsRecord.provider_address,
    city: cmsRecord.citytown,
    state: cmsRecord.state,
    zipCode: cmsRecord.zip_code,
    county: cmsRecord.countyparish,
    phone: cmsRecord.telephone_number || null,

    // Location - not in this dataset
    latitude: null,
    longitude: null,

    // Ownership
    ownershipType: cmsRecord.ownership_type,
    providerType: cmsRecord.provider_type || 'Skilled Nursing Facility',
    legalBusinessName: cmsRecord.legal_business_name || cmsRecord.provider_name,
    parentOrganization: cmsRecord.chain_name || null,
    ownershipChain: cmsRecord.chain_name || null,
    multiFacilityChain: cmsRecord.chain_id ? true : false,

    // Beds
    totalBeds: parseIntSafe(cmsRecord.number_of_certified_beds),
    certifiedBeds: parseIntSafe(cmsRecord.number_of_certified_beds),
    occupiedBeds: parseIntSafe(cmsRecord.average_number_of_residents_per_day),
    occupancyRate: cmsRecord.number_of_certified_beds && cmsRecord.average_number_of_residents_per_day
      ? parseNum((parseFloat(cmsRecord.average_number_of_residents_per_day) / parseFloat(cmsRecord.number_of_certified_beds) * 100).toFixed(2))
      : null,

    // Quality ratings
    overallRating: parseIntSafe(cmsRecord.overall_rating),
    healthInspectionRating: parseIntSafe(cmsRecord.health_inspection_rating),
    qualityMeasureRating: parseIntSafe(cmsRecord.qm_rating),
    staffingRating: parseIntSafe(cmsRecord.staffing_rating),

    // Staffing hours
    rnStaffingHours: parseNum(cmsRecord.reported_rn_staffing_hours_per_resident_per_day),
    totalNurseStaffingHours: parseNum(cmsRecord.reported_total_nurse_staffing_hours_per_resident_per_day),
    reportedCnaStaffingHours: parseNum(cmsRecord.reported_nurse_aide_staffing_hours_per_resident_per_day),

    // Compliance - would need additional API call to penalties endpoint
    healthDeficiencies: null,
    fireSafetyDeficiencies: null,
    complaintDeficiencies: null,
    totalPenaltiesAmount: null,
    penaltyCount: null,

    // Medicare/Medicaid
    acceptsMedicare: true,
    acceptsMedicaid: true,
    participatingInQrp: null,

    // Special designations
    specialFocusFacility: cmsRecord.special_focus_status === 'Y',
    abuseIcon: cmsRecord.abuse_icon === 'Y',
    continuingCareRetirementCommunity: cmsRecord.continuing_care_retirement_community === 'Y',

    // Financial - not in this dataset
    averageDailyRate: null,
    medicareRate: null,
    medicaidRate: null,

    // Status
    active: true, // All records in this dataset are active
    dateCertified: cmsRecord.date_first_approved_to_provide_medicare_and_medicaid_services
      ? new Date(cmsRecord.date_first_approved_to_provide_medicare_and_medicaid_services)
      : null,
    dateClosed: null,
    certificationStatus: 'Active',

    // Source
    dataSource: 'CMS Nursing Home Compare',
    lastCmsUpdate: new Date()
  }
}

/**
 * Main collection function
 */
export async function collectCMSFacilities() {
  try {
    console.log('======================================================================')
    console.log('  CMS NURSING HOME COMPARE FACILITIES COLLECTOR')
    console.log('======================================================================')
    console.log(`  Dataset: Nursing Home Compare - Provider Information`)
    console.log(`  Dataset ID: ${DATASET_ID}`)
    console.log('======================================================================\n')

    // Step 1: Fetch all facilities with pagination
    console.log('📥 Fetching facilities from CMS API...\n')

    let allFacilities = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true

    while (hasMore) {
      const batch = await fetchCMSFacilities(batchSize, offset)

      if (batch.length === 0) {
        hasMore = false
      } else {
        allFacilities = allFacilities.concat(batch)
        offset += batchSize
        console.log(`  ✓ Fetched ${allFacilities.length} facilities so far...`)

        // Stop if we got less than a full batch
        if (batch.length < batchSize) {
          hasMore = false
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    console.log(`\n✓ Fetched ${allFacilities.length} total facilities from CMS\n`)

    // Step 2: Transform and save to database
    console.log('💾 Saving facilities to database...\n')

    let savedCount = 0
    let errorCount = 0
    const statesProcessed = new Set()

    for (let i = 0; i < allFacilities.length; i++) {
      const cmsRecord = allFacilities[i]

      try {
        const facility = transformFacilityData(cmsRecord)
        await upsertFacility(facility)

        savedCount++
        statesProcessed.add(facility.state)

        if (savedCount % 100 === 0) {
          console.log(`  ✓ Saved ${savedCount}/${allFacilities.length} facilities...`)
        }

      } catch (error) {
        errorCount++
        if (errorCount <= 10) { // Only log first 10 errors
          console.error(`  ✗ Error saving ${cmsRecord.PRVDR_NUM}: ${error.message}`)
        }
      }
    }

    console.log(`\n✓ Saved ${savedCount} facilities to database\n`)

    // Step 3: Calculate market metrics for each state
    console.log('📊 Calculating market metrics for each state...\n')

    let metricsCount = 0
    for (const stateCode of statesProcessed) {
      try {
        await calculateStateMarketMetrics(stateCode)
        metricsCount++
        console.log(`  ✓ ${stateCode}: Market metrics calculated`)
      } catch (error) {
        console.error(`  ✗ ${stateCode}: ${error.message}`)
      }
    }

    console.log('\n======================================================================')
    console.log('  COLLECTION SUMMARY')
    console.log('======================================================================')
    console.log(`  Total facilities fetched: ${allFacilities.length}`)
    console.log(`  Successfully saved: ${savedCount}`)
    console.log(`  Errors: ${errorCount}`)
    console.log(`  States processed: ${statesProcessed.size}`)
    console.log(`  Market metrics calculated: ${metricsCount}`)
    console.log('======================================================================\n')

    console.log('✅ CMS facilities collection complete!\n')

    return {
      success: true,
      totalFacilities: allFacilities.length,
      savedCount,
      errorCount,
      statesProcessed: Array.from(statesProcessed)
    }

  } catch (error) {
    console.error('❌ Error collecting CMS facilities:', error)
    throw error
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectCMSFacilities()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export default { collectCMSFacilities }
