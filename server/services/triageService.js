/**
 * triageService.js — Phase 1 Triage Rewrite
 *
 * Replaces the inline triageArticleRelevance() in index.js.
 * Uses Anthropic Tool Use API for structured classification.
 *
 * Key design decisions (wired per spec v2.4 + Nik's calibration session):
 *  - State-specific articles are MEDIUM at ingest; feed query promotes to HIGH for matching states
 *  - Only genuinely national articles are HIGH at ingest
 *  - Closures anywhere = HIGH (competitor/market intel)
 *  - Shadow mode: every triage writes to shadow_triage_log for 48-hr parallel run
 */

import Anthropic from '@anthropic-ai/sdk'
import { pool } from '../database/db.js'
import { smartTruncate } from '../lib/truncate.js'
import { normalizeSourceSlug } from '../lib/sourceSlug.js'
import { retryWithBackoff } from '../lib/retry.js'

// ---------------------------------------------------------------------------
// Anthropic client (separate from aiService.js to own Tool Use config)
// ---------------------------------------------------------------------------
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ---------------------------------------------------------------------------
// Fluff detection — fast pre-filter before any AI call
// ---------------------------------------------------------------------------
const FLUFF_PATTERNS = [
  /\bactivit(y|ies)\b.*\bresident/i,
  /resident.*\bactivit/i,
  /happy hour/i,
  /bingo/i,
  /craft (fair|day|session)/i,
  /ribbon.?cutting/i,
  /anniversary celebrat/i,
  /\baward(s|ed)?\b.*\b(facilit|nursing|home|care)\b/i,
  /\b(nursing home|snf|facilit)\b.*\baward/i,
  /games on/i,
  /resident.*compet/i,
  /volunteer/i,
  /fundrais/i,
  /donation/i,
  /\bpet (visit|therap)/i,
  /holiday (celebrat|party|event)/i,
]

const FLUFF_DEFAULTS = {
  is_snf_relevant: false,
  primary_audience: 'generic',
  operator_impact_types: [],
  impact_scope: 'local',
  actionability_window: 'none',
  novelty: 'recap',
  severity: 0,
  confidence: 1.0,
  event_type: 'other',
  entities: [],
  affected_states: [],
  reasoning: 'fluff_pattern_match',
  effective_date: null,
}

/**
 * Check title against fluff patterns. Returns true if fluff detected.
 * @param {string} title
 * @returns {boolean}
 */
function isFluff(title) {
  return FLUFF_PATTERNS.some(p => p.test(title || ''))
}

// ---------------------------------------------------------------------------
// Tool Use schema — Phase 1.3
// ---------------------------------------------------------------------------
const CLASSIFY_TOOL = {
  name: 'classify_article',
  description: 'Classify an SNF news article for operator relevance',
  input_schema: {
    type: 'object',
    required: [
      'is_snf_relevant', 'primary_audience', 'operator_impact_types',
      'impact_scope', 'actionability_window', 'novelty', 'severity',
      'reasoning', 'confidence', 'event_type', 'entities',
      'affected_states', 'effective_date',
    ],
    properties: {
      is_snf_relevant: { type: 'boolean' },
      primary_audience: {
        type: 'string',
        enum: ['operator', 'investor', 'policy', 'consumer', 'clinical', 'generic'],
      },
      operator_impact_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['revenue', 'compliance', 'staffing', 'census', 'quality', 'liability', 'market', 'technology'],
        },
      },
      impact_scope: {
        type: 'string',
        enum: ['national', 'state', 'regional', 'local'],
      },
      actionability_window: {
        type: 'string',
        enum: ['immediate', '30d', 'watchlist', 'none'],
      },
      novelty: {
        type: 'string',
        enum: ['new_development', 'follow_up', 'commentary', 'recap'],
      },
      severity: { type: 'integer', minimum: 0, maximum: 3 },
      reasoning: { type: 'string', maxLength: 200 },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      event_type: {
        type: 'string',
        enum: [
          'regulatory_update', 'acquisition', 'closure', 'enforcement',
          'rate_change', 'litigation', 'staffing', 'quality', 'other',
        ],
      },
      entities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Named organizations, chains, specific regulation IDs ONLY. Never include generic terms.',
      },
      affected_states: {
        type: 'array',
        items: { type: 'string', pattern: '^[A-Z]{2}$' },
      },
      effective_date: { type: ['string', 'null'] },
    },
  },
}

