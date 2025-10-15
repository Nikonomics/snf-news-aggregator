import fetch from 'node-fetch';

async function testLeaderboard() {
  try {
    console.log('Fetching from http://localhost:3001/api/ma/acquirer-leaderboard...\n');

    const response = await fetch('http://localhost:3001/api/ma/acquirer-leaderboard');
    const data = await response.json();

    if (!data.success) {
      console.error('API returned error:', data);
      return;
    }

    console.log('📊 Acquirer Leaderboard:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Year: ${data.year}`);
    console.log(`Total Acquirers with bed data: ${data.leaderboard.length}`);
    console.log(`\nLeaderboard (sorted by total beds):`);

    data.leaderboard.forEach((acquirer, i) => {
      console.log(`  ${i + 1}. ${acquirer.acquirer}`);
      console.log(`     Beds: ${acquirer.totalBeds}, Facilities: ${acquirer.totalFacilities}, Deals: ${acquirer.dealCount}`);
    });

    console.log('─────────────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLeaderboard();
