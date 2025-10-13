/**
 * Test script for enhanced AI analysis prompt
 * Tests the new structured data fields on 3 sample articles
 */

import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import * as db from './database/db.js'
import fs from 'fs'

dotenv.config()

// Inline the analyzeArticleWithAI function with enhanced prompt (from server/index.js lines 288-551)
async function analyzeArticleWithAI(article) {
  try {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`Analyzing: ${article.title}`)
    console.log(`${'='.repeat(80)}\n`)

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    // Build the enhanced prompt (from lines 438-551 in server/index.js)
    const prompt = `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs). Analyze the following article and provide detailed, actionable insights for SNF operators and administrators running facilities on 1-2% margins.

Article Title: ${article.title}
Article Summary: ${article.summary || 'N/A'}
Source: ${article.source || 'N/A'}
Published Date: ${article.date || 'N/A'}

Please provide a comprehensive analysis with the following sections:

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

8. **Geographic Scope**:
   - Scope: Is this story National, State-specific, Regional, or Local?
   - State: If state-specific, provide the 2-letter state code (e.g., AL, CA, TX, FL)
   - If multiple states mentioned, list all relevant state codes
   - If national or not state-specific, put "N/A" for state

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
  "scope": "National|State-specific|Regional|Local",
  "state": "2-letter state code or N/A",
  "entities": {
    "organizations": ["org1", "org2"],
    "regulations": ["reg1", "reg2"],
    "people": [{"name": "Person Name", "title": "Title"}],
    "financialFigures": [{"amount": "$X.XX", "context": "context"}]
  },
  "topicTags": ["tag1", "tag2", "tag3"],
  "temporalSignals": {
    "isRecurring": true/false,
    "precedents": ["precedent1"],
    "cyclicality": "annual|quarterly|ad-hoc|unknown",
    "leadTime": "time estimate"
  },
  "impactFactors": {
    "facilityTypes": ["SNF"],
    "bedSizes": ["100-200 beds"],
    "payorMix": ["High Medicaid"],
    "geography": ["Urban"],
    "ownershipTypes": ["For-Profit"]
  },
  "connections": {
    "relatedTopics": ["topic1", "topic2"],
    "causeAndEffect": "explanation or N/A",
    "marketForces": ["force1", "force2"]
  }
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const responseText = message.content[0].text

    // Try to parse JSON from response
    let analysis
    try {
      // Look for JSON in code blocks
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                       responseText.match(/```\n([\s\S]*?)\n```/)

      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1])
      } else {
        // Try parsing the entire response
        analysis = JSON.parse(responseText)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError.message)
      console.log('Raw response:', responseText)
      throw parseError
    }

    return analysis

  } catch (error) {
    console.error('Error analyzing article with AI:', error)
    throw error
  }
}

async function testEnhancedPrompt() {
  try {
    console.log('\n🧪 Testing Enhanced AI Analysis Prompt')
    console.log('=' .repeat(80))
    console.log('This test will analyze 3 sample articles with the enhanced prompt')
    console.log('and verify that new structured data fields populate correctly.\n')

    // Use hardcoded sample articles (database is on Render, not local)
    const articles = [
      {
        id: 1090,
        title: "Valerie Bryan Obituary | October 2, 2025",
        summary: "Valerie Bryan Obituary | October 2, 2025  Hartford Courant...",
        url: "https://news.google.com/rss/articles/CBMiZEFVX3lxTE9vb0lYcWhDdEcyQXM4SXF4Q2hwNmoxYW9ZRVZ3clR0LUNCOTI3T1NqQWIwUVFDNXZjSXVGUmM1M1pBa3Y2bnQ4OF90SG1TRjdCOXZ1dG1JdG41STdzRkpVb1NpSzg?oc=5",
        source: "Hartford Courant",
        date: "2025-10-12T10:25:44.000Z",
        category: "Operations"
      },
      {
        id: 974,
        title: "Dementia Caregivers Workshop offers guidance and hope",
        summary: "Dementia Caregivers Workshop offers guidance and hope  WVIR...",
        url: "https://news.google.com/rss/articles/CBMijAFBVV95cUxPTzRqN1V2eXZ0QUh5ZmE4cXJXNzBMMkJHOFNNRHlCM181Q2VJaHgwZjBYWk9HNFhKSzViUTIyX3hBV1NsZmZuODZVSTlpTFRQa1hKbzcwbWczR3RDN1ZSeEVILVQ0bFFzVGdxVnN0VmVGTVEyQlBJVnBhcU5oTDlVQ0pFSEZBclk2WnFyNtIBoAFBVV95cUxPRkxXeUZOOUxsTngtRnVlSENRRDZSUkV6U3JXdGhONm9CVDh4eXg0RlVTelBDazdMLUlRZUdvcW84aVhyNnR3LXV2dkxpemlFMVIyVVg4TFFLNmtBUVBEd0lSR3JrOFc1Mm1hME5SXzVkUTV6bEdyT0dWaEN0WWJEUFBaVjVzbVhHYU52SVBzT18wNmxKOWJ0SHZPTGdQY056?oc=5",
        source: "Google News",
        date: "2025-10-12T04:43:00.000Z",
        category: "Operations"
      },
      {
        id: 975,
        title: "St. Anne's Mead hosts annual pet parade for seniors in Southfield",
        summary: "St. Anne's Mead hosts annual pet parade for seniors in Southfield  Detroit Free Press...",
        url: "https://news.google.com/rss/articles/CBMi6AFBVV95cUxPU1ZuMDFibldXcXY2WGFrQ0xNTmlaQncyaFZIbnZlRU96c3FXNHdOZVpIWExMWlBMYzlrLVI2SGdFYWZibVlxZ0lOV1c1X21yZElxMVNGN1BDdW1KdHF0aGRjWklHQUV4aEpybkJxQUZxbi1zUHAwdjhqY1lOTVBySnZpUVNPaV9QRzRucmptTVFyalFYTVJYaXhvdXNXVHpVYTNLMW8zQVFsNTFYYnVJdExVQUJVSG1jM2ZUaWVDaGxrcDl1N0h3dHlyZVFxQ1JEVlFic1d2Q3pwU3ZMRlI1UEVjdjFHajFT?oc=5",
        source: "Google News",
        date: "2025-10-12T03:51:18.000Z",
        category: "Operations"
      }
    ]

    console.log(`📊 Using ${articles.length} sample articles for testing\n`)

    // Analyze each article
    const results = []
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]

      try {
        const analysis = await analyzeArticleWithAI(article)
        results.push({
          article: article,
          analysis: analysis,
          success: true
        })

        // Check for new fields
        console.log('\n✅ Analysis completed successfully!')
        console.log('\n📋 New Fields Check:')
        console.log(`  - entities: ${analysis.entities ? '✅' : '❌'}`)
        console.log(`  - topicTags: ${analysis.topicTags ? '✅' : '❌'}`)
        console.log(`  - temporalSignals: ${analysis.temporalSignals ? '✅' : '❌'}`)
        console.log(`  - impactFactors: ${analysis.impactFactors ? '✅' : '❌'}`)
        console.log(`  - connections: ${analysis.connections ? '✅' : '❌'}`)

        // Show sample data
        if (analysis.entities) {
          console.log(`\n  📊 Sample Entities:`)
          console.log(`     Organizations: ${JSON.stringify(analysis.entities.organizations?.slice(0, 3) || [])}`)
          console.log(`     Regulations: ${JSON.stringify(analysis.entities.regulations?.slice(0, 2) || [])}`)
        }

        if (analysis.topicTags) {
          console.log(`\n  🏷️  Topic Tags: ${JSON.stringify(analysis.topicTags)}`)
        }

        if (analysis.temporalSignals) {
          console.log(`\n  ⏰ Temporal Signals:`)
          console.log(`     Is Recurring: ${analysis.temporalSignals.isRecurring}`)
          console.log(`     Cyclicality: ${analysis.temporalSignals.cyclicality}`)
        }

        if (analysis.connections) {
          console.log(`\n  🔗 Connections:`)
          console.log(`     Related Topics: ${JSON.stringify(analysis.connections.relatedTopics)}`)
          console.log(`     Market Forces: ${JSON.stringify(analysis.connections.marketForces)}`)
        }

      } catch (error) {
        console.error(`\n❌ Error analyzing article ${i + 1}:`, error.message)
        results.push({
          article: article,
          error: error.message,
          success: false
        })
      }

      // Delay between API calls to avoid rate limiting
      if (i < articles.length - 1) {
        console.log('\n⏳ Waiting 2 seconds before next article...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(80))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(80))

    const successCount = results.filter(r => r.success).length
    console.log(`\n✅ Successfully analyzed: ${successCount}/${articles.length} articles`)
    console.log(`❌ Failed: ${articles.length - successCount}/${articles.length} articles\n`)

    // Field presence check across all successful analyses
    if (successCount > 0) {
      const successfulResults = results.filter(r => r.success)
      console.log('📋 New Field Coverage:')

      const fields = ['entities', 'topicTags', 'temporalSignals', 'impactFactors', 'connections']
      fields.forEach(field => {
        const count = successfulResults.filter(r => r.analysis[field]).length
        const percentage = ((count / successCount) * 100).toFixed(0)
        console.log(`  - ${field}: ${count}/${successCount} (${percentage}%)`)
      })
    }

    // Save full results to file for detailed inspection
    const outputPath = '/Users/nikolashulewsky/snf-news-aggregator/server/test_results.json'
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
    console.log(`\n📄 Full test results saved to: ${outputPath}`)

    console.log('\n' + '='.repeat(80))
    console.log('Test complete! Check the output above for field population details.\n')

    process.exit(0)

  } catch (error) {
    console.error('❌ Fatal error during test:', error)
    process.exit(1)
  }
}

// Run the test
testEnhancedPrompt()
