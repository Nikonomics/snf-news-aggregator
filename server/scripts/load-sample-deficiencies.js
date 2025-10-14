import fetch from 'node-fetch'
import pool from '../database/db.js'

async function loadSampleDeficiencies() {
  try {
    // Delete all existing records first
    await pool.query('DELETE FROM cms_facility_deficiencies')
    console.log('✓ Cleared existing records')

    // Fetch 100 real records from CMS API
    console.log('Fetching 100 sample deficiency records from CMS...')
    const url = 'https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0?limit=100'
    const response = await fetch(url)
    const data = await response.json()

    console.log(`Got ${data.results.length} records from CMS`)

    // Insert them properly
    let inserted = 0
    for (const record of data.results) {
      try {
        await pool.query(`
          INSERT INTO cms_facility_deficiencies (
            federal_provider_number, survey_date, survey_type,
            deficiency_tag, deficiency_prefix, scope_severity,
            deficiency_text, correction_date, is_corrected
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          record.cms_certification_number_ccn,
          record.survey_date,
          record.survey_type,
          record.deficiency_tag_number,
          record.deficiency_prefix,
          record.scope_severity_code,
          record.deficiency_description,
          record.correction_date,
          record.correction_date ? true : false
        ])
        inserted++
      } catch(e) {
        console.error('Error:', e.message)
      }
    }

    console.log(`✓ Inserted ${inserted} records`)

    // Verify
    const check = await pool.query('SELECT COUNT(*) as total, COUNT(deficiency_tag) as with_tags FROM cms_facility_deficiencies')
    console.log(`  Total: ${check.rows[0].total}, With tags: ${check.rows[0].with_tags}`)

    await pool.end()
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

loadSampleDeficiencies()
