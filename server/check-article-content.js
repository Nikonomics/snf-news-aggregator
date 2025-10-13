/**
 * Check if article content is stored in database
 */

import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'

async function checkArticleContent() {
  try {
    const query = `
      SELECT id, title, summary, url, content
      FROM articles
      WHERE id = 217
    `
    const result = await db.query(query)
    const article = result.rows[0]

    console.log('Title:', article.title)
    console.log('\nSummary:', article.summary)
    console.log('\nContent field exists:', !!article.content)
    console.log('Content length:', article.content?.length || 0)

    if (article.content) {
      console.log('\nFirst 2000 chars of content:')
      console.log(article.content.substring(0, 2000))
    } else {
      console.log('\n❌ No content stored in database!')
      console.log('This means we need to fetch article content from URLs.')
    }

    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

checkArticleContent()
