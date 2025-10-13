import 'dotenv/config';
import * as db from './database/db.js';

async function deleteFederalRegisterBills() {
  try {
    console.log('Deleting Federal Register bills (except test bill)...\n');

    const result = await db.query(`
      DELETE FROM bills
      WHERE source = 'federal_register'
      AND bill_number != 'FR-TEST-001'
      RETURNING bill_number, title
    `);

    console.log(`✅ Deleted ${result.rows.length} bills:\n`);
    result.rows.forEach(bill => {
      console.log(`   - ${bill.bill_number}: ${bill.title.substring(0, 80)}...`);
    });

    console.log('\nReady to re-insert with ecosystem data.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteFederalRegisterBills();
