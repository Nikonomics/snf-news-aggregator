import fetch from 'node-fetch';

async function testMAapi() {
  try {
    console.log('Fetching from http://localhost:3001/api/ma/dashboard...\n');

    const response = await fetch('http://localhost:3001/api/ma/dashboard');
    const data = await response.json();

    if (!data.success) {
      console.error('API returned error:', data);
      return;
    }

    console.log('📊 M&A Dashboard API Response:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Total Deals: ${data.stats.totalDeals}`);
    console.log(`Total Facilities: ${data.stats.totalFacilities}`);
    console.log(`\nTop Acquirers (${data.stats.topAcquirers.length} total):`);

    data.stats.topAcquirers.slice(0, 15).forEach((acquirer, i) => {
      console.log(`  ${i + 1}. ${acquirer.name} - ${acquirer.dealCount} deals`);
    });

    console.log('─────────────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMAapi();
