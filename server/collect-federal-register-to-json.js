import 'dotenv/config';
import fs from 'fs';
import { collectFederalRegisterBills } from './services/federalRegisterCollector.js';

/**
 * Collect Federal Register bills and save to JSON file
 * Usage: node collect-federal-register-to-json.js [daysBack] [minRelevanceScore]
 */

async function main() {
  try {
    const daysBack = parseInt(process.argv[2]) || 90;
    const minRelevanceScore = parseInt(process.argv[3]) || 60;

    console.log('\n' + '='.repeat(70));
    console.log('  FEDERAL REGISTER BILL COLLECTOR (JSON Export)');
    console.log('='.repeat(70));
    console.log(`  Days back: ${daysBack}`);
    console.log(`  Min relevance score: ${minRelevanceScore}`);
    console.log('='.repeat(70) + '\n');

    // Collect bills
    const bills = await collectFederalRegisterBills(daysBack, minRelevanceScore);

    if (bills.length === 0) {
      console.log('No bills collected. Exiting.');
      process.exit(0);
    }

    // Save to JSON file
    const outputFile = './data/federal-register-bills.json';
    fs.writeFileSync(outputFile, JSON.stringify(bills, null, 2));

    console.log(`\n✅ Saved ${bills.length} bills to ${outputFile}\n`);

    // Show summary
    console.log('📋 Bills collected:\n');
    bills.forEach((bill, idx) => {
      console.log(`${idx + 1}. ${bill.bill_number}`);
      console.log(`   Title: ${bill.title}`);
      console.log(`   Priority: ${bill.priority} | Relevance: ${bill.ai_relevance_score}/100`);
      console.log(`   Comment Deadline: ${bill.comment_deadline || 'N/A'}`);
      console.log(`   Key Impact: ${bill.key_impact}`);
      console.log('');
    });

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
