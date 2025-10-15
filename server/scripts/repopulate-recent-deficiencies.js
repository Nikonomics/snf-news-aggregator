import fetch from 'node-fetch'
import pool from '../database/db.js'

/**
 * Fast repopulation - only fetch last 3 years of deficiencies
 */

const CMS_API_URL = 'https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0'
const STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

function parseDate(dateStr) {
  if (!dateStr) return null
  try {
    return new Date(dateStr)
  } catch {
    return null
  }
}

async function fetchRecentDeficienciesForState(stateCode, threeYearsAgo) {
  const cutoffDate = threeYearsAgo.toISOString().split('T')[0] // Format: YYYY-MM-DD

  // Filter by state AND survey_date >= cutoff
  const url = `${CMS_API_URL}?filters[state_cd]=${stateCode}&filters[survey_date][gte]=${cutoffDate}&limit=10000`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error(`  ✗ Error fetching ${stateCode}:`, error.message)
    return []
  }
}

async function insertDeficiency(record) {
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
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT DO NOTHING
  `

  const values = [
    record.cms_certification_number_ccn,
    parseDate(record.survey_date),
    record.survey_type,
    record.deficiency_tag_number,
    record.deficiency_prefix,
    record.scope_severity_code,
    record.deficiency_description,
    parseDate(record.correction_date),
    !!record.correction_date
  ]

  await pool.query(query, values)
}

async function repopulateRecent() {
  try {
    console.log('======================================================================')
    console.log('  FAST REPOPULATION - LAST 3 YEARS ONLY')
    console.log('======================================================================\n')

    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

    console.log(`Fetching deficiencies from ${threeYearsAgo.toISOString().split('T')[0]} onwards\n`)

    // Delete records without tags from last 3 years
    console.log('🗑️  Deleting records without tags...')
    const deleteResult = await pool.query(`
      DELETE FROM cms_facility_deficiencies
      WHERE (deficiency_tag IS NULL OR deficiency_tag = '')
        AND survey_date >= $1
    `, [threeYearsAgo])
    console.log(`   Deleted ${deleteResult.rowCount.toLocaleString()} records\n`)

    let totalFetched = 0
    let totalSaved = 0

    for (let i = 0; i < STATE_CODES.length; i++) {
      const stateCode = STATE_CODES[i]
      console.log(`[${i + 1}/${STATE_CODES.length}] Fetching ${stateCode}...`)

      const records = await fetchRecentDeficienciesForState(stateCode, threeYearsAgo)
      totalFetched += records.length

      let savedCount = 0
      for (const record of records) {
        if (record.cms_certification_number_ccn && record.survey_date) {
          await insertDeficiency(record)
          savedCount++
        }
      }
      totalSaved += savedCount

      console.log(`  ✓ ${records.length} fetched, ${savedCount} saved`)

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    console.log('\n======================================================================')
    console.log('  REPOPULATION COMPLETE')
    console.log('======================================================================')
    console.log(`  States processed: ${STATE_CODES.length}`)
    console.log(`  Total fetched: ${totalFetched.toLocaleString()}`)
    console.log(`  Total saved: ${totalSaved.toLocaleString()}`)
    console.log('======================================================================\n')

    process.exit(0)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

repopulateRecent()
