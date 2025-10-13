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
import { getTopStories, getEmergingTrends } from './services/trendAnalysis.js'
import { getArticleImage } from './utils/imageExtractor.js'
import cron from 'node-cron'

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

// Refined category taxonomy
// Tier 1 (High): Strategic intelligence - full AI analysis
// Tier 2 (Medium): Tactical insights - lighter AI analysis
// Tier 3 (Low): Community interest - minimal/no AI analysis

const categorizeArticle = (title, content) => {
  const text = `${title} ${content}`.toLowerCase()

  // Check for community fluff first (should be filtered out)
  if (text.match(/obituary|pet parade|craft fair|holiday party|bingo|birthday celebrat|ribbon cutting/)) {
    if (!text.match(/ceo|cfo|administrator|president|founder|industry leader/)) {
      return 'Community Interest'
    }
  }

  // M&A gets priority check (before Finance) since acquisition keywords might also match financial terms
  if (text.includes('acquisition') || text.includes('merger') || text.includes('acquired') ||
      text.includes('buyout') || text.includes('acquires') || text.includes('m&a') ||
      text.includes('consolidation') || text.includes('private equity') || text.includes('pe firm') ||
      text.includes('takeover') || text.includes('deal') && (text.includes('billion') || text.includes('million'))) {
    return 'Market Intelligence'
  } else if (text.includes('regulation') || text.includes('cms') || text.includes('compliance') ||
      text.includes('survey') || text.includes('law') || text.includes('legal') ||
      text.includes('penalty') || text.includes('fine') || text.includes('deficiency')) {
    return 'Regulatory'
  } else if (text.includes('medicare') || text.includes('medicaid') || text.includes('reimbursement') ||
             text.includes('payment') || text.includes('rate cut') || text.includes('rate increase') ||
             text.includes('bankruptcy') || text.includes('closure') || text.includes('financial')) {
    return 'Financial'
  } else if (text.includes('staff') || text.includes('workforce') || text.includes('hiring') ||
             text.includes('turnover') || text.includes('wage') || text.includes('staffing ratio') ||
             text.includes('minimum staffing') || text.includes('union')) {
    return 'Workforce'
  } else if (text.includes('quality') || text.includes('star rating') || text.includes('infection') ||
             text.includes('safety') || text.includes('outcomes') || text.includes('clinical')) {
    return 'Quality'
  } else if (text.includes('technology') || text.includes('software') || text.includes('digital') ||
             text.includes('telehealth') || text.includes('ai') || text.includes('artificial intelligence')) {
    return 'Technology'
  } else if (text.match(/workshop|program|best practice|training|education/) &&
             !text.match(/obituary|pet|craft|party/)) {
    return 'Best Practices'
  } else {
    return 'Operations'
  }
}

