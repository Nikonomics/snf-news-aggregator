/**
 * phase2-backfill.js — Phase 2 Operations Category Backfill Script
 *
 * Runs reclassifyBatch() in a loop until all Operations articles are categorized.
 * Stops when getReclassifyStats().pending === 0.
 *
 * Usage:
 *   node server/scripts/phase2-backfill.js
 *
 * Environment:
 *   ANTHROPIC_API_KEY — required
 *   DATABASE_URL      — required
 */

import 'dotenv/config'
import { reclassifyBatch, getReclassifyStats } from '../services/categoryService.js'
import { pool } from '../database/db.js'

const BATCH_SIZE = 25
const DELAY_MS = 500  // 500ms between batches for rate limiting

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('=== Phase 2 Operations Category Backfill ===')
  console.log(`Batch size: ${BATCH_SIZE} | Delay between batches: ${DELAY_MS}ms\n`)

  // Print initial stats
  const initialStats = await getReclassifyStats()
  const total = Object.values(initialStats).reduce((a, b) => a + b, 0)
  console.log('Initial state:')
  console.log(`  pending:           ${initialStats.pending}`)
  console.log(`  processing:        ${initialStats.processing}`)
  console.log(`  done:              ${initialStats.done}`)
  console.log(`  failed_permanently: ${initialStats.failed_permanently}`)
  console.log(`  total Operations:  ${total}\n`)

  if (initialStats.pending === 0) {
    console.log('✓ No pending articles. Nothing to do.')
    await pool.end()
    return
  }

  let batchNum = 0
  let totalProcessed = 0

  while (true) {
    // Check pending count before each batch
    const stats = await getReclassifyStats()

    if (stats.pending === 0) {
      console.log('\n✓ No more pending articles — backfill complete.')
      break
    }

    batchNum++
    const processed = await reclassifyBatch(BATCH_SIZE)

    if (processed === 0) {
      // All remaining rows are locked by another worker or there are truly none left
      const recheck = await getReclassifyStats()
      if (recheck.pending === 0) {
        console.log('\n✓ No more pending articles — backfill complete.')
        break
      }
      // Brief pause and retry (rows may be locked by orphan workers)
      console.log(`  Batch ${batchNum}: 0 claimed (rows locked or none available). Waiting...`)
      await sleep(DELAY_MS * 4)
      continue
    }

    totalProcessed += processed

    // Fetch updated stats for progress log
    const afterStats = await getReclassifyStats()
    console.log(
      `Processed batch ${batchNum}: ${processed} articles, ${afterStats.pending} remaining`
    )

    // Rate-limit delay between batches
    if (afterStats.pending > 0) {
      await sleep(DELAY_MS)
    }
  }

  // Final summary
  const finalStats = await getReclassifyStats()
  console.log('\n=== Final Summary ===')
  console.log(`  Batches run:        ${batchNum}`)
  console.log(`  Total processed:    ${totalProcessed}`)
  console.log(`  done:               ${finalStats.done}`)
  console.log(`  failed_permanently: ${finalStats.failed_permanently}`)
  console.log(`  still pending:      ${finalStats.pending}`)
  console.log(`  still processing:   ${finalStats.processing}`)

  const grandTotal = Object.values(finalStats).reduce((a, b) => a + b, 0)
  if (grandTotal > 0) {
    const donePct = ((finalStats.done / grandTotal) * 100).toFixed(1)
    const failPct = ((finalStats.failed_permanently / grandTotal) * 100).toFixed(1)
    console.log(`\n  done %:             ${donePct}%  (target: >90%)`)
    console.log(`  failed_permanently: ${failPct}%  (target: <5%)`)

    if (finalStats.done / grandTotal >= 0.9) {
      console.log('\n✅ Phase 2 gate: done > 90% — PASSED')
    } else {
      console.log('\n⚠️  Phase 2 gate: done > 90% — NOT YET MET')
    }

    if (finalStats.failed_permanently / grandTotal <= 0.05) {
      console.log('✅ Phase 2 gate: failed_permanently < 5% — PASSED')
    } else {
      console.log('⚠️  Phase 2 gate: failed_permanently < 5% — NOT YET MET')
    }
  }

  await pool.end()
}

main().catch(err => {
  console.error('❌ phase2-backfill failed:', err)
  process.exit(1)
})
