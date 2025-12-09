import pg from 'pg';
const { Client } = pg;

const renderUrl = 'postgresql://snf_news_prod_user:Uv0JLATOD97yJ8hzW7eGitLVOS1QXlkI@dpg-d3knh7adbo4c73a64e60-a.oregon-postgres.render.com/snf_news_prod';
const localUrl = 'postgresql://localhost:5432/snf_news';

async function copyCountyData() {
  const renderClient = new Client({
    connectionString: renderUrl,
    ssl: { rejectUnauthorized: false }
  });
  const localClient = new Client({ connectionString: localUrl });

  try {
    await renderClient.connect();
    await localClient.connect();
    console.log('✓ Connected to both databases\n');

    // Get row count
    const countResult = await renderClient.query('SELECT COUNT(*) FROM county_demographics');
    const count = parseInt(countResult.rows[0].count);
    console.log(`📋 Found ${count} county records to copy\n`);

    // Truncate local table
    await localClient.query('TRUNCATE TABLE county_demographics CASCADE');
    console.log('✓ Truncated local table\n');

    // Copy data
    const dataResult = await renderClient.query('SELECT * FROM county_demographics ORDER BY state_code, county_name');

    const columns = Object.keys(dataResult.rows[0]).filter(col => col !== 'id');
    const columnNames = columns.map(c => `"${c}"`).join(', ');

    let inserted = 0;
    let errors = 0;

    for (const row of dataResult.rows) {
      const values = columns.map(col => row[col]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

      try {
        await localClient.query(
          `INSERT INTO county_demographics (${columnNames}) VALUES (${placeholders})`,
          values
        );
        inserted++;
        if (inserted % 500 === 0) {
          process.stdout.write(`\r   Copying: ${inserted}/${count} (${Math.round(inserted/count*100)}%)`);
        }
      } catch (err) {
        errors++;
        if (errors <= 3) {
          console.log(`\n   ⚠️  Error: ${err.message}`);
        }
      }
    }

    console.log(`\r   ✓ Copied ${inserted}/${count} records (${errors} errors)     \n`);
    console.log('✅ County data copy complete!');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await renderClient.end();
    await localClient.end();
  }
}

copyCountyData();
