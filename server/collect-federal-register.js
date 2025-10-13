import 'dotenv/config';
import { collectFederalRegisterBills } from './services/federalRegisterCollector.js';
import { insertBill, getBills } from './database/bills.js';

/**
 * Script to collect Federal Register bills and insert into database
 * Usage: node collect-federal-register.js [daysBack] [minRelevanceScore]
 *
 * Examples:
 *   node collect-federal-register.js           // Last 30 days, score >= 50
 *   node collect-federal-register.js 60        // Last 60 days, score >= 50
 *   node collect-federal-register.js 30 70     // Last 30 days, score >= 70
 */

async function main() {
  try {
    // Parse command line arguments
    const daysBack = parseInt(process.argv[2]) || 30;
    const minRelevanceScore = parseInt(process.argv[3]) || 50;

    console.log('\n' + '='.repeat(70));
    console.log('  FEDERAL REGISTER BILL COLLECTOR');
    console.log('='.repeat(70));
    console.log(`  Days back: ${daysBack}`);
    console.log(`  Min relevance score: ${minRelevanceScore}`);
    console.log('='.repeat(70) + '\n');

    // Step 1: Collect bills from Federal Register
    const bills = await collectFederalRegisterBills(daysBack, minRelevanceScore);

    if (bills.length === 0) {
      console.log('No bills to insert.');
      process.exit(0);
    }

    // Step 2: Check existing bills to avoid duplicates
    console.log('📊 Checking for existing bills in database...\n');
    const existingBills = await getBills({ source: 'federal_register', limit: 1000 });
    const existingBillNumbers = new Set(existingBills.bills.map(b => b.bill_number));

    // Step 3: Filter out duplicates
    const newBills = bills.filter(bill => !existingBillNumbers.has(bill.bill_number));
    const duplicateCount = bills.length - newBills.length;

    console.log(`   Found ${existingBills.bills.length} existing Federal Register bills`);
    console.log(`   Duplicates filtered: ${duplicateCount}`);
    console.log(`   New bills to insert: ${newBills.length}\n`);

    if (newBills.length === 0) {
      console.log('✓ No new bills to insert. All bills already in database.\n');
      process.exit(0);
    }

    // Step 4: Insert new bills into database
    console.log('💾 Inserting new bills into database...\n');
    let insertedCount = 0;
    let errorCount = 0;

    for (const bill of newBills) {
      try {
        await insertBill(bill);
        insertedCount++;
        console.log(`   ✓ [${insertedCount}/${newBills.length}] ${bill.bill_number}: ${bill.title.substring(0, 80)}...`);
      } catch (error) {
        errorCount++;
        console.error(`   ✗ Error inserting ${bill.bill_number}: ${error.message}`);
      }
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(70));
    console.log('  COLLECTION SUMMARY');
    console.log('='.repeat(70));
    console.log(`  Total bills collected: ${bills.length}`);
    console.log(`  Duplicates skipped: ${duplicateCount}`);
    console.log(`  Successfully inserted: ${insertedCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log('='.repeat(70) + '\n');

    // Step 6: Show sample of inserted bills
    if (insertedCount > 0) {
      console.log('📋 Sample of inserted bills:\n');
      newBills.slice(0, 5).forEach((bill, idx) => {
        console.log(`${idx + 1}. ${bill.bill_number} - ${bill.title}`);
        console.log(`   Priority: ${bill.priority} | Relevance: ${bill.ai_relevance_score}/100`);
        console.log(`   Comment Deadline: ${bill.comment_deadline || 'N/A'}`);
        console.log('');
      });
    }

    console.log('✅ Federal Register collection complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
