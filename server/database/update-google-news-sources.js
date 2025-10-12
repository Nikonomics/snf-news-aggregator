import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import * as db from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../../.env') })

async function updateGoogleNewsSources() {
  try {
    console.log('\n🔄 Updating Google News article sources...')
    console.log('=' .repeat(60))

    // Get all articles with "Google News" source
    const result = await db.query(`
      SELECT id, title, source
      FROM articles
      WHERE source = 'Google News'
    `)

    console.log(`Found ${result.rows.length} Google News articles to update`)

    let updated = 0
    let failed = 0

    for (const article of result.rows) {
      try {
        // Extract source from title (format: "Title - Source")
        const lastDash = article.title.lastIndexOf(' - ')

        if (lastDash > 0) {
          const actualSource = article.title.substring(lastDash + 3).trim()
          const cleanTitle = article.title.substring(0, lastDash).trim()

          // Update the article
          await db.query(`
            UPDATE articles
            SET source = $1, title = $2
            WHERE id = $3
          `, [actualSource, cleanTitle, article.id])

          updated++
          if (updated % 100 === 0) {
            console.log(`  Progress: ${updated}/${result.rows.length}`)
          }
        }
      } catch (err) {
        failed++
        console.error(`  Error updating article ${article.id}:`, err.message)
      }
    }

    console.log('=' .repeat(60))
    console.log(`✅ Update complete!`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Failed: ${failed}`)
    console.log(`   Unchanged: ${result.rows.length - updated - failed}`)

    return true
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    return false
  }
}

async function main() {
  try {
    console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Missing')

    const success = await updateGoogleNewsSources()

    if (success) {
      console.log('\n✅ Migration completed successfully!')
      process.exit(0)
    } else {
      console.error('\n❌ Migration failed!')
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
