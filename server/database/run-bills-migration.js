import 'dotenv/config'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as db from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runBillsMigration() {
  try {
    console.log('🚀 Running bills migration...\n')

    // Read migration file
    const migrationPath = join(__dirname, 'migrations', '003_create_bills_tables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')

    // Run migration
    await db.query(migrationSQL)

    console.log('✅ Bills migration completed successfully!')
    console.log('\nCreated tables:')
    console.log('  - bills')
    console.log('  - bill_versions')
    console.log('  - bill_changes')
    console.log('  - keywords')
    console.log('  - bill_keyword_matches')
    console.log('  - bill_alerts')
    console.log('  - collection_logs')
    console.log('\nCreated views:')
    console.log('  - urgent_bills')
    console.log('  - recent_federal_bills')
    console.log('  - active_state_bills')
    console.log('\nSeeded keywords: 30+ SNF-specific terms\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runBillsMigration()
