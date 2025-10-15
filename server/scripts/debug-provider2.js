import pool from '../database/db.js'

async function debug() {
  try {
    const providerId = '056039'
    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

    // Get a sample DB record
    const sample = await pool.query(`
      SELECT *
      FROM cms_facility_deficiencies
      WHERE federal_provider_number = $1
        AND survey_date >= $2
        AND deficiency_tag IS NULL
      LIMIT 3
    `, [providerId, threeYearsAgo])

    console.log('\n📋 Sample DB Records (without tags):')
    sample.rows.forEach((row, i) => {
      console.log(`\n  Record ${i + 1}:`)
      console.log(`    ID: ${row.id}`)
      console.log(`    Survey Date: ${row.survey_date}`)
      console.log(`    Survey Type: ${row.survey_type}`)
      console.log(`    Deficiency Tag: ${row.deficiency_tag}`)
      console.log(`    Scope/Severity: ${row.scope_severity}`)
      console.log(`    Deficiency Text: ${row.deficiency_text ? row.deficiency_text.substring(0, 50) + '...' : 'NULL'}`)
    })

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

debug()
