import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Parser from 'rss-parser'
import { readFileSync } from 'fs'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import * as db from './database/db.js'
import { insertArticle, insertArticleTags, getArticles, updateArticleContent, generateContentHash } from './database/articles.js'
import {
  getBills,
  getBillById,
  getBillByNumber,
  insertBill,
  updateBill,
  getUrgentBills,
  getBillsWithCommentDeadlines,
  getBillStats,
  createBillAlert
} from './database/bills.js'
import { generateStateSummary } from './services/stateAnalysis.js'
import { getStatesWithScores, getStatesByMetric, getTopBottomStates } from './services/stateComparison.js'
import { checkDuplicate, getDeduplicationStats } from './services/deduplication.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Initialize RSS parser and cache
const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'description']
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache'
  },
  timeout: 10000
})

// Auto-refresh configuration
const REFRESH_INTERVAL_MS = 14400000 // 4 hours in milliseconds (4 * 60 * 60 * 1000)

// RSS feed URLs
const RSS_FEEDS = [
  { url: 'https://skillednursingnews.com/feed/', source: 'Skilled Nursing News' },
  { url: 'https://news.google.com/rss/search?q=skilled+nursing+facilities&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=nursing+homes&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Medicare+SNF&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=long-term+care&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=CMS+nursing+home+news&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=post-acute+care&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=SNF+staffing&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=SNF+reimbursement&hl=en-US&gl=US&ceid=US:en', source: 'Google News' }
  // Note: McKnight's blocks automated RSS access (403 Forbidden)
  // Many healthcare news sites actively block RSS scrapers for copyright protection
]

// NEW: Process articles with enhanced deduplication
// Detect if an article update is significant enough to warrant re-analysis
function isSignificantUpdate(oldArticle, newArticle) {
  // Keywords indicating major status changes
  const significantKeywords = [
    'finalized', 'passed', 'approved', 'rejected', 'delayed', 'cancelled',
    'implemented', 'withdrawn', 'revised', 'amended', 'overturned',
    'breaking', 'update:', 'revised:', 'correction:', 'developing:'
  ]

  const oldTitle = (oldArticle.title || '').toLowerCase()
  const newTitle = (newArticle.title || '').toLowerCase()
  const oldSummary = (oldArticle.summary || '').toLowerCase()
  const newSummary = (newArticle.summary || '').toLowerCase()

  // Check if title gained significant keywords
  for (const keyword of significantKeywords) {
    if (newTitle.includes(keyword) && !oldTitle.includes(keyword)) {
      return true // Status changed (e.g., "proposed" → "finalized")
    }
  }

  // Check if summary gained significant keywords
  for (const keyword of significantKeywords) {
    if (newSummary.includes(keyword) && !oldSummary.includes(keyword)) {
      return true // Major development added
    }
  }

  // Check if content length changed significantly (>30% change)
  const oldLength = oldSummary.length
  const newLength = newSummary.length
  const lengthChange = Math.abs(newLength - oldLength) / oldLength
  if (lengthChange > 0.3) {
    return true // Substantial content added/removed
  }

  // Default: minor update (typo fix, formatting, etc.)
  return false
}

async function processArticlesWithDeduplication(rssArticles) {
  const stats = {
    total: rssArticles.length,
    duplicates: 0,
    updated: 0,
    new: 0,
    aiChecks: 0,
    errors: 0,
    reanalyzed: 0
  }

  const uniqueArticles = []

  for (const article of rssArticles) {
    try {
      // Check for duplicates using 4-stage system
      const dupeCheck = await checkDuplicate(article)

      if (dupeCheck.stats?.aiCalled) {
        stats.aiChecks++
      }

      if (dupeCheck.isDuplicate) {
        stats.duplicates++

        // If content changed significantly, decide whether to re-analyze
        if (dupeCheck.contentChanged) {
          stats.updated++

          // Check if this is a significant update that warrants re-analysis
          const oldArticle = dupeCheck.matchedArticle
          const significantUpdate = isSignificantUpdate(oldArticle, article)

          if (significantUpdate) {
            // Major update - re-analyze with AI to capture new developments
            console.log(`🔄 Significant update detected, re-analyzing: ${article.title}`)
            uniqueArticles.push(article)
            stats.reanalyzed = (stats.reanalyzed || 0) + 1
          } else {
            // Minor update - just update database, skip AI
            const contentHash = generateContentHash(article.title, article.summary)
            await updateArticleContent(dupeCheck.matchedId, {
              title: article.title,
              summary: article.summary,
              contentHash,
              lastContentUpdate: new Date()
            })
            console.log(`📝 Minor update, skipping AI: ${article.title.substring(0, 60)}...`)
          }
        } else {
          console.log(`⏭️  Skipping duplicate: ${article.title.substring(0, 60)}... (method: ${dupeCheck.method})`)
        }
      } else {
        // Not a duplicate - add to list for AI analysis
        uniqueArticles.push(article)
        stats.new++
      }
    } catch (error) {
      console.error(`Error processing "${article.title}":`, error.message)
      stats.errors++
      // On error, treat as new article to be safe
      uniqueArticles.push(article)
      stats.new++
    }
  }

  console.log(`\n📊 Deduplication Results:`)
  console.log(`   Total: ${stats.total}`)
  console.log(`   New: ${stats.new}`)
  console.log(`   Duplicates: ${stats.duplicates}`)
  console.log(`   Updated: ${stats.updated}`)
  console.log(`   Re-analyzed: ${stats.reanalyzed}`)
  console.log(`   AI Checks: ${stats.aiChecks}`)
  console.log(`   Errors: ${stats.errors}\n`)

  return uniqueArticles
}

// Categories mapping based on keywords
const categorizeArticle = (title, content) => {
  const text = `${title} ${content}`.toLowerCase()

  if (text.includes('regulation') || text.includes('cms') || text.includes('compliance') ||
      text.includes('survey') || text.includes('law') || text.includes('legal')) {
    return 'Regulatory'
  } else if (text.includes('medicare') || text.includes('medicaid') || text.includes('reimbursement') ||
             text.includes('payment') || text.includes('financial') || text.includes('cost')) {
    return 'Finance'
  } else if (text.includes('staff') || text.includes('workforce') || text.includes('hiring') ||
             text.includes('turnover') || text.includes('wage')) {
    return 'Workforce'
  } else if (text.includes('quality') || text.includes('star rating') || text.includes('infection') ||
             text.includes('safety') || text.includes('outcomes')) {
    return 'Quality'
  } else if (text.includes('technology') || text.includes('software') || text.includes('digital') ||
             text.includes('telehealth') || text.includes('ai') || text.includes('artificial intelligence')) {
    return 'Technology'
  } else {
    return 'Operations'
  }
}

