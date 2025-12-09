import pg from 'pg';
const { Client } = pg;

const renderUrl = 'postgresql://snf_news_prod_user:Uv0JLATOD97yJ8hzW7eGitLVOS1QXlkI@dpg-d3knh7adbo4c73a64e60-a.oregon-postgres.render.com/snf_news_prod';

async function inspectSchema() {
  const client = new Client({
    connectionString: renderUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to Render database\n');

    // Get articles columns
    console.log('=== ARTICLES TABLE COLUMNS ===');
    const articlesColumns = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'articles'
      ORDER BY ordinal_position
    `);
    articlesColumns.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Get bills columns
    console.log('\n=== BILLS TABLE COLUMNS ===');
    const billsColumns = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'bills'
      ORDER BY ordinal_position
    `);
    billsColumns.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Get state_demographics columns
    console.log('\n=== STATE_DEMOGRAPHICS TABLE COLUMNS ===');
    const stateColumns = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'state_demographics'
      ORDER BY ordinal_position
    `);
    stateColumns.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

inspectSchema();
