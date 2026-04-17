/**
 * M&A Analysis Background Worker
 * Automatically analyzes new M&A articles as they're classified
 *
 * This runs as a scheduled job to ensure all M&A articles
 * receive deep extraction analysis for the M&A Tracker
 */

import dotenv from 'dotenv'
dotenv.config()

import { pool } from '../database/db.js'
import * as db from '../database/db.js'
import { processMAArticle } from '../services/analyzeMADeals.js'

const LOCK_ID = 829471
const MAX_ATTEMPTS = 3

/**
 * Find and analyze all unprocessed M&A articles
 * @returns {Promise<Object>} Summary of processing results
 */
export async function analyzeNewMAArticles() {
  const client = await pool.connect()

  try {
    const lockResult = await client.query('SELECT pg_try_advisory_lock($1) as acquired', [LOCK_ID])
    if (!lockResult.rows[0].acquired) {
      console.log('⏭️ M&A worker: another instance holds the lock, skipping')
      return { skipped: true }
    }

    try {
      const unprocessed = await db.query(`
        SELECT id, title, url, summary, source, analysis, ma_analysis_attempts
        FROM articles
        WHERE category = 'M&A'
          AND ma_analyzed = FALSE
          AND (ma_analysis_attempts IS NULL OR ma_analysis_attempts < $1)
        ORDER BY published_date DESC
      `, [MAX_ATTEMPTS])

      console.log(`Found ${unprocessed.rows.length} unprocessed M&A articles`)

      let processed = 0
      let failed = 0

      for (const article of unprocessed.rows) {
        try {
          await db.query(
            'UPDATE articles SET ma_analysis_attempts = COALESCE(ma_analysis_attempts, 0) + 1 WHERE id = $1',
            [article.id]
          )

          await processMAArticle(article)
          processed++
          console.log(`✅ Processed: ${article.title.substring(0, 60)}...`)

          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          failed++
          console.error(`❌ Failed (attempt ${(article.ma_analysis_attempts || 0) + 1}/${MAX_ATTEMPTS}): ${article.title.substring(0, 60)}... — ${error.message}`)
        }
      }

      return { processed, failed, total: unprocessed.rows.length }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID])
    }
  } finally {
    client.release()
  }
}

/**
 * Start the scheduled worker
 * Runs every hour to check for new M&A articles
 */
export function startMAAnalysisWorker() {
  console.log('🚀 Starting M&A Analysis Worker (advisory lock, max 3 attempts)')

  analyzeNewMAArticles().catch(err => console.error('Initial M&A run error:', err))

  setInterval(() => {
    analyzeNewMAArticles().catch(err => console.error('Scheduled M&A run error:', err))
  }, 60 * 60 * 1000)
}

export default { analyzeNewMAArticles, startMAAnalysisWorker }
