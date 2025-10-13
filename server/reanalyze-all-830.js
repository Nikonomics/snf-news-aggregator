/**
 * FULL RE-ANALYSIS: Re-analyze ALL 830 articles with two-pass system
 * This resets relevance_tier to null first, forcing fresh AI triage
 */

// CRITICAL: Import and configure dotenv BEFORE importing any modules
import dotenv from 'dotenv'
const envResult = dotenv.config()
if (envResult.error) {
  console.error('Error loading .env file:', envResult.error)
  process.exit(1)
}

import fetch from 'node-fetch'
import * as db from './database/db.js'

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
        model: 'claude-3-5-haiku-20241022', // Cheap, fast model for triage
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
    return triageResult.relevanceTier

  } catch (error) {
    console.error('   ✗ Triage failed:', error.message)
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

// Deep AI analysis function (Pass 2 - expensive)
async function deepAnalyzeArticle(article) {
  const analysisPrompt = `You are an expert SNF operations analyst. Analyze this article for skilled nursing facility operators.

Article Title: ${article.title}
Article Summary: ${article.summary || 'N/A'}
Source: ${article.source}

Provide actionable insights in JSON format:
{
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "complianceTimeline": {
    "commentDeadline": "YYYY-MM-DD or N/A",
    "effectiveDate": "YYYY-MM-DD or N/A",
    "prepTime": "description",
    "criticalDates": ["date: description"]
  },
  "financialImpact": "description of financial impact",
  "whoNeedsToKnow": ["role 1", "role 2"],
  "actionItems": {
    "immediate": ["action 1"],
    "shortTerm": ["action 2"],
    "longTerm": ["action 3"]
  },
  "risks": ["risk 1", "risk 2"],
  "relevanceReasoning": "why this matters to SNFs",
  "scope": "National|State|Regional|Local",
  "articleType": "Regulation|Enforcement|M&A|Technology|Staffing|Clinical|Operations|Finance",
  "urgencyScore": 1-10
}

Return ONLY valid JSON. No markdown, no extra text.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // Premium model for deep analysis
        max_tokens: 2000,
        temperature: 0.5,
        messages: [{
          role: 'user',
          content: analysisPrompt
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`Analysis API error: ${response.status}`)
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

    return JSON.parse(cleanedResponse)

  } catch (error) {
    console.error('   ✗ Deep analysis failed:', error.message)
    throw error
  }
}

// Main analysis function (orchestrates Pass 1 + Pass 2)
async function analyzeArticleWithAI(article) {
  // PASS 1: AI Triage to determine relevance tier (cheap, fast)
  // Force re-triage even if tier exists
  article.relevance_tier = await triageArticleRelevance(article)
  console.log(`   → AI Triage: ${article.relevance_tier}`)

  // Skip expensive AI analysis for low-tier articles
  if (article.relevance_tier === 'low') {
    console.log(`   → Skipping deep analysis for low-tier (cost savings)`)
    return {
      keyInsights: ["Community interest article with minimal operational relevance"],
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
      relevanceReasoning: "Low-relevance community content",
      scope: "Local",
      articleType: "Community",
      urgencyScore: 1
    }
  }

  // PASS 2: Deep analysis for high/medium tier articles (expensive)
  console.log(`   → Running deep AI analysis (${article.relevance_tier} tier)`)
  const analysis = await deepAnalyzeArticle(article)
  return analysis
}

// Main re-analysis function
async function reanalyzeAll() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('FULL RE-ANALYSIS: Two-Pass System on ALL 830 Articles')
    console.log('='.repeat(80) + '\n')

    // Fetch ALL articles from database (skip first 16 already processed)
    const query = `
      SELECT
        id, external_id, title, summary, url, source,
        published_date as date, category, relevance_tier
      FROM articles
      ORDER BY published_date DESC
      OFFSET 16
    `

    const result = await db.query(query)
    const articles = result.rows

    console.log(`Found ${articles.length} articles to re-analyze\n`)
    console.log(`Estimated cost:`)
    console.log(`  - Pass 1 (AI Triage): ${articles.length} × $0.001 = $${(articles.length * 0.001).toFixed(2)}`)
    console.log(`  - Pass 2 (Deep Analysis): ~${Math.floor(articles.length * 0.6)} × $0.01 = $${(articles.length * 0.6 * 0.01).toFixed(2)}`)
    console.log(`  - Total estimated: $${(articles.length * 0.001 + articles.length * 0.6 * 0.01).toFixed(2)}`)
    console.log(`  - Estimated time: ${Math.floor(articles.length * 3 / 60)} minutes\n`)

    const results = []
    let processed = 0
    let tierCounts = { high: 0, medium: 0, low: 0, error: 0 }

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]
      processed++

      if (processed % 10 === 0) {
        console.log(`\n[${processed}/${articles.length}] Progress: ${Math.floor(processed/articles.length*100)}%`)
        console.log(`   Current tier distribution: H:${tierCounts.high} M:${tierCounts.medium} L:${tierCounts.low} E:${tierCounts.error}\n`)
      }

      console.log(`[${processed}/${articles.length}] ${article.title.substring(0, 60)}...`)

      try {
        // Run the analysis
        const analysis = await analyzeArticleWithAI(article)

        // Update the database with new analysis and tier
        const updateQuery = `
          UPDATE articles
          SET
            analysis = $1,
            relevance_tier = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING id, relevance_tier
        `

        await db.query(updateQuery, [
          JSON.stringify(analysis),
          article.relevance_tier,
          article.id
        ])

        tierCounts[article.relevance_tier]++
        console.log(`   ✓ Updated: ${article.relevance_tier}`)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`   ✗ Error: ${error.message}`)
        tierCounts.error++
      }
    }

    // Final Summary
    console.log('\n\n' + '='.repeat(80))
    console.log('RE-ANALYSIS COMPLETE')
    console.log('='.repeat(80))
    console.log(`Total articles processed: ${processed}/${articles.length}`)
    console.log(`\nFinal Tier Distribution:`)
    console.log(`  HIGH:   ${tierCounts.high} (${Math.floor(tierCounts.high/processed*100)}%)`)
    console.log(`  MEDIUM: ${tierCounts.medium} (${Math.floor(tierCounts.medium/processed*100)}%)`)
    console.log(`  LOW:    ${tierCounts.low} (${Math.floor(tierCounts.low/processed*100)}%)`)
    console.log(`  ERRORS: ${tierCounts.error}`)
    console.log(`\n✅ Re-analysis complete! Priority Feed will now show only high/medium tier articles.`)

    process.exit(0)

  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

reanalyzeAll()
