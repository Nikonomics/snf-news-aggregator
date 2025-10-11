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

    const prompt = `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs). Analyze the following article and provide detailed, actionable insights for SNF operators and administrators running facilities on 1-2% margins.

CRITICAL: You must respond with ONLY a valid JSON object. Do not include any explanatory text, comments, or natural language before or after the JSON. Start your response with { and end with }.

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
  "relevanceReasoning": "why this matters explanation",
  "scope": "National/State/Regional/Local",
  "state": "Two-letter state code or N/A or comma-separated list"
}

REMINDER: Return ONLY the JSON object above. No additional text. No explanations. No markdown. Just pure JSON starting with { and ending with }.`;

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

      const article = {
        id: articleId++,
        title: item.title,
        summary: cleanContent,
        date: item.isoDate || item.pubDate,
        source: feed.source,
        category: categorizeArticle(item.title, cleanContent),
        impact: determineImpact(item.title, cleanContent),
        tags: extractTags(item.title, cleanContent, categorizeArticle(item.title, cleanContent)),
        relevanceScore: calculateRelevanceScore(item.title, cleanContent),
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

    // Get articles from database with PostgreSQL filtering
    const result = await getArticles({
      page,
      limit,
      category,
      impact,
      source,
      search
    })

    res.json({
      success: true,
      count: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      articles: result.articles
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

    // Get state-specific articles from database
    const result = await db.query(
      `SELECT * FROM articles
       WHERE scope = 'State'
       AND (states @> ARRAY[$1] OR analysis->>'state' LIKE $2)
       ORDER BY published_date DESC`,
      [stateCode.toUpperCase(), `%${stateCode.toUpperCase()}%`]
    )

    const stateArticles = result.rows

    // Get or generate AI state summary
    let stateSummary = null
    if (stateArticles.length > 0) {
      const summaryResult = await generateStateSummary(stateCode.toUpperCase(), stateArticles)
      if (summaryResult.success) {
        stateSummary = summaryResult.analysis
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
    }).catch(error => {
      console.error('Error fetching initial articles:', error)
    })

  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
