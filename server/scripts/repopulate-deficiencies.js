import { collectCMSDeficiencies } from '../collectors/cms-deficiencies-collector.js'
import pool from '../database/db.js'

/**
 * Repopulate deficiency tags by:
 * 1. Finding states with missing tags
 * 2. Deleting deficiencies without tags for those states
 * 3. Re-running the collector for those states
 */

async function repopulate() {
  try {
    console.log('======================================================================')
    console.log('  REPOPULATE DEFICIENCY TAGS')
    console.log('======================================================================\n')

    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

    // Find states with significant missing tags
    const statesQuery = await pool.query(`
      SELECT
        SUBSTRING(federal_provider_number FROM 1 FOR 2) as state_code,
        COUNT(*) as total,
        COUNT(deficiency_tag) as tagged,
        COUNT(*) - COUNT(deficiency_tag) as missing
      FROM cms_facility_deficiencies
      WHERE survey_date >= $1
      GROUP BY SUBSTRING(federal_provider_number FROM 1 FOR 2)
      HAVING COUNT(*) - COUNT(deficiency_tag) > 100
      ORDER BY missing DESC
    `, [threeYearsAgo])

    console.log(`Found ${statesQuery.rows.length} state codes with missing tags:\n`)
    statesQuery.rows.forEach(row => {
      const percent = ((row.missing / row.total) * 100).toFixed(1)
      console.log(`  ${row.state_code}: ${row.missing.toLocaleString()} missing (${percent}%)`)
    })

    console.log('\n⚠️  This will DELETE records without tags and re-fetch from CMS API')
    console.log('     Press Ctrl+C now to cancel, or wait 5 seconds to continue...\n')

    await new Promise(resolve => setTimeout(resolve, 5000))

    // Delete records without tags
    console.log('🗑️  Deleting records without tags...')
    const deleteResult = await pool.query(`
      DELETE FROM cms_facility_deficiencies
      WHERE (deficiency_tag IS NULL OR deficiency_tag = '')
        AND survey_date >= $1
    `, [threeYearsAgo])

    console.log(`   Deleted ${deleteResult.rowCount.toLocaleString()} records\n`)

    // Re-run collector for all states (it will skip existing records)
    console.log('📥 Re-fetching deficiencies from CMS API...\n')
    await collectCMSDeficiencies()

    console.log('\n✅ Repopulation complete!\n')
    process.exit(0)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

repopulate()
