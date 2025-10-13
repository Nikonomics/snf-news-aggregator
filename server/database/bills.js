import * as db from './db.js'
import crypto from 'crypto'

/**
 * Generate a hash for bill deduplication
 */
export function generateBillHash(billNumber, source) {
  return crypto.createHash('sha256')
    .update(`${billNumber}-${source}`)
    .digest('hex')
}

/**
 * Insert a new bill into the database
 */
export async function insertBill(bill) {
  const query = `
    INSERT INTO bills (
      bill_number, external_id, title, summary, full_text,
      source, jurisdiction, state, document_type,
      status, sponsor, committee, introduced_date, last_action_date,
      url, api_url, pdf_url,
      ai_relevance_score, ai_impact_type, ai_explanation, ai_summary,
      financial_impact_pbpy, annual_facility_impact,
      reimbursement_risk, staffing_risk, compliance_risk, quality_risk,
      operational_area, implementation_timeline, implementation_steps,
      has_comment_period, comment_deadline, comment_url, effective_date,
      priority, passage_likelihood, tracking_enabled,
      topics, snf_keywords_matched,
      analyzed_at, last_checked_at, analysis,
      direct_relevance_score, ecosystem_relevance_score, impact_type,
      ecosystem_impact, strategic_actions, affected_operators, key_impact,
      financial_impact_description, action_required, publication_date,
      categories, agencies,
      urgency_score, implementation_complexity, competitive_intelligence,
      strategic_implications, impact_factors, entities, temporal_signals,
      market_forces, compliance_timeline
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
      $51, $52, $53, $54, $55, $56, $57, $58, $59, $60,
      $61, $62, $63
    )
    RETURNING id
  `

  const values = [
    bill.bill_number,
    bill.external_id || generateBillHash(bill.bill_number, bill.source),
    bill.title,
    bill.summary,
    bill.full_text,
    bill.source,
    bill.jurisdiction,
    bill.state || null,
    bill.document_type || null,
    bill.status,
    bill.sponsor || null,
    bill.committee || null,
    bill.introduced_date || null,
    bill.last_action_date || null,
    bill.url,
    bill.api_url || null,
    bill.pdf_url || null,
    bill.ai_relevance_score || null,
    bill.ai_impact_type || null,
    bill.ai_explanation || null,
    bill.ai_summary || null,
    bill.financial_impact_pbpy || null,
    bill.annual_facility_impact || null,
    bill.reimbursement_risk || null,
    bill.staffing_risk || null,
    bill.compliance_risk || null,
    bill.quality_risk || null,
    bill.operational_area || null,
    bill.implementation_timeline || null,
    bill.implementation_steps || null,
    bill.has_comment_period || false,
    bill.comment_deadline || null,
    bill.comment_url || null,
    bill.effective_date || null,
    bill.priority || 'medium',
    bill.passage_likelihood || null,
    bill.tracking_enabled !== false,
    bill.topics || null,
    bill.snf_keywords_matched || null,
    bill.analyzed_at || null,
    new Date(),
    bill.analysis ? JSON.stringify(bill.analysis) : null,
    // New ecosystem fields
    bill.direct_relevance_score || null,
    bill.ecosystem_relevance_score || null,
    bill.impact_type || null,
    bill.ecosystem_impact ? JSON.stringify(bill.ecosystem_impact) : null,
    bill.strategic_actions ? JSON.stringify(bill.strategic_actions) : null,
    bill.affected_operators || null,
    bill.key_impact || null,
    bill.financial_impact_description || null,
    bill.action_required || false,
    bill.publication_date || null,
    bill.categories ? JSON.stringify(bill.categories) : null,
    bill.agencies ? JSON.stringify(bill.agencies) : null,
    // Enhanced analysis fields
    bill.urgency_score || null,
    bill.implementation_complexity || null,
    bill.competitive_intelligence || null,
    bill.strategic_implications || null,
    bill.impact_factors ? JSON.stringify(bill.impact_factors) : null,
    bill.entities ? JSON.stringify(bill.entities) : null,
    bill.temporal_signals ? JSON.stringify(bill.temporal_signals) : null,
    bill.market_forces ? JSON.stringify(bill.market_forces) : null,
    bill.compliance_timeline ? JSON.stringify(bill.compliance_timeline) : null
  ]

  const result = await db.query(query, values)
  return result.rows[0].id
}

