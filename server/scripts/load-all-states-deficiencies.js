import fetch from 'node-fetch'
import pool from '../database/db.js'

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

async function loadStateDeficiencies(state) {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`  LOADING ${state} DEFICIENCIES`)
  console.log('='.repeat(70))

  let totalInserted = 0
  let offset = 0
  const limit = 1000
  let hasMore = true

  try {
    while (hasMore) {
      const url = `https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0?filters[state]=${state}&limit=${limit}&offset=${offset}`
      const response = await fetch(url)
      const data = await response.json()

      if (!data.results || data.results.length === 0) {
        hasMore = false
        break
      }

      console.log(`  Fetching batch: ${data.results.length} records (offset ${offset})`)

      for (const record of data.results) {
        try {
          await pool.query(`
            INSERT INTO cms_facility_deficiencies (
              federal_provider_number, survey_date, survey_type,
              deficiency_tag, deficiency_prefix, scope_severity,
              deficiency_text, correction_date, is_corrected
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (federal_provider_number, survey_date, deficiency_tag, deficiency_prefix)
            DO UPDATE SET
              scope_severity = EXCLUDED.scope_severity,
              deficiency_text = EXCLUDED.deficiency_text,
              correction_date = EXCLUDED.correction_date,
              is_corrected = EXCLUDED.is_corrected
          `, [
            record.cms_certification_number_ccn,
            record.survey_date,
            record.survey_type,
            record.deficiency_tag_number,
            record.deficiency_prefix,
            record.scope_severity_code,
            record.deficiency_description,
            record.correction_date,
            !!record.correction_date
          ])
          totalInserted++
        } catch(e) {
          // Skip individual record errors
        }
      }

      if (data.results.length < limit) {
        hasMore = false
      } else {
        offset += limit
      }

      // Rate limiting to avoid overwhelming CMS API
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    console.log(`  ✓ Loaded ${totalInserted} deficiency records for ${state}`)
    return totalInserted

  } catch (error) {
    console.error(`  ❌ Error loading ${state}:`, error.message)
    return totalInserted
  }
}

async function loadAllStates() {
  console.log('\n' + '='.repeat(70))
  console.log('  LOADING DEFICIENCIES FOR ALL STATES')
  console.log('='.repeat(70))
  console.log(`  Total states to process: ${STATES.length}`)
  console.log('  Estimated time: 1-2 hours')
  console.log('='.repeat(70))

  const startTime = Date.now()
  let grandTotal = 0
  let statesProcessed = 0

  for (const state of STATES) {
    const count = await loadStateDeficiencies(state)
    grandTotal += count
    statesProcessed++

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
    const avgPerState = elapsed / statesProcessed
    const remaining = (STATES.length - statesProcessed) * avgPerState

    console.log(`\n  Progress: ${statesProcessed}/${STATES.length} states | ${grandTotal.toLocaleString()} total records | ${elapsed}m elapsed | ~${remaining.toFixed(0)}m remaining`)
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  console.log('\n' + '='.repeat(70))
  console.log('  LOAD COMPLETE')
  console.log('='.repeat(70))
  console.log(`  Total states processed: ${statesProcessed}`)
  console.log(`  Total records loaded: ${grandTotal.toLocaleString()}`)
  console.log(`  Total time: ${totalTime} minutes`)
  console.log('='.repeat(70) + '\n')

  await pool.end()
  process.exit(0)
}

loadAllStates()
