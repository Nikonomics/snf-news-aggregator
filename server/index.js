import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Parser from 'rss-parser'
import { readFileSync } from 'fs'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import aiService from './services/aiService.js'
import * as db from './database/db.js'
import pool from './database/db.js'
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
import { requireAdminKey } from './middleware/adminAuth.js'
import {
  getStateDemographics,
  getAllStateDemographics,
  getCountyDemographics,
  getCountiesByState,
  getAllCountyDemographics,
  getFacilitiesByCounty,
  getFacilitiesByCountyFips,
  getCountyFacilitySummary,
  getStateCountyFacilitySummaries,
  getFacilitiesWithCountyDemographics,
  getFacilitiesByState,
  getFacilityByProviderNumber,
  searchFacilities,
  getFacilitiesByChain,
  getStateMarketMetrics,
  getStateOverview,
  getComprehensiveStateAnalysis,
  getAllStatesComparison,
  getStateRankings,
  getFacilityOwnershipBreakdown,
  getTopChainsByState,
  searchFacilitiesAdvanced
} from './database/state-data.js'
import cron from 'node-cron'
import { startMAAnalysisWorker } from './workflows/ma-analysis-worker.js'
import medicaidRouter from './routes/medicaid.js'
import clustersRouter from './routes/clusters.js'

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
    const response = await aiService.analyzeContent(triagePrompt, {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 200,
      temperature: 0.3
    })

    let cleanedResponse = response.content.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '')
    }

    const triageResult = JSON.parse(cleanedResponse)

    const validTiers = ['high', 'medium', 'low']
    if (!validTiers.includes(triageResult.relevanceTier)) {
      console.warn(`Invalid tier "${triageResult.relevanceTier}", defaulting to medium`)
      return 'medium'
    }

    console.log(`  → AI Triage: ${triageResult.relevanceTier} - ${triageResult.reasoning} (${response.provider})`)

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

9. **Urgency Score** (0-100): Weighted composite score based on impact type and time-sensitivity.

   **Primary Factors (60% of score):**
   - Regulatory/Compliance Impact (30%): CMS rules, staffing mandates, certification requirements, enforcement actions
   - Financial Impact (30%): Reimbursement changes, rate cuts/increases, payment model shifts, margin impact >1%

   **Secondary Factors (40% of score):**
   - Time Sensitivity (25%): Deadlines, comment periods, effective dates, implementation timelines
   - Operational Disruption (15%): Workflow changes, staffing requirements, care delivery modifications

   **Scoring Guidelines:**
   - 90-100: Critical regulatory change OR major financial impact (>5% margin effect) + immediate action required
   - 75-89: Significant regulatory/financial impact with near-term deadline (30-90 days) or breaking enforcement
   - 60-74: Important regulatory/financial changes with longer timeline (3-12 months) or moderate margin impact (2-5%)
   - 40-59: Strategic trends, emerging policies, moderate financial impact (<2%), or operational best practices
   - 20-39: Informational updates, industry analysis, long-term trends, minor operational changes
   - 0-19: Low priority news, opinion pieces without actionable policy implications, minor updates

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

14. **Structured Entities** (for cross-article pattern recognition):
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

    const response = await aiService.analyzeContent(prompt, {
      maxTokens: 2000,
      temperature: 0.1
    });

    const analysisText = response.content;
    console.log(`🤖 Article analysis using ${response.provider}`);

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
        image_url: imageUrl
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
app.use('/api/medicaid', medicaidRouter)
app.use(clustersRouter)