// AI-based triage to determine relevance tier (using cheap Claude Haiku)
async function triageArticleRelevance(article) {
  const triagePrompt = `You are an expert healthcare policy analyst. Quickly classify this article's relevance to skilled nursing facility (SNF) operators.

Article Title: ${article.title}
Article Summary: ${article.summary || 'N/A'}
Source: ${article.source}

Classification Task:
Determine if this article is:
- **HIGH**: Directly relevant to SNF operations (CMS regulations, Medicare/Medicaid reimbursement, staffing mandates, compliance requirements, quality/star ratings, M&A activity, financial/operational guidance, enforcement actions)
- **MEDIUM**: Adjacent healthcare content with contextual value (broader healthcare policy, market trends, industry analysis, operational best practices, technology/innovation, workforce trends)
- **LOW**: Not relevant to SNF operations (community events, obituaries, pet parades, local news, political opinions unrelated to healthcare policy, general news)

CRITICAL: Respond with ONLY a JSON object. No text before or after.

{
  "relevanceTier": "high|medium|low",
  "reasoning": "1-2 sentence explanation of why you chose this tier"
}

Return ONLY the JSON object. No markdown. No extra text.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-3-5-20241022', // Cheap, fast model for triage
        max_tokens: 200,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: triagePrompt
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`Triage API error: ${response.status}`)
    }

    const result = await response.json()
    const textContent = result.content[0].text

    // Clean up response
    let cleanedResponse = textContent.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '')
    }

    const triageResult = JSON.parse(cleanedResponse)
    console.log(`  → AI Triage: ${triageResult.relevanceTier} - ${triageResult.reasoning}`)

    return triageResult.relevanceTier

  } catch (error) {
    console.error('Triage failed, falling back to keyword-based:', error.message)
    // Fallback to simple keyword-based triage
    const text = `${article.title} ${article.summary || ''}`.toLowerCase()
    if (text.match(/obituary|pet parade|craft fair|holiday party|bingo|birthday celebrat/)) {
      return 'low'
    }
    if (text.match(/cms|medicare|medicaid|regulation|reimbursement|staffing|compliance/)) {
      return 'high'
    }
    return 'medium'
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

    // PASS 1: AI Triage to determine relevance tier (cheap, fast)
    if (!article.relevance_tier) {
      article.relevance_tier = await triageArticleRelevance(article);
      console.log(`  → AI Triage assigned tier: ${article.relevance_tier}`);
    }

    // Skip expensive AI analysis for low-tier articles (community fluff)
    if (article.relevance_tier === 'low') {
      console.log(`  → Skipping full AI analysis for low-tier article (cost savings)`);
      return {
        keyInsights: [
          "Community interest article with minimal operational relevance"
        ],
        complianceTimeline: {
          commentDeadline: "N/A",
          effectiveDate: "N/A",
          prepTime: "N/A",
          criticalDates: []
        },
        financialImpact: "No significant financial impact on SNF operations.",
        whoNeedsToKnow: [],
        actionItems: {
          immediate: [],
          shortTerm: [],
          longTerm: []
        },
        risks: [],
        relevanceReasoning: "Low-relevance community content (pet parade, obituary, local event, etc.)",
        scope: "Local",
        state: "N/A",
        entities: {
          organizations: [],
          regulations: [],
          people: [],
          financialFigures: []
        },
        topicTags: ["Community Interest"],
        temporalSignals: {
          isRecurring: false,
          precedents: [],
          cyclicality: "ad-hoc",
          leadTime: "none"
        },
        impactFactors: {
          facilityTypes: [],
          bedSizes: [],
          payorMix: [],
          geography: [],
          ownershipTypes: []
        },
        connections: {
          relatedTopics: [],
          causeAndEffect: "N/A",
          marketForces: []
        }
      };
    }

    // PASS 2: Deep AI Analysis (expensive Claude Sonnet 4, only for high/medium tier)
    console.log(`  → Running deep analysis (Pass 2) with Claude Sonnet 4`);

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

9. **Urgency Score** (0-100): How time-sensitive is this? Consider:
   - 90-100: Immediate action required (comment periods closing, breaking regulatory changes)
   - 70-89: Important within next 30 days (upcoming deadlines, significant policy shifts)
   - 40-69: Monitor and plan (emerging trends, medium-term changes)
   - 20-39: Informational, no immediate action (industry updates, long-term trends)
   - 0-19: Low priority (opinions, general news, minor updates)

10. **Article Type**: Classify as exactly one of:
   - "Breaking News": Time-sensitive news, enforcement actions, major announcements
   - "Regulatory Update": CMS rules, state regulations, compliance requirements
   - "Policy Analysis": Deep dives into policy implications
   - "Financial/Market": Reimbursement, M&A, financial performance, market trends
   - "Operational Guidance": Best practices, implementation strategies
   - "Opinion/Commentary": Opinion pieces, editorials, thought leadership
   - "Industry Trend": General market trends, future predictions

11. **Implementation Complexity**: Rate as "Low", "Medium", or "High" based on:
   - Low: Informational only, no implementation needed
   - Medium: Some operational changes, training, or policy updates required
   - High: Significant operational overhaul, capital investment, or major compliance effort

12. **Competitive Intelligence**: Briefly note (1-2 sentences):
   - Which operators/competitors are mentioned or affected?
   - How might this create competitive advantages or disadvantages?
   - Are specific chains/companies positioned better/worse?
   If not applicable, use "N/A"

13. **Strategic Implications**: Beyond immediate impact, what are the 2nd and 3rd order effects? (1-2 sentences)
   - How might this change competitive dynamics?
   - What downstream operational or strategic shifts might be needed?
   If not applicable, use "N/A"

14. **M&A Details** (ONLY for articles about mergers, acquisitions, or sales):
   If this article is about a merger, acquisition, joint venture, or facility sale, extract:
   - acquirer: Full company name of the buyer (e.g., "Genesis HealthCare", "Ensign Group", "Omega Healthcare Investors")
   - target: Name of facility/company being acquired (e.g., "Sunrise Senior Living", "5 facilities in Ohio")
   - dealValue: Transaction value (e.g., "$45 million", "Undisclosed", "N/A if not mentioned")
   - dealType: One of: "Acquisition", "Merger", "Joint Venture", "Asset Sale", "Portfolio Sale"
   - facilityCount: Number of facilities involved (integer, or null if not mentioned)
   - states: Array of state codes where facilities are located (e.g., ["PA", "OH", "MI"])
   - acquirerType: One of: "Public Company", "Private Equity", "REIT", "Non-Profit", "Family Office", "Unknown"
   - sellerType: One of: "Public Company", "Private Equity", "REIT", "Non-Profit", "Family Office", "Individual Owner", "Unknown"
   - strategicRationale: Brief (1 sentence) explanation of why this deal matters strategically

   If NOT an M&A article, omit this field entirely (do not include null or empty object)

15. **Structured Entities** (for cross-article pattern recognition):
   Extract key entities mentioned:
   - organizations: Array of organization names (e.g., ["CMS", "California Dept of Health", "AHCA", "Genesis HealthCare"])
   - regulations: Array of specific regulations mentioned (e.g., ["42 CFR 483.70", "AB 1502", "SNF PPS Final Rule 2025"])
   - people: Array of key people mentioned with titles (e.g., [{"name": "Jane Smith", "title": "CMS Administrator"}])
   - financialFigures: Array of specific dollar amounts or percentages with context (e.g., [{"amount": "$15.50", "context": "per patient per day"}, {"amount": "12%", "context": "Medicare rate increase"}])

16. **Topic Tags** (for clustering and pattern detection):
   Assign 3-5 specific topic tags from this list:
   ["Staffing", "Reimbursement", "Quality Measures", "Survey/Enforcement", "Minimum Staffing Ratios",
    "Medicare Advantage", "Medicaid Rates", "5-Star Ratings", "Financial Performance", "Bankruptcy/Closure",
    "Technology/Innovation", "Workforce Development", "Regulatory Compliance", "M&A Activity", "Market Trends",
    "COVID-19", "Infection Control", "Resident Rights", "Clinical Operations", "Private Equity"]

17. **Temporal Signals** (for trend prediction):
   - isRecurring: true/false - Has this type of event happened before?
   - precedents: Array of similar past events (e.g., ["Similar rate cut in Q3 2024", "NY implemented same policy in 2023"])
   - cyclicality: "annual" | "quarterly" | "ad-hoc" | "unknown"
   - leadTime: How much advance warning typically exists for this type of change? (e.g., "90 days", "6 months", "none")

18. **Impact Factors** (who is most affected):
   - facilityTypes: Array from ["SNF", "ALF", "Memory Care", "CCRC", "All Post-Acute"]
   - bedSizes: Array from ["<50 beds", "50-100 beds", "100-200 beds", "200+ beds", "All sizes"]
   - payorMix: Array from ["High Medicaid", "High Medicare", "High Private Pay", "Mixed", "All"]
   - geography: Array from ["Urban", "Suburban", "Rural", "All"]
   - ownershipTypes: Array from ["Chain-owned", "Independent", "Non-Profit", "For-Profit", "All"]

19. **Cross-Article Connections** (for meta-analysis):
   - relatedTopics: Array of 2-3 related topics this connects to (e.g., ["reimbursement-pressure", "staffing-crisis", "quality-metrics"])
   - causeAndEffect: Describe if this is a cause or effect of another trend (1 sentence, or "N/A")
   - marketForces: Array of market dynamics at play (e.g., ["consolidation", "margin-compression", "labor-shortage", "regulatory-burden"])

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
  "state": "XX or N/A",
  "urgencyScore": 0-100,
  "articleType": "Breaking News|Regulatory Update|Policy Analysis|Financial/Market|Operational Guidance|Opinion/Commentary|Industry Trend",
  "implementationComplexity": "Low|Medium|High",
  "competitiveIntelligence": "Brief competitive analysis or N/A",
  "strategicImplications": "2nd and 3rd order effects or N/A",
  "maDetails": {
    "acquirer": "Company Name",
    "target": "Facility/Company Name",
    "dealValue": "$XX million or Undisclosed",
    "dealType": "Acquisition|Merger|Joint Venture|Asset Sale|Portfolio Sale",
    "facilityCount": 5,
    "states": ["PA", "OH"],
    "acquirerType": "Public Company|Private Equity|REIT|Non-Profit|Family Office|Unknown",
    "sellerType": "Public Company|Private Equity|REIT|Non-Profit|Family Office|Individual Owner|Unknown",
    "strategicRationale": "Brief explanation"
  },
  "entities": {
    "organizations": ["CMS", "Genesis HealthCare"],
    "regulations": ["42 CFR 483.70"],
    "people": [{"name": "Jane Smith", "title": "CMS Administrator"}],
    "financialFigures": [{"amount": "$15.50", "context": "per patient per day"}]
  },
  "topicTags": ["Reimbursement", "Staffing", "Quality Measures"],
  "temporalSignals": {
    "isRecurring": true,
    "precedents": ["Similar event in Q3 2024"],
    "cyclicality": "annual",
    "leadTime": "90 days"
  },
  "impactFactors": {
    "facilityTypes": ["SNF"],
    "bedSizes": ["100-200 beds"],
    "payorMix": ["High Medicaid"],
    "geography": ["Urban"],
    "ownershipTypes": ["For-Profit"]
  },
  "connections": {
    "relatedTopics": ["reimbursement-pressure", "staffing-crisis"],
    "causeAndEffect": "This rate cut will increase agency staffing costs",
    "marketForces": ["margin-compression", "labor-shortage"]
  }
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

      // Extract image from RSS feed (fast, no HTTP requests)
      const imageUrl = await getArticleImage(item, item.link, cleanTitle)

      const category = categorizeArticle(cleanTitle, cleanContent)
      const article = {
        id: articleId++,
        title: cleanTitle,
        summary: cleanContent,
        date: item.isoDate || item.pubDate,
        source: actualSource,
        category: category,
        impact: determineImpact(cleanTitle, cleanContent),
        tags: extractTags(cleanTitle, cleanContent, category),
        relevanceScore: calculateRelevanceScore(cleanTitle, cleanContent),
        url: item.link,
        image_url: imageUrl,
        relevance_tier: determineRelevanceTier(cleanTitle, cleanContent, category)
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

// Serve static frontend files in production (but not /api routes)
const distPath = join(__dirname, '../dist')
app.use((req, res, next) => {
  // Skip static file serving for /api routes
  if (req.path.startsWith('/api')) {
    return next()
  }
  express.static(distPath)(req, res, next)
})

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

// GET /api/articles/priority - Get priority feed (filtered by urgency, type, and relevance)
app.get('/api/articles/priority', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15 // Default to top 15 articles

    // Query for priority articles with enhanced filtering
    const query = `
      SELECT
        id, external_id, title, summary, url, source, published_date as date,
        category, impact, relevance_score, scope, states, analysis, relevance_tier,
        image_url, created_at, updated_at
      FROM articles
      WHERE
        -- Only show high and medium relevance tier articles (filter out low-tier noise)
        relevance_tier IN ('high', 'medium')
        -- Filter out opinion/commentary articles
        AND (analysis->>'articleType' IS NULL OR analysis->>'articleType' != 'Opinion/Commentary')
        -- Exclude low urgency articles (below 20)
        AND (analysis->>'urgencyScore' IS NULL OR CAST(analysis->>'urgencyScore' AS INTEGER) >= 20)
        -- Only include National, Regional, or State scope (filter out purely local news)
        AND (scope IS NULL OR scope IN ('National', 'Regional', 'State'))
      ORDER BY
        -- Priority scoring: tier first, then urgency score, then impact, then date
        CASE relevance_tier
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 1
          ELSE 0
        END DESC,
        CAST(COALESCE(analysis->>'urgencyScore', '50') AS INTEGER) DESC,
        CASE impact
          WHEN 'high' THEN 3
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 1
          ELSE 0
        END DESC,
        published_date DESC
      LIMIT $1
    `

    const result = await db.query(query, [limit])

    res.json({
      success: true,
      articles: result.rows,
      count: result.rows.length,
      description: 'Priority feed: High/medium tier, time-sensitive articles (AI-filtered for relevance)'
    })
  } catch (error) {
    console.error('Error fetching priority articles:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch priority articles',
      message: error.message
    })
  }
})

// GET /api/ma/dashboard - Get M&A activity dashboard data
app.get('/api/ma/dashboard', async (req, res) => {
  try {
    // Get all M&A articles with extracted details
    const maArticlesQuery = `
      SELECT
        id, title, url, published_date, source,
        analysis->'maDetails' as ma_details,
        analysis
      FROM articles
      WHERE category = 'M&A'
        AND analysis->'maDetails' IS NOT NULL
      ORDER BY published_date DESC
    `

    const maArticles = await db.query(maArticlesQuery)

    // Aggregate statistics
    const stats = {
      totalDeals: maArticles.rows.length,
      dealsByMonth: {},
      topAcquirers: {},
      dealsByType: {},
      dealsByState: {},
      acquirerTypes: {},
      totalFacilities: 0,
      dealsWithValue: 0,
      industryLeaders: new Set()
    }

    // Process each M&A article
    maArticles.rows.forEach(row => {
      const maDetails = row.ma_details
      if (!maDetails) return

      // Extract month for time series
      const month = new Date(row.published_date).toISOString().slice(0, 7) // YYYY-MM
      stats.dealsByMonth[month] = (stats.dealsByMonth[month] || 0) + 1

      // Track acquirers
      if (maDetails.acquirer && maDetails.acquirer !== 'N/A') {
        stats.topAcquirers[maDetails.acquirer] = (stats.topAcquirers[maDetails.acquirer] || 0) + 1
        stats.industryLeaders.add(maDetails.acquirer)
      }

      // Track deal types
      if (maDetails.dealType) {
        stats.dealsByType[maDetails.dealType] = (stats.dealsByType[maDetails.dealType] || 0) + 1
      }

      // Track states
      if (maDetails.states && Array.isArray(maDetails.states)) {
        maDetails.states.forEach(state => {
          stats.dealsByState[state] = (stats.dealsByState[state] || 0) + 1
        })
      }

      // Track acquirer types
      if (maDetails.acquirerType) {
        stats.acquirerTypes[maDetails.acquirerType] = (stats.acquirerTypes[maDetails.acquirerType] || 0) + 1
      }

      // Count facilities
      if (maDetails.facilityCount) {
        stats.totalFacilities += maDetails.facilityCount
      }

      // Count deals with disclosed values
      if (maDetails.dealValue && maDetails.dealValue !== 'Undisclosed' && maDetails.dealValue !== 'N/A') {
        stats.dealsWithValue++
      }
    })

    // Convert top acquirers to sorted array
    const topAcquirersArray = Object.entries(stats.topAcquirers)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([name, count]) => ({ name, dealCount: count }))

    // Convert industry leaders set to array
    const industryLeadersArray = Array.from(stats.industryLeaders).sort()

    res.json({
      success: true,
      stats: {
        totalDeals: stats.totalDeals,
        totalFacilities: stats.totalFacilities,
        dealsWithValue: stats.dealsWithValue,
        dealsByMonth: stats.dealsByMonth,
        dealsByType: stats.dealsByType,
        dealsByState: stats.dealsByState,
        acquirerTypes: stats.acquirerTypes,
        topAcquirers: topAcquirersArray,
        industryLeaders: industryLeadersArray
      },
      recentDeals: maArticles.rows.slice(0, 10).map(row => ({
        id: row.id,
        title: row.title,
        url: row.url,
        date: row.published_date,
        source: row.source,
        maDetails: row.ma_details
      }))
    })
  } catch (error) {
    console.error('Error fetching M&A dashboard:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch M&A dashboard data',
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

// Get top stories of the week with trend analysis
app.get('/api/trends/top-stories', async (req, res) => {
  try {
    const {
      days = 7,
      limit = 5,
      minArticles = 2,
      category,
      state
    } = req.query

    const stories = await getTopStories({
      days: parseInt(days),
      limit: parseInt(limit),
      minArticles: parseInt(minArticles),
      category,
      state
    })

    res.json({
      success: true,
      timeframe: `${days} days`,
      stories
    })
  } catch (error) {
    console.error('Error fetching top stories:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top stories',
      message: error.message
    })
  }
})

// Get emerging trends
app.get('/api/trends/emerging', async (req, res) => {
  try {
    const { days = 7 } = req.query

    const trends = await getEmergingTrends(parseInt(days))

    res.json({
      success: true,
      timeframe: `${days} days`,
      trends
    })
  } catch (error) {
    console.error('Error fetching emerging trends:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emerging trends',
      message: error.message
    })
  }
})

// =================================================================
// WEEKLY REPORTS API ENDPOINTS
// =================================================================

// GET /api/weekly-reports - List all weekly reports (paginated)
app.get('/api/weekly-reports', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit

    const countResult = await db.query('SELECT COUNT(*) FROM weekly_reports')
    const totalCount = parseInt(countResult.rows[0].count)

    const result = await db.query(`
      SELECT id, week_start_date, week_end_date, title, created_at
      FROM weekly_reports
      ORDER BY week_start_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset])

    res.json({
      success: true,
      reports: result.rows,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      }
    })
  } catch (error) {
    console.error('Error fetching weekly reports:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/weekly-reports/latest - Get latest weekly report
app.get('/api/weekly-reports/latest', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, week_start_date, week_end_date, title, report_data,
             introduction, editor_note, author_name, author_title, created_at
      FROM weekly_reports
      ORDER BY week_start_date DESC
      LIMIT 1
    `)

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No weekly reports found'
      })
    }

    res.json({
      success: true,
      report: result.rows[0]
    })
  } catch (error) {
    console.error('Error fetching latest report:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/weekly-reports/:id - Get specific weekly report by ID
app.get('/api/weekly-reports/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await db.query(`
      SELECT id, week_start_date, week_end_date, title, report_data,
             introduction, editor_note, author_name, author_title, created_at
      FROM weekly_reports
      WHERE id = $1
    `, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Weekly report not found'
      })
    }

    res.json({
      success: true,
      report: result.rows[0]
    })
  } catch (error) {
    console.error('Error fetching weekly report:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/weekly-reports/generate - Manually generate a weekly report
app.post('/api/weekly-reports/generate', async (req, res) => {
  try {
    console.log('Generating weekly report...')

    // Generate report for the past 7 days
    const stories = await getTopStories({ days: 7, limit: 5 })

    // Calculate week dates
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    const formatDate = (date) => date.toISOString().split('T')[0]
    const weekStartStr = formatDate(startDate)
    const weekEndStr = formatDate(endDate)

    const title = `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    // Save to database
    const result = await db.query(`
      INSERT INTO weekly_reports (week_start_date, week_end_date, title, report_data)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (week_start_date, week_end_date)
      DO UPDATE SET
        report_data = EXCLUDED.report_data,
        created_at = CURRENT_TIMESTAMP
      RETURNING id, week_start_date, week_end_date, title, created_at
    `, [weekStartStr, weekEndStr, title, JSON.stringify({ stories })])

    console.log('✅ Weekly report generated and saved')

    res.json({
      success: true,
      message: 'Weekly report generated successfully',
      report: result.rows[0]
    })
  } catch (error) {
    console.error('Error generating weekly report:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Admin: Add image_url column to articles
app.post('/api/admin/add-image-url-column', async (req, res) => {
  try {
    console.log('\n🔧 Adding image_url column to articles table...')

    await db.query(`
      ALTER TABLE articles
      ADD COLUMN IF NOT EXISTS image_url TEXT
    `)

    console.log('✅ image_url column added successfully')

    res.json({
      success: true,
      message: 'image_url column added to articles table'
    })
  } catch (error) {
    console.error('❌ Error adding image_url column:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Admin: Backfill images for articles without image_url
app.post('/api/admin/backfill-images', async (req, res) => {
  try {
    console.log('🖼️  Starting image backfill process...')

    const { force = false } = req.query

    // Query articles without images OR with placeholder images (if force=true)
    const query = force
      ? `
          SELECT id, url, title
          FROM articles
          WHERE image_url IS NULL OR image_url LIKE '%ui-avatars.com%'
          ORDER BY published_date DESC
        `
      : `
          SELECT id, url, title
          FROM articles
          WHERE image_url IS NULL
          ORDER BY published_date DESC
        `

    const result = await db.query(query)
    const articlesWithoutImages = result.rows

    console.log(`📊 Found ${articlesWithoutImages.length} articles ${force ? 'to refresh' : 'without images'}`)

    if (articlesWithoutImages.length === 0) {
      return res.json({ success: true, message: 'All articles already have images!' })
    }

    let successCount = 0
    let failureCount = 0
    let skippedCount = 0
    const batchSize = 10
    const delayBetweenBatches = 2000

    // Process in batches
    for (let i = 0; i < articlesWithoutImages.length; i += batchSize) {
      const batch = articlesWithoutImages.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(articlesWithoutImages.length / batchSize)

      console.log(`📦 Processing batch ${batchNum}/${totalBatches}`)

      // Process batch in parallel
      const promises = batch.map(async (article) => {
        try {
          // Skip invalid URLs
          if (!article.url || !article.url.startsWith('http')) {
            skippedCount++
            return { success: false, skipped: true }
          }

          // Fetch Open Graph image (pass null for feedItem to force scraping)
          const imageUrl = await getArticleImage(null, article.url, article.title)

          if (imageUrl) {
            // Update database
            const updateQuery = `
              UPDATE articles
              SET image_url = $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `
            await db.query(updateQuery, [imageUrl, article.id])

            successCount++
            console.log(`  ✅ ${article.title.substring(0, 60)}...`)
            return { success: true }
          } else {
            failureCount++
            return { success: false }
          }
        } catch (error) {
          failureCount++
          console.error(`  ❌ Error processing article ${article.id}:`, error.message)
          return { success: false }
        }
      })

      await Promise.all(promises)

      // Delay between batches
      if (i + batchSize < articlesWithoutImages.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    const summary = {
      total: articlesWithoutImages.length,
      success: successCount,
      failed: failureCount,
      skipped: skippedCount,
      successRate: ((successCount / articlesWithoutImages.length) * 100).toFixed(1)
    }

    console.log('✅ Backfill complete:', summary)
    res.json({ success: true, summary })
  } catch (error) {
    console.error('❌ Error during backfill:', error)
    res.status(500).json({ error: error.message })
  }
})

// Admin: Add personalization columns to weekly_reports
app.post('/api/admin/migrate-weekly-reports-personalization', async (req, res) => {
  try {
    console.log('\n🔧 Adding personalization columns to weekly_reports table...')

    await db.query(`
      ALTER TABLE weekly_reports
      ADD COLUMN IF NOT EXISTS introduction TEXT,
      ADD COLUMN IF NOT EXISTS editor_note TEXT,
      ADD COLUMN IF NOT EXISTS author_name VARCHAR(255) DEFAULT 'Nicolas Hulewsky',
      ADD COLUMN IF NOT EXISTS author_title VARCHAR(255) DEFAULT 'Healthcare Policy Analyst'
    `)

    console.log('✅ Personalization columns added successfully')

    res.json({
      success: true,
      message: 'Personalization columns added to weekly_reports table'
    })
  } catch (error) {
    console.error('❌ Error adding personalization columns:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// PUT /api/weekly-reports/:id - Update report personalization
app.put('/api/weekly-reports/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { introduction, editor_note, author_name, author_title } = req.body

    // Build update query dynamically based on provided fields
    const updates = []
    const values = []
    let paramIndex = 1

    if (introduction !== undefined) {
      updates.push(`introduction = $${paramIndex++}`)
      values.push(introduction)
    }
    if (editor_note !== undefined) {
      updates.push(`editor_note = $${paramIndex++}`)
      values.push(editor_note)
    }
    if (author_name !== undefined) {
      updates.push(`author_name = $${paramIndex++}`)
      values.push(author_name)
    }
    if (author_title !== undefined) {
      updates.push(`author_title = $${paramIndex++}`)
      values.push(author_title)
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      })
    }

    // Add ID to values array
    values.push(id)

    const query = `
      UPDATE weekly_reports
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, week_start_date, week_end_date, title, introduction, editor_note, author_name, author_title, created_at, updated_at
    `

    const result = await db.query(query, values)

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      })
    }

    res.json({
      success: true,
      message: 'Report updated successfully',
      report: result.rows[0]
    })
  } catch (error) {
    console.error('Error updating weekly report:', error)
    res.status(500).json({
      success: false,
      error: error.message
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
    // cache.set('articles', articles) // Cache not needed, using database
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

// Admin endpoint: Add relevance_tier column and update category taxonomy
app.post('/api/admin/migrate-relevance-tier', async (req, res) => {
  try {
    console.log('\n🔄 Starting relevance tier migration...')

    // Step 1: Add relevance_tier column if it doesn't exist
    console.log('📊 Adding relevance_tier column...')
    await db.query(`
      ALTER TABLE articles
      ADD COLUMN IF NOT EXISTS relevance_tier VARCHAR(10) DEFAULT 'medium'
    `)

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_articles_relevance_tier
      ON articles(relevance_tier)
    `)

    console.log('✅ Column added successfully')

    // Step 2: Get category distribution
    const categoryStats = await db.query(`
      SELECT category, COUNT(*) as count
      FROM articles
      GROUP BY category
      ORDER BY count DESC
    `)

    console.log('\n📈 Current category distribution:')
    categoryStats.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count}`)
    })

    // Step 3: Auto-tier articles based on simple heuristics
    console.log('\n🤖 Auto-tiering articles based on content signals...')

    // High tier: Regulatory, financial, compliance keywords
    const highTierUpdate = await db.query(`
      UPDATE articles
      SET relevance_tier = 'high'
      WHERE relevance_tier = 'medium'
      AND (
        category IN ('Regulatory', 'Financial', 'Compliance')
        OR title ILIKE ANY(ARRAY[
          '%CMS%', '%medicare%', '%medicaid%', '%regulation%', '%survey%',
          '%deficiency%', '%penalty%', '%fine%', '%star rating%', '%reimbursement%',
          '%staffing ratio%', '%minimum staffing%', '%bankruptcy%', '%acquisition%',
          '%merger%', '%layoff%', '%closure%', '%rate cut%', '%rate increase%'
        ])
      )
    `)

    // Low tier: Community fluff
    const lowTierUpdate = await db.query(`
      UPDATE articles
      SET relevance_tier = 'low'
      WHERE relevance_tier = 'medium'
      AND (
        title ILIKE ANY(ARRAY[
          '%obituary%', '%pet parade%', '%craft fair%', '%holiday party%',
          '%bingo%', '%birthday celebrat%', '%anniversary%', '%ribbon cutting%',
          '%grand opening%', '%open house%', '%talent show%'
        ])
        OR (
          title ~* 'obituary'
          AND NOT title ~* 'ceo|cfo|administrator|president|founder|industry leader'
        )
      )
    `)

    console.log(`  ✅ Tier high: ${highTierUpdate.rowCount} articles`)
    console.log(`  ✅ Tier medium: (default, remaining articles)`)
    console.log(`  ✅ Tier low: ${lowTierUpdate.rowCount} articles`)

    // Step 4: Get final tier distribution
    const tierStats = await db.query(`
      SELECT relevance_tier, COUNT(*) as count
      FROM articles
      GROUP BY relevance_tier
      ORDER BY
        CASE relevance_tier
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END
    `)

    console.log('\n📊 Final tier distribution:')
    tierStats.rows.forEach(row => {
      console.log(`  ${row.relevance_tier}: ${row.count}`)
    })

    res.json({
      success: true,
      message: 'Relevance tier migration completed',
      categoryStats: categoryStats.rows,
      tierStats: tierStats.rows,
      highTierCount: highTierUpdate.rowCount,
      lowTierCount: lowTierUpdate.rowCount
    })
  } catch (error) {
    console.error('Error in relevance tier migration:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Admin endpoint: Backfill images for articles without image_url
app.post('/api/admin/backfill-images', async (req, res) => {
  try {
    console.log('\n🖼️  Starting image backfill process...')

    // Import image extractor
    const { fetchOpenGraphImage } = await import('./utils/imageExtractor.js')

    // Query articles without images or with placeholder images
    const query = `
      SELECT id, url, title
      FROM articles
      WHERE image_url IS NULL OR image_url LIKE '%ui-avatars.com%'
      ORDER BY published_date DESC
      LIMIT 100
    `

    const result = await db.query(query)
    const articlesWithoutImages = result.rows

    console.log(`📊 Found ${articlesWithoutImages.length} articles to process`)

    if (articlesWithoutImages.length === 0) {
      return res.json({
        success: true,
        message: 'All articles already have real images!',
        successCount: 0,
        failureCount: 0,
        skippedCount: 0
      })
    }

    let successCount = 0
    let failureCount = 0
    let skippedCount = 0
    const batchSize = 10
    const delayBetweenBatches = 2000 // 2 seconds

    // Process in batches
    for (let i = 0; i < articlesWithoutImages.length; i += batchSize) {
      const batch = articlesWithoutImages.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(articlesWithoutImages.length / batchSize)

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (articles ${i + 1}-${Math.min(i + batchSize, articlesWithoutImages.length)})`)

      // Process batch in parallel
      const promises = batch.map(async (article) => {
        try {
          // Skip if URL is invalid
          if (!article.url || !article.url.startsWith('http')) {
            skippedCount++
            return { success: false, skipped: true }
          }

          // Fetch Open Graph image
          const imageUrl = await fetchOpenGraphImage(article.url)

          if (imageUrl) {
            // Update database
            const updateQuery = `
              UPDATE articles
              SET image_url = $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `
            await db.query(updateQuery, [imageUrl, article.id])

            successCount++
            console.log(`  ✅ ${article.title.substring(0, 60)}...`)
            return { success: true }
          } else {
            failureCount++
            console.log(`  ⚠️  No image found: ${article.title.substring(0, 60)}...`)
            return { success: false }
          }
        } catch (error) {
          failureCount++
          console.error(`  ❌ Error processing article ${article.id}:`, error.message)
          return { success: false }
        }
      })

      await Promise.all(promises)

      // Delay between batches
      if (i + batchSize < articlesWithoutImages.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    const successRate = ((successCount / articlesWithoutImages.length) * 100).toFixed(1)

    console.log('\n' + '='.repeat(60))
    console.log('📊 Backfill Summary:')
    console.log('='.repeat(60))
    console.log(`Total articles processed: ${articlesWithoutImages.length}`)
    console.log(`✅ Successfully added images: ${successCount}`)
    console.log(`⚠️  No image found: ${failureCount}`)
    console.log(`⏭️  Skipped (invalid URL): ${skippedCount}`)
    console.log(`📈 Success rate: ${successRate}%`)
    console.log('='.repeat(60))

    res.json({
      success: true,
      message: 'Image backfill completed',
      total: articlesWithoutImages.length,
      successCount,
      failureCount,
      skippedCount,
      successRate: parseFloat(successRate)
    })
  } catch (error) {
    console.error('❌ Fatal error during backfill:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Admin endpoint: Run weekly reports table migration
app.post('/api/admin/migrate-weekly-reports', async (req, res) => {
  try {
    console.log('Running weekly_reports table migration...')

    await db.query(`
      CREATE TABLE IF NOT EXISTS weekly_reports (
        id SERIAL PRIMARY KEY,
        week_start_date DATE NOT NULL,
        week_end_date DATE NOT NULL,
        title VARCHAR(255) NOT NULL,
        report_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(week_start_date, week_end_date)
      );

      CREATE INDEX IF NOT EXISTS idx_weekly_reports_dates ON weekly_reports(week_start_date DESC, week_end_date DESC);
      CREATE INDEX IF NOT EXISTS idx_weekly_reports_created ON weekly_reports(created_at DESC);
    `)

    console.log('✅ Migration completed successfully')

    res.json({
      success: true,
      message: 'Weekly reports table created successfully'
    })
  } catch (error) {
    console.error('Migration error:', error)
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

// GET /api/regulatory/bills - Get regulatory bills with ecosystem analysis (optimized for Regulatory Feed)
app.get('/api/regulatory/bills', async (req, res) => {
  try {
    const {
      source,
      priority,
      impactType,
      hasCommentPeriod
    } = req.query

    const filters = {
      page: 1,
      limit: 1000, // Get all bills for now (we can add pagination later)
      sortBy: 'ai_relevance_score',
      sortOrder: 'DESC'
    }

    // Add filters if provided
    if (source && source !== 'all') {
      filters.source = source
    }
    if (priority && priority !== 'all') {
      filters.priority = priority
    }
    if (hasCommentPeriod && hasCommentPeriod !== 'all') {
      filters.hasCommentPeriod = hasCommentPeriod === 'yes'
    }

    const result = await getBills(filters)

    // Filter by impact type (client-side for now, can move to DB later)
    let bills = result.bills
    if (impactType && impactType !== 'all') {
      bills = bills.filter(bill => bill.impact_type === impactType)
    }

    res.json({
      success: true,
      bills,
      count: bills.length
    })
  } catch (error) {
    console.error('Error fetching regulatory bills:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch regulatory bills',
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
    app.use((req, res, next) => {
      // Skip fallback for /api routes - they should 404 if not found
      if (req.path.startsWith('/api')) {
        return next()
      }
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

    // Schedule weekly report generation every Sunday at 8 PM
    cron.schedule('0 20 * * 0', async () => {
      console.log('\n📊 Weekly report scheduled job triggered...')
      try {
        const now = new Date()
        const endDate = new Date(now)
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)

        const stories = await getTopStories({ days: 7, limit: 5 })

        const title = `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

        const query = `
          INSERT INTO weekly_reports (week_start_date, week_end_date, title, report_data)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (week_start_date, week_end_date)
          DO UPDATE SET
            title = EXCLUDED.title,
            report_data = EXCLUDED.report_data,
            created_at = CURRENT_TIMESTAMP
          RETURNING id
        `

        const result = await db.query(query, [
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
          title,
          JSON.stringify({ stories })
        ])

        console.log(`✅ Weekly report generated successfully (ID: ${result.rows[0].id})`)
        console.log(`   Title: ${title}`)
        console.log(`   Stories: ${stories.length}`)
      } catch (error) {
        console.error('❌ Error generating weekly report:', error.message)
      }
    }, {
      timezone: 'America/New_York'
    })

    console.log('✓ Weekly report scheduler initialized (Sundays at 8 PM ET)')

    // Fetch feeds after server starts (non-blocking)
    fetchAllFeeds().then(articles => {
      // cache.set('articles', articles) // Cache not needed, using database
      console.log(`✓ Initial fetch complete: ${articles.length} articles`)

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
