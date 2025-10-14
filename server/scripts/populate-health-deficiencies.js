import pool from '../database/db.js'

/**
 * Populate health_deficiencies column in snf_facilities table
 * by counting deficiencies from cms_facility_deficiencies table
 */
async function populateHealthDeficiencies() {
  console.log('Starting health deficiencies population...\n')

  try {
    // First, check if health_deficiencies column exists
    const columnCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'snf_facilities'
      AND column_name = 'health_deficiencies'
    `)

    if (columnCheck.rows.length === 0) {
      console.log('Adding health_deficiencies column to snf_facilities table...')
      await pool.query(`
        ALTER TABLE snf_facilities
        ADD COLUMN IF NOT EXISTS health_deficiencies INTEGER DEFAULT 0
      `)
      console.log('✓ Column added\n')
    }

    // Count total facilities
    const totalFacilities = await pool.query(`
      SELECT COUNT(*) as count FROM snf_facilities WHERE active = true
    `)
    console.log(`Total active facilities: ${totalFacilities.rows[0].count}\n`)

    // Update health_deficiencies by counting from cms_facility_deficiencies
    console.log('Updating health_deficiencies counts...')
    const updateResult = await pool.query(`
      UPDATE snf_facilities sf
      SET health_deficiencies = COALESCE(deficiency_counts.deficiency_count, 0)
      FROM (
        SELECT
          federal_provider_number,
          COUNT(*) as deficiency_count
        FROM cms_facility_deficiencies
        GROUP BY federal_provider_number
      ) as deficiency_counts
      WHERE sf.federal_provider_number = deficiency_counts.federal_provider_number
      AND sf.active = true
    `)

    console.log(`✓ Updated ${updateResult.rowCount} facilities with deficiency counts\n`)

    // Set 0 for facilities with no deficiencies
    const zeroResult = await pool.query(`
      UPDATE snf_facilities
      SET health_deficiencies = 0
      WHERE health_deficiencies IS NULL
      AND active = true
    `)

    console.log(`✓ Set ${zeroResult.rowCount} facilities to 0 deficiencies (no records)\n`)

    // Show statistics
    const stats = await pool.query(`
      SELECT
        COUNT(*) as facilities_with_data,
        AVG(health_deficiencies) as avg_deficiencies,
        MIN(health_deficiencies) as min_deficiencies,
        MAX(health_deficiencies) as max_deficiencies,
        COUNT(*) FILTER (WHERE health_deficiencies = 0) as facilities_with_zero
      FROM snf_facilities
      WHERE active = true AND health_deficiencies IS NOT NULL
    `)

    const stat = stats.rows[0]
    console.log('Statistics:')
    console.log(`  Facilities with deficiency data: ${stat.facilities_with_data}`)
    console.log(`  Average deficiencies per facility: ${parseFloat(stat.avg_deficiencies).toFixed(2)}`)
    console.log(`  Min deficiencies: ${stat.min_deficiencies}`)
    console.log(`  Max deficiencies: ${stat.max_deficiencies}`)
    console.log(`  Facilities with zero deficiencies: ${stat.facilities_with_zero}`)

    // Show top 5 states by average deficiencies
    console.log('\nTop 5 states by average deficiencies:')
    const topStates = await pool.query(`
      SELECT
        state,
        COUNT(*) as facility_count,
        AVG(health_deficiencies) as avg_deficiencies
      FROM snf_facilities
      WHERE active = true AND health_deficiencies IS NOT NULL
      GROUP BY state
      HAVING COUNT(*) > 0
      ORDER BY avg_deficiencies DESC
      LIMIT 5
    `)

    topStates.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.state}: ${parseFloat(row.avg_deficiencies).toFixed(2)} avg (${row.facility_count} facilities)`)
    })

    console.log('\n✅ Health deficiencies population complete!')

  } catch (error) {
    console.error('❌ Error populating health deficiencies:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the script
populateHealthDeficiencies()
