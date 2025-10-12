import * as db from './db.js'
import crypto from 'crypto'

// Retry database operations with exponential backoff
async function retryQuery(queryFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn()
    } catch (error) {
      const isLastAttempt = attempt === maxRetries
      const isConnectionError = error.code === 'ECONNREFUSED' ||
                                error.code === 'EADDRNOTAVAIL' ||
                                error.message?.includes('Connection terminated')

      if (isConnectionError && !isLastAttempt) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        console.log(`Database connection error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }
}

// Generate unique external ID for deduplication
export function generateExternalId(title, url) {
  return crypto.createHash('md5').update(`${title}:${url}`).digest('hex')
}

// Insert a new article
export async function insertArticle(article) {
  const externalId = generateExternalId(article.title, article.url)

  const query = `
    INSERT INTO articles (
      external_id, title, summary, url, source, published_date,
      category, impact, relevance_score, scope, states, analysis, image_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (external_id) DO UPDATE SET
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      category = EXCLUDED.category,
      impact = EXCLUDED.impact,
      relevance_score = EXCLUDED.relevance_score,
      scope = EXCLUDED.scope,
      states = EXCLUDED.states,
      analysis = EXCLUDED.analysis,
      image_url = EXCLUDED.image_url,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `

  // Validate scope value (must be one of: National, State, Regional, Local)
  const validScopes = ['National', 'State', 'Regional', 'Local']
  let scope = article.analysis?.scope || null
  if (scope && !validScopes.includes(scope)) {
    console.warn(`Invalid scope "${scope}" for article "${article.title}", defaulting to null`)
    scope = null
  }

  const values = [
    externalId,
    article.title,
    article.summary || null,
    article.url,
    article.source,
    article.date || new Date(),
    article.category || 'Operations',
    article.impact || 'low',
    article.relevanceScore || null,
    scope,
    article.analysis?.state ? [article.analysis.state] : null,
    article.analysis || null,
    article.image_url || null
  ]

  try {
    const result = await retryQuery(() => db.query(query, values))
    return result.rows[0].id
  } catch (error) {
    console.error('Error inserting article:', error.message)
    throw error
  }
}

// Insert article tags
export async function insertArticleTags(articleId, tags) {
  if (!tags || tags.length === 0) return

  try {
    for (const tagName of tags) {
      // Insert tag if it doesn't exist
      const tagQuery = `
        INSERT INTO tags (name)
        VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `
      const tagResult = await db.query(tagQuery, [tagName])
      const tagId = tagResult.rows[0].id

      // Link article to tag
      const linkQuery = `
        INSERT INTO article_tags (article_id, tag_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `
      await db.query(linkQuery, [articleId, tagId])
    }
  } catch (error) {
    console.error('Error inserting article tags:', error.message)
  }
}

// Get paginated articles with filters
export async function getArticles(options = {}) {
  const {
    page = 1,
    limit = 50,
    category,
    impact,
    source,
    scope,
    states,
    dateRange,
    search
  } = options

  const offset = (page - 1) * limit
  const conditions = []
  const values = []
  let paramCount = 1

  // Build WHERE clause
  if (category && category !== 'All') {
    conditions.push(`category = $${paramCount}`)
    values.push(category)
    paramCount++
  }

  if (impact && impact !== 'all') {
    conditions.push(`impact = $${paramCount}`)
    values.push(impact)
    paramCount++
  }

  if (source && source !== 'All Sources') {
    conditions.push(`source = $${paramCount}`)
    values.push(source)
    paramCount++
  }

  if (scope && scope !== 'all') {
    conditions.push(`scope = $${paramCount}`)
    values.push(scope)
    paramCount++
  }

  if (states && states.length > 0) {
    conditions.push(`states && $${paramCount}`)
    values.push(states)
    paramCount++
  }

  if (dateRange) {
    const dateConditions = {
      today: "published_date >= CURRENT_DATE",
      week: "published_date >= CURRENT_DATE - INTERVAL '7 days'",
      month: "published_date >= CURRENT_DATE - INTERVAL '30 days'",
      quarter: "published_date >= CURRENT_DATE - INTERVAL '90 days'"
    }
    if (dateConditions[dateRange]) {
      conditions.push(dateConditions[dateRange])
    }
  }

  if (search) {
    conditions.push(`
      to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(summary, '')) @@
      plainto_tsquery('english', $${paramCount})
    `)
    values.push(search)
    paramCount++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Count query
  const countQuery = `SELECT COUNT(*) FROM articles ${whereClause}`
  const countResult = await db.query(countQuery, values)
  const totalCount = parseInt(countResult.rows[0].count)

  // Data query
  const dataQuery = `
    SELECT
      id, external_id, title, summary, url, source, published_date as date,
      category, impact, relevance_score, scope, states, analysis,
      image_url, created_at, updated_at
    FROM articles
    ${whereClause}
    ORDER BY published_date DESC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `

  values.push(limit, offset)
  const dataResult = await db.query(dataQuery, values)

  const totalPages = Math.ceil(totalCount / limit)

  return {
    articles: dataResult.rows,
    pagination: {
      page,
      limit,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

// Get article by ID with tags
export async function getArticleById(id) {
  const articleQuery = `
    SELECT
      id, external_id, title, summary, url, source, published_date as date,
      category, impact, relevance_score, scope, states, analysis,
      image_url, created_at, updated_at
    FROM articles
    WHERE id = $1
  `

  const tagsQuery = `
    SELECT t.name
    FROM tags t
    JOIN article_tags at ON t.id = at.tag_id
    WHERE at.article_id = $1
  `

  const [articleResult, tagsResult] = await Promise.all([
    db.query(articleQuery, [id]),
    db.query(tagsQuery, [id])
  ])

  if (articleResult.rows.length === 0) {
    return null
  }

  const article = articleResult.rows[0]
  article.tags = tagsResult.rows.map(row => row.name)

  return article
}

// Get trending tags
export async function getTrendingTags(days = 7, limit = 10) {
  const query = `
    SELECT t.name, COUNT(*) as count
    FROM tags t
    JOIN article_tags at ON t.id = at.tag_id
    JOIN articles a ON at.article_id = a.id
    WHERE a.published_date > CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY t.name
    ORDER BY count DESC
    LIMIT $1
  `

  const result = await db.query(query, [limit])
  return result.rows
}

// Check if article exists (by URL or external ID)
export async function articleExists(url) {
  const query = `SELECT id FROM articles WHERE url = $1 LIMIT 1`
  const result = await db.query(query, [url])
  return result.rows.length > 0
}

// ============================================================
// NEW DEDUPLICATION FUNCTIONS
// ============================================================

// Stage 1: Find article by exact URL
export async function findArticleByURL(url) {
  const query = `
    SELECT id, content_hash, title, summary, updated_at
    FROM articles
    WHERE url = $1
    LIMIT 1
  `
  const result = await db.query(query, [url])
  return result.rows.length > 0 ? result.rows[0] : null
}

// Stage 2: Find article by content hash
export async function findArticleByContentHash(hash) {
  const query = `
    SELECT id, url, title, summary, published_date, updated_at
    FROM articles
    WHERE content_hash = $1
    LIMIT 1
  `
  const result = await db.query(query, [hash])
  return result.rows.length > 0 ? result.rows[0] : null
}

// Stage 3: Find similar articles (fuzzy title search + date proximity)
export async function findSimilarArticles(title, publishedDate, dateWindowDays = 7, limit = 5) {
  const query = `
    SELECT
      id, url, title, summary, content_hash, published_date, source,
      similarity(title, $1) as title_similarity
    FROM articles
    WHERE
      published_date BETWEEN $2::timestamp - INTERVAL '${dateWindowDays} days'
                        AND $2::timestamp + INTERVAL '${dateWindowDays} days'
      AND similarity(title, $1) > 0.3
    ORDER BY title_similarity DESC, published_date DESC
    LIMIT $3
  `
  const result = await db.query(query, [title, publishedDate, limit])
  return result.rows
}

// Update article content and metadata
export async function updateArticleContent(id, updates) {
  const query = `
    UPDATE articles
    SET
      title = COALESCE($2, title),
      summary = COALESCE($3, summary),
      content_hash = COALESCE($4, content_hash),
      last_content_update = COALESCE($5, last_content_update),
      duplicate_check_count = duplicate_check_count + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id
  `
  const values = [
    id,
    updates.title || null,
    updates.summary || null,
    updates.contentHash || null,
    updates.lastContentUpdate || new Date()
  ]

  const result = await db.query(query, values)
  return result.rows.length > 0
}

// Generate content hash for deduplication
export function generateContentHash(title, summary) {
  // Normalize title: lowercase, remove all punctuation/special chars, collapse whitespace
  const normalizedTitle = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove all non-alphanumeric characters
    .replace(/\s+/g, ' ')
    .trim()

  // Normalize summary: lowercase, remove special chars, collapse whitespace
  const normalizedSummary = (summary || '')
    .toLowerCase()
    .replace(/&nbsp;|&amp;|&quot;|&lt;|&gt;/g, ' ') // Remove HTML entities
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500)

  const content = `${normalizedTitle}|${normalizedSummary}`
  return crypto.createHash('md5').update(content).digest('hex')
}

// Get deduplication statistics
export async function getDuplicateStats() {
  const query = `
    SELECT
      COUNT(*) as total_articles,
      COUNT(DISTINCT content_hash) as unique_content_hashes,
      COUNT(*) - COUNT(DISTINCT content_hash) as potential_duplicates,
      SUM(duplicate_check_count) as total_ai_checks,
      MAX(last_content_update) as most_recent_update
    FROM articles
  `
  const result = await db.query(query)
  return result.rows[0]
}

export default {
  insertArticle,
  insertArticleTags,
  getArticles,
  getArticleById,
  getTrendingTags,
  articleExists,
  generateExternalId,
  // New deduplication functions
  findArticleByURL,
  findArticleByContentHash,
  findSimilarArticles,
  updateArticleContent,
  generateContentHash,
  getDuplicateStats
}
