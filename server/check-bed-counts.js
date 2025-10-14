/**
 * Check how many M&A deals now have bed count data
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'

async function checkBedCounts() {
  try {
    console.log('🔍 Checking M&A bed count data...\n')

    // Count total M&A deals and deals with bed counts
    const query = `
      SELECT
        COUNT(*) as total_ma_deals,
        COUNT(CASE
          WHEN analysis->'maDetails'->>'totalBeds' IS NOT NULL
          AND analysis->'maDetails'->>'totalBeds' != 'null'
          AND CAST(analysis->'maDetails'->>'totalBeds' AS INTEGER) > 0
          THEN 1
        END) as deals_with_beds,
        SUM(CASE
          WHEN analysis->'maDetails'->>'totalBeds' IS NOT NULL
          AND analysis->'maDetails'->>'totalBeds' != 'null'
          AND CAST(analysis->'maDetails'->>'totalBeds' AS INTEGER) > 0
          THEN CAST(analysis->'maDetails'->>'totalBeds' AS INTEGER)
          ELSE 0
        END) as total_beds
      FROM articles
      WHERE category = 'M&A'
    `

    const result = await db.query(query)
    const stats = result.rows[0]

    console.log('📊 M&A Bed Count Statistics:')
    console.log('='.repeat(50))
    console.log(`Total M&A deals: ${stats.total_ma_deals}`)
    console.log(`Deals with bed counts: ${stats.deals_with_beds}`)
    console.log(`Deals without bed counts: ${stats.total_ma_deals - stats.deals_with_beds}`)
    console.log(`Total beds tracked: ${stats.total_beds?.toLocaleString() || 0}`)
    console.log('='.repeat(50))

    // Show sample of deals with bed counts
    const sampleQuery = `
      SELECT
        title,
        published_date,
        analysis->'maDetails'->>'acquirer' as acquirer,
        analysis->'maDetails'->>'totalBeds' as total_beds
      FROM articles
      WHERE category = 'M&A'
        AND analysis->'maDetails'->>'totalBeds' IS NOT NULL
        AND analysis->'maDetails'->>'totalBeds' != 'null'
        AND CAST(analysis->'maDetails'->>'totalBeds' AS INTEGER) > 0
      ORDER BY published_date DESC
      LIMIT 10
    `

    const sampleResult = await db.query(sampleQuery)

    console.log('\n✅ Sample of deals with bed counts (top 10 most recent):')
    console.log('='.repeat(50))
    sampleResult.rows.forEach((deal, i) => {
      console.log(`${i+1}. ${deal.acquirer || 'Unknown'}: ${deal.total_beds} beds`)
      console.log(`   ${deal.title.substring(0, 60)}...`)
      console.log(`   Published: ${deal.published_date.toISOString().split('T')[0]}`)
      console.log()
    })

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkBedCounts()
