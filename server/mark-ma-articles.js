/**
 * Mark articles with M&A keywords as M&A category
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'

async function markMAArticles() {
  try {
    console.log('Marking M&A articles by keyword...\n')

    const result = await db.query(`
      UPDATE articles
      SET category = 'M&A'
      WHERE category = 'Unclassified'
        AND (
          title ILIKE '%merger%' OR
          title ILIKE '%acquisition%' OR
          title ILIKE '%acquires%' OR
          title ILIKE '%merge%' OR
          title ILIKE '%M&A%' OR
          title ILIKE '%buys%' OR
          title ILIKE '%sells%'
        )
    `)

    console.log(`✅ Marked ${result.rowCount} articles as M&A`)

    // Count total M&A articles
    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM articles WHERE category = 'M&A'
    `)

    console.log(`📊 Total M&A articles: ${countResult.rows[0].total}`)

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

markMAArticles()
