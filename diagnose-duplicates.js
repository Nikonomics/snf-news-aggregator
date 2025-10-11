import dotenv from 'dotenv'
import * as db from './server/database/db.js'

dotenv.config()

async function diagnoseDuplicates() {
  console.log('🔍 Diagnosing duplicate detection issues...\n')

  // Get all articles, group by title (normalized)
  const result = await db.query(`
    SELECT
      LOWER(TRIM(title)) as normalized_title,
      COUNT(*) as count,
      STRING_AGG(DISTINCT url, ' | ') as urls
    FROM articles
    GROUP BY LOWER(TRIM(title))
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 20
  `)

  console.log(`Found ${result.rows.length} titles with multiple articles:\n`)

  for (const row of result.rows) {
    console.log(`📰 "${row.normalized_title.substring(0, 80)}..."`)
    console.log(`   Count: ${row.count}`)
    console.log(`   URLs: ${row.urls.substring(0, 150)}...\n`)
  }

  // Check content_hash distribution
  const hashResult = await db.query(`
    SELECT
      content_hash,
      COUNT(*) as count
    FROM articles
    WHERE content_hash IS NOT NULL
    GROUP BY content_hash
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 10
  `)

  console.log(`\n📊 Content hashes with duplicates: ${hashResult.rows.length}`)
  for (const row of hashResult.rows) {
    console.log(`   Hash ${row.content_hash.substring(0, 12)}...: ${row.count} articles`)
  }

  // Total stats
  const stats = await db.query(`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT content_hash) as unique_hashes,
      COUNT(*) - COUNT(DISTINCT content_hash) as hash_duplicates
    FROM articles
    WHERE content_hash IS NOT NULL
  `)

  console.log(`\n📈 Overall Stats:`)
  console.log(`   Total articles: ${stats.rows[0].total}`)
  console.log(`   Unique content hashes: ${stats.rows[0].unique_hashes}`)
  console.log(`   Duplicate hashes: ${stats.rows[0].hash_duplicates}`)

  process.exit(0)
}

diagnoseDuplicates()
