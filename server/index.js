import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Parser from 'rss-parser'
import NodeCache from 'node-cache'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import Anthropic from '@anthropic-ai/sdk'

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

// Cache configuration
const CACHE_TTL_SECONDS = 1800 // 30 minutes (1800 seconds)
const REFRESH_INTERVAL_MS = 1800000 // 30 minutes in milliseconds (30 * 60 * 1000)

// Cache for articles
const cache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS })

// RSS feed URLs
const RSS_FEEDS = [
  { url: 'https://skillednursingnews.com/feed/', source: 'Skilled Nursing News' }
  // Note: McKnight's blocks automated RSS access (403 Forbidden)
  // Many healthcare news sites actively block RSS scrapers for copyright protection
]

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

// Fetch and parse RSS feeds
async function fetchAllFeeds() {
  console.log('Fetching RSS feeds...')
  const allArticles = []
  let articleId = 1

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`Fetching ${feed.source}...`)
      const parsedFeed = await parser.parseURL(feed.url)

      for (const item of parsedFeed.items) {
        const content = item['content:encoded'] || item.description || item.contentSnippet || ''
        const cleanContent = content.replace(/<[^>]*>/g, '').substring(0, 500) // Strip HTML and limit length

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
    } catch (error) {
      console.error(`Error fetching ${feed.source}:`, error.message)
    }
  }

  // Sort by date (newest first)
  allArticles.sort((a, b) => new Date(b.date) - new Date(a.date))

  console.log(`Total articles fetched: ${allArticles.length}`)
  return allArticles
}

// Middleware
app.use(cors())
app.use(express.json())

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/articles', async (req, res) => {
  try {
    // Check cache first
    let articles = cache.get('articles')

    if (!articles) {
      // Fetch fresh data if cache is empty
      articles = await fetchAllFeeds()
      cache.set('articles', articles)
    }

    res.json({
      success: true,
      count: articles.length,
      articles: articles
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

// Force refresh endpoint (useful for testing)
app.post('/api/articles/refresh', async (req, res) => {
  try {
    const articles = await fetchAllFeeds()
    cache.set('articles', articles)
    res.json({
      success: true,
      message: 'Articles refreshed successfully',
      count: articles.length
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

// Conference API endpoints
let conferencesData = null

// Load conferences data
async function loadConferences() {
  try {
    const data = await readFile(join(__dirname, 'data', 'conferences.json'), 'utf-8')
    conferencesData = JSON.parse(data)
    console.log('✓ Conferences data loaded')
  } catch (error) {
    console.error('Error loading conferences data:', error.message)
  }
}

// GET /api/conferences - Return all conferences
app.get('/api/conferences', (req, res) => {
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

    const prompt = `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs). Analyze the following article and provide detailed insights for SNF operators and administrators.

Article Title: ${article.title}
Article Summary: ${article.summary}
Category: ${article.category}
Source: ${article.source}
Tags: ${article.tags.join(', ')}

Please provide:
1. **Key Insights** (3-5 bullet points): What are the most important takeaways from this article?
2. **Action Items** (4-6 specific steps): What should SNF operators do in response to this news?
3. **Risk Assessment** (identify 2-3 risks with severity levels - high/medium/low): What are the potential risks or challenges?
4. **Timeline Impact**: What is the urgency and timeline for response?
5. **Financial Impact**: What are the estimated cost implications?
6. **Why This Matters**: Explain the relevance and importance to SNF facilities in 2-3 sentences.

Format your response as JSON with the following structure:
{
  "keyInsights": ["insight1", "insight2", ...],
  "actionItems": ["action1", "action2", ...],
  "risks": [
    {"level": "high|medium|low", "description": "risk description"},
    ...
  ],
  "timelineImpact": "timeline description",
  "financialImpact": "financial impact description",
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
    // Load conferences data
    await loadConferences()

    // Fetch feeds on startup
    const articles = await fetchAllFeeds()
    cache.set('articles', articles)

    // Set up automatic refresh interval
    setInterval(refreshArticlesInBackground, REFRESH_INTERVAL_MS)

    app.listen(PORT, () => {
      console.log(`\n✓ Server running on http://localhost:${PORT}`)
      console.log(`✓ Articles cached: ${articles.length}`)
      console.log(`✓ Auto-refresh: Every ${REFRESH_INTERVAL_MS / 60000} minutes`)
      console.log(`✓ API endpoints:`)
      console.log(`  - GET  http://localhost:${PORT}/api/articles`)
      console.log(`  - POST http://localhost:${PORT}/api/articles/refresh`)
      console.log(`  - GET  http://localhost:${PORT}/api/health`)
      console.log(`  - GET  http://localhost:${PORT}/api/conferences`)
      console.log(`  - GET  http://localhost:${PORT}/api/conferences/state/:state`)
      console.log(`  - GET  http://localhost:${PORT}/api/conferences/national`)
      console.log(`  - GET  http://localhost:${PORT}/api/conferences/upcoming`)
      console.log(`  - POST http://localhost:${PORT}/api/analyze-article\n`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
