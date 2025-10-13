/**
 * Backfill M&A articles from 2025
 * Adds M&A-specific Google News RSS feeds and fetches articles
 */

import dotenv from 'dotenv'
dotenv.config()

import Parser from 'rss-parser'
import * as db from './database/db.js'

const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'description']
  }
})

async function backfillMA2025() {
  console.log('🔍 Backfilling M&A Articles from 2025...\n')

  // M&A-specific Google News RSS feeds
  const maFeeds = [
    { url: 'https://news.google.com/rss/search?q=skilled+nursing+facility+merger&hl=en-US&gl=US&ceid=US:en', source: 'Google News - SNF Merger' },
    { url: 'https://news.google.com/rss/search?q=skilled+nursing+facility+acquisition&hl=en-US&gl=US&ceid=US:en', source: 'Google News - SNF Acquisition' },
    { url: 'https://news.google.com/rss/search?q=nursing+home+merger&hl=en-US&gl=US&ceid=US:en', source: 'Google News - NH Merger' },
    { url: 'https://news.google.com/rss/search?q=nursing+home+acquisition&hl=en-US&gl=US&ceid=US:en', source: 'Google News - NH Acquisition' },
    { url: 'https://news.google.com/rss/search?q=post-acute+care+merger&hl=en-US&gl=US&ceid=US:en', source: 'Google News - PAC Merger' },
    { url: 'https://news.google.com/rss/search?q=senior+living+merger&hl=en-US&gl=US&ceid=US:en', source: 'Google News - Senior Living Merger' },
    { url: 'https://news.google.com/rss/search?q=long-term+care+M%26A&hl=en-US&gl=US&ceid=US:en', source: 'Google News - LTC M&A' },
    { url: 'https://news.google.com/rss/search?q=skilled+nursing+M%26A&hl=en-US&gl=US&ceid=US:en', source: 'Google News - SNF M&A' },
  ]

  console.log(`Fetching from ${maFeeds.length} M&A-specific feeds...\n`)

  let totalCollected = 0
  let newArticles = 0
  let duplicates = 0

  try {
    for (const feed of maFeeds) {
      console.log(`\n📰 Fetching: ${feed.source}`)

      try {
        const rssFeed = await parser.parseURL(feed.url)
        console.log(`  Found ${rssFeed.items.length} articles`)

        for (const item of rssFeed.items) {
          // Check if article already exists
          const existingArticle = await db.query(
            'SELECT id FROM articles WHERE external_id = $1',
            [item.guid || item.link]
          )

          if (existingArticle.rows.length > 0) {
            duplicates++
            continue
          }

          // Insert new article (category and impact will be set during classification)
          await db.query(
            `INSERT INTO articles (
              external_id, title, url, summary, source, category, impact, published_date, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              item.guid || item.link,
              item.title,
              item.link,
              item.contentSnippet || item.description || '',
              feed.source,
              'Unclassified', // Will be classified in next step
              'medium', // Default impact level
              item.pubDate ? new Date(item.pubDate) : new Date()
            ]
          )

          newArticles++
          totalCollected++
        }
      } catch (error) {
        console.error(`  ❌ Error fetching ${feed.source}:`, error.message)
      }
    }

    console.log('\n✅ Backfill Complete!')
    console.log(`Total articles processed: ${totalCollected}`)
    console.log(`New articles added: ${newArticles}`)
    console.log(`Duplicates skipped: ${duplicates}`)

    console.log('\n📊 Next Steps:')
    console.log('1. Run general classification: node server/classify-all-unclassified.js')
    console.log('2. Run M&A analysis: node server/analyze-ma-deals.js')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error during backfill:', error)
    process.exit(1)
  }
}

backfillMA2025()