// Determine impact level based on keywords
const determineImpact = (title, content) => {
  const text = `${title} ${content}`.toLowerCase()

  if (text.includes('mandate') || text.includes('required') || text.includes('penalty') ||
      text.includes('deadline') || text.includes('urgent') || text.includes('immediate')) {
    return 'high'
  } else if (text.includes('propose') || text.includes('consider') || text.includes('may') ||
             text.includes('could') || text.includes('plan')) {
    return 'medium'
  } else {
    return 'low'
  }
}

// Extract tags from content
const extractTags = (title, content, category) => {
  const tags = []
  const text = `${title} ${content}`.toLowerCase()

  const tagKeywords = {
    'CMS': /\bcms\b/,
    'Medicare': /medicare/,
    'Medicaid': /medicaid/,
    'Staffing': /staff|workforce|hiring/,
    'Compliance': /compliance|regulation/,
    'Quality': /quality|safety/,
    'Star Ratings': /star rating/,
    'Payment': /payment|reimbursement/,
    'Technology': /technology|digital|software/,
    'COVID-19': /covid|pandemic/,
    'Infection Control': /infection/,
    'Survey': /survey|inspection/,
    'M&A': /merger|acquisition|acquire|bought|purchase|sale|sold|deal\b|buyout/
  }

  for (const [tag, regex] of Object.entries(tagKeywords)) {
    if (regex.test(text)) {
      tags.push(tag)
    }
  }

  // Always include category as a tag
  if (!tags.includes(category)) {
    tags.push(category)
  }

  return tags.slice(0, 5) // Limit to 5 tags
}

// Calculate relevance score (simplified)
const calculateRelevanceScore = (title, content) => {
  const text = `${title} ${content}`.toLowerCase()
  let score = 70 // Base score

  // High relevance keywords
  const highRelevanceKeywords = ['snf', 'skilled nursing', 'nursing home', 'long-term care']
  highRelevanceKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 10
  })

  // Medium relevance keywords
  const medRelevanceKeywords = ['cms', 'medicare', 'medicaid', 'healthcare']
  medRelevanceKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 5
  })

  return Math.min(score, 100) // Cap at 100
}

