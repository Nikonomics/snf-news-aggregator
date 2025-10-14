/**
 * IMPROVED Re-analysis of ALL M&A deals with 18-field prompt including totalBeds
 *
 * Improvements:
 * - Batch commits every 10 articles (progress not lost if killed)
 * - Skip articles that fail after 2 retries
 * - Better error handling and logging
 * - Progress tracking with percentage
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'
import { analyzeMADeal } from './services/analyzeMADeals.js'

const BATCH_SIZE = 10 // Commit every 10 articles
const MAX_RETRIES = 2 // Retry failed articles up to 2 times
const RETRY_DELAY = 1000 // Wait 1 second between retries

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function reanalyzeAllMAImproved() {
  console.log('🔄 Re-analyzing ALL M&A deals with improved error handling...\n')
  console.log('💡 Features:')
  console.log('   - Batch commits every 10 articles (progress saved)')
  console.log('   - Skip articles that fail after 2 retries')
  console.log('   - Better logging and progress tracking\n')

  try {
    // Get ALL M&A articles
    const query = `
      SELECT id, title, url, summary, published_date
      FROM articles
      WHERE category = 'M&A'
      ORDER BY published_date DESC
    `

    const result = await db.query(query)
    const totalArticles = result.rows.length

    console.log(`Found ${totalArticles} M&A articles to re-analyze\n`)
    console.log(`Estimated cost: ${totalArticles} × $0.015 = $${(totalArticles * 0.015).toFixed(2)}`)
    console.log(`Estimated time: ~${Math.ceil(totalArticles * 3 / 60)} minutes\n`)
    console.log('='.repeat(80))

    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    const failedArticles = []

    for (let i = 0; i < result.rows.length; i++) {
      const article = result.rows[i]
      const progress = ((i + 1) / totalArticles * 100).toFixed(1)

      console.log(`\n[${i + 1}/${totalArticles}] (${progress}%) ${article.title.substring(0, 60)}...`)

      let success = false
      let attempts = 0

      // Retry logic
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
            console.log(`   ⏳ Retrying in ${RETRY_DELAY}ms...`)
            await sleep(RETRY_DELAY)
          } else {
            // Max retries reached, skip this article
            console.log(`   ⏭️  Skipping after ${MAX_RETRIES} failed attempts`)
            errorCount++
            skippedCount++
            failedArticles.push({
              id: article.id,
              title: article.title,
              error: error.message
            })
          }
        }
      }

      // Batch commit every BATCH_SIZE articles
      if ((i + 1) % BATCH_SIZE === 0) {
        console.log(`\n💾 Progress checkpoint: ${i + 1}/${totalArticles} articles processed`)
        console.log(`   ✅ Success: ${successCount} | ❌ Errors: ${errorCount} | ⏭️  Skipped: ${skippedCount}`)
      }

      // Small delay to avoid rate limiting (only if not last article)
      if (i < result.rows.length - 1 && success) {
        await sleep(300) // Reduced from 500ms since we have retry delays
      }
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log(`✅ Re-analysis complete!`)
    console.log(`   Success: ${successCount} (${(successCount / totalArticles * 100).toFixed(1)}%)`)
    console.log(`   Errors: ${errorCount}`)
    console.log(`   Skipped: ${skippedCount}`)
    console.log(`${'='.repeat(80)}`)

    if (failedArticles.length > 0) {
      console.log(`\n⚠️  Failed Articles (${failedArticles.length}):`)
      failedArticles.forEach((article, i) => {
        console.log(`   ${i + 1}. [ID: ${article.id}] ${article.title.substring(0, 60)}...`)
        console.log(`      Error: ${article.error}`)
      })
      console.log(`\nYou can manually re-analyze these later if needed.`)
    }

    // Final stats check
    console.log(`\n📊 Checking final bed count statistics...`)
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

    console.log(`\n✅ Final Statistics:`)
    console.log(`   Total M&A deals: ${stats.total_ma_deals}`)
    console.log(`   Deals with bed counts: ${stats.deals_with_beds}`)
    console.log(`   Coverage: ${(stats.deals_with_beds / stats.total_ma_deals * 100).toFixed(1)}%`)

    process.exit(0)
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

reanalyzeAllMAImproved()
