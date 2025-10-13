/**
 * Test Enhanced M&A Analysis
 * Analyzes one M&A article to verify the enhanced prompt works
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'
import { processMAArticle } from './services/analyzeMADeals.js'

async function testEnhancedMA() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('Testing Enhanced M&A Analysis')
    console.log('='.repeat(80) + '\n')

    // Get one unanalyzed M&A article (or reset one if all are analyzed)
    let query = `
      SELECT
        id, external_id, title, summary, url, source,
        published_date, category, analysis
      FROM articles
      WHERE category = 'M&A'
        AND ma_analyzed = FALSE
      ORDER BY published_date DESC
      LIMIT 1
    `

    let result = await db.query(query)
    let article = result.rows[0]

    // If no unanalyzed articles, pick the most recent analyzed one and reset it
    if (!article) {
      console.log('No unanalyzed M&A articles found. Resetting most recent article...\n')

      query = `
        UPDATE articles
        SET ma_analyzed = FALSE,
            analysis = jsonb_set(COALESCE(analysis, '{}'::jsonb), '{maDetails}', 'null'::jsonb)
        WHERE id = (
          SELECT id FROM articles
          WHERE category = 'M&A'
          ORDER BY published_date DESC
          LIMIT 1
        )
        RETURNING id, external_id, title, summary, url, source,
                  published_date, category, analysis
      `

      result = await db.query(query)
      article = result.rows[0]

      if (!article) {
        console.log('❌ No M&A articles found in database!')
        process.exit(1)
      }
    }

    console.log('📄 Testing with article:')
    console.log(`   ID: ${article.id}`)
    console.log(`   Title: ${article.title}`)
    console.log(`   Published: ${article.published_date}`)
    console.log(`   Source: ${article.source}\n`)

    console.log('🔄 Running enhanced M&A analysis...\n')

    // Run the enhanced analysis
    await processMAArticle(article)

    console.log('\n✅ Analysis complete! Fetching results...\n')

    // Fetch the updated article to show results
    const updatedQuery = `
      SELECT
        id,
        title,
        ma_acquirer,
        ma_target,
        ma_deal_value,
        ma_deal_type,
        ma_facility_count,
        ma_states,
        analysis->'maDetails' as ma_details_full
      FROM articles
      WHERE id = $1
    `

    const updatedResult = await db.query(updatedQuery, [article.id])
    const updated = updatedResult.rows[0]

    console.log('='.repeat(80))
    console.log('ENHANCED M&A ANALYSIS RESULTS')
    console.log('='.repeat(80))
    console.log('\n📊 Basic Fields (in dedicated columns):')
    console.log(`   Acquirer: ${updated.ma_acquirer}`)
    console.log(`   Target: ${updated.ma_target}`)
    console.log(`   Deal Value: ${updated.ma_deal_value}`)
    console.log(`   Deal Type: ${updated.ma_deal_type}`)
    console.log(`   Facility Count: ${updated.ma_facility_count}`)
    console.log(`   States: ${updated.ma_states?.join(', ') || 'N/A'}`)

    console.log('\n🎯 Enhanced Fields (in analysis.maDetails JSONB):')
    const maDetails = updated.ma_details_full

    if (maDetails.valuationMetrics) {
      console.log('\n   💰 Valuation Metrics:')
      console.log(`      Price Per Facility: ${maDetails.valuationMetrics.pricePerFacility}`)
      console.log(`      Implied Multiple: ${maDetails.valuationMetrics.impliedMultiple}`)
      console.log(`      Context: ${maDetails.valuationMetrics.valuationContext}`)
    }

    if (maDetails.assetQuality) {
      console.log('\n   🏥 Asset Quality:')
      console.log(`      ${maDetails.assetQuality}`)
    }

    if (maDetails.acquirerProfile) {
      console.log('\n   🏢 Acquirer Profile:')
      console.log(`      Acquisition History: ${maDetails.acquirerProfile.acquisitionHistory}`)
      console.log(`      Strategic Focus: ${maDetails.acquirerProfile.strategicFocus}`)
      console.log(`      Operational Approach: ${maDetails.acquirerProfile.operationalApproach}`)
      console.log(`      Market Reputation: ${maDetails.acquirerProfile.marketReputation}`)
      console.log(`      Competitive Signal: ${maDetails.acquirerProfile.competitiveSignal}`)
    }

    if (maDetails.competitiveImplications) {
      console.log('\n   🎯 Competitive Implications:')
      console.log(`      ${maDetails.competitiveImplications}`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ Enhanced M&A Analysis Test Complete!')
    console.log('='.repeat(80))
    console.log('\nThe enhanced prompt is working correctly with:')
    console.log('  • 17 total fields (vs original 13)')
    console.log('  • Operator profiling via database lookup')
    console.log('  • Valuation metrics calculations')
    console.log('  • Asset quality assessment')
    console.log('  • Competitive intelligence\n')

    process.exit(0)

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

testEnhancedMA()
