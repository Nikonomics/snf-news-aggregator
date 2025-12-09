import pg from 'pg';
const { Client } = pg;

const renderUrl = 'postgresql://snf_news_prod_user:Uv0JLATOD97yJ8hzW7eGitLVOS1QXlkI@dpg-d3knh7adbo4c73a64e60-a.oregon-postgres.render.com/snf_news_prod';
const localUrl = 'postgresql://localhost:5432/snf_news';

async function copyDeficiencies() {
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
    const countResult = await renderClient.query('SELECT COUNT(*) FROM cms_facility_deficiencies');
    const count = parseInt(countResult.rows[0].count);
    console.log(`📋 Found ${count} deficiency records to copy\n`);

    // Truncate local table
    await localClient.query('TRUNCATE TABLE cms_facility_deficiencies CASCADE');
    console.log('✓ Truncated local table\n');

    // Copy data in batches for better performance
    const batchSize = 1000;
    let offset = 0;
    let totalInserted = 0;
    let errors = 0;

    while (offset < count) {
      const dataResult = await renderClient.query(
        `SELECT * FROM cms_facility_deficiencies ORDER BY id LIMIT $1 OFFSET $2`,
        [batchSize, offset]
      );

      if (dataResult.rows.length === 0) break;

      const columns = Object.keys(dataResult.rows[0]).filter(col => col !== 'id');
      const columnNames = columns.map(c => `"${c}"`).join(', ');

      for (const row of dataResult.rows) {
        const values = columns.map(col => row[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        try {
          await localClient.query(
            `INSERT INTO cms_facility_deficiencies (${columnNames}) VALUES (${placeholders})`,
            values
          );
          totalInserted++;
          if (totalInserted % 500 === 0) {
            process.stdout.write(`\r   Copying: ${totalInserted}/${count} (${Math.round(totalInserted/count*100)}%)`);
          }
        } catch (err) {
          errors++;
          if (errors <= 3) {
            console.log(`\n   ⚠️  Error: ${err.message}`);
          }
        }
      }

      offset += batchSize;
    }

    console.log(`\r   ✓ Copied ${totalInserted}/${count} records (${errors} errors)     \n`);

    // Create the facility_deficiency_summary view
    console.log('\n📊 Creating facility_deficiency_summary view...');
    await localClient.query(`
      CREATE OR REPLACE VIEW facility_deficiency_summary AS
      SELECT
        federal_provider_number,
        COUNT(*) AS total_deficiencies,
        COUNT(DISTINCT deficiency_tag) AS unique_deficiency_types,
        COUNT(CASE WHEN scope_severity IN ('J', 'K', 'L') THEN 1 END) AS serious_deficiencies,
        COUNT(CASE WHEN is_corrected = false THEN 1 END) AS uncorrected_deficiencies,
        MAX(survey_date) AS last_survey_date,
        MIN(survey_date) AS first_survey_date
      FROM cms_facility_deficiencies
      GROUP BY federal_provider_number
    `);
    console.log('✓ View created successfully\n');

    console.log('✅ Deficiency data copy complete!');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await renderClient.end();
    await localClient.end();
  }
}

copyDeficiencies();
