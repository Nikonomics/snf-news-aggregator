/**
 * Check if organizations are being tagged in articles
 */
import dotenv from 'dotenv'
dotenv.config()
import * as db from './database/db.js'

async function checkOrgTags() {
  try {
    // Get a few sample articles with organization tags
    const result = await db.query(`
      SELECT
        id,
        title,
        category,
        analysis->'entities'->'organizations' as organizations
      FROM articles
      WHERE analysis->'entities'->'organizations' IS NOT NULL
      ORDER BY published_date DESC
      LIMIT 5
    `)

    console.log('\n📊 Sample Articles with Organization Tags:\n')

    if (result.rows.length === 0) {
      console.log('❌ No articles found with organization tags!')
      console.log('This means the prompt is NOT currently extracting organizations.\n')
    } else {
      result.rows.forEach((article, i) => {
        console.log(`${i + 1}. [ID: ${article.id}] ${article.title}`)
        console.log(`   Category: ${article.category}`)
        console.log(`   Organizations: ${JSON.stringify(article.organizations, null, 2)}`)
        console.log()
      })
    }

    // Count how many articles have org tags
    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM articles
      WHERE analysis->'entities'->'organizations' IS NOT NULL
    `)

    const totalCount = await db.query('SELECT COUNT(*) as total FROM articles')

    console.log(`\n📈 Statistics:`)
    console.log(`   Articles with org tags: ${countResult.rows[0].total}`)
    console.log(`   Total articles: ${totalCount.rows[0].total}`)
    console.log(`   Percentage tagged: ${((countResult.rows[0].total / totalCount.rows[0].total) * 100).toFixed(1)}%\n`)

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkOrgTags()
