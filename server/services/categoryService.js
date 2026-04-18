/**
 * categoryService.js — Phase 2 Category Taxonomy Backfill Worker
 *
 * Implements the crash-safe state-driven queue pattern from spec v2.4 Phase 2.2.
 *
 * Key design:
 *  - Claim rows atomically via UPDATE...RETURNING (no separate SELECT/UPDATE race)
 *  - SKIP LOCKED for safe concurrent workers
 *  - AI calls run OUTSIDE any transaction (claim committed first)
 *  - Individual short transactions per result write
 *  - Orphan recovery: reclaim rows stuck in 'processing' > 15 min
 *  - Retryable vs fatal error distinction via retryWithBackoff
 *  - After 3 attempts → category_status = 'failed_permanently'
 *
 * DO NOT import aiService — uses Anthropic client directly per spec.
 */

import Anthropic from '@anthropic-ai/sdk'
import { pool } from '../database/db.js'
import { retryWithBackoff } from '../lib/retry.js'
import { smartTruncate } from '../lib/truncate.js'

// ---------------------------------------------------------------------------
// Anthropic client — direct, per spec (not via aiService)
// ---------------------------------------------------------------------------
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ---------------------------------------------------------------------------
// Category taxonomy (Phase 2.1)
// ---------------------------------------------------------------------------
const CATEGORY_ENUM = [
  'Reimbursement & Rates',
  'Regulation & Compliance',
  'Survey & Enforcement',
  'Workforce & Labor',
  'Quality & Clinical',
  'M&A & Ownership',
  'Financial Distress',
  'Census & Referrals',
  'Technology & Vendors',
  'Legal & Litigation',
  'State Policy',
  'Opinion & Commentary',
]

// ---------------------------------------------------------------------------
// Tool Use schema — classify_category
// ---------------------------------------------------------------------------
const CLASSIFY_TOOL = {
  name: 'classify_category',
  description: 'Classify an SNF news article into the correct operational category for SNF operators.',
  input_schema: {
    type: 'object',
    required: ['primary_category', 'confidence', 'reasoning'],
    properties: {
      primary_category: {
        type: 'string',
        enum: CATEGORY_ENUM,
        description: 'The single best-fit category for this article.',
      },
      secondary_categories: {
        type: 'array',
        items: { type: 'string', enum: CATEGORY_ENUM },
        maxItems: 2,
        description: 'Up to 2 additional relevant categories (optional).',
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Confidence score between 0 and 1.',
      },
      reasoning: {
        type: 'string',
        maxLength: 100,
        description: 'Brief rationale for the classification (max 100 chars).',
      },
    },
  },
}

