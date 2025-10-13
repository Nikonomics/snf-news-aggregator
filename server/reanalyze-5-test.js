/**
 * Test script: Re-analyze 5 articles with two-pass system
 * Self-contained version with analysis functions included
 */

import dotenv from 'dotenv'
dotenv.config()

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
    console.error('Deep analysis failed:', error.message)
    throw error
  }
}

// Main analysis function (orchestrates Pass 1 + Pass 2)
async function analyzeArticleWithAI(article) {
  try {
    console.log(`Analyzing: ${article.title}`)

    // PASS 1: AI Triage to determine relevance tier (cheap, fast)
    if (!article.relevance_tier) {
      article.relevance_tier = await triageArticleRelevance(article)
      console.log(`  → Assigned tier: ${article.relevance_tier}`)
    }

    // Skip expensive AI analysis for low-tier articles
    if (article.relevance_tier === 'low') {
      console.log(`  → Skipping deep analysis for low-tier article (cost savings)`)
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
    console.log(`  → Running deep AI analysis (${article.relevance_tier} tier)`)
    const analysis = await deepAnalyzeArticle(article)
    return analysis

  } catch (error) {
    console.error('Analysis failed:', error.message)
    throw error
  }
}

// Main test function
async function testReanalysis() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('Testing Two-Pass Analysis System on 5 Articles')
    console.log('='.repeat(80) + '\n')

    // Fetch 5 articles from database
    const query = `
      SELECT
        id, external_id, title, summary, url, source,
        published_date as date, category, relevance_tier
      FROM articles
      ORDER BY published_date DESC
      LIMIT 5
    `

    const result = await db.query(query)
    const articles = result.rows

    console.log(`Found ${articles.length} articles to analyze\n`)

    const results = []

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]

      console.log(`\n[${i + 1}/5] =====================================`)
      console.log(`Title: ${article.title}`)
      console.log(`Current tier: ${article.relevance_tier || 'none'}`)
      console.log(`Category: ${article.category}`)
      console.log(`Source: ${article.source}`)
      console.log(`Published: ${new Date(article.date).toLocaleDateString()}`)
      console.log('-------------------------------------------\n')

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
          RETURNING id, relevance_tier,
            analysis->>'urgencyScore' as urgency_score,
            analysis->>'articleType' as article_type
        `

        const updateResult = await db.query(updateQuery, [
          JSON.stringify(analysis),
          article.relevance_tier,
          article.id
        ])

        const updated = updateResult.rows[0]

        results.push({
          title: article.title.substring(0, 60) + '...',
          tier: article.relevance_tier,
          urgency: updated.urgency_score || 'N/A',
          type: updated.article_type || 'N/A'
        })

        console.log(`✓ Updated successfully`)
        console.log(`  Tier: ${article.relevance_tier}`)
        console.log(`  Urgency: ${updated.urgency_score || 'N/A'}`)
        console.log(`  Type: ${updated.article_type || 'N/A'}`)

      } catch (error) {
        console.error(`✗ Error analyzing article: ${error.message}`)
        results.push({
          title: article.title.substring(0, 60) + '...',
          tier: 'ERROR',
          urgency: 'N/A',
          type: 'N/A'
        })
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(80))
    console.log('SUMMARY')
    console.log('='.repeat(80))
    console.table(results)

    const tierCounts = results.reduce((acc, r) => {
      acc[r.tier] = (acc[r.tier] || 0) + 1
      return acc
    }, {})

    console.log('\nTier Distribution:')
    console.log(tierCounts)

    console.log('\n✓ Test complete! Check results above.')
    console.log('\nNext step: If these look good, run the full 830 article re-analysis.')

    process.exit(0)

  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

testReanalysis()
