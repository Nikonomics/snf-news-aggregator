import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import * as db from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') })

async function runMigration(filename) {
  try {
    console.log(`\n🔄 Running migration: ${filename}`)
    console.log('=' .repeat(60))

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', filename)
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Execute migration
    await db.query(migrationSQL)

    console.log(`✅ Migration completed successfully!`)
    console.log('=' .repeat(60))

    return true
  } catch (error) {
    console.error(`❌ Migration failed:`, error.message)
    console.error(error)
    return false
  }
}

async function main() {
  try {
    // Test database connection first
    console.log('Testing database connection...')
    console.log(`Database URL: ${process.env.DATABASE_URL ? 'Found' : 'Missing'}`)

    const connected = await db.testConnection()

    if (!connected) {
      console.error('\n❌ Cannot connect to database.')
      console.error('This might be a network/SSL issue with Render database.')
      console.error('Proceeding anyway - migration will fail if connection is truly broken.\n')
      // Don't exit, try migration anyway
    }

    // Run migrations in order
    const migrations = [
      '001_add_deduplication_fields.sql',
      '002_create_state_summaries.sql'
    ]

    let allSucceeded = true
    for (const migration of migrations) {
      const success = await runMigration(migration)
      if (!success) {
        allSucceeded = false
        break
      }
    }

    if (allSucceeded) {
      console.log('\n✅ All migrations completed successfully!')
      process.exit(0)
    } else {
      console.error('\n❌ One or more migrations failed!')
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
