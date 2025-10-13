/**
 * Add dedicated M&A columns to articles table
 * These columns will be populated by the specialized M&A analysis
 */

import dotenv from 'dotenv'
dotenv.config()
import * as db from './database/db.js'

async function addMAColumns() {
  try {
    console.log('Adding M&A-specific columns to articles table...\n')

    // Add M&A-specific columns
    await db.query(`
      ALTER TABLE articles
      ADD COLUMN IF NOT EXISTS ma_analyzed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ma_acquirer VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ma_target VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ma_deal_value VARCHAR(100),
      ADD COLUMN IF NOT EXISTS ma_deal_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS ma_facility_count INTEGER,
      ADD COLUMN IF NOT EXISTS ma_states TEXT[],
      ADD COLUMN IF NOT EXISTS ma_acquirer_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS ma_seller_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS ma_strategic_rationale TEXT,
      ADD COLUMN IF NOT EXISTS ma_analyzed_at TIMESTAMP
    `)

    console.log('✓ M&A columns added successfully!')

    // Create index for faster M&A queries
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_articles_ma_analyzed
      ON articles(category, ma_analyzed)
      WHERE category = 'M&A'
    `)

    console.log('✓ Created index for M&A queries')

    // Verify columns
    const result = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'articles'
        AND column_name LIKE 'ma_%'
      ORDER BY ordinal_position
    `)

    console.log('\nM&A columns in database:')
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`)
    })

    console.log('\n✅ Database schema updated for specialized M&A analysis!')
    process.exit(0)

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

addMAColumns()
