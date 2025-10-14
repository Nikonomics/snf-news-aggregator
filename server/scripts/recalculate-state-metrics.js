import pool from '../database/db.js'
import { calculateStateMarketMetrics } from '../database/state-data.js'

/**
 * Recalculate market metrics for all states
 */
async function recalculateAllStateMetrics() {
  console.log('Recalculating state market metrics...\n')

  try {
    // Get all state codes
    const statesResult = await pool.query(`
      SELECT DISTINCT state
      FROM snf_facilities
      WHERE active = true
      ORDER BY state
    `)

    const states = statesResult.rows.map(row => row.state)
    console.log(`Found ${states.length} states to process\n`)

    let completed = 0
    let failed = 0

    for (const state of states) {
      try {
        await calculateStateMarketMetrics(state)
        completed++
        console.log(`✓ ${state} (${completed}/${states.length})`)
      } catch (error) {
        failed++
        console.error(`✗ ${state} - Error: ${error.message}`)
      }
    }

    console.log(`\n✅ Complete!`)
    console.log(`  Successful: ${completed}`)
    console.log(`  Failed: ${failed}`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    // Don't call pool.end() since it's a singleton
    process.exit(0)
  }
}

// Run the script
recalculateAllStateMetrics()
