import pg from 'pg';
const { Client } = pg;

const renderUrl = 'postgresql://snf_news_prod_user:Uv0JLATOD97yJ8hzW7eGitLVOS1QXlkI@dpg-d3knh7adbo4c73a64e60-a.oregon-postgres.render.com/snf_news_prod';
const localUrl = 'postgresql://localhost:5432/snf_news';

async function checkAndCopy() {
  const renderClient = new Client({
    connectionString: renderUrl,
    ssl: { rejectUnauthorized: false }
  });
  const localClient = new Client({ connectionString: localUrl });

  try {
    await renderClient.connect();
    await localClient.connect();
    console.log('✓ Connected to both databases\n');

    // Check if table exists in Render
    const tableCheck = await renderClient.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'state_market_metrics'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ state_market_metrics table does not exist in Render database');
      return;
    }

    // Get row count
    const countResult = await renderClient.query('SELECT COUNT(*) FROM state_market_metrics');
    const count = parseInt(countResult.rows[0].count);
    console.log(`✓ Found ${count} rows in Render state_market_metrics table\n`);

    if (count === 0) {
      console.log('⏭️  Table is empty, nothing to copy');
      return;
    }

    // Truncate local table
    await localClient.query('TRUNCATE TABLE state_market_metrics CASCADE');
    console.log('✓ Truncated local table\n');

    // Copy data
    const dataResult = await renderClient.query('SELECT * FROM state_market_metrics');

    if (dataResult.rows.length > 0) {
      const columns = Object.keys(dataResult.rows[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnNames = columns.map(c => `"${c}"`).join(', ');

      let inserted = 0;
      for (const row of dataResult.rows) {
        const values = columns.map(col => row[col]);
        try {
          await localClient.query(
            `INSERT INTO state_market_metrics (${columnNames}) VALUES (${placeholders})`,
            values
          );
          inserted++;
        } catch (err) {
          console.log(`   ⚠️  Error inserting row: ${err.message}`);
        }
      }
      console.log(`✓ Copied ${inserted}/${count} rows from state_market_metrics\n`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await renderClient.end();
    await localClient.end();
  }
}

checkAndCopy();
