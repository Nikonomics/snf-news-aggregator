/**
 * phase3-materialize.js — Phase 3.3: Materialized View + Indexes
 *
 * Creates the article_rankings materialized view with the ranking formula
 * per Nik's priority decision:
 *   National regulatory/compliance = top
 *   Local closure = very close second (1.25× multiplier)
 *
 * Also creates indexes required for REFRESH CONCURRENTLY.
 *
 * Usage: node server/scripts/phase3-materialize.js
 *
 * Prerequisites:
 *   - phase3-setup.js must have run first (source_authority table must exist)
 *   - articles table must have: relevance_tier, severity, actionability_window,
 *     event_type, novelty, affected_states, visible, source_slug, impact_scope
 */

import { pool } from '../database/db.js';

// ---------------------------------------------------------------------------
// Materialized view — exact SQL from Phase 3.3 of remediation-spec-v2.4.md
// ---------------------------------------------------------------------------
const CREATE_VIEW_SQL = `
CREATE MATERIALIZED VIEW IF NOT EXISTS article_rankings AS
SELECT
  a.id,
  a.title,
  a.url,
  a.published_date,
  a.relevance_tier,
  a.primary_category,
  a.impact_scope,
  a.event_type,
  a.actionability_window,
  a.severity,
  a.affected_states,
  a.visible,
  a.source_slug,

  -- Base: source tier weight (default 1.0 for unknown sources)
  COALESCE(sa.weight, 1.0) *

  -- Relevance tier multiplier
  CASE a.relevance_tier
    WHEN 'high'   THEN 3.0
    WHEN 'medium' THEN 1.5
    ELSE 1.0
  END *

  -- Severity bonus (0–3 scale → adds up to 30%)
  (1.0 + COALESCE(a.severity, 0) * 0.1) *

  -- Actionability window bonus
  CASE a.actionability_window
    WHEN 'immediate' THEN 1.3
    WHEN '30d'       THEN 1.15
    WHEN 'watchlist' THEN 1.0
    ELSE 0.9
  END *

  -- Local closure multiplier (Nik's decision: very close second to national HIGH)
  -- event_type='closure' + novelty='new_development' → 1.25× boost
  CASE
    WHEN a.event_type = 'closure' AND a.novelty = 'new_development' THEN 1.25
    ELSE 1.0
  END *

  -- Time decay: half-life ~10 days
  -- Formula: 1 / (1 + days_old * 0.1)
  (1.0 / (1.0 + GREATEST(
    EXTRACT(EPOCH FROM (NOW() - COALESCE(a.published_date, a.created_at))) / 86400.0,
    0
  ) * 0.1))

  AS rank_score

FROM articles a
LEFT JOIN source_authority sa ON sa.source_slug = a.source_slug
WHERE a.visible = true
  OR a.visible IS NULL;  -- treat NULL as visible (pre-Phase 0 rows)
`;

// REQUIRED for REFRESH CONCURRENTLY — must be UNIQUE
const CREATE_UNIQUE_INDEX_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS article_rankings_id_idx
  ON article_rankings (id);
`;

// Composite index for the common query pattern (rank_score DESC, state filter)
const CREATE_SCORE_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS article_rankings_score_idx
  ON article_rankings (rank_score DESC);
`;

async function run() {
  const client = await pool.connect();
  try {
    // 1. Create materialized view
    console.log('Creating article_rankings materialized view...');
    await client.query(CREATE_VIEW_SQL);
    console.log('✓ Materialized view created (or already exists)');

    // 2. UNIQUE index — required for REFRESH CONCURRENTLY
    console.log('\nCreating UNIQUE index on article_rankings(id)...');
    await client.query(CREATE_UNIQUE_INDEX_SQL);
    console.log('✓ UNIQUE index article_rankings_id_idx ready');

    // 3. Score index
    console.log('\nCreating rank_score index...');
    await client.query(CREATE_SCORE_INDEX_SQL);
    console.log('✓ Score index article_rankings_score_idx ready');

    // 4. Row count
    const { rows: countRows } = await client.query(
      'SELECT COUNT(*) AS total FROM article_rankings;'
    );
    const total = parseInt(countRows[0].total, 10);
    console.log(`\n✓ article_rankings contains ${total} rows`);

    if (total === 0) {
      console.warn(
        '⚠️  View is empty. This is expected if the articles table has no rows yet,\n' +
        '   or if all rows have visible=false. Check your data.'
      );
    } else {
      // 5. Top 5 articles by rank_score
      console.log('\n--- Top 5 articles by rank_score ---');
      const { rows: top5 } = await client.query(`
        SELECT
          id,
          rank_score,
          relevance_tier,
          source_slug,
          actionability_window,
          event_type,
          SUBSTRING(title, 1, 80) AS title_preview
        FROM article_rankings
        ORDER BY rank_score DESC
        LIMIT 5;
      `);

      if (top5.length === 0) {
        console.log('  (no rows)');
      } else {
        for (const [i, r] of top5.entries()) {
          console.log(
            `  ${i + 1}. [score=${Number(r.rank_score).toFixed(4)}] ` +
            `[${r.relevance_tier}] [${r.source_slug || 'unknown'}] ` +
            `[${r.actionability_window}] [${r.event_type}]\n` +
            `     "${r.title_preview}"`
          );
        }
      }
    }

    console.log('\n✓ phase3-materialize complete');
    console.log('  Next: Add POST /api/admin/refresh-rankings cron endpoint to index.js');
    console.log('  Cron schedule: every 30 min → REFRESH MATERIALIZED VIEW CONCURRENTLY article_rankings');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ phase3-materialize failed:', err.message);
  process.exit(1);
});