// AI article analysis function
async function analyzeArticleWithAI(article) {
  try {
    console.log(`Analyzing new article: ${article.title}`);

    // Detect if this is an opinion/commentary piece
    const titleLower = article.title.toLowerCase();
    const summaryLower = (article.summary || '').toLowerCase();
    const combinedText = titleLower + ' ' + summaryLower;

    // Opinion indicators in title/content
    const opinionIndicators = [
      'opinion:', 'commentary:', 'perspective:', 'my view',
      'i think', 'i believe', 'in my opinion', 'personal reflection',
      'i feel', 'from my perspective', 'i often', 'i recently',
      'as i ', 'my ', 'foolproof childhood plan', 'my strategy'
    ];

    const hasOpinionLanguage = opinionIndicators.some(indicator => combinedText.includes(indicator));

    const isOpinionPiece = article.category === 'Opinion' ||
                          article.tags.some(tag => ['opinion', 'commentary', 'editorial', 'perspective', 'column'].includes(tag.toLowerCase())) ||
                          hasOpinionLanguage;

    if (isOpinionPiece) {
      console.log(`  → Detected as opinion/commentary piece`);
    }

    const prompt = isOpinionPiece
      ? `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs). This appears to be an opinion piece or commentary article. Provide a brief, lighter analysis focused on relevance.

CRITICAL: Respond with ONLY valid JSON. No text before or after. Start with { and end with }.

Article Title: ${article.title}
Article Summary: ${article.summary}
Category: ${article.category}
Source: ${article.source}

Requirements:

1. **Key Insights** (1-2 bullet points): What's the main theme or perspective? How might it relate to SNF operators? Keep it brief and relevant.

2. Skip detailed compliance timelines, financial impact, and action items for opinion pieces. Instead provide:
   - complianceTimeline: Set all fields to "N/A"
   - financialImpact: "No direct financial impact - opinion/commentary piece"
   - actionItems: Empty arrays for immediate, shortTerm, longTerm
   - risks: Empty array
   - whoNeedsToKnow: Just Administrator if it's industry-relevant, empty array otherwise

3. **Why This Matters** (relevanceReasoning): 1-2 sentences on why this perspective might be relevant to SNF operators, or state "General interest piece with limited operational relevance" if not directly applicable.

4. **Geographic Scope**: Based on content, set scope and state appropriately.

JSON Structure:
{
  "keyInsights": ["brief theme or perspective"],
  "complianceTimeline": {
    "commentDeadline": "N/A",
    "effectiveDate": "N/A",
    "prepTime": "N/A",
    "criticalDates": []
  },
  "financialImpact": "No direct financial impact - opinion/commentary piece",
  "whoNeedsToKnow": [],
  "actionItems": {
    "immediate": [],
    "shortTerm": [],
    "longTerm": []
  },
  "risks": [],
  "relevanceReasoning": "Brief explanation of relevance or 'General interest piece with limited operational relevance'",
  "scope": "National|State|Regional|Local",
  "state": "XX or N/A"
}

Return ONLY the JSON object. No markdown. No extra text.`
      : `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs). Analyze this article for SNF operators running facilities on 1-2% margins.

CRITICAL: Respond with ONLY valid JSON. No text before or after. Start with { and end with }.

Article Title: ${article.title}
Article Summary: ${article.summary}
Category: ${article.category}
Source: ${article.source}
Tags: ${article.tags.join(', ')}

IMPORTANT: If the article summary is limited or unavailable, focus your analysis on what can be reasonably inferred from the TITLE alone. Make educated guesses based on the title's topic and typical SNF industry patterns. Do NOT mention that content is limited or unavailable - just provide the best analysis you can based on the title.

Requirements:

1. **Key Insights** (1-2 bullet points): Write concise, actionable takeaways based on the title and any available content. Each should be 1-2 sentences. Focus on what matters most to operators. NEVER mention that content is "limited", "truncated", "unavailable", or that you cannot provide analysis. Instead, infer likely implications from the title. Avoid phrases like "this article discusses" or "may provide opportunities."

2. **Compliance Timeline**: Extract exact dates if mentioned. If not mentioned, use "N/A".
   - commentDeadline: Exact date or "N/A"
   - effectiveDate: Exact date or "N/A"
   - prepTime: Estimated time needed or "N/A"
   - criticalDates: Array of specific dates with context, or empty array

3. **Financial Impact** (be specific): Provide concrete numbers when possible. For a 100-bed facility, estimate:
   - Per-patient costs (daily/monthly/yearly)
   - One-time vs. ongoing costs
   - ROI timeline
   If no financial impact, state "No direct financial impact" and explain briefly.

4. **Who Needs to Know**: List 2-4 key roles. Be specific about why each role needs to know.

5. **Action Items**: List 1-3 actions per timeframe. Be specific and actionable. If no actions needed, use empty arrays.

6. **Risks**: Identify 1-3 real risks. Avoid generic risks. Each risk must have:
   - level: "high", "medium", or "low"
   - description: Brief, specific risk
   - mitigation: Concrete mitigation strategy

7. **Why This Matters** (relevanceReasoning): 2-3 sentences max. Explain direct impact on SNF operations. Skip if not relevant.

8. **Geographic Scope**:
   - scope: Must be exactly one of: "National", "State", "Regional", or "Local"
   - state: Two-letter state code(s) if state-specific, or "N/A"

JSON Structure:
{
  "keyInsights": ["concise insight 1", "concise insight 2"],
  "complianceTimeline": {
    "commentDeadline": "MM/DD/YYYY or N/A",
    "effectiveDate": "MM/DD/YYYY or N/A",
    "prepTime": "X days/weeks/months or N/A",
    "criticalDates": ["date with context"]
  },
  "financialImpact": "Specific financial impact with numbers, or 'No direct financial impact'",
  "whoNeedsToKnow": [
    {"role": "Title", "reason": "specific reason"}
  ],
  "actionItems": {
    "immediate": ["specific action"],
    "shortTerm": ["specific action"],
    "longTerm": ["specific action"]
  },
  "risks": [
    {"level": "high|medium|low", "description": "specific risk", "mitigation": "specific strategy"}
  ],
  "relevanceReasoning": "Direct, concise explanation of why this matters",
  "scope": "National|State|Regional|Local",
  "state": "XX or N/A"
}

Return ONLY the JSON object. No markdown. No extra text.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const anthropic = new Anthropic({
      apiKey: apiKey
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const analysisText = message.content[0].text;

    // Strip markdown code fences and extract only the JSON object
    let cleanedText = analysisText.trim();
    const oldCleanedText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Find the JSON object (starts with { and ends with })
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON object found in response');
    }

    cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);

    const analysis = JSON.parse(cleanedText);

    console.log(`✓ Analysis complete for: ${article.title}`);
    return { ...article, analysis };
  } catch (error) {
    console.error(`Error analyzing article: ${article.title}`, error.message);
    return null;
  }
}

// Fetch and parse RSS feeds (in parallel for speed)
async function fetchAllFeeds() {
  console.log('Fetching RSS feeds in parallel...')
  const startTime = Date.now()

  // Fetch all feeds in parallel
  const feedPromises = RSS_FEEDS.map(feed =>
    parser.parseURL(feed.url)
      .then(parsedFeed => ({ feed, parsedFeed, error: null }))
      .catch(error => ({ feed, parsedFeed: null, error }))
  )

  const results = await Promise.all(feedPromises)

  // Process results
  const allArticles = []
  let articleId = 1

  for (const { feed, parsedFeed, error } of results) {
    if (error) {
      console.error(`Error fetching ${feed.source}:`, error.message)
      continue
    }

    for (const item of parsedFeed.items) {
      const content = item['content:encoded'] || item.description || item.contentSnippet || ''
      const cleanContent = content.replace(/<[^>]*>/g, '').substring(0, 400) + '...' // Strip HTML and limit length

      // Extract actual source from Google News titles (format: "Title - Source")
      let actualSource = feed.source
      let cleanTitle = item.title

      if (feed.source === 'Google News' && item.title) {
        const lastDash = item.title.lastIndexOf(' - ')
        if (lastDash > 0) {
          actualSource = item.title.substring(lastDash + 3).trim()
          cleanTitle = item.title.substring(0, lastDash).trim()
        }
      }

      const article = {
        id: articleId++,
        title: cleanTitle,
        summary: cleanContent,
        date: item.isoDate || item.pubDate,
        source: actualSource,
        category: categorizeArticle(cleanTitle, cleanContent),
        impact: determineImpact(cleanTitle, cleanContent),
        tags: extractTags(cleanTitle, cleanContent, categorizeArticle(cleanTitle, cleanContent)),
        relevanceScore: calculateRelevanceScore(cleanTitle, cleanContent),
        url: item.link
      }

      allArticles.push(article)
    }

    console.log(`✓ Fetched ${parsedFeed.items.length} articles from ${feed.source}`)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`⚡ Fetched ${RSS_FEEDS.length} feeds in ${elapsed}s (parallel)`)

  // Sort by date (newest first)
  allArticles.sort((a, b) => new Date(b.date) - new Date(a.date))

  // Process articles with enhanced deduplication (4-stage system)
  console.log(`\n🔍 Processing ${allArticles.length} articles through deduplication...`)
  const newArticles = await processArticlesWithDeduplication(allArticles)
  console.log(`✅ Found ${newArticles.length} unique articles to analyze`)

  // Analyze and save articles in batches for better performance
  const BATCH_SIZE = 5 // Process 5 articles concurrently
  let savedCount = 0
  let totalAnalyzed = 0

  for (let i = 0; i < newArticles.length; i += BATCH_SIZE) {
    const batch = newArticles.slice(i, i + BATCH_SIZE)
    console.log(`\n🔄 Analyzing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(newArticles.length / BATCH_SIZE)} (${batch.length} articles)...`)

    // Analyze all articles in batch concurrently
    const analysisPromises = batch.map(article =>
      analyzeArticleWithAI(article)
        .then(result => ({ article, result, error: null }))
        .catch(error => ({ article, result: null, error }))
    )

    const results = await Promise.all(analysisPromises)

    // Save results to database
    for (const { article, result, error } of results) {
      totalAnalyzed++

      if (error) {
        console.error(`❌ Error analyzing "${article.title}":`, error.message)
        continue
      }

      if (!result) {
        console.error(`❌ No result for "${article.title}"`)
        continue
      }

      try {
        // Insert article into database
        const articleId = await insertArticle(result)

        // Insert tags
        if (result.tags && result.tags.length > 0) {
          await insertArticleTags(articleId, result.tags)
        }

        savedCount++
        console.log(`✓ Saved: ${article.title.substring(0, 70)}...`)
      } catch (error) {
        console.error(`❌ Error saving "${article.title}":`, error.message)
      }
    }

    console.log(`📊 Progress: ${totalAnalyzed}/${newArticles.length} analyzed, ${savedCount} saved`)
  }

  console.log(`\n✅ Completed: ${savedCount}/${newArticles.length} articles saved to database`)

  // Get all articles from database for response
  const result = await db.query('SELECT COUNT(*) as count FROM articles')
  console.log(`Total articles in database: ${result.rows[0].count}`)

  console.log(`Total articles fetched from RSS: ${allArticles.length}`)

  // Return articles from database
  const dbArticles = await getArticles({ limit: 1000 })
  return dbArticles.articles || []
}

// Middleware
app.use(cors())
app.use(express.json())

// Serve static frontend files in production
const distPath = join(__dirname, '../dist')
app.use(express.static(distPath))

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// GET /api/articles - Get articles with backend filtering
// Query params: page, limit, category, impact, source, search
// Example: /api/articles?category=Regulatory&impact=high&page=1&limit=50
app.get('/api/articles', async (req, res) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const category = req.query.category
    const impact = req.query.impact
    const source = req.query.source
    const search = req.query.search
    const scope = req.query.scope
    const states = req.query.states ? req.query.states.split(',') : undefined

    // Get articles from database with PostgreSQL filtering
    const result = await getArticles({
      page,
      limit,
      category,
      impact,
      source,
      search,
      scope,
      states
    })

    res.json({
      success: true,
      articles: result.articles,
      pagination: result.pagination
    })
  } catch (error) {
    console.error('Error fetching articles:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles',
      message: error.message
    })
  }
})

// Get filter statistics (counts for each filter option)
app.get('/api/articles/stats', async (req, res) => {
  try {
    // Get counts for each filter type
    const [categoryStats, impactStats, sourceStats, scopeStats] = await Promise.all([
      // Category counts
      db.query(`
        SELECT category, COUNT(*) as count
        FROM articles
        GROUP BY category
        ORDER BY category
      `),
      // Impact counts
      db.query(`
        SELECT impact, COUNT(*) as count
        FROM articles
        GROUP BY impact
        ORDER BY
          CASE impact
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
          END
      `),
      // Source counts
      db.query(`
        SELECT source, COUNT(*) as count
        FROM articles
        GROUP BY source
        ORDER BY count DESC
      `),
      // Scope counts
      db.query(`
        SELECT scope, COUNT(*) as count
        FROM articles
        WHERE scope IS NOT NULL
        GROUP BY scope
        ORDER BY scope
      `)
    ])

    // Get state counts (including both State and Local scope)
    const stateStats = await db.query(`
      SELECT UNNEST(states) as state, COUNT(*) as count
      FROM articles
      WHERE (scope = 'State' OR scope = 'Local')
        AND states IS NOT NULL
        AND array_length(states, 1) > 0
      GROUP BY state
      ORDER BY state
    `)

    // Format response
    const stats = {
      categories: categoryStats.rows.reduce((acc, row) => {
        acc[row.category] = parseInt(row.count)
        return acc
      }, {}),
      impacts: impactStats.rows.reduce((acc, row) => {
        acc[row.impact] = parseInt(row.count)
        return acc
      }, {}),
      sources: sourceStats.rows.reduce((acc, row) => {
        acc[row.source] = parseInt(row.count)
        return acc
      }, {}),
      scopes: scopeStats.rows.reduce((acc, row) => {
        acc[row.scope] = parseInt(row.count)
        return acc
      }, {}),
      states: stateStats.rows.reduce((acc, row) => {
        if (row.state && row.state !== 'N/A') {
          acc[row.state] = parseInt(row.count)
        }
        return acc
      }, {})
    }

    // Calculate total
    const totalResult = await db.query('SELECT COUNT(*) as count FROM articles')
    stats.total = parseInt(totalResult.rows[0].count)

    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error fetching article stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    })
  }
})

// Force refresh endpoint (triggers RSS fetch + analysis)
app.post('/api/articles/refresh', async (req, res) => {
  try {
    await fetchAllFeeds()

    // Get count from database
    const result = await db.query('SELECT COUNT(*) as count FROM articles')
    const totalArticles = parseInt(result.rows[0].count)

    res.json({
      success: true,
      message: 'Articles refreshed successfully',
      totalInDatabase: totalArticles
    })
  } catch (error) {
    console.error('Error refreshing articles:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to refresh articles',
      message: error.message
    })
  }
})

// Cost monitoring endpoint
app.get('/api/stats/costs', async (req, res) => {
  try {
    // Get article statistics
    const articlesResult = await db.query(`
      SELECT COUNT(*) as total_articles,
             COUNT(DISTINCT DATE(created_at)) as active_days
      FROM articles
    `)

    // Get deduplication stats (from analysis JSONB field)
    const dedupResult = await db.query(`
      SELECT COUNT(*) as total_processed
      FROM articles
      WHERE created_at > NOW() - INTERVAL '30 days'
    `)

    const totalArticles = parseInt(articlesResult.rows[0].total_articles)
    const activeDays = parseInt(articlesResult.rows[0].active_days)
    const articlesLast30Days = parseInt(dedupResult.rows[0].total_processed)

    // Cost estimates (based on current pricing)
    const AI_ANALYSIS_COST = 0.02 // $0.02 per article analysis
    const AI_DEDUP_COST = 0.001 // $0.001 per dedup check
    const DEDUP_AI_USAGE_RATE = 0.01 // ~1% of articles need AI dedup

    const estimatedMonthlyCost = (articlesLast30Days * AI_ANALYSIS_COST) +
                                 (articlesLast30Days * DEDUP_AI_USAGE_RATE * AI_DEDUP_COST)

    res.json({
      success: true,
      articles: {
        total: totalArticles,
        last30Days: articlesLast30Days,
        avgPerDay: Math.round(articlesLast30Days / 30)
      },
      costs: {
        estimatedMonthly: `$${estimatedMonthlyCost.toFixed(2)}`,
        perArticle: `$${AI_ANALYSIS_COST.toFixed(3)}`,
        dedupPerCheck: `$${AI_DEDUP_COST.toFixed(4)}`,
        dedupUsageRate: `${(DEDUP_AI_USAGE_RATE * 100).toFixed(1)}%`
      },
      savings: {
        withoutDedup: `$${(articlesLast30Days * 10 * AI_ANALYSIS_COST).toFixed(2)}`,
        withDedup: `$${estimatedMonthlyCost.toFixed(2)}`,
        saved: `$${((articlesLast30Days * 10 * AI_ANALYSIS_COST) - estimatedMonthlyCost).toFixed(2)}`,
        percentage: `${(((articlesLast30Days * 10 * AI_ANALYSIS_COST - estimatedMonthlyCost) / (articlesLast30Days * 10 * AI_ANALYSIS_COST)) * 100).toFixed(1)}%`
      }
    })
  } catch (error) {
    console.error('Error fetching cost stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cost statistics',
      message: error.message
    })
  }
})

// Conference API endpoints
let conferencesData = null

// Load conferences data
function loadConferences() {
  try {
    const conferencesPath = join(__dirname, 'data', 'conferences.json');
    const data = readFileSync(conferencesPath, 'utf8');
    conferencesData = JSON.parse(data);
    const totalConferences = (conferencesData.stateConferences?.length || 0) + (conferencesData.nationalConferences?.length || 0);
    console.log(`✓ Loaded ${totalConferences} conferences (${conferencesData.stateConferences?.length || 0} state, ${conferencesData.nationalConferences?.length || 0} national)`);
  } catch (error) {
    console.error('❌ Error loading conferences:', error);
  }
}

// GET /api/conferences - Return all conferences
app.get('/api/conferences', (req, res) => {
  console.log('DEBUG: conferencesData is:', conferencesData ? 'loaded' : 'null');
  if (!conferencesData) {
    return res.status(500).json({
      success: false,
      error: 'Conferences data not loaded'
    })
  }

  res.json({
    success: true,
    stateConferences: conferencesData.stateConferences,
    nationalConferences: conferencesData.nationalConferences,
    lastUpdated: conferencesData.lastUpdated
  })
})

// GET /api/conferences/state/:state - Filter by specific state
app.get('/api/conferences/state/:state', (req, res) => {
  if (!conferencesData) {
    return res.status(500).json({
      success: false,
      error: 'Conferences data not loaded'
    })
  }

  const state = req.params.state.toUpperCase()
  const stateConferences = conferencesData.stateConferences.filter(
    conf => conf.state === state
  )

  res.json({
    success: true,
    state: state,
    conferences: stateConferences,
    count: stateConferences.length
  })
})

// GET /api/conferences/national - Return only national conferences
app.get('/api/conferences/national', (req, res) => {
  if (!conferencesData) {
    return res.status(500).json({
      success: false,
      error: 'Conferences data not loaded'
    })
  }

  res.json({
    success: true,
    conferences: conferencesData.nationalConferences,
    count: conferencesData.nationalConferences.length
  })
})

// GET /api/conferences/upcoming - Return only future conferences
app.get('/api/conferences/upcoming', (req, res) => {
  if (!conferencesData) {
    return res.status(500).json({
      success: false,
      error: 'Conferences data not loaded'
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingState = conferencesData.stateConferences.filter(
    conf => new Date(conf.dateStart) >= today
  )

  const upcomingNational = conferencesData.nationalConferences.filter(
    conf => new Date(conf.dateStart) >= today
  )

  res.json({
    success: true,
    stateConferences: upcomingState,
    nationalConferences: upcomingNational,
    totalCount: upcomingState.length + upcomingNational.length
  })
})

// GET /api/state/:stateCode - Get state dashboard data
app.get('/api/state/:stateCode', async (req, res) => {
  const { stateCode } = req.params

  try {
    // Get state association info from conferences
    const stateAssociations = conferencesData?.stateConferences?.filter(
      conf => conf.state === stateCode.toUpperCase()
    ) || []

    // Get state-specific articles from database (including both State and Local scope)
    const result = await db.query(
      `SELECT * FROM articles
       WHERE (scope = 'State' OR scope = 'Local')
       AND (states @> ARRAY[$1] OR analysis->>'state' LIKE $2)
       ORDER BY published_date DESC`,
      [stateCode.toUpperCase(), `%${stateCode.toUpperCase()}%`]
    )

    const stateArticles = result.rows

    // Get or generate AI state summary with caching
    let stateSummary = null
    if (stateArticles.length > 0) {
      // Check if we have a cached summary
      const cachedSummary = await db.query(
        'SELECT summary, articles_analyzed, updated_at FROM state_summaries WHERE state = $1',
        [stateCode.toUpperCase()]
      )

      // Use cached summary if it exists and article count matches
      if (cachedSummary.rows.length > 0 && cachedSummary.rows[0].articles_analyzed === stateArticles.length) {
        console.log(`📦 Using cached summary for ${stateCode.toUpperCase()}`)
        stateSummary = cachedSummary.rows[0].summary
      } else {
        // Generate new summary
        console.log(`🤖 Generating new summary for ${stateCode.toUpperCase()}...`)
        const summaryResult = await generateStateSummary(stateCode.toUpperCase(), stateArticles)
        if (summaryResult.success) {
          stateSummary = summaryResult.analysis

          // Cache the new summary
          await db.query(
            `INSERT INTO state_summaries (state, summary, articles_analyzed)
             VALUES ($1, $2, $3)
             ON CONFLICT (state)
             DO UPDATE SET summary = $2, articles_analyzed = $3, updated_at = CURRENT_TIMESTAMP`,
            [stateCode.toUpperCase(), JSON.stringify(stateSummary), stateArticles.length]
          )
          console.log(`💾 Cached summary for ${stateCode.toUpperCase()}`)
        }
      }
    }

    res.json({
      success: true,
      state: stateCode.toUpperCase(),
      associations: stateAssociations,
      articles: stateArticles,
      articleCount: stateArticles.length,
      summary: stateSummary
    })

  } catch (error) {
    console.error('Error fetching state data:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/state/:stateCode/dashboard - Get comprehensive dashboard data
app.get('/api/state/:stateCode/dashboard', async (req, res) => {
  const { stateCode } = req.params

  try {
    // Load dashboard data from JSON file (for prototype)
    const dashboardPath = join(__dirname, 'data', `${stateCode.toLowerCase()}-dashboard-data.json`)
    const dashboardData = await readFile(dashboardPath, 'utf8')
    const data = JSON.parse(dashboardData)

    res.json({
      success: true,
      ...data
    })

  } catch (error) {
    console.error('Error fetching dashboard data:', error)

    // If file doesn't exist, return a helpful error
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: `Dashboard data not available for state: ${stateCode.toUpperCase()}`,
        message: 'Currently only Idaho (ID) has prototype dashboard data available'
      })
    }

    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/states/comparison - Get all states with scores
app.get('/api/states/comparison', (req, res) => {
  try {
    const metric = req.query.metric || 'overall'
    const states = getStatesByMetric(metric)

    res.json({
      success: true,
      metric: metric,
      count: states.length,
      states: states
    })
  } catch (error) {
    console.error('Error fetching state comparison data:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/states/rankings - Get top and bottom performers
app.get('/api/states/rankings', (req, res) => {
  try {
    const count = parseInt(req.query.count) || 10
    const rankings = getTopBottomStates(count)

    res.json({
      success: true,
      top10: rankings.top10,
      bottom10: rankings.bottom10
    })
  } catch (error) {
    console.error('Error fetching state rankings:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// AI Analysis endpoint
app.post('/api/analyze-article', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Anthropic API key not configured on server'
    })
  }

  const { article } = req.body

  if (!article) {
    return res.status(400).json({
      success: false,
      error: 'Article data is required'
    })
  }

  try {
    const anthropic = new Anthropic({
      apiKey: apiKey
    })

    const prompt = `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs). Analyze the following article and provide detailed, actionable insights for SNF operators and administrators running facilities on 1-2% margins.

