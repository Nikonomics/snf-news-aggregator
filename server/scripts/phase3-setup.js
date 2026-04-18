/**
 * phase3-setup.js — Phase 3.1: Source Authority Table + Seed Data
 *
 * Creates source_authority table and seeds it with tier data.
 * Safe to re-run (idempotent via ON CONFLICT DO UPDATE).
 *
 * Usage: node server/scripts/phase3-setup.js
 */

import { pool } from '../database/db.js';
import { normalizeSourceSlug } from '../lib/sourceSlug.js';

// ---------------------------------------------------------------------------
// Table DDL
// ---------------------------------------------------------------------------
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS source_authority (
  id SERIAL PRIMARY KEY,
  source_slug VARCHAR(255) UNIQUE NOT NULL,
  source_display_name VARCHAR(255),
  tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 4),
  weight FLOAT NOT NULL DEFAULT 1.0,
  auto_reject BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
`;

// ---------------------------------------------------------------------------
// Seed data — display names only; slugs generated at runtime via normalizeSourceSlug
// ---------------------------------------------------------------------------
const SEED_SOURCES = [
  // Tier 1 — Domain-specific trade press + key regulatory bodies (weight 1.5)
  { name: 'Skilled Nursing News',           tier: 1, weight: 1.5, auto_reject: false },
  { name: "McKnight's Long-Term Care News", tier: 1, weight: 1.5, auto_reject: false },
  { name: "McKnight's Senior Living",       tier: 1, weight: 1.5, auto_reject: false },
  { name: "McKnight's Home Care",           tier: 1, weight: 1.5, auto_reject: false },
  { name: 'CMS.gov',                        tier: 1, weight: 1.5, auto_reject: false },
  { name: 'AHCA/NCAL',                      tier: 1, weight: 1.5, auto_reject: false },
  { name: 'Modern Healthcare',              tier: 1, weight: 1.5, auto_reject: false },
  { name: 'Healthcare Dive',                tier: 1, weight: 1.5, auto_reject: false },
  { name: 'Provider Magazine',              tier: 1, weight: 1.5, auto_reject: false },

  // Tier 2 — High-quality general health / national press (weight 1.0)
  { name: 'KFF',                    tier: 2, weight: 1.0, auto_reject: false },
  { name: 'STAT News',              tier: 2, weight: 1.0, auto_reject: false },
  { name: 'Fierce Healthcare',      tier: 2, weight: 1.0, auto_reject: false },
  { name: 'AP News',                tier: 2, weight: 1.0, auto_reject: false },
  { name: 'Reuters Health',         tier: 2, weight: 1.0, auto_reject: false },
  { name: 'The New York Times',     tier: 2, weight: 1.0, auto_reject: false },
  { name: 'Health Affairs',         tier: 2, weight: 1.0, auto_reject: false },
  { name: 'Healthcare Finance News',tier: 2, weight: 1.0, auto_reject: false },
  { name: 'Politico Pro Health',    tier: 2, weight: 1.0, auto_reject: false },

  // Tier 3 — Wire services / press release distributors (weight 0.5)
  { name: 'PR Newswire',    tier: 3, weight: 0.5, auto_reject: false },
  { name: 'Business Wire',  tier: 3, weight: 0.5, auto_reject: false },
  { name: 'GlobeNewswire', tier: 3, weight: 0.5, auto_reject: false },
  { name: 'AccessWire',    tier: 3, weight: 0.5, auto_reject: false },
  { name: 'EIN Presswire', tier: 3, weight: 0.5, auto_reject: false },

  // Tier 4 — Validated irrelevant international sources (weight 0.0, auto_reject true)
  { name: 'BBC News',     tier: 4, weight: 0.0, auto_reject: true },
  { name: 'The Guardian', tier: 4, weight: 0.0, auto_reject: true },
  { name: 'Sky News',     tier: 4, weight: 0.0, auto_reject: true },
  { name: 'Daily Mail',   tier: 4, weight: 0.0, auto_reject: true },
];

// ---------------------------------------------------------------------------
// Upsert SQL — idempotent; safe to re-run
// ---------------------------------------------------------------------------
const UPSERT_SQL = `
INSERT INTO source_authority
  (source_slug, source_display_name, tier, weight, auto_reject)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (source_slug) DO UPDATE SET
  source_display_name = EXCLUDED.source_display_name,
  tier                = EXCLUDED.tier,
  weight              = EXCLUDED.weight,
  auto_reject         = EXCLUDED.auto_reject,
  updated_at          = NOW();
`;

async function run() {
  const client = await pool.connect();
  try {
    // 1. Create table
    console.log('Creating source_authority table (if not exists)...');
    await client.query(CREATE_TABLE_SQL);
    console.log('✓ Table ready');

    // 2. Seed rows
    console.log(`\nSeeding ${SEED_SOURCES.length} sources...`);
    let inserted = 0;
    for (const src of SEED_SOURCES) {
      const slug = normalizeSourceSlug(src.name);
      await client.query(UPSERT_SQL, [
        slug,
        src.name,
        src.tier,
        src.weight,
        src.auto_reject,
      ]);
      console.log(`  ✓ [Tier ${src.tier}] ${src.name} → slug: ${slug}`);
      inserted++;
    }
    console.log(`\n✓ Upserted ${inserted} sources`);

    // 3. Verification query
    console.log('\n--- Verification ---');
    const { rows: tierCounts } = await client.query(`
      SELECT
        tier,
        COUNT(*)            AS count,
        ROUND(AVG(weight)::numeric, 2) AS avg_weight,
        SUM(CASE WHEN auto_reject THEN 1 ELSE 0 END) AS auto_reject_count
      FROM source_authority
      GROUP BY tier
      ORDER BY tier;
    `);

    console.log('Tier | Count | Avg Weight | Auto-Reject');
    console.log('-----|-------|------------|------------');
    for (const row of tierCounts) {
      console.log(
        `  ${row.tier}  |   ${row.count}   |    ${row.avg_weight}     |     ${row.auto_reject_count}`
      );
    }

    const { rows: allSources } = await client.query(`
      SELECT tier, source_display_name, source_slug, weight, auto_reject
      FROM source_authority
      ORDER BY tier, source_display_name;
    `);
    console.log(`\nAll ${allSources.length} sources in source_authority:`);
    for (const r of allSources) {
      const flag = r.auto_reject ? ' [AUTO-REJECT]' : '';
      console.log(`  Tier ${r.tier} | w=${r.weight} | ${r.source_display_name} → ${r.source_slug}${flag}`);
    }

    console.log('\n✓ phase3-setup complete');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ phase3-setup failed:', err.message);
  process.exit(1);
});