// API monitoring routes
import apiMonitoringRouter from './routes/api-monitoring.js'
app.use('/api', apiMonitoringRouter)

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

    // Query for priority articles with enhanced filtering and time decay
    // Use a subquery to calculate adjusted_urgency_score first, then filter on it
    const query = `
      WITH scored_articles AS (
        SELECT
          id, external_id, title, summary, url, source, published_date as date,
          category, impact, relevance_score, scope, states, analysis, relevance_tier,
          image_url, created_at, updated_at,
          -- Calculate time-decayed urgency score
          CAST(COALESCE(analysis->>'urgencyScore', '50') AS INTEGER) *
            CASE
              WHEN published_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1.0
              WHEN published_date >= CURRENT_DATE - INTERVAL '30 days' THEN 0.7
              WHEN published_date >= CURRENT_DATE - INTERVAL '90 days' THEN 0.4
              ELSE 0.1
            END AS adjusted_urgency_score
        FROM articles
        WHERE
          -- Only show high and medium relevance tier articles (filter out low-tier noise)
          relevance_tier IN ('high', 'medium')
          -- Filter out opinion/commentary articles
          AND (analysis->>'articleType' IS NULL OR analysis->>'articleType' != 'Opinion/Commentary')
          -- Only include National, Regional, or State scope (filter out purely local news)
          AND (scope IS NULL OR scope IN ('National', 'Regional', 'State'))
          -- Filter out articles older than 90 days (stale news)
          AND published_date >= CURRENT_DATE - INTERVAL '90 days'
      ),
      filtered_articles AS (
        SELECT *
        FROM scored_articles
        WHERE
          -- Apply time-decayed urgency threshold (must be >= 20 after decay)
          adjusted_urgency_score >= 20
      ),
      deduplicated_articles AS (
        SELECT DISTINCT ON (title) *
        FROM filtered_articles
        ORDER BY
          title,
          -- For duplicate titles, prefer higher priority source and newer article
          CASE relevance_tier
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 1
            ELSE 0
          END DESC,
          adjusted_urgency_score DESC,
          date DESC
      )
      SELECT *
      FROM deduplicated_articles
      ORDER BY
        -- Final sort for display: tier first, then urgency, then impact, then date
        CASE relevance_tier
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 1
          ELSE 0
        END DESC,
        adjusted_urgency_score DESC,
        CASE impact
          WHEN 'high' THEN 3
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 1
          ELSE 0
        END DESC,
        date DESC
      LIMIT $1
    `

    const result = await db.query(query, [limit])

    res.json({
      success: true,
      articles: result.rows,
      count: result.rows.length,
      description: 'Priority feed: High/medium tier, time-sensitive articles with recency weighting (AI-filtered for relevance)'
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
    // Extract filter parameters
    const {
      dateFrom,
      dateTo,
      states,
      dealType,
      acquirer,
      limit = 500
    } = req.query

    // Build WHERE clauses
    const whereClauses = [
      "category = 'M&A'",
      "analysis->'maDetails' IS NOT NULL",
      "analysis->'maDetails'->>'acquirer' != 'Unknown'",  // Filter out deals with unknown acquirers
      "analysis->'maDetails'->>'acquirer' IS NOT NULL"
    ]
    const queryParams = []
    let paramCount = 1

    // Date filters
    if (dateFrom) {
      whereClauses.push(`published_date >= $${paramCount}`)
      queryParams.push(dateFrom)
      paramCount++
    }
    if (dateTo) {
      whereClauses.push(`published_date <= $${paramCount}`)
      queryParams.push(dateTo)
      paramCount++
    }

    // State filter (check if any of the selected states match)
    if (states) {
      const stateArray = Array.isArray(states) ? states : [states]
      whereClauses.push(`analysis->'maDetails'->'states' ?| ARRAY[${stateArray.map((_, i) => `$${paramCount + i}`).join(',')}]`)
      queryParams.push(...stateArray)
      paramCount += stateArray.length
    }

    // Deal type filter
    if (dealType) {
      whereClauses.push(`analysis->'maDetails'->>'dealType' = $${paramCount}`)
      queryParams.push(dealType)
      paramCount++
    }

    // Acquirer filter (case-insensitive partial match)
    if (acquirer) {
      whereClauses.push(`LOWER(analysis->'maDetails'->>'acquirer') LIKE LOWER($${paramCount})`)
      queryParams.push(`%${acquirer}%`)
      paramCount++
    }

    // Get M&A articles with filters
    const maArticlesQuery = `
      SELECT
        id, title, url, published_date, source,
        analysis->'maDetails' as ma_details,
        analysis
      FROM articles
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY published_date DESC
      LIMIT $${paramCount}
    `

    queryParams.push(parseInt(limit))
    const maArticles = await db.query(maArticlesQuery, queryParams)

    // Deduplicate deals by acquirer+target combination
    // Keep only the most recent article for each unique deal
    const dealsMap = new Map()
    maArticles.rows.forEach(row => {
      const maDetails = row.ma_details
      if (!maDetails) return

      // Normalize merger partners by sorting (handles "A merges with B" vs "B merges with A")
      const companies = [maDetails.acquirer, maDetails.target].sort()
      const dealKey = `${companies[0]}::${companies[1]}`.toLowerCase()
      const existingDeal = dealsMap.get(dealKey)

      // Keep the most recent article for this deal
      if (!existingDeal || new Date(row.published_date) > new Date(existingDeal.published_date)) {
        dealsMap.set(dealKey, row)
      }
    })

    // Convert back to array of unique deals
    const uniqueDeals = Array.from(dealsMap.values())

    // Aggregate statistics
    const stats = {
      totalDeals: uniqueDeals.length,
      dealsByMonth: {},
      topAcquirers: {},
      dealsByType: {},
      dealsByState: {},
      acquirerTypes: {},
      totalFacilities: 0,
      dealsWithValue: 0,
      industryLeaders: new Set()
    }

    // Process each unique M&A deal
    uniqueDeals.forEach(row => {
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
      recentDeals: uniqueDeals.map(row => ({
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

// GET /api/ma/acquirer-leaderboard - YTD leaderboard of acquirers by beds acquired
app.get('/api/ma/acquirer-leaderboard', async (req, res) => {
  try {
    // Get all M&A deals from current year
    const currentYear = new Date().getFullYear()
    const query = `
      SELECT
        id, title, published_date,
        analysis->'maDetails' as ma_details
      FROM articles
      WHERE category = 'M&A'
        AND EXTRACT(YEAR FROM published_date) = $1
        AND analysis->'maDetails' IS NOT NULL
        AND analysis->'maDetails'->>'acquirer' != 'Unknown'
        AND analysis->'maDetails'->>'acquirer' IS NOT NULL
      ORDER BY published_date DESC
    `

    const result = await db.query(query, [currentYear])

    // Aggregate by acquirer
    const acquirerStats = {}

    result.rows.forEach(row => {
      const maDetails = row.ma_details
      if (!maDetails) return

      const acquirer = maDetails.acquirer
      if (!acquirer || acquirer === 'Unknown') return

      // Initialize acquirer stats if not exists
      if (!acquirerStats[acquirer]) {
        acquirerStats[acquirer] = {
          acquirer,
          totalBeds: 0,
          totalFacilities: 0,
          dealCount: 0,
          deals: []
        }
      }

      // Add deal data
      const totalBeds = maDetails.totalBeds || 0
      const facilityCount = maDetails.facilityCount || 0

      acquirerStats[acquirer].totalBeds += totalBeds
      acquirerStats[acquirer].totalFacilities += facilityCount
      acquirerStats[acquirer].dealCount += 1
      acquirerStats[acquirer].deals.push({
        id: row.id,
        title: row.title,
        date: row.published_date,
        target: maDetails.target,
        dealValue: maDetails.dealValue,
        totalBeds: totalBeds,
        facilityCount: facilityCount,
        states: maDetails.states || []
      })
    })

    // Convert to array and sort by deal count, then total beds
    const leaderboard = Object.values(acquirerStats)
      .sort((a, b) => {
        // Primary sort by deal count
        if (b.dealCount !== a.dealCount) {
          return b.dealCount - a.dealCount
        }
        // Secondary sort by total beds (if available)
        return b.totalBeds - a.totalBeds
      })

    res.json({
      success: true,
      year: currentYear,
      leaderboard,
      summary: {
        totalAcquirers: leaderboard.length,
        totalBeds: leaderboard.reduce((sum, a) => sum + a.totalBeds, 0),
        totalFacilities: leaderboard.reduce((sum, a) => sum + a.totalFacilities, 0),
        totalDeals: leaderboard.reduce((sum, a) => sum + a.dealCount, 0)
      }
    })
  } catch (error) {
    console.error('Error fetching acquirer leaderboard:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch acquirer leaderboard',
      message: error.message
    })
  }
})

// GET /api/ma/companies - Get all companies mentioned in M&A articles
app.get('/api/ma/companies', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT
        analysis->'maDetails'->>'acquirer' as acquirer,
        analysis->'maDetails'->>'target' as target,
        published_date
      FROM articles
      WHERE category = 'M&A'
        AND analysis->'maDetails' IS NOT NULL
      ORDER BY published_date DESC
    `

    const result = await db.query(query)

    // Build unique company list with metadata
    const companyMap = new Map()

    result.rows.forEach(row => {
      const acquirer = row.acquirer
      const target = row.target
      const date = row.published_date

      // Process acquirer
      if (acquirer && acquirer !== 'Unknown') {
        if (!companyMap.has(acquirer)) {
          companyMap.set(acquirer, {
            name: acquirer,
            role: ['acquirer'],
            deal_count: 0,
            recent_activity: date
          })
        }
        const company = companyMap.get(acquirer)
        company.deal_count++
        if (!company.role.includes('acquirer')) {
          company.role.push('acquirer')
        }
        if (new Date(date) > new Date(company.recent_activity)) {
          company.recent_activity = date
        }
      }

      // Process target
      if (target && target !== 'Unknown') {
        if (!companyMap.has(target)) {
          companyMap.set(target, {
            name: target,
            role: ['target'],
            deal_count: 0,
            recent_activity: date
          })
        }
        const company = companyMap.get(target)
        company.deal_count++
        if (!company.role.includes('target')) {
          company.role.push('target')
        }
        if (new Date(date) > new Date(company.recent_activity)) {
          company.recent_activity = date
        }
      }
    })

    // Helper function to determine if a name is likely a company vs. asset description
    const isLikelyCompanyName = (name) => {
      const lower = name.toLowerCase()

      // Exclude if it contains numbers followed by common asset terms
      const assetPatterns = [
        /^\d+[\s-]*(bed|facility|facilities|building|property|properties|communities|community|portfolio)/i,
        /^more than \d+/i,
        /beds? (across|in|at)/i,
        /(midtown|downtown|multiple|various|several|undisclosed).*(building|facility|facilities|properties|portfolio)/i,
        /(nursing home|skilled nursing|assisted living|senior (housing|living)).*(facility|facilities|portfolio|properties)/i,
        /(office|headquarters).*(building)/i,
        /state.*(hospital|facility|facilities)/i,
        /formerly? .*(seniors|senior|nursing)/i,
        /(merger|acquisition).*(not specified|unspecified|unnamed)/i
      ]

      // Check if matches asset description patterns
      for (const pattern of assetPatterns) {
        if (pattern.test(name)) {
          return false
        }
      }

      // Exclude generic/descriptive phrases
      const genericTerms = [
        'unknown',
        'unspecified',
        'unnamed',
        'not specified',
        'not named',
        'article discusses'
      ]

      if (genericTerms.some(term => lower.includes(term))) {
        return false
      }

      // If name starts with a number and is long, likely an asset description
      if (/^\d+/.test(name) && name.length > 30) {
        return false
      }

      return true
    }

    // Convert to array, filter out asset descriptions, add IDs, and sort
    const companies = Array.from(companyMap.values())
      .filter(company => isLikelyCompanyName(company.name))
      .map((company, index) => ({
        id: index + 1,
        ...company
      }))
      .sort((a, b) => new Date(b.recent_activity) - new Date(a.recent_activity))

    res.json({
      success: true,
      companies,
      summary: {
        total_companies: companies.length,
        acquirers: companies.filter(c => c.role.includes('acquirer')).length,
        targets: companies.filter(c => c.role.includes('target')).length,
        both: companies.filter(c => c.role.includes('acquirer') && c.role.includes('target')).length
      }
    })
  } catch (error) {
    console.error('Error fetching companies:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch companies',
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
app.post('/api/admin/add-image-url-column', requireAdminKey, async (req, res) => {
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

app.post('/api/admin/backfill-content-hashes', requireAdminKey, async (req, res) => {
  try {
    const BATCH_SIZE = 200
    let totalUpdated = 0
    let hasMore = true

    while (hasMore) {
      const batch = await db.query(`
        SELECT id, title, summary FROM articles
        WHERE content_hash IS NULL
        ORDER BY id
        LIMIT $1
      `, [BATCH_SIZE])

      if (batch.rows.length === 0) {
        hasMore = false
        break
      }

      for (const row of batch.rows) {
        const hash = generateContentHash(row.title, row.summary || '')
        await db.query(
          'UPDATE articles SET content_hash = $1 WHERE id = $2',
          [hash, row.id]
        )
        totalUpdated++
      }

      console.log(`Backfilled ${totalUpdated} content hashes...`)

      if (batch.rows.length < BATCH_SIZE) {
        hasMore = false
      }
    }

    res.json({ success: true, updated: totalUpdated })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Admin: Backfill images for articles without image_url

// TEMPORARY: Bulk article backfill endpoint
// Accepts array of {title, summary, url, source, published_date}
// Inserts via insertArticle (dedup by external_id), skips AI triage to save cost
app.post('/api/admin/backfill-articles', requireAdminKey, async (req, res) => {
  try {
    const { articles, skipTriage = true } = req.body;
    if (!Array.isArray(articles)) {
      return res.status(400).json({ error: 'articles must be an array' });
    }

    console.log(`📦 Backfill: processing ${articles.length} articles (skipTriage=${skipTriage})`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const article of articles) {
      try {
        const result = await insertArticle({
          title: article.title,
          summary: article.summary || '',
          url: article.url,
          source: article.source || 'Google News',
          published_date: article.published_date,
          category: article.category || 'General',
          impact: article.impact || 'medium',
          relevance_score: article.relevance_score || 50,
          scope: article.scope || 'National',
          analysis: article.analysis || null,
          image_url: article.image_url || null,
          relevance_tier: article.relevance_tier || 'medium',
        });

        if (result) {
          inserted++;
        } else {
          skipped++;
        }
      } catch (err) {
        if (err.code === '23505') {
          skipped++; // duplicate
        } else {
          errors++;
          if (errors <= 5) console.error(`  Backfill error: ${err.message}`);
        }
      }
    }

    console.log(`✅ Backfill complete: ${inserted} inserted, ${skipped} skipped (dupes), ${errors} errors`);
    res.json({ success: true, inserted, skipped, errors, total: articles.length });
  } catch (error) {
    console.error('Backfill error:', error);
    res.status(500).json({ error: error.message });
  }
});
