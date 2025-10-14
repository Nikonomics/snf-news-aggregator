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
 * CMS Facility Deficiencies Collector
 * Collects deficiency records from CMS Deficiencies dataset
 *
 * API Docs: https://data.cms.gov/provider-data/api-docs
 * Dataset: Deficiencies
 * Dataset ID: r5ix-sfxw
 * Update Frequency: Monthly
 *
 * IMPORTANT: This dataset is 2GB+. We query state-by-state to avoid downloading the entire dataset.
 */

const CMS_API_BASE = 'https://data.cms.gov/provider-data/api/1/datastore/query'
const DATASET_ID = 'r5ix-sfxw'
const CMS_API_URL = `${CMS_API_BASE}/${DATASET_ID}/0`

// US State codes
const STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

/**
 * Fetch deficiencies data from CMS API for a specific state
 */
async function fetchDeficienciesForState(stateCode, limit = 1000, offset = 0) {
  // Filter by state to reduce data volume
  const url = `${CMS_API_URL}?filters[state_cd]=${stateCode}&limit=${limit}&offset=${offset}`

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
    console.error(`Error fetching CMS Deficiencies for ${stateCode}:`, error.message)
    throw error
  }
}

/**
 * Parse date safely
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'Not Available') {
    return null
  }
  try {
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * Parse integer safely
 */
function parseIntSafe(val) {
  if (val === null || val === undefined || val === '' || val === 'N/A' || val === 'Not Available') {
    return null
  }
  const num = parseFloat(val)
  return isNaN(num) ? null : Math.floor(num)
}

/**
 * Transform CMS Deficiency data to database format
 */
function transformDeficiencyData(cmsRecord) {
  // Get provider number (can be under different field names)
  const providerNumber = cmsRecord.PROVNUM || cmsRecord.federal_provider_number || cmsRecord.cms_certification_number_ccn

  return {
    federalProviderNumber: providerNumber,
    surveyDate: parseDate(cmsRecord.SURVEY_DATE || cmsRecord.survey_date),
    surveyType: cmsRecord.SURVEY_TYPE || cmsRecord.survey_type || 'Health',
    deficiencyTag: cmsRecord.deficiency_tag_number || cmsRecord.DEFICIENCY_TAG_NUMBER || cmsRecord.deficiency_tag || cmsRecord.TAG || cmsRecord.tag,
    deficiencyPrefix: cmsRecord.deficiency_prefix || cmsRecord.DEFICIENCY_PREFIX || cmsRecord.PREFIX || (cmsRecord.deficiency_tag_number || '').charAt(0) || 'F',
    scopeSeverity: cmsRecord.scope_severity_code || cmsRecord.SCOPE_SEVERITY_CODE || cmsRecord.scope_severity || cmsRecord.SCOPE_SEVERITY || cmsRecord.SCOPE || cmsRecord.scope,
    deficiencyText: cmsRecord.deficiency_description || cmsRecord.DEFICIENCY_DESCRIPTION || cmsRecord.deficiency_text || cmsRecord.DEFICIENCY_TEXT || null,
    correctionDate: parseDate(cmsRecord.CORRECTION_DATE || cmsRecord.correction_date),
    isCorrected: cmsRecord.CORRECTION_DATE || cmsRecord.correction_date ? true : false
  }
}

/**
 * Insert deficiency record into database
 */
async function insertDeficiency(deficiency) {
  const query = `
    INSERT INTO cms_facility_deficiencies (
      federal_provider_number,
      survey_date,
      survey_type,
      deficiency_tag,
      deficiency_prefix,
      scope_severity,
      deficiency_text,
      correction_date,
      is_corrected
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9
    )
    ON CONFLICT DO NOTHING
  `

  const values = [
    deficiency.federalProviderNumber,
    deficiency.surveyDate,
    deficiency.surveyType,
    deficiency.deficiencyTag,
    deficiency.deficiencyPrefix,
    deficiency.scopeSeverity,
    deficiency.deficiencyText,
    deficiency.correctionDate,
    deficiency.isCorrected
  ]

  await pool.query(query, values)
}

/**
 * Collect deficiencies for a single state
 */
