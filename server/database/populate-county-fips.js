import pool from './db.js'

/**
 * Populate county_fips in snf_facilities by matching county names
 * This links facilities to counties for proper aggregation
 */

async function populateCountyFips() {
  console.log('🚀 Starting county FIPS population...\n')

  try {
    // First, get counts
    const counts = await pool.query(`
      SELECT
        COUNT(*) as total_facilities,
        COUNT(county_fips) as facilities_with_fips,
        COUNT(county) as facilities_with_county_name
      FROM snf_facilities
    `)

    console.log('📊 Current state:')
    console.log(`   Total facilities: ${counts.rows[0].total_facilities}`)
    console.log(`   With county_fips: ${counts.rows[0].facilities_with_fips}`)
    console.log(`   With county name: ${counts.rows[0].facilities_with_county_name}`)
    console.log()

    // Update facilities by matching county name to county_demographics
    // Handle variations: "County" suffix, case differences, whitespace
    const result = await pool.query(`
      UPDATE snf_facilities f
      SET county_fips = cd.county_fips
      FROM county_demographics cd
      WHERE f.state = cd.state_code
        AND f.county_fips IS NULL
        AND f.county IS NOT NULL
        AND (
          -- Exact match
          LOWER(TRIM(f.county)) = LOWER(TRIM(cd.county_name))
          -- Match without "County" suffix
          OR LOWER(TRIM(f.county)) = LOWER(TRIM(REGEXP_REPLACE(cd.county_name, ' County$', '', 'i')))
          -- Match with added "County" suffix
          OR LOWER(TRIM(f.county || ' County')) = LOWER(TRIM(cd.county_name))
        )
    `)

    console.log(`✅ Updated ${result.rowCount} facilities with county FIPS codes`)
    console.log()

    // Get updated counts
    const newCounts = await pool.query(`
      SELECT
        COUNT(*) as total_facilities,
        COUNT(county_fips) as facilities_with_fips,
        COUNT(county) - COUNT(county_fips) as facilities_without_fips
      FROM snf_facilities
      WHERE county IS NOT NULL
    `)

    console.log('📊 Updated state:')
    console.log(`   Total facilities: ${newCounts.rows[0].total_facilities}`)
    console.log(`   With county_fips: ${newCounts.rows[0].facilities_with_fips}`)
    console.log(`   Still missing FIPS: ${newCounts.rows[0].facilities_without_fips}`)
    console.log()

    // Show facilities that still don't have FIPS codes
    if (parseInt(newCounts.rows[0].facilities_without_fips) > 0) {
      const unmatched = await pool.query(`
        SELECT DISTINCT state, county, COUNT(*) as count
        FROM snf_facilities
        WHERE county IS NOT NULL AND county_fips IS NULL
        GROUP BY state, county
        ORDER BY count DESC
        LIMIT 20
      `)

      console.log('⚠️  Facilities still without FIPS codes (top 20):')
      unmatched.rows.forEach(row => {
        console.log(`   ${row.state} - ${row.county}: ${row.count} facilities`)
      })
      console.log()
    }

    // Show summary by state
    const stateSummary = await pool.query(`
      SELECT
        state,
        COUNT(*) as total,
        COUNT(county_fips) as with_fips,
        ROUND(COUNT(county_fips)::numeric / COUNT(*) * 100, 1) as percent_complete
      FROM snf_facilities
      WHERE county IS NOT NULL
      GROUP BY state
      HAVING COUNT(*) - COUNT(county_fips) > 0
      ORDER BY percent_complete ASC
      LIMIT 10
    `)

    if (stateSummary.rows.length > 0) {
      console.log('📍 States with incomplete county FIPS (bottom 10):')
      stateSummary.rows.forEach(row => {
        console.log(`   ${row.state}: ${row.with_fips}/${row.total} (${row.percent_complete}%)`)
      })
    } else {
      console.log('🎉 All facilities have county FIPS codes!')
    }

  } catch (error) {
    console.error('❌ Error populating county FIPS:', error)
    throw error
  }
}

// Run the script
populateCountyFips()
  .then(() => {
    console.log('\n✅ County FIPS population complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error)
    process.exit(1)
  })
