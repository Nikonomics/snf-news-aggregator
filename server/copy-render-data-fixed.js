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

    // Define table order to handle dependencies
    const tableOrder = [
      'tags',
      'articles',
      'article_tags',
      'conferences',
      'bills',
      'bill_categories',
      'bill_summaries',
      'bill_tags',
      'bill_states',
      'bill_sponsors',
      'bill_summaries_backup',
      'state_summaries',
      'state_demographics',
      'state_facilities',
      'state_facilities_details',
      'county_demographics',
      'cms_regions',
      'cms_care_compare',
      'cms_deficiencies'
    ];

    console.log(`\n📊 Copying ${tableOrder.length} tables in dependency order\n`);

    for (const tablename of tableOrder) {
      try {
        console.log(`📋 Copying table: ${tablename}...`);

        // Check if table exists
        const tableCheck = await renderClient.query(`
          SELECT EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = 'public' AND tablename = $1
          )
        `, [tablename]);

        if (!tableCheck.rows[0].exists) {
          console.log(`   ⏭️  Table ${tablename} doesn't exist in Render, skipping`);
          continue;
        }

        // Get row count
        const countResult = await renderClient.query(`SELECT COUNT(*) FROM "${tablename}"`);
        const count = parseInt(countResult.rows[0].count);

        if (count === 0) {
          console.log(`   ⏭️  Skipping ${tablename} (empty)`);
          continue;
        }

        // Truncate local table
        await localClient.query(`TRUNCATE TABLE "${tablename}" CASCADE`);

        // Copy data in batches
        const batchSize = 1000;
        const dataResult = await renderClient.query(`SELECT * FROM "${tablename}"`);

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
                `INSERT INTO "${tablename}" (${columnNames}) VALUES (${placeholders})`,
                values
              );
              inserted++;
              if (inserted % 100 === 0) {
                process.stdout.write(`\r   Copying: ${inserted}/${count}`);
              }
            } catch (err) {
              errors++;
              if (errors <= 3) {
                console.log(`\n   ⚠️  Error inserting row: ${err.message}`);
              }
            }
          }
          console.log(`\r   ✓ Copied ${inserted}/${count} rows from ${tablename} (${errors} errors)`);
        }
      } catch (tableError) {
        console.log(`   ❌ Error with table ${tablename}: ${tableError.message}`);
      }
    }

    console.log('\n✅ Data copy complete!');
    console.log('\n📊 Final counts:');
    const articleCount = await localClient.query('SELECT COUNT(*) FROM articles');
    const conferenceCount = await localClient.query('SELECT COUNT(*) FROM conferences');
    console.log(`   Articles: ${articleCount.rows[0].count}`);
    console.log(`   Conferences: ${conferenceCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await renderClient.end();
    await localClient.end();
  }
}

copyData();
