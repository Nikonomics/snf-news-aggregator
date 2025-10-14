/**
 * Batch re-analysis of M&A deals - Process in small batches to avoid memory issues
 * Run this multiple times until all articles are analyzed
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'
import { analyzeMADeal } from './services/analyzeMADeals.js'

const BATCH_SIZE = 25 // Process 25 articles per run
const MAX_RETRIES = 2
const RETRY_DELAY = 1000

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function reanalyzeMABatch() {
  console.log('🔄 Batch re-analysis of M&A deals\n')
  console.log(`📦 Batch size: ${BATCH_SIZE} articles per run\n`)

  try {
    // Get M&A articles ordered by ID, limit to batch size
    const query = `
      SELECT id, title, url, summary, published_date
      FROM articles
      WHERE category = 'M&A'
      ORDER BY id ASC
      LIMIT ${BATCH_SIZE}
    `

    const result = await db.query(query)

    if (result.rows.length === 0) {
      console.log('✅ No more M&A articles to analyze!')
      console.log('\n📊 Checking final statistics...\n')

      const statsQuery = `
        SELECT
          COUNT(*) as total_ma_deals,
          COUNT(CASE
            WHEN analysis->'maDetails'->>'totalBeds' IS NOT NULL
            AND analysis->'maDetails'->>'totalBeds' != 'null'
            AND CAST(analysis->'maDetails'->>'totalBeds' AS INTEGER) > 0
            THEN 1
          END) as deals_with_beds
        FROM articles
        WHERE category = 'M&A'
      `
      const statsResult = await db.query(statsQuery)
      const stats = statsResult.rows[0]

      console.log('✅ Final Statistics:')
      console.log('='.repeat(60))
      console.log(`   Total M&A deals: ${stats.total_ma_deals}`)
      console.log(`   Deals with bed counts: ${stats.deals_with_beds}`)
      console.log(`   Coverage: ${(stats.deals_with_beds / stats.total_ma_deals * 100).toFixed(1)}%`)
      console.log('='.repeat(60))

      process.exit(0)
    }

    console.log(`Found ${result.rows.length} articles in this batch`)
    console.log(`Processing articles ID ${result.rows[0].id} to ${result.rows[result.rows.length-1].id}\n`)
    console.log('='.repeat(60))

    let successCount = 0
    let errorCount = 0
    let skippedCount = 0

    for (let i = 0; i < result.rows.length; i++) {
      const article = result.rows[i]
      const progress = ((i + 1) / result.rows.length * 100).toFixed(1)

      console.log(`\n[${i + 1}/${result.rows.length}] (${progress}%) [ID:${article.id}]`)
      console.log(`${article.title.substring(0, 70)}...`)

      let success = false
      let attempts = 0

      while (!success && attempts < MAX_RETRIES) {
        attempts++

        try {
          await analyzeMADeal(article)
          successCount++
          console.log(`✅ Success${attempts > 1 ? ` (attempt ${attempts})` : ''}`)
          success = true
        } catch (error) {
          console.error(`❌ Error (attempt ${attempts}/${MAX_RETRIES}): ${error.message}`)

          if (attempts < MAX_RETRIES) {
            await sleep(RETRY_DELAY)
          } else {
            errorCount++
            skippedCount++
            console.log(`⏭️  Skipping after ${MAX_RETRIES} failed attempts`)
          }
        }
      }

      // Small delay between articles
      if (i < result.rows.length - 1 && success) {
        await sleep(300)
      }
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log(`✅ Batch complete!`)
    console.log(`   Success: ${successCount}/${result.rows.length}`)
    console.log(`   Errors: ${errorCount}`)
    console.log(`   Skipped: ${skippedCount}`)
    console.log(`${'='.repeat(60)}`)

    // Check how many articles remain
    const remainingQuery = `SELECT COUNT(*) as remaining FROM articles WHERE category = 'M&A'`
    const remainingResult = await db.query(remainingQuery)
    const remaining = remainingResult.rows[0].remaining

    if (remaining > 0) {
      console.log(`\n📋 ${remaining} articles remaining`)
      console.log(`💡 Run this script again to process the next batch\n`)
    } else {
      console.log(`\n✅ All articles processed!\n`)
    }

    process.exit(0)
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

reanalyzeMABatch()
