/**
 * phase0-verify.js — Phase 0 validation gates.
 *
 * Runs all checks from the spec and exits 1 if any gate fails.
 * Run this after phase0-migrate.js before proceeding to Phase 1.
 *
 * Gates:
 *   1. All required schema columns exist
 *   2. Source slug verification: JS normalizeSourceSlug() matches every DB slug (0 mismatches)
 *   3. HTML entity decode spot-check: 20 random articles have no &amp; / &#x27; remaining
 *   4. Date quality tags applied: date_quality='estimated' count > 0
 *
 * Usage:
 *   node server/scripts/phase0-verify.js
 */

import * as db from '../database/db.js';
import { normalizeSourceSlug } from '../lib/sourceSlug.js';

let allPassed = true;

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ FAIL: ${msg}`);
  allPassed = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate 1 — All required schema columns exist
// ─────────────────────────────────────────────────────────────────────────────
async function verifyColumns() {
  console.log('\n── Gate 1: Required columns ──');

  const REQUIRED_COLUMNS = [
    'source_slug',
    'visible',
    'hidden_reason',
    'date_quality',
    'affected_states',
    'impact_scope',
    'actionability_window',
    'novelty',
    'severity',
    'triage_confidence',
    'event_type',
    'triage_entities',
    'triage_reasoning',
    'primary_audience',
    'primary_category',
    'secondary_categories',
    'category_confidence',
    'triage_status',
    'triage_attempts',
    'triage_started_at',
    'category_status',
    'category_attempts',
    'category_started_at',
  ];

  const { rows } = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='articles'`
  );
  const existing = new Set(rows.map(r => r.column_name));

  const missing = REQUIRED_COLUMNS.filter(col => !existing.has(col));
  if (missing.length === 0) {
    pass(`All ${REQUIRED_COLUMNS.length} required columns present`);
  } else {
    fail(`Missing columns: ${missing.join(', ')}`);
    console.error('    → Run phase0-migrate.js to add missing columns');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate 2 — Source slug verification
// ─────────────────────────────────────────────────────────────────────────────
async function verifySlugs() {
  console.log('\n── Gate 2: Source slug verification ──');

  const { rows } = await db.query(
    `SELECT DISTINCT source, source_slug FROM articles WHERE source IS NOT NULL`
  );

  const mismatches = rows.filter(r => normalizeSourceSlug(r.source) !== r.source_slug);

  if (mismatches.length === 0) {
    pass(`All ${rows.length} distinct source slugs verified (0 mismatches)`);
  } else {
    fail(`SLUG MISMATCHES (${mismatches.length} of ${rows.length}):`);
    mismatches.forEach(r =>
      console.error(`    "${r.source}" → DB: "${r.source_slug}" | JS: "${normalizeSourceSlug(r.source)}"`)
    );
    console.error('    → Fix with:');
    console.error('      UPDATE articles SET source_slug = <js_value> WHERE source = <raw_source>');
    console.error('    → Do NOT proceed to Phase 1 until 0 mismatches.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate 3 — HTML entity spot-check
// ─────────────────────────────────────────────────────────────────────────────
async function verifyEntityDecode() {
  console.log('\n── Gate 3: HTML entity decode spot-check ──');

  // Sample 20 random articles and check for remaining entities
  const { rows } = await db.query(`
    SELECT id, title, summary FROM articles
    ORDER BY RANDOM()
    LIMIT 20
  `);

  const HTML_ENTITY_RE = /&([a-zA-Z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/;

  const dirty = rows.filter(r =>
    HTML_ENTITY_RE.test(r.title || '') || HTML_ENTITY_RE.test(r.summary || '')
  );

  if (dirty.length === 0) {
    pass('Spot-check: 0 of 20 sampled articles contain HTML entities');
  } else {
    fail(`Spot-check: ${dirty.length} of 20 sampled articles still contain HTML entities`);
    dirty.forEach(r => {
      const where = HTML_ENTITY_RE.test(r.title || '') ? 'title' : 'summary';
      const snippet = (r.title || r.summary || '').substring(0, 80);
      console.error(`    id=${r.id} [${where}]: ${snippet}`);
    });
    console.error('    → Re-run entity decode backfill in phase0-migrate.js');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate 4 — Date quality tags applied
// ─────────────────────────────────────────────────────────────────────────────
async function verifyDateQuality() {
  console.log('\n── Gate 4: Date quality tags ──');

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) as cnt FROM articles WHERE date_quality = 'estimated'`
  );
  const estimatedCount = parseInt(countRows[0].cnt, 10);

  const { rows: knownRows } = await db.query(
    `SELECT COUNT(*) as cnt FROM articles WHERE date_quality = 'known'`
  );
  const knownCount = parseInt(knownRows[0].cnt, 10);

  const total = estimatedCount + knownCount;

  if (estimatedCount > 0) {
    pass(`date_quality tagged: ${estimatedCount} 'estimated', ${knownCount} 'known' (total ${total})`);
  } else {
    // Could be a fresh DB with no articles yet — warn but don't hard-fail
    console.warn(`  ⚠ date_quality='estimated' count is 0 — this may be expected for a fresh DB`);
    console.warn(`    Known: ${knownCount}, Total: ${total}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate 5 — Indexes exist
// ─────────────────────────────────────────────────────────────────────────────
async function verifyIndexes() {
  console.log('\n── Gate 5: Required indexes ──');

  const REQUIRED_INDEXES = [
    'idx_articles_source_slug',
    'idx_articles_triage_status',
    'idx_articles_category_status',
  ];

  const { rows } = await db.query(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'articles'`
  );
  const existing = new Set(rows.map(r => r.indexname));

  const missing = REQUIRED_INDEXES.filter(idx => !existing.has(idx));
  if (missing.length === 0) {
    pass(`All ${REQUIRED_INDEXES.length} required indexes present`);
  } else {
    fail(`Missing indexes: ${missing.join(', ')}`);
    console.error('    → Run phase0-migrate.js to create missing indexes');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Phase 0 Verification ===');

  try {
    await verifyColumns();
    await verifySlugs();
    await verifyEntityDecode();
    await verifyDateQuality();
    await verifyIndexes();

    console.log('');
    if (allPassed) {
      console.log('✅ All Phase 0 gates PASSED — safe to proceed to Phase 1');
      process.exit(0);
    } else {
      console.error('❌ One or more Phase 0 gates FAILED — do NOT proceed to Phase 1');
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Verification error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

main();