// System prompt
const SYSTEM_PROMPT = `You are an expert healthcare policy analyst specializing in skilled nursing facility (SNF) operations.

**HIGH** means a SNF administrator, regional leader, reimbursement lead, compliance officer, or owner-operator would prioritize this in their daily brief because it affects revenue, compliance exposure, staffing cost, survey risk, or operating decisions within 90 days. HIGH is not reserved for emergencies.

For \`entities\`: named organizations, chains, or specific regulation identifiers ONLY. Never output: CMS, Medicare, Medicaid, HHS, nursing home, SNF, LTC, long-term care, skilled nursing, or any generic sector term.`

// ---------------------------------------------------------------------------
// Entity blacklist — regex-based (v2.4 fix: not exact Set match)
// ---------------------------------------------------------------------------
const BROAD_ENTITY_PATTERNS = [
  /\bcms\b/i,
  /\bmedicare\b/i,
  /\bmedicaid\b/i,
  /\bhhs\b/i,
  /\bahca\b/i,
  /\bncal\b/i,
  /\bsnf\b/i,
  /\bltc\b/i,
  /nursing home/i,
  /skilled nursing/i,
  /centers for medicare/i,
  /dept.*health/i,
]

// ---------------------------------------------------------------------------
// Defensive parsing — Phase 1.4
// ---------------------------------------------------------------------------

function cleanTriageResult(result) {
  // Filter entities: must be > 3 chars and not match any broad pattern
  result.entities = (result.entities || []).filter(
    e => typeof e === 'string' && e.length > 3 && !BROAD_ENTITY_PATTERNS.some(p => p.test(e))
  )

  // Clamp / validate enum values with safe fallbacks
  const validAudience = ['operator', 'investor', 'policy', 'consumer', 'clinical', 'generic']
  if (!validAudience.includes(result.primary_audience)) result.primary_audience = 'generic'

  const validImpact = ['revenue', 'compliance', 'staffing', 'census', 'quality', 'liability', 'market', 'technology']
  result.operator_impact_types = (result.operator_impact_types || []).filter(x => validImpact.includes(x))

  const validScope = ['national', 'state', 'regional', 'local']
  if (!validScope.includes(result.impact_scope)) result.impact_scope = 'national'

  const validWindow = ['immediate', '30d', 'watchlist', 'none']
  if (!validWindow.includes(result.actionability_window)) result.actionability_window = 'watchlist'

  // 'recap' is the safe novelty fallback (not 'other' — 'other' is not in enum)
  const validNovelty = ['new_development', 'follow_up', 'commentary', 'recap']
  if (!validNovelty.includes(result.novelty)) result.novelty = 'recap'

  const validEventType = ['regulatory_update', 'acquisition', 'closure', 'enforcement', 'rate_change', 'litigation', 'staffing', 'quality', 'other']
  if (!validEventType.includes(result.event_type)) result.event_type = 'other'

  result.severity = Math.max(0, Math.min(3, parseInt(result.severity, 10) || 0))
  result.confidence = Math.max(0, Math.min(1, parseFloat(result.confidence) || 0))
  result.affected_states = (result.affected_states || []).filter(s => /^[A-Z]{2}$/.test(s))
  result.is_snf_relevant = Boolean(result.is_snf_relevant)

  return result
}

/**
 * Parse the Anthropic Tool Use API response defensively.
 * Falls back through tool_use → raw JSON text → safe defaults.
 *
 * @param {object} response - Raw Anthropic API response
 * @returns {object} Normalized triage result
 */
function parseTriageResponse(response) {
  // Primary path: tool_use block
  try {
    const toolUse = response.content?.find(b => b.type === 'tool_use')
    if (toolUse?.input) return cleanTriageResult(toolUse.input)
  } catch (_) {}

  // Fallback: raw text JSON
  try {
    const text = response.content?.find(b => b.type === 'text')?.text || ''
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
    if (Object.keys(json).length > 0) return cleanTriageResult(json)
  } catch (_) {}

  // Hard fallback — safe defaults (is_snf_relevant=true so it doesn't disappear)
  console.warn('[triageService] parseTriageResponse: complete parse failure, returning safe defaults')
  return {
    is_snf_relevant: true,
    primary_audience: 'generic',
    operator_impact_types: [],
    impact_scope: 'national',
    actionability_window: 'watchlist',
    novelty: 'recap',
    severity: 0,
    confidence: 0,
    event_type: 'other',
    entities: [],
    affected_states: [],
    reasoning: 'parse_failure',
    effective_date: null,
  }
}

// ---------------------------------------------------------------------------
// Tier derivation — Phase 1.5 (Nik's calibration: state-specific = MEDIUM at ingest)
// ---------------------------------------------------------------------------