Article Title: ${article.title}
Article Summary: ${article.summary}
Category: ${article.category}
Source: ${article.source}
Tags: ${article.tags.join(', ')}

Please provide:

1. **Key Insights** (3-5 bullet points): What are the most important takeaways from this article?

2. **Compliance Timeline** (if applicable):
   - Comment period deadline
   - Effective date / implementation deadline
   - Estimated preparation time needed
   - Any critical dates operators need to calendar

3. **Financial Impact** (be specific when possible):
   - Estimated cost per patient per day/month/year (if calculable)
   - Approximate impact on typical 100-bed facility
   - One-time costs vs. ongoing operational costs
   - Timeline for when financial impact will be felt

4. **Who Needs to Know**:
   - Which roles in the facility need to be informed (Administrator, DON, CFO, Board, etc.)
   - Why each role needs to know

5. **Action Items** (prioritized by timeline):
   - Immediate actions (next 7 days)
   - Short-term actions (30 days)
   - Long-term actions (60+ days)

6. **Risk Assessment**: Identify 2-3 risks with severity levels:
   - High/Medium/Low severity
   - Brief description of each risk
   - Mitigation strategies

7. **Why This Matters**: Explain the relevance and importance to SNF facilities in 2-3 sentences. If this is similar to past changes, provide that context.

