import fetch from 'node-fetch'
import pool from '../database/db.js'

/**
 * Update existing deficiency records with correct tag numbers and severity codes
 * This script fetches fresh data from CMS API and updates the database
 */

const CMS_API_URL = 'https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0'

function parseDate(dateStr) {
  if (!dateStr) return null
  try {
    return new Date(dateStr)
  } catch {
    return null
  }
}

async function fetchAndUpdateDeficienciesForProvider(providerId) {
  try {
    // Fetch from CMS API
    const url = `${CMS_API_URL}?filters[cms_certification_number_ccn]=${providerId}&limit=1000`
    const response = await fetch(url)
    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      return 0
    }

    let updated = 0

    for (const record of data.results) {
      // Update the database record
      const result = await pool.query(`
        UPDATE cms_facility_deficiencies
        SET
          deficiency_tag = $1,
          deficiency_prefix = $2,
          scope_severity = $3,
          deficiency_text = $4
        WHERE
          federal_provider_number = $5
          AND survey_date = $6
          AND survey_type = $7
      `, [
        record.deficiency_tag_number,
        record.deficiency_prefix,
        record.scope_severity_code,
        record.deficiency_description,
        record.cms_certification_number_ccn,
        parseDate(record.survey_date),
        record.survey_type
      ])

      if (result.rowCount > 0) {
        updated += result.rowCount
      }
    }

    return updated
  } catch (error) {
    console.error(`Error updating ${providerId}:`, error.message)
    return 0
  }
}

async function updateDeficiencyTags(state = null, limit = null) {
  console.log('======================================================================')
  console.log('  UPDATE DEFICIENCY TAGS SCRIPT')
  console.log('======================================================================\n')

  try {
    // Get providers that need updating
    let query = `
      SELECT DISTINCT federal_provider_number, COUNT(*) as deficiency_count
      FROM cms_facility_deficiencies
      WHERE deficiency_tag IS NULL OR scope_severity IS NULL
    `

    if (state) {
      // Get providers from a specific state
      query = `
        SELECT DISTINCT d.federal_provider_number, COUNT(*) as deficiency_count
        FROM cms_facility_deficiencies d
        JOIN snf_facilities f ON d.federal_provider_number = f.federal_provider_number
        WHERE (d.deficiency_tag IS NULL OR d.scope_severity IS NULL)
          AND f.state = $1
        GROUP BY d.federal_provider_number
        ORDER BY deficiency_count DESC
      `
      if (limit) query += ` LIMIT ${limit}`
    } else {
      query += ` GROUP BY federal_provider_number ORDER BY deficiency_count DESC`
      if (limit) query += ` LIMIT ${limit}`
    }

    const providers = state
      ? await pool.query(query, [state])
      : await pool.query(query)

    console.log(`Found ${providers.rows.length} providers needing updates`)
    if (state) console.log(`  State filter: ${state}`)
    if (limit) console.log(`  Limit: ${limit} providers`)
    console.log()

    let totalUpdated = 0
    let providersProcessed = 0

    for (const row of providers.rows) {
      const providerId = row.federal_provider_number
      providersProcessed++

      console.log(`[${providersProcessed}/${providers.rows.length}] Updating ${providerId}...`)

      const updated = await fetchAndUpdateDeficienciesForProvider(providerId)
      totalUpdated += updated

      console.log(`  ✓ Updated ${updated} deficiency records`)

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    console.log('\n======================================================================')
    console.log('  UPDATE COMPLETE')
    console.log('======================================================================')
    console.log(`  Providers processed: ${providersProcessed}`)
    console.log(`  Total records updated: ${totalUpdated}`)
    console.log('======================================================================\n')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

// Run with command line args: node update-deficiency-tags.js [STATE] [LIMIT]
const state = process.argv[2] || null
const limit = process.argv[3] ? parseInt(process.argv[3]) : 50

updateDeficiencyTags(state, limit)
