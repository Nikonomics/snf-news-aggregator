/**
 * Check one specific M&A deal to see its analysis structure
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'

async function checkOneDeal() {
  try {
    console.log('🔍 Checking one M&A deal structure...\n')

    const query = `
      SELECT
        id,
        title,
        published_date,
        analysis
      FROM articles
      WHERE category = 'M&A'
      ORDER BY published_date DESC
      LIMIT 1
    `

    const result = await db.query(query)

    if (result.rows.length === 0) {
      console.log('❌ No M&A deals found')
      process.exit(1)
    }

    const deal = result.rows[0]

    console.log('📄 Most Recent M&A Deal:')
    console.log('='.repeat(80))
    console.log(`ID: ${deal.id}`)
    console.log(`Title: ${deal.title}`)
    console.log(`Published: ${deal.published_date}`)
    console.log('\n📊 Analysis Object:')
    console.log(JSON.stringify(deal.analysis, null, 2))

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkOneDeal()
