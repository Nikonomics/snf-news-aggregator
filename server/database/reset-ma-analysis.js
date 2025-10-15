import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetMAAnalysisFlags() {
  try {
    console.log('🔄 Resetting ma_analyzed flags for M&A articles...\n');

    const result = await pool.query(`
      UPDATE articles
      SET ma_analyzed = FALSE
      WHERE category = 'M&A'
      RETURNING id, title
    `);

    console.log(`✅ Reset ${result.rowCount} M&A articles for re-analysis\n`);
    console.log('📊 Render\'s hourly worker will automatically process these articles in the background.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting flags:', error);
    process.exit(1);
  }
}

resetMAAnalysisFlags();
