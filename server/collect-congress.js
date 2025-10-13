#!/usr/bin/env node

/**
 * Congress.gov Bill Collector CLI
 *
 * Usage:
 *   node collect-congress.js [daysBack] [minRelevanceScore] [congress]
 *
 * Examples:
 *   node collect-congress.js                    # Default: 30 days back, min score 50, current congress
 *   node collect-congress.js 90 60              # 90 days back, min score 60
 *   node collect-congress.js 30 50 118          # 30 days back, min score 50, 118th Congress
 */

import 'dotenv/config';
import { collectCongressBills } from './services/congressCollector.js';

// Parse command line arguments
const daysBack = parseInt(process.argv[2]) || 30;
const minRelevanceScore = parseInt(process.argv[3]) || 50;
const congress = parseInt(process.argv[4]) || null;

// Run collection
try {
  const options = { daysBack, minRelevanceScore };
  if (congress) {
    options.congress = congress;
  }

  await collectCongressBills(options);
  process.exit(0);
} catch (error) {
  console.error('\n❌ Collection failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
