/**
 * Test script: Re-analyze 5 articles with two-pass system
 * Tests AI triage + deep analysis on production database
 */

// IMPORTANT: Load env vars FIRST before any database imports
import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'
import * as articlesDB from './database/articles.js'

// Import the analysis function from index.js
import('./index.js').then(async (indexModule) => {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('Testing Two-Pass Analysis System on 5 Articles')
    console.log('='.repeat(80) + '\n')

    // Fetch 5 articles from database (varied sample)
    const query = `
      SELECT
        id, external_id, title, summary, url, source,
        published_date as date, category, relevance_tier
      FROM articles
      ORDER BY published_date DESC
      LIMIT 5
    `

    const result = await db.query(query)
    const articles = result.rows

    console.log(`Found ${articles.length} articles to analyze\n`)

    const results = []

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]

      console.log(`\n[${ i + 1}/5] =====================================`)
      console.log(`Title: ${article.title}`)
      console.log(`Current tier: ${article.relevance_tier || 'none'}`)
      console.log(`Category: ${article.category}`)
      console.log(`Source: ${article.source}`)
      console.log(`Published: ${new Date(article.date).toLocaleDateString()}`)
      console.log('-------------------------------------------\n')

      try {
        // Run the analysis (this will do Pass 1: triage, then Pass 2: deep analysis if high/medium)
        const analysis = await indexModule.analyzeArticleWithAI(article)

        // Update the database with new analysis and tier
        const updateQuery = `
          UPDATE articles
          SET
            analysis = $1,
            relevance_tier = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING id, relevance_tier,
            analysis->>'urgencyScore' as urgency_score,
            analysis->>'articleType' as article_type
        `

        const updateResult = await db.query(updateQuery, [
          JSON.stringify(analysis),
          article.relevance_tier, // tier was set during analysis
          article.id
        ])

        const updated = updateResult.rows[0]

        results.push({
          title: article.title.substring(0, 60) + '...',
          tier: article.relevance_tier,
          urgency: updated.urgency_score || 'N/A',
          type: updated.article_type || 'N/A'
        })

        console.log(`✓ Updated successfully`)
        console.log(`  Tier: ${article.relevance_tier}`)
        console.log(`  Urgency: ${updated.urgency_score || 'N/A'}`)
        console.log(`  Type: ${updated.article_type || 'N/A'}`)

      } catch (error) {
        console.error(`✗ Error analyzing article: ${error.message}`)
        results.push({
          title: article.title.substring(0, 60) + '...',
          tier: 'ERROR',
          urgency: 'N/A',
          type: 'N/A'
        })
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(80))
    console.log('SUMMARY')
    console.log('='.repeat(80))
    console.table(results)

    const tierCounts = results.reduce((acc, r) => {
      acc[r.tier] = (acc[r.tier] || 0) + 1
      return acc
    }, {})

    console.log('\nTier Distribution:')
    console.log(tierCounts)

    console.log('\n✓ Test complete! Check results above.')
    console.log('\nNext step: If these look good, run the full 830 article re-analysis.')

    process.exit(0)

  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
})
