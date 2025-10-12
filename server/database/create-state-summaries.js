import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import * as db from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') })

async function createStateSummaries() {
  try {
    console.log('\n🔄 Creating state_summaries table...')
    console.log('=' .repeat(60))

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '002_create_state_summaries.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Execute migration
    await db.query(migrationSQL)

    console.log(`✅ state_summaries table created successfully!`)
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
    console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Missing')

    const success = await createStateSummaries()

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
