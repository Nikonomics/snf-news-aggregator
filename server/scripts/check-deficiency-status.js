import pool from '../database/db.js'

async function checkStatus() {
  try {
    // Check deficiency tagging status
    const deficiencyStatus = await pool.query(`
      SELECT
        COUNT(*) as total_deficiencies,
        COUNT(deficiency_tag) as tagged,
        COUNT(*) - COUNT(deficiency_tag) as missing_tags,
        COUNT(DISTINCT federal_provider_number) as providers_with_deficiencies
      FROM cms_facility_deficiencies
    `)

    // Check how many providers need updates
    const providersNeedingUpdates = await pool.query(`
      SELECT COUNT(DISTINCT federal_provider_number) as count
      FROM cms_facility_deficiencies
      WHERE deficiency_tag IS NULL OR scope_severity IS NULL
    `)

    console.log('\n📊 Deficiency Tags Status:')
    console.log('─────────────────────────────────────────')
    console.log(`Total deficiency records: ${deficiencyStatus.rows[0].total_deficiencies.toLocaleString()}`)
    console.log(`Tagged: ${deficiencyStatus.rows[0].tagged.toLocaleString()}`)
    console.log(`Missing tags: ${deficiencyStatus.rows[0].missing_tags.toLocaleString()}`)
    console.log(`Providers with deficiencies: ${deficiencyStatus.rows[0].providers_with_deficiencies.toLocaleString()}`)
    console.log(`Providers needing tag updates: ${providersNeedingUpdates.rows[0].count.toLocaleString()}`)

    const percentComplete = ((deficiencyStatus.rows[0].tagged / deficiencyStatus.rows[0].total_deficiencies) * 100).toFixed(1)
    console.log(`\n✅ ${percentComplete}% of deficiencies have tags\n`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkStatus()
