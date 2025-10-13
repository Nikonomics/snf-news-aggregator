// Quick migration script to add relevance_tier column
import dotenv from 'dotenv'
dotenv.config()

import * as db from './database/db.js'

async function addColumn() {
  try {
    console.log('Adding relevance_tier column to articles table...')

    await db.query(`
      ALTER TABLE articles
      ADD COLUMN IF NOT EXISTS relevance_tier VARCHAR(10) DEFAULT 'medium'
    `)

    console.log('✓ Column added successfully!')

    // Verify
    const result = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'articles' AND column_name = 'relevance_tier'
    `)

    console.log('Column info:', result.rows[0])

    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

addColumn()