/**
 * Derive relevance tier from triage result.
 * KEY CALIBRATION: state-specific articles are MEDIUM at ingest.
 * Feed query promotes them to HIGH for operators in matching states.
 * Only genuinely national articles are HIGH at ingest time.
 *
 * @param {object} r - Cleaned triage result
 * @returns {'high'|'medium'|'low'}
 */
function deriveTier(r) {
  if (!r.is_snf_relevant) return 'low'
  const t = r.operator_impact_types || []

  // National HIGH: affects all SNF operators regardless of state
  const isNationalHigh = (
    r.impact_scope === 'national' &&
    t.some(x => ['revenue', 'compliance', 'staffing'].includes(x)) &&
    ['immediate', '30d'].includes(r.actionability_window)
  ) || (
    r.impact_scope === 'national' && r.severity >= 2
  )

  // Closure anywhere = HIGH (competitors + market intel)
  const isClosure = r.event_type === 'closure' && r.novelty === 'new_development'

  // National M&A = HIGH
  const isNationalMA = t.includes('market') && r.novelty === 'new_development' && r.impact_scope === 'national'

  return (isNationalHigh || isClosure || isNationalMA) ? 'high' : 'medium'
  // NOTE: 'low' is only returned when is_snf_relevant=false OR fluff_pattern matched upstream
}

// ---------------------------------------------------------------------------
// Shadow mode table bootstrap
// ---------------------------------------------------------------------------

/**
 * Ensure the shadow_triage_log table exists.
 * Safe to call on every server startup (CREATE TABLE IF NOT EXISTS).
 */
