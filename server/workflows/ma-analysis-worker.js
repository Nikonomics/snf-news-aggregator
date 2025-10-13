/**
 * M&A Analysis Background Worker
 * Automatically analyzes new M&A articles as they're classified
 *
 * This runs as a scheduled job to ensure all M&A articles
 * receive deep extraction analysis for the M&A Tracker
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from '../database/db.js'
import { processMAArticle } from '../services/analyzeMADeals.js'

/**
 * Find and analyze all unprocessed M&A articles
 * @returns {Promise<Object>} Summary of processing results
 */
export async function analyzeNewMAArticles() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('M&A Analysis Worker - Checking for new articles')
    console.log('='.repeat(80) + '\n')

    // Find M&A articles that haven't been analyzed yet
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

    if (maArticles.length === 0) {
      console.log('✓ No new M&A articles to analyze\n')
      return {
        success: true,
        processed: 0,
        succeeded: 0,
        failed: 0,
        message: 'No new M&A articles found'
      }
    }

    console.log(`📊 Found ${maArticles.length} new M&A article${maArticles.length === 1 ? '' : 's'} to analyze\n`)

    let processed = 0
    let succeeded = 0
    let failed = 0
    const errors = []

    for (const article of maArticles) {
      processed++

      try {
        console.log(`[${processed}/${maArticles.length}] Analyzing: ${article.title.substring(0, 60)}...`)

        await processMAArticle(article)

        succeeded++

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`✗ Failed: ${error.message}`)
        failed++
        errors.push({
          articleId: article.id,
          title: article.title.substring(0, 60),
          error: error.message
        })
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('M&A ANALYSIS WORKER COMPLETE')
    console.log('='.repeat(80))
    console.log(`Total articles: ${processed}`)
    console.log(`Succeeded: ${succeeded}`)
    console.log(`Failed: ${failed}`)

    if (succeeded > 0) {
      console.log(`\n✅ ${succeeded} M&A article${succeeded === 1 ? '' : 's'} analyzed successfully!`)
    }

    if (failed > 0) {
      console.log(`\n⚠️  ${failed} article${failed === 1 ? '' : 's'} failed:`)
      errors.forEach(err => {
        console.log(`   - ${err.title}: ${err.error}`)
      })
    }

    console.log()

    return {
      success: failed === 0,
      processed,
      succeeded,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Processed ${processed} article${processed === 1 ? '' : 's'}: ${succeeded} succeeded, ${failed} failed`
    }

  } catch (error) {
    console.error('Fatal error in M&A analysis worker:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Start the scheduled worker
 * Runs every hour to check for new M&A articles
 */
export function startMAAnalysisWorker() {
  console.log('\n🚀 Starting M&A Analysis Worker')
  console.log('   Schedule: Every hour')
  console.log('   Queries: category=\'M&A\' AND ma_analyzed=FALSE\n')

  // Run immediately on startup
  analyzeNewMAArticles().catch(error => {
    console.error('Error in initial M&A analysis run:', error)
  })

  // Then run every hour
  const INTERVAL = 60 * 60 * 1000 // 1 hour in milliseconds

  setInterval(() => {
    analyzeNewMAArticles().catch(error => {
      console.error('Error in scheduled M&A analysis run:', error)
    })
  }, INTERVAL)

  console.log('✅ M&A Analysis Worker started successfully\n')
}

export default {
  analyzeNewMAArticles,
  startMAAnalysisWorker
}
