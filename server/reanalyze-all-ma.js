/**
 * Re-analyze ALL M&A deals to capture bed counts with updated 18-field prompt
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'
import { analyzeMADeal } from './services/analyzeMADeals.js'

async function reanalyzeAllMA() {
  console.log('🔄 Re-analyzing ALL M&A deals with updated prompt (18 fields including totalBeds)...\n')

  try {
    // Get ALL M&A articles (not just unanalyzed ones)
    const query = `
      SELECT id, title, url, summary, published_date
      FROM articles
      WHERE category = 'M&A'
      ORDER BY published_date DESC
    `

    const result = await db.query(query)
    console.log(`Found ${result.rows.length} M&A articles to re-analyze\n`)
    console.log(`Estimated cost: ${result.rows.length} × $0.015 = $${(result.rows.length * 0.015).toFixed(2)}`)
    console.log(`Estimated time: ~${result.rows.length * 3} seconds\n`)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < result.rows.length; i++) {
      const article = result.rows[i]

      console.log(`\n[${i + 1}/${result.rows.length}] Re-analyzing: ${article.title.substring(0, 60)}...`)

      try {
        await analyzeMADeal(article)
        successCount++
        console.log(`✅ Success`)
      } catch (error) {
        console.error(`❌ Error: ${error.message}`)
        errorCount++
      }

      // Add small delay to avoid rate limiting
      if (i < result.rows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log(`✅ Re-analysis complete!`)
    console.log(`   Success: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)
    console.log(`${'='.repeat(80)}`)

    process.exit(0)
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

reanalyzeAllMA()
