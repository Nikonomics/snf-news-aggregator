import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as db from './db.js'
import { generateContentHash } from './articles.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') })

async function backfillContentHashes() {
  console.log('🔄 Starting content hash backfill...')

  try {
    // Get articles with NULL content_hash
    const result = await db.query(`
      SELECT id, title, summary
      FROM articles
      WHERE content_hash IS NULL
      ORDER BY id
    `)

    const articlesWithoutHash = result.rows
    console.log(`Found ${articlesWithoutHash.length} articles without content_hash`)

    if (articlesWithoutHash.length === 0) {
      console.log('✅ All articles already have content hashes!')
      process.exit(0)
    }

    let updated = 0
    let errors = 0

    for (const article of articlesWithoutHash) {
      try {
        const hash = generateContentHash(
          article.title || '',
          article.summary || ''
        )

        await db.query(`
          UPDATE articles
          SET content_hash = $1,
              last_content_update = updated_at
          WHERE id = $2
        `, [hash, article.id])

        updated++

        if (updated % 100 === 0) {
          console.log(`📝 Updated ${updated}/${articlesWithoutHash.length} articles...`)
        }
      } catch (error) {
        console.error(`Error updating article ${article.id}:`, error.message)
        errors++
      }
    }

    console.log('\n✅ Backfill complete!')
    console.log(`   Updated: ${updated}`)
    console.log(`   Errors: ${errors}`)
    console.log(`   Total: ${articlesWithoutHash.length}`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Backfill failed:', error)
    process.exit(1)
  }
}

backfillContentHashes()
