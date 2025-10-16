import * as db from '../database/db.js'
import Anthropic from '@anthropic-ai/sdk'
import apiKeyManager from './apiKeyManager.js'

// Create Anthropic client with key rotation
function createAnthropicClient() {
  const apiKey = apiKeyManager.getNextAvailableKey()
  if (!apiKey) {
    throw new Error('No valid Anthropic API keys available')
  }
  return new Anthropic({ apiKey })
}

// Normalize text for clustering
function normalizeForClustering(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract key topics from article using simple keyword extraction
function extractKeywords(title, summary, analysis) {
  const text = `${title} ${summary} ${analysis?.keyInsights?.join(' ') || ''}`.toLowerCase()

  // Healthcare/SNF-specific keywords to track
  const importantKeywords = [
    'medicare', 'medicaid', 'staffing', 'wage', 'reimbursement', 'cms',
    'survey', 'inspection', 'quality', 'star rating', 'private equity',
    'medicare advantage', 'ownership', 'bankruptcy', 'closure', 'penalty',
    'regulation', 'compliance', 'lawsuit', 'fraud', 'abuse', 'vaccine',
    'covid', 'flu', 'infection', 'outbreak', 'technology', 'telehealth',
    'ehr', 'staffing ratio', 'minimum staffing', 'nursing shortage',
    'rate increase', 'rate cut', 'payment', 'billing', 'resident rights',
    'arbitration', 'eviction', 'discharge', 'admission', 'census',
    'occupancy', 'merger', 'acquisition', 'sale'
  ]

  const found = []
  for (const keyword of importantKeywords) {
    if (text.includes(keyword)) {
      found.push(keyword)
    }
  }

  return found
}

// Calculate article similarity based on keywords and topics
function calculateSimilarity(article1, article2) {
  const keywords1 = new Set(article1.keywords)
  const keywords2 = new Set(article2.keywords)

  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)))
  const union = new Set([...keywords1, ...keywords2])

  // Jaccard similarity
  return intersection.size / union.size
}

// Cluster related articles into stories
function clusterArticles(articles, similarityThreshold = 0.3) {
  const clusters = []
  const assigned = new Set()

  for (let i = 0; i < articles.length; i++) {
    if (assigned.has(i)) continue

    const cluster = {
      articles: [articles[i]],
      indices: [i],
      keywords: new Set(articles[i].keywords)
    }

    assigned.add(i)

    // Find similar articles
    for (let j = i + 1; j < articles.length; j++) {
      if (assigned.has(j)) continue

      const similarity = calculateSimilarity(articles[i], articles[j])

      if (similarity >= similarityThreshold) {
        cluster.articles.push(articles[j])
        cluster.indices.push(j)
        assigned.add(j)

        // Add keywords from this article
        articles[j].keywords.forEach(kw => cluster.keywords.add(kw))
      }
    }

    clusters.push(cluster)
  }

  return clusters
}

// Calculate story importance score
function calculateStoryScore(cluster, timeWindow) {
  const articles = cluster.articles

  // Factors:
  // 1. Number of articles (more coverage = more important)
  const coverageScore = Math.log(articles.length + 1) * 10

  // 2. Impact level (high = 3, medium = 2, low = 1)
  const impactMap = { 'high': 3, 'medium': 2, 'low': 1 }
  const avgImpact = articles.reduce((sum, a) => sum + (impactMap[a.impact] || 1), 0) / articles.length
  const impactScore = avgImpact * 15

  // 3. Geographic spread (more states = broader impact)
  const states = new Set()
  articles.forEach(a => {
    if (a.states && Array.isArray(a.states)) {
      a.states.forEach(s => states.add(s))
    }
  })
  const geoScore = Math.min(states.size * 2, 20) // Cap at 20

  // 4. Recency (more recent = more important)
  const now = new Date()
  const avgAge = articles.reduce((sum, a) => {
    const age = (now - new Date(a.published_date)) / (1000 * 60 * 60 * 24) // days
    return sum + age
  }, 0) / articles.length
  const recencyScore = Math.max(0, 20 - (avgAge * 2)) // Decay over 10 days

  // 5. Source diversity (more unique sources = more credible)
  const sources = new Set(articles.map(a => a.source))
  const diversityScore = Math.min(sources.size * 3, 15)

  // 6. Financial impact bonus
  const hasFinancialImpact = articles.some(a =>
    a.analysis?.financialImpact &&
    !a.analysis.financialImpact.toLowerCase().includes('no direct financial')
  )
  const financialScore = hasFinancialImpact ? 10 : 0

  // 7. Regulatory/compliance bonus
  const isRegulatory = articles.some(a => a.category === 'Regulatory')
  const regulatoryScore = isRegulatory ? 10 : 0

  const totalScore = coverageScore + impactScore + geoScore + recencyScore +
                    diversityScore + financialScore + regulatoryScore

  return {
    total: totalScore,
    breakdown: {
      coverage: coverageScore,
      impact: impactScore,
      geographic: geoScore,
      recency: recencyScore,
      diversity: diversityScore,
      financial: financialScore,
      regulatory: regulatoryScore
    }
  }
}

