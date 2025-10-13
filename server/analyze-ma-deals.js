/**
 * Batch M&A Analysis Script
 * Analyzes all M&A articles that haven't been analyzed yet
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'
import { processMAArticle } from './services/analyzeMADeals.js'

async function analyzeMADeals() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('M&A Deal Analysis - Specialized Extraction')
    console.log('='.repeat(80) + '\n')

    // Find all M&A articles that haven't been analyzed yet
    const query = `
      SELECT
        id, external_id, title, summary, url, source,
        published_date, category, analysis
      FROM articles
      WHERE category = 'M&A'
        AND ma_analyzed = FALSE
      ORDER BY published_date DESC
    `

    const result = await db.query(query)
    const maArticles = result.rows

    console.log(`Found ${maArticles.length} M&A articles to analyze\n`)

    if (maArticles.length === 0) {
      console.log('✅ All M&A articles have been analyzed!')
      process.exit(0)
    }

    console.log(`Estimated cost: ${maArticles.length} × $0.015 = $${(maArticles.length * 0.015).toFixed(2)}`)
    console.log(`Estimated time: ~${maArticles.length * 3} seconds\n`)

    let processed = 0
    let succeeded = 0
    let failed = 0

    for (const article of maArticles) {
      processed++

      try {
        console.log(`[${processed}/${maArticles.length}] ` + '='.repeat(60))

        await processMAArticle(article)

        succeeded++

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`✗ Failed: ${error.message}\n`)
        failed++
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('M&A ANALYSIS COMPLETE')
    console.log('='.repeat(80))
    console.log(`Total articles: ${processed}`)
    console.log(`Succeeded: ${succeeded}`)
    console.log(`Failed: ${failed}`)
    console.log(`\n✅ M&A Tracker is now populated with deal details!`)
    console.log(`Visit the M&A Tracker dashboard to see the results.\n`)

    process.exit(0)

  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

analyzeMADeals()
