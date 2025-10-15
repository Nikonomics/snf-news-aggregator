import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkMAStatus() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_ma,
        SUM(CASE WHEN ma_analyzed = TRUE THEN 1 ELSE 0 END) as analyzed,
        SUM(CASE WHEN ma_analyzed = FALSE THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN analysis->'maDetails' IS NOT NULL THEN 1 ELSE 0 END) as has_data
      FROM articles
      WHERE category = 'M&A'
    `);

    const stats = result.rows[0];

    console.log('\n📊 M&A Analysis Status:');
    console.log('─────────────────────────────────');
    console.log(`Total M&A articles:     ${stats.total_ma}`);
    console.log(`Analyzed (flag set):    ${stats.analyzed}`);
    console.log(`Pending analysis:       ${stats.pending}`);
    console.log(`With extracted data:    ${stats.has_data}`);
    console.log('─────────────────────────────────\n');

    if (parseInt(stats.pending) > 0) {
      console.log(`✅ Ready for worker to process ${stats.pending} articles\n`);
    } else {
      console.log('✅ All M&A articles have been analyzed\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMAStatus();
