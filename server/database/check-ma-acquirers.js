import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkMAacquirers() {
  try {
    const result = await pool.query(`
      SELECT
        analysis->'maDetails'->>'acquirer' as acquirer,
        COUNT(*) as deal_count
      FROM articles
      WHERE category = 'M&A'
        AND analysis->'maDetails' IS NOT NULL
        AND analysis->'maDetails'->>'acquirer' IS NOT NULL
        AND analysis->'maDetails'->>'acquirer' != 'Unknown'
        AND analysis->'maDetails'->>'acquirer' != 'N/A'
      GROUP BY analysis->'maDetails'->>'acquirer'
      ORDER BY deal_count DESC
      LIMIT 15
    `);

    console.log('\n📊 Top Acquirers in M&A Articles:');
    console.log('─────────────────────────────────────────────────────────');

    if (result.rows.length === 0) {
      console.log('⚠️  No acquirers found with valid data');
    } else {
      result.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.acquirer} - ${row.deal_count} deals`);
      });
    }

    console.log('─────────────────────────────────────────────────────────\n');

    // Also check for articles with Unknown/N/A acquirers
    const unknownResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM articles
      WHERE category = 'M&A'
        AND analysis->'maDetails' IS NOT NULL
        AND (
          analysis->'maDetails'->>'acquirer' = 'Unknown'
          OR analysis->'maDetails'->>'acquirer' = 'N/A'
          OR analysis->'maDetails'->>'acquirer' IS NULL
        )
    `);

    console.log(`ℹ️  Articles with Unknown/N/A acquirers: ${unknownResult.rows[0].count}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMAacquirers();