8. **Geographic Scope** (2-3 sentences):
   - Scope: Is this story National, State-specific, Regional, or Local?
   - State: If state-specific, provide the 2-letter state code (e.g., AL, CA, TX, FL)
   - If multiple states mentioned, list all relevant state codes
   - If national or not state-specific, put "N/A" for state

Format your response as JSON with this structure:
{
  "keyInsights": ["insight1", "insight2", ...],
  "complianceTimeline": {
    "commentDeadline": "date or N/A",
    "effectiveDate": "date or N/A",
    "prepTime": "time estimate or N/A",
    "criticalDates": ["date1", "date2", ...]
  },
  "financialImpact": "detailed financial impact description",
  "whoNeedsToKnow": [
    {"role": "role name", "reason": "why they need to know"}
  ],
  "actionItems": {
    "immediate": ["action1", "action2", ...],
    "shortTerm": ["action1", "action2", ...],
    "longTerm": ["action1", "action2", ...]
  },
  "risks": [
    {"level": "high|medium|low", "description": "risk description", "mitigation": "mitigation strategy"}
  ],
  "relevanceReasoning": "why this matters explanation"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Extract the JSON from the response
    const responseText = message.content[0].text

    // Try to parse as JSON, or extract JSON from markdown code blocks
    let analysis
    try {
      analysis = JSON.parse(responseText)
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('Could not parse AI response as JSON')
      }
    }

    res.json({
      success: true,
      analysis: analysis
    })
  } catch (error) {
    console.error('Error analyzing article:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to analyze article',
      message: error.message
    })
  }
})

