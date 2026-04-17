/**
 * phase0-migrate.js — Phase 0 DB migrations + backfill.
 *
 * Runs in order:
 *   1. ADD COLUMN IF NOT EXISTS for every new column in the spec
 *   2. SQL label cleanup (Finance → Financial, Market Intelligence → M&A)
 *   3. HTML entity decode backfill (keyset pagination, NOT offset)
 *   4. Source slug backfill
 *   5. Date quality tagging
 *
 * SAFETY: Run --dry-run to print all SQL without executing.
 *
 * Usage:
 *   node server/scripts/phase0-migrate.js
 *   node server/scripts/phase0-migrate.js --dry-run
 */

import * as db from '../database/db.js';
import he from 'he';
import { normalizeSourceSlug } from '../lib/sourceSlug.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function runSQL(label, sql, params = []) {
  if (DRY_RUN) {
    console.log(`[DRY-RUN] ${label}\n  SQL: ${sql.trim().split('\n')[0]}...`);
    return;
  }
  console.log(`Running: ${label}`);
  await db.query(sql, params);
  console.log(`  ✓ ${label}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Schema migrations (ADD COLUMN IF NOT EXISTS)
// ─────────────────────────────────────────────────────────────────────────────
async function runSchemaMigrations() {
  console.log('\n── Step 1: Schema migrations ──');

  // 0.0 Source slug
  await runSQL('ADD source_slug',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_slug VARCHAR(255)`);

  // 0.3 Soft-delete
  await runSQL('ADD visible',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true`);
  await runSQL('ADD hidden_reason',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS hidden_reason VARCHAR(50)`);

  // 0.3 Date quality
  await runSQL('ADD date_quality',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS date_quality VARCHAR(20) DEFAULT 'known'`);

  // 0.3 Geographic
  await runSQL('ADD affected_states',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS affected_states TEXT[]`);

  // 0.3 Phase 1 triage output fields
  await runSQL('ADD impact_scope',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS impact_scope VARCHAR(20)`);
  await runSQL('ADD actionability_window',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS actionability_window VARCHAR(20)`);
  await runSQL('ADD novelty',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS novelty VARCHAR(30)`);
  await runSQL('ADD severity',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS severity INTEGER`);
  await runSQL('ADD triage_confidence',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS triage_confidence FLOAT`);
  await runSQL('ADD event_type',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS event_type VARCHAR(50)`);
  await runSQL('ADD triage_entities',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS triage_entities TEXT[]`);
  await runSQL('ADD triage_reasoning',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS triage_reasoning TEXT`);
  await runSQL('ADD primary_audience',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS primary_audience VARCHAR(30)`);

  // 0.3 Phase 2 taxonomy
  await runSQL('ADD primary_category',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS primary_category VARCHAR(100)`);
  await runSQL('ADD secondary_categories',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS secondary_categories TEXT[]`);
  await runSQL('ADD category_confidence',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS category_confidence FLOAT`);

  // 0.3 Split workflow state (v2.4 — one column per workflow)
  await runSQL('ADD triage_status',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS triage_status VARCHAR(20) DEFAULT 'pending'`);
  await runSQL('ADD triage_attempts',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS triage_attempts INTEGER DEFAULT 0`);
  await runSQL('ADD triage_started_at',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS triage_started_at TIMESTAMP`);

  await runSQL('ADD category_status',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS category_status VARCHAR(20) DEFAULT 'pending'`);
  await runSQL('ADD category_attempts',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS category_attempts INTEGER DEFAULT 0`);
  await runSQL('ADD category_started_at',
    `ALTER TABLE articles ADD COLUMN IF NOT EXISTS category_started_at TIMESTAMP`);

  // Indexes for worker queries
  await runSQL('CREATE INDEX idx_articles_triage_status',
    `CREATE INDEX IF NOT EXISTS idx_articles_triage_status ON articles(triage_status) WHERE triage_status != 'done'`);
  await runSQL('CREATE INDEX idx_articles_category_status',
    `CREATE INDEX IF NOT EXISTS idx_articles_category_status ON articles(category_status) WHERE category_status = 'pending'`);
  await runSQL('CREATE INDEX idx_articles_source_slug',
    `CREATE INDEX IF NOT EXISTS idx_articles_source_slug ON articles(source_slug)`);

  console.log('✓ Schema migrations complete');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Category label cleanup (0.1)
// ─────────────────────────────────────────────────────────────────────────────
async function runCategoryCleanup() {
  console.log('\n── Step 2: Category label cleanup ──');
  await runSQL("Rename 'Finance' → 'Financial'",
    `UPDATE articles SET category = 'Financial' WHERE category = 'Finance'`);
  await runSQL("Rename 'Market Intelligence' → 'M&A'",
    `UPDATE articles SET category = 'M&A' WHERE category = 'Market Intelligence'`);
  console.log('✓ Category label cleanup complete');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Backfill affected_states from states (0.3)
// ─────────────────────────────────────────────────────────────────────────────
async function backfillAffectedStates() {
  console.log('\n── Step 3: Backfill affected_states from states ──');
  await runSQL('Backfill affected_states',
    `UPDATE articles SET affected_states = states
     WHERE states IS NOT NULL AND affected_states IS NULL`);
  console.log('✓ affected_states backfill complete');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — HTML entity decode backfill — keyset pagination (0.2)
// ─────────────────────────────────────────────────────────────────────────────
async function runEntityDecodeBackfill() {
  console.log('\n── Step 4: HTML entity decode backfill (keyset pagination) ──');

  if (DRY_RUN) {
    console.log('[DRY-RUN] Would iterate articles with HTML entities using keyset pagination');
    return;
  }

  let lastId = 0;
  const BATCH = 200;
  let totalDecoded = 0;

  while (true) {
    const { rows } = await db.query(`
      SELECT id, summary, title FROM articles
      WHERE id > $1
        AND (
          summary ~ '&([a-zA-Z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});'
          OR title ~ '&([a-zA-Z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});'
        )
      ORDER BY id ASC LIMIT $2
    `, [lastId, BATCH]);

    if (rows.length === 0) break;

    for (const row of rows) {
      await db.query(
        'UPDATE articles SET summary=$1, title=$2 WHERE id=$3',
        [
          he.decode(row.summary || ''),
          he.decode(row.title || ''),
          row.id
        ]
      );
      lastId = Math.max(lastId, row.id);
      totalDecoded++;
    }
    console.log(`  Decoded through id=${lastId} (${totalDecoded} articles updated)...`);
  }
  console.log(`✓ HTML entity decode complete — ${totalDecoded} articles updated`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Source slug backfill (0.0)
// ─────────────────────────────────────────────────────────────────────────────
async function runSourceSlugBackfill() {
  console.log('\n── Step 5: Source slug backfill ──');

  // SQL-based backfill for existing records
  await runSQL('SQL source_slug backfill', `
    UPDATE articles SET source_slug =
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          LOWER(
            TRANSLATE(source,
              E'\u2018\u2019\u201C\u201D\`\u0027\u2032',
              ''
            )
          ),
          '[^a-z0-9]+', '-', 'g'
        ),
        '^-+|-+$', '', 'g'
      )
    WHERE source_slug IS NULL
  `);
  console.log('✓ Source slug backfill complete');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6 — Date quality tagging (0.5)
// ─────────────────────────────────────────────────────────────────────────────
async function runDateQualityTagging() {
  console.log('\n── Step 6: Date quality tagging ──');
  await runSQL('Tag estimated dates',
    `UPDATE articles
     SET date_quality = 'estimated'
     WHERE DATE(published_date) = DATE(created_at)
       AND date_quality = 'known'`);
  console.log('✓ Date quality tagging complete');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE — no changes will be written to the database\n');
  }

  console.log('=== Phase 0 Migration ===');
  const start = Date.now();

  try {
    await runSchemaMigrations();
    await runCategoryCleanup();
    await backfillAffectedStates();
    await runEntityDecodeBackfill();
    await runSourceSlugBackfill();
    await runDateQualityTagging();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Phase 0 migration complete in ${elapsed}s`);
    console.log('\nNext step: run phase0-verify.js to confirm all gates pass before proceeding to Phase 1.');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

main();