/**
 * Update an existing bill
 */
export async function updateBill(billId, updates) {
  const fields = []
  const values = []
  let paramIndex = 1

  // Build dynamic SET clause
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex}`)
      values.push(value)
      paramIndex++
    }
  }

  if (fields.length === 0) {
    return false
  }

  // Always update last_checked_at
  fields.push(`last_checked_at = $${paramIndex}`)
  values.push(new Date())
  paramIndex++

  // Add billId as last parameter
  values.push(billId)

  const query = `
    UPDATE bills
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
  `

  await db.query(query, values)
  return true
}

/**
 * Get bills with filtering and pagination
 */
export async function getBills(options = {}) {
  const {
    page = 1,
    limit = 50,
    source,
    jurisdiction,
    state,
    priority,
    minRelevanceScore,
    hasCommentPeriod,
    search,
    sortBy = 'last_action_date',
    sortOrder = 'DESC'
  } = options

  const offset = (page - 1) * limit
  const conditions = []
  const values = []
  let paramIndex = 1

  // Build WHERE clause
  if (source) {
    conditions.push(`source = $${paramIndex}`)
    values.push(source)
    paramIndex++
  }

  if (jurisdiction) {
    conditions.push(`jurisdiction = $${paramIndex}`)
    values.push(jurisdiction)
    paramIndex++
  }

  if (state) {
    conditions.push(`state = $${paramIndex}`)
    values.push(state)
    paramIndex++
  }

  if (priority) {
    conditions.push(`priority = $${paramIndex}`)
    values.push(priority)
    paramIndex++
  }

  if (minRelevanceScore) {
    conditions.push(`ai_relevance_score >= $${paramIndex}`)
    values.push(minRelevanceScore)
    paramIndex++
  }

  if (hasCommentPeriod !== undefined) {
    conditions.push(`has_comment_period = $${paramIndex}`)
    values.push(hasCommentPeriod)
    paramIndex++
  }

  if (search) {
    conditions.push(`(
      title ILIKE $${paramIndex} OR
      summary ILIKE $${paramIndex} OR
      bill_number ILIKE $${paramIndex}
    )`)
    values.push(`%${search}%`)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Get total count
  const countQuery = `SELECT COUNT(*) FROM bills ${whereClause}`
  const countResult = await db.query(countQuery, values)
  const totalCount = parseInt(countResult.rows[0].count)

  // Get bills
  const dataQuery = `
    SELECT * FROM bills
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `
  values.push(limit, offset)

  const dataResult = await db.query(dataQuery, values)

  return {
    bills: dataResult.rows,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    }
  }
}

/**
 * Get a single bill by ID
 */
export async function getBillById(billId) {
  const query = 'SELECT * FROM bills WHERE id = $1'
  const result = await db.query(query, [billId])
  return result.rows[0] || null
}

/**
 * Get a bill by bill number
 */
export async function getBillByNumber(billNumber, source = null) {
  let query = 'SELECT * FROM bills WHERE bill_number = $1'
  const values = [billNumber]

  if (source) {
    query += ' AND source = $2'
    values.push(source)
  }

  const result = await db.query(query, values)
  return result.rows[0] || null
}

/**
 * Check if a bill exists (by bill_number or external_id)
 */
export async function billExists(billNumber, externalId = null) {
  let query = 'SELECT id FROM bills WHERE bill_number = $1'
  const values = [billNumber]

  if (externalId) {
    query += ' OR external_id = $2'
    values.push(externalId)
  }

  const result = await db.query(query, values)
  return result.rows.length > 0 ? result.rows[0].id : null
}

/**
 * Create a new bill version (for change tracking)
 */
export async function createBillVersion(billId, versionData) {
  const query = `
    INSERT INTO bill_versions (
      bill_id, version_number, title, summary, full_text,
      status, changes_summary, change_significance
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `

  // Get the next version number
  const versionCountResult = await db.query(
    'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM bill_versions WHERE bill_id = $1',
    [billId]
  )
  const nextVersion = versionCountResult.rows[0].next_version

  const values = [
    billId,
    nextVersion,
    versionData.title,
    versionData.summary,
    versionData.full_text,
    versionData.status,
    versionData.changes_summary || null,
    versionData.change_significance || 'minor'
  ]

  const result = await db.query(query, values)
  return result.rows[0].id
}

/**
 * Record a bill change
 */
export async function recordBillChange(billId, changeData) {
  const query = `
    INSERT INTO bill_changes (
      bill_id, change_type, change_severity, old_value, new_value,
      diff_summary, change_description, impact_assessment
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `

  const values = [
    billId,
    changeData.change_type,
    changeData.change_severity || 'minor',
    changeData.old_value || null,
    changeData.new_value || null,
    changeData.diff_summary || null,
    changeData.change_description || null,
    changeData.impact_assessment || null
  ]

  const result = await db.query(query, values)
  return result.rows[0].id
}

/**
 * Create a bill alert
 */
export async function createBillAlert(billId, alertData) {
  // Generate dedup hash
  const dedupHash = crypto.createHash('md5')
    .update(`${billId}-${alertData.alert_type}-${alertData.title}`)
    .digest('hex')

  // Check if alert already exists
  const existingAlert = await db.query(
    'SELECT id FROM bill_alerts WHERE dedup_hash = $1 AND triggered_at > NOW() - INTERVAL \'24 hours\'',
    [dedupHash]
  )

  if (existingAlert.rows.length > 0) {
    return null // Alert already exists (within 24 hours)
  }

  const query = `
    INSERT INTO bill_alerts (
      bill_id, alert_type, priority, title, message, dedup_hash
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `

  const values = [
    billId,
    alertData.alert_type,
    alertData.priority || 'medium',
    alertData.title,
    alertData.message,
    dedupHash
  ]

  const result = await db.query(query, values)
  return result.rows[0].id
}

/**
 * Get urgent bills (high priority or upcoming comment deadlines)
 */
export async function getUrgentBills() {
  const query = 'SELECT * FROM urgent_bills'
  const result = await db.query(query)
  return result.rows
}

/**
 * Get bills with upcoming comment deadlines
 */
export async function getBillsWithCommentDeadlines(daysAhead = 30) {
  const query = `
    SELECT * FROM bills
    WHERE has_comment_period = true
      AND comment_deadline >= CURRENT_DATE
      AND comment_deadline <= CURRENT_DATE + $1
    ORDER BY comment_deadline ASC
  `

  const result = await db.query(query, [daysAhead])
  return result.rows
}

/**
 * Log a collection run
 */
export async function logCollection(source, collectionType = 'incremental') {
  const query = `
    INSERT INTO collection_logs (source, collection_type)
    VALUES ($1, $2)
    RETURNING id
  `

  const result = await db.query(query, [source, collectionType])
  return result.rows[0].id
}

/**
 * Update collection log with results
 */
export async function updateCollectionLog(logId, stats) {
  const query = `
    UPDATE collection_logs
    SET bills_collected = $1,
        bills_updated = $2,
        bills_analyzed = $3,
        errors_count = $4,
        completed_at = CURRENT_TIMESTAMP,
        duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)),
        status = $5,
        error_message = $6,
        metadata = $7
    WHERE id = $8
  `

  const values = [
    stats.bills_collected || 0,
    stats.bills_updated || 0,
    stats.bills_analyzed || 0,
    stats.errors_count || 0,
    stats.status || 'completed',
    stats.error_message || null,
    stats.metadata ? JSON.stringify(stats.metadata) : null,
    logId
  ]

  await db.query(query, values)
}

/**
 * Get bill statistics
 */
export async function getBillStats() {
  const [totalResult, bySourceResult, byPriorityResult, urgentResult] = await Promise.all([
    db.query('SELECT COUNT(*) as count FROM bills'),
    db.query('SELECT source, COUNT(*) as count FROM bills GROUP BY source'),
    db.query('SELECT priority, COUNT(*) as count FROM bills GROUP BY priority'),
    db.query('SELECT COUNT(*) as count FROM bills WHERE priority IN (\'urgent\', \'high\')')
  ])

  return {
    total: parseInt(totalResult.rows[0].count),
    bySource: bySourceResult.rows.reduce((acc, row) => {
      acc[row.source] = parseInt(row.count)
      return acc
    }, {}),
    byPriority: byPriorityResult.rows.reduce((acc, row) => {
      acc[row.priority] = parseInt(row.count)
      return acc
    }, {}),
    urgent: parseInt(urgentResult.rows[0].count)
  }
}