// Generate AI summary of a story cluster
async function generateStorySummary(cluster) {
  const articles = cluster.articles.slice(0, 10) // Limit to 10 most recent

  const articlesText = articles.map((a, i) => {
    const dateStr = a.published_date instanceof Date
      ? a.published_date.toISOString().split('T')[0]
      : (typeof a.published_date === 'string' ? a.published_date.split('T')[0] : 'N/A')

    return `
${i + 1}. "${a.title}" (${a.source}, ${dateStr})
   Impact: ${a.impact}
   Category: ${a.category}
   Key Insight: ${a.analysis?.keyInsights?.[0] || 'N/A'}
   States: ${a.states?.join(', ') || 'National'}
`
  }).join('\n')

  const prompt = `You are analyzing healthcare news trends for SNF operators. Based on these related articles, create a cohesive story summary.

ARTICLES (${articles.length} total):
${articlesText}

Provide a JSON response with:
{
  "headline": "Clear, compelling headline (50-80 chars)",
  "summary": "2-3 sentence overview of the story",
  "whyItMatters": "Why SNF operators should care (1-2 sentences)",
  "actionItems": ["Specific action item 1", "Action item 2"],
  "trend": "emerging|growing|stable|declining",
  "topics": ["primary topic", "secondary topic"],
  "affectedStates": ["state codes if applicable"],
  "estimatedImpact": "Brief description of operational/financial impact"
}

Focus on:
- What's actually happening across these articles
- Operational and financial implications
- What operators need to know or do
- Whether this is a new trend or ongoing situation

Respond with ONLY valid JSON.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Error generating story summary:', error.message)
  }

  // Fallback summary
  return {
    headline: articles[0].title.substring(0, 80),
    summary: 'Multiple articles covering this topic.',
    whyItMatters: 'This story has been covered by multiple sources.',
    actionItems: ['Monitor for updates'],
    trend: 'stable',
    topics: Array.from(cluster.keywords).slice(0, 3),
    affectedStates: [],
    estimatedImpact: 'Impact assessment pending'
  }
}

// Main function: Get top stories of the week
export async function getTopStories(options = {}) {
  const {
    days = 7,
    limit = 5,
    minArticles = 2, // Minimum articles to constitute a "story"
    category = null,
    state = null
  } = options

  try {
    console.log(`\n📊 Analyzing trends from past ${days} days...`)

    // Get recent articles
    let query = `
      SELECT id, title, summary, url, source, published_date,
             category, impact, scope, states, analysis
      FROM articles
      WHERE published_date >= NOW() - INTERVAL '${days} days'
    `

    const conditions = []
    const params = []
    let paramCount = 0

    if (category) {
      paramCount++
      conditions.push(`category = $${paramCount}`)
      params.push(category)
    }

    if (state) {
      paramCount++
      conditions.push(`$${paramCount} = ANY(states)`)
      params.push(state)
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ')
    }

    query += ' ORDER BY published_date DESC'

    const result = await db.query(query, params)
    const articles = result.rows

    console.log(`  Found ${articles.length} articles`)

    if (articles.length === 0) {
      return []
    }

    // Extract keywords for each article
    articles.forEach(article => {
      article.keywords = extractKeywords(
        article.title,
        article.summary || '',
        article.analysis
      )
    })

    // Cluster related articles
    console.log('  Clustering related articles...')
    const clusters = clusterArticles(articles)

    // Filter to significant stories (multiple articles)
    const significantClusters = clusters.filter(c => c.articles.length >= minArticles)
    console.log(`  Found ${significantClusters.length} significant stories (${minArticles}+ articles each)`)

    // Score each story
    const scoredStories = significantClusters.map(cluster => ({
      cluster,
      score: calculateStoryScore(cluster, days)
    }))

    // Sort by score
    scoredStories.sort((a, b) => b.score.total - a.score.total)

    // Take top N stories
    const topStories = scoredStories.slice(0, limit)

    // Generate AI summaries for top stories
    console.log('  Generating AI summaries...')
    const stories = []

    for (const { cluster, score } of topStories) {
      const aiSummary = await generateStorySummary(cluster)

      stories.push({
        ...aiSummary,
        articleCount: cluster.articles.length,
        score: score.total,
        scoreBreakdown: score.breakdown,
        articles: cluster.articles.map(a => ({
          id: a.id,
          title: a.title,
          source: a.source,
          url: a.url,
          published_date: a.published_date,
          impact: a.impact,
          category: a.category
        })),
        keywords: Array.from(cluster.keywords)
      })
    }

    console.log(`✅ Generated ${stories.length} top stories`)

    return stories

  } catch (error) {
    console.error('Error in trend analysis:', error)
    throw error
  }
}

// Get emerging trends (stories gaining momentum)
export async function getEmergingTrends(days = 7) {
  try {
    // Compare current period vs previous period
    const currentPeriod = await getArticlesByTopic(days)
    const previousPeriod = await getArticlesByTopic(days, days) // offset by 'days'

    const trends = []

    for (const [topic, currentCount] of Object.entries(currentPeriod)) {
      const previousCount = previousPeriod[topic] || 0
      const growth = previousCount === 0 ? 100 : ((currentCount - previousCount) / previousCount) * 100

      if (growth > 50 && currentCount >= 3) { // 50%+ growth and at least 3 articles
        trends.push({
          topic,
          currentArticles: currentCount,
          previousArticles: previousCount,
          growthPercent: growth.toFixed(0),
          status: 'emerging'
        })
      }
    }

    return trends.sort((a, b) => b.growthPercent - a.growthPercent)

  } catch (error) {
    console.error('Error detecting emerging trends:', error)
    return []
  }
}

// Helper: Get article counts by topic
async function getArticlesByTopic(days, offset = 0) {
  const query = `
    SELECT title, summary, analysis
    FROM articles
    WHERE published_date >= NOW() - INTERVAL '${days + offset} days'
      AND published_date < NOW() - INTERVAL '${offset} days'
  `

  const result = await db.query(query)
  const topicCounts = {}

  result.rows.forEach(article => {
    const keywords = extractKeywords(article.title, article.summary || '', article.analysis)
    keywords.forEach(kw => {
      topicCounts[kw] = (topicCounts[kw] || 0) + 1
    })
  })

  return topicCounts
}

export default {
  getTopStories,
  getEmergingTrends
}
