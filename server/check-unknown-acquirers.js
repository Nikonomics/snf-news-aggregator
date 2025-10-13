/**
 * Check M&A articles with "Unknown" acquirers
 * Print article titles and summaries to see if acquirer info is present
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'

async function checkUnknownAcquirers() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('Checking M&A Articles with Unknown Acquirers')
    console.log('='.repeat(80) + '\n')

    // Get articles where acquirer is "Unknown"
    const query = `
      SELECT
        id,
        title,
        summary,
        url,
        analysis->'maDetails'->>'acquirer' as acquirer,
        analysis->'maDetails'->>'target' as target
      FROM articles
      WHERE category = 'M&A'
        AND (
          analysis->'maDetails'->>'acquirer' = 'Unknown'
          OR analysis->'maDetails'->>'acquirer' IS NULL
        )
      ORDER BY published_date DESC
      LIMIT 5
    `

    const result = await db.query(query)
    const articles = result.rows

    if (articles.length === 0) {
      console.log('✅ No articles with unknown acquirers found!')
      process.exit(0)
    }

    console.log(`Found ${articles.length} articles with unknown acquirers:\n`)

    articles.forEach((article, idx) => {
      console.log(`\n${'─'.repeat(80)}`)
      console.log(`Article ${idx + 1}`)
      console.log(`${'─'.repeat(80)}`)
      console.log(`ID: ${article.id}`)
      console.log(`Title: ${article.title}`)
      console.log(`\nSummary:`)
      console.log(article.summary)
      console.log(`\nExtracted Data:`)
      console.log(`  Acquirer: ${article.acquirer || 'NULL'}`)
      console.log(`  Target: ${article.target || 'NULL'}`)
      console.log(`\nURL: ${article.url}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log('Analysis Complete')
    console.log('='.repeat(80))
    console.log('\nCheck if acquirer names are present in the titles/summaries above.')
    console.log('If yes, the AI extraction needs improvement.\n')

    process.exit(0)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

checkUnknownAcquirers()
