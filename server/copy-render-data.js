import pg from 'pg';
const { Client } = pg;

const renderUrl = 'postgresql://snf_news_prod_user:Uv0JLATOD97yJ8hzW7eGitLVOS1QXlkI@dpg-d3knh7adbo4c73a64e60-a.oregon-postgres.render.com/snf_news_prod';
const localUrl = 'postgresql://localhost:5432/snf_news';

async function copyData() {
  const renderClient = new Client({
    connectionString: renderUrl,
    ssl: { rejectUnauthorized: false }
  });
  const localClient = new Client({ connectionString: localUrl });

  try {
    console.log('🔌 Connecting to Render database...');
    await renderClient.connect();
    console.log('✓ Connected to Render');

    console.log('🔌 Connecting to local database...');
    await localClient.connect();
    console.log('✓ Connected to local database');

    // Get list of tables
    const tablesResult = await renderClient.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`\n📊 Found ${tablesResult.rows.length} tables to copy\n`);

    for (const { tablename } of tablesResult.rows) {
      console.log(`📋 Copying table: ${tablename}...`);

      // Get row count
      const countResult = await renderClient.query(`SELECT COUNT(*) FROM "${tablename}"`);
      const count = parseInt(countResult.rows[0].count);

      if (count === 0) {
        console.log(`   ⏭️  Skipping ${tablename} (empty)`);
        continue;
      }

      // Truncate local table
      await localClient.query(`TRUNCATE TABLE "${tablename}" CASCADE`);

      // Copy data
      const dataResult = await renderClient.query(`SELECT * FROM "${tablename}"`);

      if (dataResult.rows.length > 0) {
        const columns = Object.keys(dataResult.rows[0]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const columnNames = columns.map(c => `"${c}"`).join(', ');

        let inserted = 0;
        for (const row of dataResult.rows) {
          const values = columns.map(col => row[col]);
          try {
            await localClient.query(
              `INSERT INTO "${tablename}" (${columnNames}) VALUES (${placeholders})`,
              values
            );
            inserted++;
          } catch (err) {
            console.log(`   ⚠️  Error inserting row: ${err.message}`);
          }
        }
        console.log(`   ✓ Copied ${inserted}/${count} rows from ${tablename}`);
      }
    }

    console.log('\n✅ Data copy complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await renderClient.end();
    await localClient.end();
  }
}

copyData();
