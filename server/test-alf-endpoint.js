import pg from 'pg';
const { Client } = pg;

const localUrl = 'postgresql://localhost:5432/snf_news';

async function testAlfEndpoint() {
  const client = new Client({ connectionString: localUrl });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Test Idaho ALF facilities
    const result = await client.query(`
      SELECT
        id, facility_name, city, state, latitude, longitude
      FROM alf_facilities
      WHERE state = 'ID' AND active = true
      ORDER BY facility_name
      LIMIT 5
    `);

    console.log(`Found ${result.rows.length} Idaho ALF facilities:\n`);
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.facility_name} - ${row.city}, ${row.state}`);
      console.log(`   Coordinates: ${row.latitude}, ${row.longitude}\n`);
    });

    // Get total count
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM alf_facilities
      WHERE state = 'ID' AND active = true
    `);

    console.log(`\nTotal Idaho ALF facilities: ${countResult.rows[0].total}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testAlfEndpoint();