export async function ensureShadowLogTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shadow_triage_log (
      id SERIAL PRIMARY KEY,
      article_id INTEGER,
      old_tier VARCHAR(20),
      new_tier VARCHAR(20),
      new_impact_scope VARCHAR(20),
      new_event_type VARCHAR(50),
      new_affected_states TEXT[],
      new_actionability_window VARCHAR(20),
      triage_confidence FLOAT,
      label_source VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

// ---------------------------------------------------------------------------
// Source blocklist cache (refreshed per process lifetime — avoids per-article DB hit)
// ---------------------------------------------------------------------------
let _blockedSlugCache = null
let _blockedSlugCacheAt = 0
const BLOCKED_SLUG_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function getBlockedSourceSlugs() {
  const now = Date.now()
  if (_blockedSlugCache && (now - _blockedSlugCacheAt) < BLOCKED_SLUG_CACHE_TTL_MS) {
    return _blockedSlugCache
  }
  const { rows } = await pool.query(
    `SELECT source_slug FROM source_authority WHERE auto_reject = true`
  )
  _blockedSlugCache = new Set(rows.map(r => r.source_slug))
  _blockedSlugCacheAt = now
  return _blockedSlugCache
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Triage a single article using Anthropic Tool Use API.
 *
 * Flow:
 *   1. Input truncation
 *   2. Source blocklist check
 *   3. Fluff detection (fast, no AI)
 *   4. Anthropic Tool Use API call (with retry)
 *   5. Defensive response parsing
 *   6. Tier derivation
 *   7. Persist all triage fields to articles table
 *   8. Log to shadow_triage_log
 *
 * @param {object} article - Article row from DB (must have id, title, summary, source, relevance_tier)
 * @param {object} [options]
 * @param {string} [options.model] - Anthropic model override (default: claude-haiku-4-5-20251001)
 * @returns {Promise<{tier: string, ...triageFields}>}
 */
export async function triageArticle(article, options = {}) {
  const model = options.model || 'claude-haiku-4-5-20251001'

  // ------------------------------------------------------------------
  // 1. Input truncation (Phase 1.1)
  // ------------------------------------------------------------------
  const truncatedSummary = smartTruncate(article.summary, 4000)
  const truncatedTitle = (article.title || '').substring(0, 500)

  // ------------------------------------------------------------------
  // 2. Source blocklist check (Phase 1.2)
  // ------------------------------------------------------------------
  try {
    const slug = normalizeSourceSlug(article.source)
    const blockedSlugs = await getBlockedSourceSlugs()
    if (blockedSlugs.has(slug)) {
      console.log(`[triageService] Blocked source: ${slug} (article ${article.id})`)
      await pool.query(
        `UPDATE articles SET visible = false, hidden_reason = 'blocked_source', triage_status = 'done' WHERE id = $1`,
        [article.id]
      )
      return { tier: 'low', reason: 'blocked_source', ...FLUFF_DEFAULTS }
    }
  } catch (err) {
    // source_authority table may not exist yet in Phase 0 — log and continue
    if (!err.message?.includes('does not exist')) {
      console.warn(`[triageService] Blocklist check error: ${err.message}`)
    }
  }

  // ------------------------------------------------------------------
  // 3. Fluff detection
  // ------------------------------------------------------------------
  if (isFluff(truncatedTitle)) {
    console.log(`[triageService] Fluff detected: "${truncatedTitle}" (article ${article.id})`)
    const fluffResult = { tier: 'low', reason: 'fluff_pattern', ...FLUFF_DEFAULTS }
    await persistTriageResult(article, fluffResult, 'fluff_pattern')
    return fluffResult
  }

  // ------------------------------------------------------------------
  // 4. Anthropic Tool Use API call (with retry)
  // ------------------------------------------------------------------
  let rawResponse
  try {
    rawResponse = await retryWithBackoff(
      () => anthropic.messages.create({
        model,
        max_tokens: 1024,
        temperature: 0,
        system: SYSTEM_PROMPT,
        tools: [CLASSIFY_TOOL],
        tool_choice: { type: 'any' },
        messages: [
          {
            role: 'user',
            content: `Classify this SNF news article:

Title: ${truncatedTitle}
Summary: ${truncatedSummary || 'N/A'}
Source: ${article.source || 'Unknown'}`,
          },
        ],
      }),
      { maxRetries: 3, baseDelayMs: 1000 }
    )
  } catch (err) {
    console.error(`[triageService] Anthropic API call failed for article ${article.id}:`, err.message)
    throw err
  }

  // ------------------------------------------------------------------
  // 5. Parse response defensively
  // ------------------------------------------------------------------
  const parsed = parseTriageResponse(rawResponse)

  // ------------------------------------------------------------------
  // 6. Derive tier
  // ------------------------------------------------------------------
  const tier = deriveTier(parsed)
  const result = { tier, ...parsed }

  // ------------------------------------------------------------------
  // 7 + 8. Persist + shadow log
  // ------------------------------------------------------------------
  await persistTriageResult(article, result, 'ai_tool_use')

  console.log(`[triageService] article ${article.id} → ${tier} (scope=${parsed.impact_scope}, event=${parsed.event_type}, conf=${parsed.confidence})`)
  return result
}

// ---------------------------------------------------------------------------
// Persistence helpers (internal)
// ---------------------------------------------------------------------------

/**
 * Write triage fields to articles table and log to shadow_triage_log.
 * Each is its own short transaction (no long-held locks during AI calls).
 *
 * @param {object} article
 * @param {object} result - Merged tier + triage fields
 * @param {string} labelSource - 'ai_tool_use' | 'fluff_pattern' | 'blocked_source'
 */
async function persistTriageResult(article, result, labelSource) {
  const {
    tier, impact_scope, actionability_window, novelty, severity,
    confidence, event_type, entities, affected_states,
    reasoning, primary_audience, effective_date,
  } = result

  // Persist triage fields
  try {
    await pool.query(
      `UPDATE articles SET
        impact_scope             = $1,
        actionability_window     = $2,
        novelty                  = $3,
        severity                 = $4,
        triage_confidence        = $5,
        event_type               = $6,
        triage_entities          = $7,
        affected_states          = $8,
        triage_reasoning         = $9,
        primary_audience         = $10,
        relevance_tier           = $11,
        triage_status            = 'done'
      WHERE id = $12`,
      [
        impact_scope || null,
        actionability_window || null,
        novelty || null,
        severity != null ? severity : null,
        confidence != null ? confidence : null,
        event_type || null,
        entities?.length ? entities : null,
        affected_states?.length ? affected_states : null,
        reasoning || null,
        primary_audience || null,
        tier,
        article.id,
      ]
    )
  } catch (err) {
    console.error(`[triageService] DB persist error for article ${article.id}:`, err.message)
    // Don't throw — shadow log still useful even if persist fails
  }

  // Shadow log (best-effort)
  try {
    await pool.query(
      `INSERT INTO shadow_triage_log
        (article_id, old_tier, new_tier, new_impact_scope, new_event_type,
         new_affected_states, new_actionability_window, triage_confidence, label_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        article.id,
        article.relevance_tier || null,
        tier,
        impact_scope || null,
        event_type || null,
        affected_states?.length ? affected_states : null,
        actionability_window || null,
        confidence != null ? confidence : null,
        labelSource,
      ]
    )
  } catch (err) {
    console.warn(`[triageService] Shadow log write failed for article ${article.id}:`, err.message)
  }
}

// Export internal helpers for testing
export { deriveTier, parseTriageResponse, isFluff, cleanTriageResult }
