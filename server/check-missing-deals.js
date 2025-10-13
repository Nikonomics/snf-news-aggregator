/**
 * Check why Global REIT and Omega deals aren't showing in UI
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'

async function checkMissingDeals() {
  try {
    console.log('🔍 Checking for Global REIT and Omega deals...\n')

    // Check for these deals
    const query = `
      SELECT
        id,
        title,
        published_date,
        category,
        analysis->'maDetails'->>'acquirer' as acquirer,
        analysis->'maDetails'->>'target' as target,
        analysis->'maDetails'->>'dealValue' as deal_value,
        analysis->'maDetails'->>'facilityCount' as facilities,
        analysis->'maDetails'->>'totalBeds' as total_beds
      FROM articles
      WHERE category = 'M&A'
        AND (
          title ILIKE '%Global REIT%'
          OR title ILIKE '%Omega%'
          OR title ILIKE '%Healthcare Investors%'
          OR analysis->'maDetails'->>'acquirer' ILIKE '%Global REIT%'
          OR analysis->'maDetails'->>'acquirer' ILIKE '%Omega%'
        )
      ORDER BY published_date DESC
    `

    const result = await db.query(query)

    console.log(`Found ${result.rows.length} matching M&A deals:\n`)
    console.log('='.repeat(80))

    result.rows.forEach((deal, i) => {
      console.log(`\n${i+1}. [ID: ${deal.id}] ${deal.title.substring(0, 60)}...`)
      console.log(`   Published: ${deal.published_date}`)
      console.log(`   Acquirer: ${deal.acquirer || 'NULL'}`)
      console.log(`   Target: ${deal.target || 'NULL'}`)
      console.log(`   Deal Value: ${deal.deal_value || 'NULL'}`)
      console.log(`   Facilities: ${deal.facilities || 'NULL'}`)
      console.log(`   Total Beds: ${deal.total_beds || 'NULL'}`)
    })

    console.log('\n' + '='.repeat(80))

    // Now check what the dashboard endpoint would return
    console.log('\n📊 Testing dashboard query logic...\n')

    const dashboardQuery = `
      SELECT
        id, title, published_date,
        analysis->'maDetails' as ma_details
      FROM articles
      WHERE category = 'M&A'
        AND analysis->'maDetails' IS NOT NULL
        AND analysis->'maDetails'->>'acquirer' != 'Unknown'
        AND analysis->'maDetails'->>'acquirer' IS NOT NULL
      ORDER BY published_date DESC
      LIMIT 50
    `

    const dashboardResult = await db.query(dashboardQuery)

    const globalREITInDashboard = dashboardResult.rows.find(r =>
      r.title.includes('Global REIT') ||
      r.ma_details?.acquirer?.includes('Global REIT')
    )

    const omegaInDashboard = dashboardResult.rows.find(r =>
      r.title.includes('Omega') ||
      r.ma_details?.acquirer?.includes('Omega')
    )

    console.log(`Global REIT in dashboard results: ${globalREITInDashboard ? 'YES ✓' : 'NO ✗'}`)
    console.log(`Omega in dashboard results: ${omegaInDashboard ? 'YES ✓' : 'NO ✗'}`)

    if (globalREITInDashboard) {
      console.log(`\nGlobal REIT deal:`)
      console.log(`  Acquirer: ${globalREITInDashboard.ma_details.acquirer}`)
      console.log(`  Target: ${globalREITInDashboard.ma_details.target}`)
    }

    if (omegaInDashboard) {
      console.log(`\nOmega deal:`)
      console.log(`  Acquirer: ${omegaInDashboard.ma_details.acquirer}`)
      console.log(`  Target: ${omegaInDashboard.ma_details.target}`)
    }

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkMissingDeals()
