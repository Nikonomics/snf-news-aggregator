import pg from 'pg';
const { Client } = pg;

const renderUrl = 'postgresql://snf_news_prod_user:Uv0JLATOD97yJ8hzW7eGitLVOS1QXlkI@dpg-d3knh7adbo4c73a64e60-a.oregon-postgres.render.com/snf_news_prod';
const localUrl = 'postgresql://localhost:5432/snf_news';

async function copyFacilitiesData() {
  const renderClient = new Client({
    connectionString: renderUrl,
    ssl: { rejectUnauthorized: false }
  });
  const localClient = new Client({ connectionString: localUrl });

  try {
    await renderClient.connect();
    await localClient.connect();
    console.log('✓ Connected to both databases\n');

    // Tables related to facilities
    const tables = ['snf_facilities', 'regional_market_stats'];

    for (const tableName of tables) {
      console.log(`\n📋 Processing table: ${tableName}...`);

      // Check if table exists in Render
      const tableCheck = await renderClient.query(`
        SELECT EXISTS (
          SELECT FROM pg_tables
          WHERE schemaname = 'public' AND tablename = $1
        )
      `, [tableName]);

      if (!tableCheck.rows[0].exists) {
        console.log(`   ⏭️  Table ${tableName} doesn't exist in Render`);
        continue;
      }

      // Get row count
      const countResult = await renderClient.query(`SELECT COUNT(*) FROM "${tableName}"`);
      const count = parseInt(countResult.rows[0].count);
      console.log(`   Found ${count} rows`);

      if (count === 0) {
        console.log(`   ⏭️  Skipping ${tableName} (empty)`);
        continue;
      }

      // Truncate local table
      await localClient.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
      console.log(`   ✓ Truncated local table`);

      // Copy data
      const dataResult = await renderClient.query(`SELECT * FROM "${tableName}"`);

      if (dataResult.rows.length > 0) {
        const columns = Object.keys(dataResult.rows[0]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const columnNames = columns.map(c => `"${c}"`).join(', ');

        let inserted = 0;
        let errors = 0;
        for (const row of dataResult.rows) {
          const values = columns.map(col => row[col]);
          try {
            await localClient.query(
              `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders})`,
              values
            );
            inserted++;
            if (inserted % 500 === 0) {
              process.stdout.write(`\r   Copying: ${inserted}/${count}`);
            }
          } catch (err) {
            errors++;
            if (errors <= 3) {
              console.log(`\n   ⚠️  Error: ${err.message}`);
            }
          }
        }
        console.log(`\r   ✓ Copied ${inserted}/${count} rows (${errors} errors)`);
      }
    }

    console.log('\n✅ Facilities data copy complete!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await renderClient.end();
    await localClient.end();
  }
}

copyFacilitiesData();
