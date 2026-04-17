// Backfill script: reads articles from JSON, inserts via the existing pipeline
// Calls the production API's refresh endpoint won't work (it re-fetches RSS).
// Instead, POST each article to a simple insert endpoint.
// Since there's no bulk insert API, we'll call the DB directly like the server does.

import { readFileSync } from 'fs';

const API_BASE = 'https://snf-news-aggregator.onrender.com';
const ADMIN_KEY = 'f650b7b3ba2d3389ead9be29d669cd8d4a90e9b2d8e2489e530dd315aaba82ae';

const articles = JSON.parse(readFileSync('/tmp/backfill-articles.json', 'utf-8'));
console.log(`📦 Loaded ${articles.length} articles to backfill`);

// The app has no bulk insert endpoint. But it DOES have /api/articles/refresh which 
// fetches RSS and processes through the full pipeline (triage + insert).
// We can't use that for historical articles.
//
// Alternative: POST each article for AI analysis via /api/analyze-article
// But that requires the article to already be in the DB.
//
// Cleanest approach: Add a temporary admin endpoint for bulk insert,
// or run the insert logic locally against the production DB.
//
// Safest approach: Trigger the refresh endpoint multiple times, but temporarily
// modify the RSS feeds in the deployed code... that's too risky.
//
// ACTUAL approach: Use the existing insertArticle function locally,
// but that requires DB connection string which is on Render.
//
// PRAGMATIC approach: Build a small admin endpoint, deploy it, use it, remove it.

// Let's just build a bulk insert endpoint that processes through the pipeline
console.log('\n⚠️  No bulk insert API exists. Need to add one.');
console.log('Creating a temporary admin endpoint...');

// Actually, the SIMPLEST approach: just write a script that POSTs to the 
// production server's analyze-article endpoint after inserting raw articles.
// But we need the articles IN the DB first.

// OK, the real simplest: add a POST /api/admin/backfill-articles endpoint
// that accepts an array of articles and runs them through insertArticle + triage.

console.log(`\n📊 Article date distribution:`);
const byMonth = {};
for (const a of articles) {
  const month = a.published_date ? a.published_date.substring(0, 7) : 'unknown';
  byMonth[month] = (byMonth[month] || 0) + 1;
}
for (const [month, count] of Object.entries(byMonth).sort()) {
  console.log(`  ${month}: ${count}`);
}

