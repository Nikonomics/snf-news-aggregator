import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import * as db from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../../.env') })

// Normalize title for comparison
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}

async function cleanupDuplicates() {
  try {
    console.log('\n🔍 Finding duplicate articles...')
    console.log('=' .repeat(60))

    // Find articles with the same normalized title
    const result = await db.query(`
      SELECT
        id,
        title,
        published_date,
        source,
        url,
        LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9\\s]', '', 'g')) as normalized_title
      FROM articles
      ORDER BY normalized_title, published_date ASC
    `)

    console.log(`Analyzing ${result.rows.length} articles...`)

    // Group by normalized title
    const titleGroups = {}
    for (const article of result.rows) {
      const key = article.normalized_title
      if (!titleGroups[key]) {
        titleGroups[key] = []
      }
      titleGroups[key].push(article)
    }

    // Find duplicates (groups with more than 1 article)
    const duplicateGroups = Object.entries(titleGroups)
      .filter(([_, articles]) => articles.length > 1)
      .sort((a, b) => b[1].length - a[1].length) // Sort by most duplicates first

    console.log(`\nFound ${duplicateGroups.length} sets of duplicates`)
    console.log('=' .repeat(60))

    let totalDeleted = 0

    for (const [normalizedTitle, articles] of duplicateGroups) {
      console.log(`\n📄 "${articles[0].title}"`)
      console.log(`   Found ${articles.length} copies:`)

      // Keep the oldest one (first published)
      const keeper = articles[0]
      const duplicates = articles.slice(1)

      console.log(`   ✓ Keeping ID ${keeper.id} (${keeper.published_date})`)

      for (const dup of duplicates) {
        console.log(`   ✗ Deleting ID ${dup.id} (${dup.published_date})`)

        // Delete the duplicate
        await db.query('DELETE FROM articles WHERE id = $1', [dup.id])
        totalDeleted++
      }
    }

    console.log('\n' + '=' .repeat(60))
    console.log(`✅ Cleanup complete!`)
    console.log(`   Total deleted: ${totalDeleted}`)
    console.log(`   Unique articles remaining: ${result.rows.length - totalDeleted}`)

    return true
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    console.error(error)
    return false
  }
}

async function main() {
  try {
    console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Missing')

    const success = await cleanupDuplicates()

    if (success) {
      console.log('\n✅ Cleanup completed successfully!')
      process.exit(0)
    } else {
      console.error('\n❌ Cleanup failed!')
      process.exit(1)
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  } finally {
    await db.closePool()
  }
}

main()