async function collectDeficienciesForState(stateCode) {
  console.log(`\n📍 Collecting deficiencies for ${stateCode}...`)

  let allRecords = []
  let offset = 0
  const batchSize = 1000
  let hasMore = true

  while (hasMore) {
    const batch = await fetchDeficienciesForState(stateCode, batchSize, offset)

    if (batch.length === 0) {
      hasMore = false
    } else {
      allRecords = allRecords.concat(batch)
      offset += batchSize

      // Stop if we got less than a full batch
      if (batch.length < batchSize) {
        hasMore = false
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  console.log(`  ✓ Fetched ${allRecords.length} deficiencies for ${stateCode}`)

  // Save to database
  let savedCount = 0
  let errorCount = 0

  for (const cmsRecord of allRecords) {
    try {
      const deficiency = transformDeficiencyData(cmsRecord)

      // Skip if no provider number or survey date
      if (!deficiency.federalProviderNumber || !deficiency.surveyDate) {
        errorCount++
        continue
      }

      await insertDeficiency(deficiency)
      savedCount++

    } catch (error) {
      errorCount++
      if (errorCount <= 5) { // Only log first 5 errors per state
        console.error(`  ✗ Error saving deficiency: ${error.message}`)
      }
    }
  }

  console.log(`  ✓ Saved ${savedCount} deficiencies for ${stateCode}`)

  return {
    state: stateCode,
    fetched: allRecords.length,
    saved: savedCount,
    errors: errorCount
  }
}

/**
 * Main collection function
 */
export async function collectCMSDeficiencies(stateCodes = STATE_CODES) {
  try {
    console.log('======================================================================')
    console.log('  CMS FACILITY DEFICIENCIES COLLECTOR')
    console.log('======================================================================')
    console.log(`  Dataset: CMS Deficiencies`)
    console.log(`  Dataset ID: ${DATASET_ID}`)
    console.log(`  Update Frequency: Monthly`)
    console.log(`  States to collect: ${stateCodes.length}`)
    console.log('======================================================================')
    console.log('  NOTE: Collecting state-by-state to avoid 2GB+ full dataset download')
    console.log('======================================================================\n')

    const results = []
    let totalFetched = 0
    let totalSaved = 0
    let totalErrors = 0

    // Process each state sequentially to avoid overwhelming the API
    for (let i = 0; i < stateCodes.length; i++) {
      const stateCode = stateCodes[i]

      try {
        const result = await collectDeficienciesForState(stateCode)
        results.push(result)

        totalFetched += result.fetched
        totalSaved += result.saved
        totalErrors += result.errors

        console.log(`  Progress: ${i + 1}/${stateCodes.length} states completed`)

        // Longer pause between states to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`  ✗ Failed to collect ${stateCode}: ${error.message}`)
        results.push({
          state: stateCode,
          fetched: 0,
          saved: 0,
          errors: 1,
          error: error.message
        })
      }
    }

    console.log('\n======================================================================')
    console.log('  COLLECTION SUMMARY')
    console.log('======================================================================')
    console.log(`  States processed: ${results.length}`)
    console.log(`  Total deficiencies fetched: ${totalFetched}`)
    console.log(`  Successfully saved: ${totalSaved}`)
    console.log(`  Errors: ${totalErrors}`)
    console.log('======================================================================\n')

    // Print top states by deficiency count
    console.log('Top 10 states by deficiency count:')
    const topStates = results
      .filter(r => r.fetched > 0)
      .sort((a, b) => b.fetched - a.fetched)
      .slice(0, 10)

    topStates.forEach((state, idx) => {
      console.log(`  ${idx + 1}. ${state.state}: ${state.fetched} deficiencies`)
    })

    console.log('\n✅ CMS deficiencies collection complete!\n')

    await pool.end()

    return {
      success: true,
      statesProcessed: results.length,
      totalFetched,
      totalSaved,
      totalErrors,
      results
    }

  } catch (error) {
    console.error('❌ Error collecting CMS deficiencies:', error)
    await pool.end()
    throw error
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Allow passing specific states as command line args
  const args = process.argv.slice(2)
  const statesToCollect = args.length > 0 ? args.map(s => s.toUpperCase()) : STATE_CODES

  console.log(`Collecting deficiencies for: ${statesToCollect.join(', ')}\n`)

  collectCMSDeficiencies(statesToCollect)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export default { collectCMSDeficiencies }