// Background refresh function
async function refreshArticlesInBackground() {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Refreshing articles in background...`)
    const articles = await fetchAllFeeds()
    cache.set('articles', articles)
    console.log(`[${new Date().toLocaleTimeString()}] ✓ Background refresh complete: ${articles.length} articles`)
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Error in background refresh:`, error.message)
  }
}

// POST /api/admin/update-google-news-sources - Extract actual sources from Google News articles
app.post('/api/admin/update-google-news-sources', async (req, res) => {
  try {
    console.log('Updating Google News article sources...')

    // Get all articles with "Google News" source
    const result = await db.query(`
      SELECT id, title, source
      FROM articles
      WHERE source = 'Google News'
    `)

    console.log(`Found ${result.rows.length} Google News articles to update`)

    let updated = 0
    let failed = 0

    for (const article of result.rows) {
      try {
        // Extract source from title (format: "Title - Source")
        const lastDash = article.title.lastIndexOf(' - ')

        if (lastDash > 0) {
          const actualSource = article.title.substring(lastDash + 3).trim()
          const cleanTitle = article.title.substring(0, lastDash).trim()

          // Update the article
          await db.query(`
            UPDATE articles
            SET source = $1, title = $2
            WHERE id = $3
          `, [actualSource, cleanTitle, article.id])

          updated++
        }
      } catch (err) {
        failed++
        console.error(`Error updating article ${article.id}:`, err.message)
      }
    }

    console.log(`✅ Update complete! Updated: ${updated}, Failed: ${failed}`)

    res.json({
      success: true,
      message: 'Google News sources updated',
      updated,
      failed,
      total: result.rows.length
    })
  } catch (error) {
    console.error('Error updating Google News sources:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/admin/create-state-summaries-table - Create state_summaries table
app.post('/api/admin/create-state-summaries-table', async (req, res) => {
  try {
    console.log('Creating state_summaries table...')

    const migrationSQL = `
      CREATE TABLE IF NOT EXISTS state_summaries (
          id SERIAL PRIMARY KEY,
          state VARCHAR(2) NOT NULL UNIQUE,
          summary JSONB NOT NULL,
          articles_analyzed INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_state_summaries_state ON state_summaries(state);
      CREATE INDEX IF NOT EXISTS idx_state_summaries_updated ON state_summaries(updated_at DESC);

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_state_summaries_updated_at ON state_summaries;
      CREATE TRIGGER update_state_summaries_updated_at
          BEFORE UPDATE ON state_summaries
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `

    await db.query(migrationSQL)

    console.log('✅ state_summaries table created successfully')

    res.json({
      success: true,
      message: 'state_summaries table created successfully'
    })
  } catch (error) {
    console.error('Error creating state_summaries table:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/admin/tag-opinion-pieces - Identify and tag opinion/commentary articles
app.post('/api/admin/tag-opinion-pieces', async (req, res) => {
  try {
    console.log('\n🔍 Identifying opinion/commentary pieces...')

    // Get all articles
    const result = await db.query('SELECT id, title, summary, category FROM articles')
    console.log(`Analyzing ${result.rows.length} articles...`)

    let updated = 0
    let alreadyTagged = 0

    // Opinion indicators (same as in analyzeArticleWithAI)
    const opinionIndicators = [
      'opinion:', 'commentary:', 'perspective:', 'my view',
      'i think', 'i believe', 'in my opinion', 'personal reflection',
      'i feel', 'from my perspective', 'i often', 'i recently',
      'as i ', 'my '
    ]

    for (const article of result.rows) {
      // Skip if already categorized as Opinion
      if (article.category === 'Opinion') {
        alreadyTagged++
        continue
      }

      const titleLower = (article.title || '').toLowerCase()
      const summaryLower = (article.summary || '').toLowerCase()
      const combinedText = titleLower + ' ' + summaryLower

      // Check if it matches opinion criteria
      const hasOpinionLanguage = opinionIndicators.some(indicator => combinedText.includes(indicator))

      if (hasOpinionLanguage) {
        // Update category to Opinion
        await db.query('UPDATE articles SET category = $1 WHERE id = $2', ['Opinion', article.id])
        updated++
        console.log(`  ✓ Tagged: "${article.title.substring(0, 60)}..."`)
      }
    }

    console.log('\n✅ Tagging complete!')
    console.log(`   Updated: ${updated}`)
    console.log(`   Already tagged: ${alreadyTagged}`)
    console.log(`   Total checked: ${result.rows.length}`)

    res.json({
      success: true,
      message: 'Opinion pieces tagged',
      updated,
      alreadyTagged,
      total: result.rows.length
    })
  } catch (error) {
    console.error('Error tagging opinion pieces:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Admin endpoint to cleanup duplicate articles
app.post('/api/admin/cleanup-duplicates', async (req, res) => {
  try {
    console.log('\n🔍 Finding duplicate articles...')

    // Find articles with the same normalized title
    const result = await db.query(`
      SELECT
        id,
        title,
        published_date,
        source,
        url,
        LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9\\s]', '', 'g')) as normalized_title
      FROM articles
      ORDER BY normalized_title, published_date ASC
    `)

    console.log(`Analyzing ${result.rows.length} articles...`)

    // Group by normalized title
    const titleGroups = {}
    for (const article of result.rows) {
      const key = article.normalized_title
      if (!titleGroups[key]) {
        titleGroups[key] = []
      }
      titleGroups[key].push(article)
    }

    // Find duplicates (groups with more than 1 article)
    const duplicateGroups = Object.entries(titleGroups)
      .filter(([_, articles]) => articles.length > 1)
      .sort((a, b) => b[1].length - a[1].length) // Sort by most duplicates first

    console.log(`Found ${duplicateGroups.length} sets of duplicates`)

    let totalDeleted = 0
    const deletedArticles = []

    for (const [normalizedTitle, articles] of duplicateGroups) {
      // Keep the oldest one (first published)
      const keeper = articles[0]
      const duplicates = articles.slice(1)

      console.log(`\n📄 "${keeper.title}" - keeping ID ${keeper.id}, deleting ${duplicates.length} duplicates`)

      for (const dup of duplicates) {
        // Delete the duplicate
        await db.query('DELETE FROM articles WHERE id = $1', [dup.id])
        totalDeleted++
        deletedArticles.push({
          id: dup.id,
          title: dup.title,
          date: dup.published_date
        })
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} duplicates`)

    res.json({
      success: true,
      message: 'Duplicates cleaned up',
      totalDeleted,
      duplicateGroups: duplicateGroups.length,
      totalArticles: result.rows.length,
      remainingArticles: result.rows.length - totalDeleted
    })
  } catch (error) {
    console.error('Error cleaning up duplicates:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ============================================================
// LEGISLATION TRACKING API ENDPOINTS
// ============================================================


// GET /api/bills - Get bills with filtering and pagination
app.get('/api/bills', async (req, res) => {
  try {
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
    } = req.query

    const result = await getBills({
      page: parseInt(page),
      limit: parseInt(limit),
      source,
      jurisdiction,
      state,
      priority,
      minRelevanceScore: minRelevanceScore ? parseInt(minRelevanceScore) : undefined,
      hasCommentPeriod: hasCommentPeriod ? hasCommentPeriod === 'true' : undefined,
      search,
      sortBy,
      sortOrder
    })

    res.json({
      success: true,
      bills: result.bills,
      pagination: result.pagination
    })
  } catch (error) {
    console.error('Error fetching bills:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bills',
      message: error.message
    })
  }
})

// GET /api/bills/stats - Get bill statistics
app.get('/api/bills/stats', async (req, res) => {
  try {
    const stats = await getBillStats()

    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error fetching bill stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bill statistics',
      message: error.message
    })
  }
})

// GET /api/bills/urgent - Get urgent bills (high priority or upcoming deadlines)
app.get('/api/bills/urgent', async (req, res) => {
  try {
    const urgentBills = await getUrgentBills()

    res.json({
      success: true,
      count: urgentBills.length,
      bills: urgentBills
    })
  } catch (error) {
    console.error('Error fetching urgent bills:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch urgent bills',
      message: error.message
    })
  }
})

// GET /api/bills/comment-deadlines - Get bills with upcoming comment deadlines
app.get('/api/bills/comment-deadlines', async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 30
    const bills = await getBillsWithCommentDeadlines(daysAhead)

    res.json({
      success: true,
      daysAhead,
      count: bills.length,
      bills
    })
  } catch (error) {
    console.error('Error fetching bills with comment deadlines:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bills with comment deadlines',
      message: error.message
    })
  }
})

// GET /api/bills/:id - Get a single bill by ID
app.get('/api/bills/:id', async (req, res) => {
  try {
    const billId = parseInt(req.params.id)
    const bill = await getBillById(billId)

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found'
      })
    }

    res.json({
      success: true,
      bill
    })
  } catch (error) {
    console.error('Error fetching bill:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bill',
      message: error.message
    })
  }
})

// POST /api/bills - Create a new bill (admin/collector use)
app.post('/api/bills', async (req, res) => {
  try {
    const bill = req.body

    // Validate required fields
    if (!bill.bill_number || !bill.title || !bill.source || !bill.jurisdiction || !bill.url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bill_number, title, source, jurisdiction, url'
      })
    }

    // Check if bill already exists
    const existing = await getBillByNumber(bill.bill_number, bill.source)
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Bill already exists',
        existingBillId: existing.id
      })
    }

    const billId = await insertBill(bill)

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      billId
    })
  } catch (error) {
    console.error('Error creating bill:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create bill',
      message: error.message
    })
  }
})

// PUT /api/bills/:id - Update an existing bill
app.put('/api/bills/:id', async (req, res) => {
  try {
    const billId = parseInt(req.params.id)
    const updates = req.body

    // Check if bill exists
    const existing = await getBillById(billId)
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found'
      })
    }

    await updateBill(billId, updates)

    res.json({
      success: true,
      message: 'Bill updated successfully'
    })
  } catch (error) {
    console.error('Error updating bill:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update bill',
      message: error.message
    })
  }
})

// POST /api/bills/:id/analyze - Trigger AI analysis for a specific bill
app.post('/api/bills/:id/analyze', async (req, res) => {
  try {
    const billId = parseInt(req.params.id)

    // Get the bill
    const bill = await getBillById(billId)
    if (!bill) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found'
      })
    }

    // TODO: Implement AI analysis service
    // For now, return a placeholder
    res.json({
      success: true,
      message: 'AI analysis will be implemented in the next phase',
      billId
    })
  } catch (error) {
    console.error('Error analyzing bill:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to analyze bill',
      message: error.message
    })
  }
})

// POST /api/bills/collect - Trigger bill collection from external sources
app.post('/api/bills/collect', async (req, res) => {
  try {
    const { source } = req.body // 'congress', 'federal_register', 'legiscan'

    if (!source) {
      return res.status(400).json({
        success: false,
        error: 'Source is required (congress, federal_register, or legiscan)'
      })
    }

    // TODO: Implement bill collection services
    // For now, return a placeholder
    res.json({
      success: true,
      message: 'Bill collection will be implemented in the next phase',
      source
    })
  } catch (error) {
    console.error('Error collecting bills:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to collect bills',
      message: error.message
    })
  }
})

// Start server and fetch feeds on startup
async function startServer() {
  try {
    // Initialize database
    await db.testConnection()
    await db.initializeDatabase()

    // Load conferences data
    loadConferences()

    // Fallback middleware - serve index.html for all non-API routes (for React Router)
    // This must be last, after all other routes
    app.use((req, res) => {
      res.sendFile(join(distPath, 'index.html'))
    })

    // Start server immediately
    app.listen(PORT, () => {
      console.log(`\n✓ Server running on http://localhost:${PORT}`)
      console.log(`✓ Conferences loaded: ${conferencesData ? 'yes' : 'no'}`)
      console.log(`✓ Auto-refresh: Every ${REFRESH_INTERVAL_MS / 60000} minutes`)
      console.log(`✓ API endpoints:`)
      console.log(`  - GET  http://localhost:${PORT}/api/articles`)
      console.log(`  - POST http://localhost:${PORT}/api/articles/refresh`)
      console.log(`  - GET  http://localhost:${PORT}/api/health`)
      console.log(`  - GET  http://localhost:${PORT}/api/conferences`)
      console.log(`  - GET  http://localhost:${PORT}/api/conferences/state/:state`)
      console.log(`  - GET  http://localhost:${PORT}/api/conferences/national`)
      console.log(`  - GET  http://localhost:${PORT}/api/conferences/upcoming`)
      console.log(`  - GET  http://localhost:${PORT}/api/states/comparison?metric=overall`)
      console.log(`  - GET  http://localhost:${PORT}/api/states/rankings`)
      console.log(`  - POST http://localhost:${PORT}/api/analyze-article\n`)
    })

    // Fetch feeds after server starts (non-blocking)
    fetchAllFeeds().then(articles => {
      cache.set('articles', articles)
      console.log(`✓ Articles cached: ${articles.length}`)

      // Set up automatic refresh interval
      setInterval(refreshArticlesInBackground, REFRESH_INTERVAL_MS)

      // Set up daily duplicate cleanup (runs at 3am)
      const scheduleCleanup = () => {
        const now = new Date()
        const next3AM = new Date()
        next3AM.setHours(3, 0, 0, 0)
        if (next3AM <= now) {
          next3AM.setDate(next3AM.getDate() + 1)
        }
        const msUntil3AM = next3AM - now

        setTimeout(async () => {
          console.log('\n🧹 Running automated duplicate cleanup...')
          try {
            const result = await db.query(`
              SELECT id, title, published_date, LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9\\s]', '', 'g')) as normalized_title
              FROM articles
              ORDER BY normalized_title, published_date ASC
            `)

            const titleGroups = {}
            for (const article of result.rows) {
              const key = article.normalized_title
              if (!titleGroups[key]) titleGroups[key] = []
              titleGroups[key].push(article)
            }

            const duplicateGroups = Object.entries(titleGroups).filter(([_, articles]) => articles.length > 1)
            let totalDeleted = 0

            for (const [_, articles] of duplicateGroups) {
              const duplicates = articles.slice(1)
              for (const dup of duplicates) {
                await db.query('DELETE FROM articles WHERE id = $1', [dup.id])
                totalDeleted++
              }
            }

            if (totalDeleted > 0) {
              console.log(`✓ Automated cleanup removed ${totalDeleted} duplicates`)
            } else {
              console.log(`✓ No duplicates found`)
            }
          } catch (error) {
            console.error('❌ Automated cleanup failed:', error)
          }

          // Schedule next cleanup
          scheduleCleanup()
        }, msUntil3AM)

        console.log(`✓ Duplicate cleanup scheduled for ${next3AM.toLocaleString()}`)
      }

      scheduleCleanup()
    }).catch(error => {
      console.error('Error fetching initial articles:', error)
    })

  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
