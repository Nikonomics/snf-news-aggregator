import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'

async function listAcquirers() {
  try {
    const query = `
      SELECT
        id,
        title,
        analysis->'maDetails'->>'acquirer' as acquirer,
        analysis->'maDetails'->>'target' as target,
        analysis->'maDetails'->>'dealValue' as deal_value,
        analysis->'maDetails'->>'facilityCount' as facility_count
      FROM articles
      WHERE category = 'M&A'
        AND analysis->'maDetails'->>'acquirer' != 'Unknown'
        AND analysis->'maDetails'->>'acquirer' IS NOT NULL
      ORDER BY published_date DESC
    `

    const result = await db.query(query)

    console.log(`\nM&A Tracker - ${result.rows.length} Deals with Known Acquirers:\n`)
    console.log('='.repeat(80))

    result.rows.forEach((deal, i) => {
      console.log(`${i+1}. ${deal.acquirer} → ${deal.target}`)
      console.log(`   Deal Value: ${deal.deal_value}`)
      console.log(`   Facilities: ${deal.facility_count || 'N/A'}`)
      console.log(`   Title: ${deal.title.substring(0, 70)}...`)
      console.log('')
    })

    console.log('='.repeat(80))
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

listAcquirers()