// ---------------------------------------------------------------------------
// classifyArticle — calls Claude Haiku via Tool Use API
// ---------------------------------------------------------------------------
async function classifyArticle(article) {
  const title = (article.title || '').substring(0, 500)
  const summary = smartTruncate(article.summary || '', 4000)
  const source = article.source || ''

  const prompt = `You are classifying a skilled nursing facility (SNF) news article into the correct operational category.

Categories:
- Reimbursement & Rates: Medicare/Medicaid rates, PDPM, payment rules
- Regulation & Compliance: CMS rules, regulatory guidance, compliance deadlines
- Survey & Enforcement: F-tags, CMPs, DOJ/OIG, survey process
- Workforce & Labor: Staffing, wages, unions, turnover, mandates
- Quality & Clinical: Star ratings, outcomes, infection control
- M&A & Ownership: Acquisitions, mergers, PE, REIT, ownership changes
- Financial Distress: Closures, bankruptcies, distressed assets
- Census & Referrals: Occupancy, hospital discharge, ACO/MA
- Technology & Vendors: EHRs, telehealth, AI tools
- Legal & Litigation: Lawsuits, settlements, fraud, whistleblower
- State Policy: State legislation, Medicaid waiver changes
- Opinion & Commentary: Editorial, analysis, no new facts

Article:
Source: ${source}
Title: ${title}
Summary: ${summary}

Classify this article into exactly one primary category. Use the classify_category tool.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: 'tool', name: 'classify_category' },
    messages: [{ role: 'user', content: prompt }],
  })

  // Extract tool use block
  const toolUse = response.content?.find(b => b.type === 'tool_use' && b.name === 'classify_category')
  if (!toolUse?.input) {
    throw new Error('classify_category tool not called in response')
  }

  const { primary_category, secondary_categories, confidence, reasoning } = toolUse.input

  // Validate primary_category is in the enum
  if (!CATEGORY_ENUM.includes(primary_category)) {
    throw new Error(`Invalid primary_category returned: "${primary_category}"`)
  }

  // Clamp secondary_categories to valid enum values only, max 2
  const validSecondary = (secondary_categories || [])
    .filter(c => CATEGORY_ENUM.includes(c) && c !== primary_category)
    .slice(0, 2)

  return {
    primary_category,
    secondary_categories: validSecondary,
    confidence: Math.min(1, Math.max(0, confidence || 0)),
    reasoning: (reasoning || '').substring(0, 100),
  }
}

// ---------------------------------------------------------------------------
// reclassifyBatch — state-driven queue, crash-safe (spec v2.4 Phase 2.2)
// ---------------------------------------------------------------------------
/**
 * Claim and process one batch of Operations articles.
 *
 * @param {number} batchSize - Number of rows to claim per batch (default 25)
 * @returns {Promise<number>} - Number of articles processed in this batch
 */
export async function reclassifyBatch(batchSize = 25) {
  // Step 1: Claim rows atomically — commit the claim BEFORE any AI call.
  // This prevents multiple workers from racing on the same rows.
  // Includes both:
  //   (a) new pending rows (category = 'Operations', category_status = 'pending', < 3 attempts)
  //   (b) orphaned rows stuck in 'processing' > 15 min (crash recovery)
  const { rows } = await pool.query(
    `UPDATE articles
     SET
       category_status = 'processing',
       category_attempts = category_attempts + 1,
       category_started_at = NOW()
     WHERE id IN (
       SELECT id FROM articles
       WHERE (
         -- New pending rows: former Operations articles not yet categorized
         (category = 'Operations' AND category_status = 'pending' AND category_attempts < 3)
         OR
         -- Orphaned rows: stuck in processing > 15 min (worker crash recovery)
         (category_status = 'processing'
          AND category_started_at < NOW() - INTERVAL '15 minutes'
          AND category_attempts < 3)
       )
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
     RETURNING id, title, summary, source, url, category_attempts`,
    [batchSize]
  )

  if (rows.length === 0) {
    return 0
  }

  // Step 2: Run AI calls OUTSIDE any transaction.
  // The claim is already committed above — AI calls are safe to run now.
  const results = await Promise.allSettled(
    rows.map(row =>
      retryWithBackoff(() => classifyArticle(row), {
        maxRetries: 2,   // Up to 2 internal retries (3 total attempts across batches)
        baseDelayMs: 1000,
      })
    )
  )

  // Step 3: Write results — each as its own short transaction per article.
  for (let i = 0; i < rows.length; i++) {
    const { status, value, reason } = results[i]
    const article = rows[i]

    if (status === 'fulfilled') {
      // Success — write classification result and mark done
      await pool.query(
        `UPDATE articles
         SET
           primary_category = $1,
           secondary_categories = $2,
           category_confidence = $3,
           category_status = 'done'
         WHERE id = $4`,
        [
          value.primary_category,
          value.secondary_categories,
          value.confidence,
          article.id,
        ]
      )
    } else {
      // Failed — distinguish retryable vs fatal
      const isFatal = reason?.fatal === true
      const attempts = article.category_attempts  // already incremented by the claim query

      // Mark permanently failed if: fatal error OR exhausted 3 total attempts
      const newStatus = isFatal || attempts >= 3 ? 'failed_permanently' : 'pending'

      console.error(
        `categoryService: article ${article.id} failed ` +
          `(attempt ${attempts}, fatal=${isFatal}, → ${newStatus}):`,
        reason?.message || reason
      )

      await pool.query(
        `UPDATE articles SET category_status = $1 WHERE id = $2`,
        [newStatus, article.id]
      )
    }
  }

  return rows.length
}

// ---------------------------------------------------------------------------
// getReclassifyStats — summary counts for Operations articles
// ---------------------------------------------------------------------------
/**
 * Returns status distribution counts for all former Operations articles.
 *
 * @returns {Promise<{pending: number, processing: number, done: number, failed_permanently: number}>}
 */
export async function getReclassifyStats() {
  const { rows } = await pool.query(`
    SELECT
      category_status,
      COUNT(*)::int AS count
    FROM articles
    WHERE category = 'Operations'
    GROUP BY category_status
  `)

  const stats = {
    pending: 0,
    processing: 0,
    done: 0,
    failed_permanently: 0,
  }

  for (const row of rows) {
    const key = row.category_status
    if (key in stats) {
      stats[key] = row.count
    }
  }

  return stats
}

export default { reclassifyBatch, getReclassifyStats }
