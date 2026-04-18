/**
 * phase3-verify.js — Phase 3 Verification Script
 *
 * Checks:
 *   1. source_authority table exists with expected tier counts
 *   2. article_rankings view exists and has rows
 *   3. Top 10 articles by rank_score are from Tier 1/2 sources (>50%)
 *   4. UNIQUE index exists on article_rankings
 *
 * Usage: node server/scripts/phase3-verify.js
 * Exits 0 on pass, 1 on any failure.
 */

import { pool } from '../database/db.js';

const EXPECTED_TIER_COUNTS = {
  1: 9,
  2: 9,
  3: 5,
  4: 4,
};

let allPassed = true;

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ FAIL: ${msg}`);
  allPassed = false;
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

async function run() {
  const client = await pool.connect();
  try {
    // -----------------------------------------------------------------------
    // Check 1: source_authority table exists with expected tier counts
    // -----------------------------------------------------------------------
    section('Check 1: source_authority table + tier counts');

    const { rows: tableCheck } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'source_authority'
      ) AS exists;
    `);
    if (!tableCheck[0].exists) {
      fail('source_authority table does not exist — run phase3-setup.js first');
      // Can't continue checks without the table
    } else {
      pass('source_authority table exists');

      const { rows: tierRows } = await client.query(`
        SELECT tier, COUNT(*) AS count
        FROM source_authority
        GROUP BY tier
        ORDER BY tier;
      `);

      const actual = {};
      for (const r of tierRows) {
        actual[r.tier] = parseInt(r.count, 10);
      }

      for (const [tier, expected] of Object.entries(EXPECTED_TIER_COUNTS)) {
        const got = actual[tier] ?? 0;
        if (got >= expected) {
          pass(`Tier ${tier}: ${got} sources (expected ≥ ${expected})`);
        } else {
          fail(`Tier ${tier}: ${got} sources (expected ≥ ${expected})`);
        }
      }
    }

    // -----------------------------------------------------------------------
    // Check 2: article_rankings view exists and has rows
    // -----------------------------------------------------------------------
    section('Check 2: article_rankings view exists + row count');

    const { rows: viewCheck } = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_matviews
        WHERE schemaname = 'public'
          AND matviewname = 'article_rankings'
      ) AS exists;
    `);

    if (!viewCheck[0].exists) {
      fail('article_rankings materialized view does not exist — run phase3-materialize.js first');
    } else {
      pass('article_rankings materialized view exists');

      const { rows: countRows } = await client.query(
        'SELECT COUNT(*) AS total FROM article_rankings;'
      );
      const total = parseInt(countRows[0].total, 10);

      if (total > 0) {
        pass(`article_rankings has ${total} rows`);
      } else {
        fail('article_rankings has 0 rows — expected > 0 (check visible=true articles exist)');
      }

      // -----------------------------------------------------------------------
      // Check 3: Top 10 articles — >50% must be Tier 1 or Tier 2 sources
      // -----------------------------------------------------------------------
      section('Check 3: Top-10 rank_score articles from Tier 1/2 sources (>50%)');

      if (total > 0) {
        const { rows: top10 } = await client.query(`
          SELECT
            ar.id,
            ar.rank_score,
            ar.source_slug,
            ar.relevance_tier,
            sa.tier AS source_tier,
            SUBSTRING(ar.title, 1, 70) AS title_preview
          FROM article_rankings ar
          LEFT JOIN source_authority sa ON sa.source_slug = ar.source_slug
          ORDER BY ar.rank_score DESC
          LIMIT 10;
        `);

        const tier12Count = top10.filter(
          r => r.source_tier === 1 || r.source_tier === 2
        ).length;
        const pct = Math.round((tier12Count / top10.length) * 100);

        console.log(`  Top-${top10.length} articles by rank_score:`);
        for (const [i, r] of top10.entries()) {
          const tierLabel = r.source_tier ? `Tier ${r.source_tier}` : 'Unknown';
          console.log(
            `    ${i + 1}. [${tierLabel}] [score=${Number(r.rank_score).toFixed(4)}] ` +
            `${r.source_slug || 'unknown'}\n` +
            `       "${r.title_preview}"`
          );
        }

        if (pct > 50) {
          pass(`${tier12Count}/${top10.length} (${pct}%) top articles from Tier 1/2 sources (>50% required)`);
        } else {
          fail(`Only ${tier12Count}/${top10.length} (${pct}%) top articles from Tier 1/2 — need >50%`);
        }
      } else {
        console.log('  (skipped — view is empty)');
      }
    }

    // -----------------------------------------------------------------------
    // Check 4: UNIQUE index exists on article_rankings
    // -----------------------------------------------------------------------
    section('Check 4: UNIQUE index on article_rankings(id)');

    const { rows: idxCheck } = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'article_rankings'
        AND indexname = 'article_rankings_id_idx';
    `);

    if (idxCheck.length > 0) {
      const isUnique = idxCheck[0].indexdef.toLowerCase().includes('unique');
      if (isUnique) {
        pass(`UNIQUE index article_rankings_id_idx exists (required for REFRESH CONCURRENTLY)`);
      } else {
        fail(`Index article_rankings_id_idx exists but is NOT UNIQUE — REFRESH CONCURRENTLY will fail`);
      }
    } else {
      fail('article_rankings_id_idx does not exist — run phase3-materialize.js');
    }

    // -----------------------------------------------------------------------
    // Bonus: score index
    // -----------------------------------------------------------------------
    const { rows: scoreIdx } = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'article_rankings'
        AND indexname = 'article_rankings_score_idx';
    `);
    if (scoreIdx.length > 0) {
      pass('Score index article_rankings_score_idx exists');
    } else {
      console.log('  ℹ️  Score index article_rankings_score_idx not found (optional but recommended)');
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    console.log('\n══════════════════════════════════');
    if (allPassed) {
      console.log('✓ ALL CHECKS PASSED — Phase 3 is properly set up');
      process.exitCode = 0;
    } else {
      console.error('✗ SOME CHECKS FAILED — see above for details');
      process.exitCode = 1;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ phase3-verify crashed:', err.message);
  process.exit(1);
});
