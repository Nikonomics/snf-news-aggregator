import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Generate AI summary and sentiment analysis for a specific state
 * @param {string} state - State code (e.g., 'CA', 'TX')
 * @param {Array} articles - Articles tagged to this state
 * @returns {Object} Analysis with summary and sentiment scores
 */
export async function generateStateSummary(state, articles) {
  if (!articles || articles.length === 0) {
    return {
      success: false,
      error: 'No articles available for this state'
    }
  }

  console.log(`🤖 Analyzing ${articles.length} articles for ${state}...`)

  // Prepare article summaries for AI
  const articleSummaries = articles.map((article, index) => {
    return `
Article ${index + 1}:
Title: ${article.title}
Date: ${article.date}
Category: ${article.category}
Impact: ${article.impact}
Summary: ${article.summary}
Key Insights: ${article.analysis?.keyInsights?.join('; ') || 'N/A'}
Financial Impact: ${article.analysis?.financialImpact || 'N/A'}
---
`
  }).join('\n')

  const prompt = `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs). You're analyzing the current regulatory and operational environment for SNF operators in ${state}.

TASK: Analyze these ${articles.length} articles specific to ${state} and provide:
1. A comprehensive summary of what's happening in the state
2. Sentiment scores across 3 key dimensions

ARTICLES TO ANALYZE:
${articleSummaries}

ANALYSIS REQUIREMENTS:

1. **State Summary**:
   - Write 3-4 paragraphs summarizing the current environment for SNF operators in ${state}
   - Focus on: What are the major regulatory changes? What financial pressures exist? What operational challenges?
   - Be specific about impacts to SNF operators' bottom line and compliance requirements

2. **Sentiment Scoring** (0-100 scale where 0=Very Negative, 50=Neutral, 100=Very Positive):

   **Regulatory Sentiment (0-100):**
   - 0-30: Severe new regulatory burden, complex requirements, high compliance costs
   - 31-50: Moderate new regulations, manageable compliance
   - 51-70: Stable regulatory environment, minor changes
   - 71-100: Regulatory relief, reduced burden, favorable changes

   **Staffing Sentiment (0-100):**
   - 0-30: Severe staffing crisis, new mandates, wage pressures
   - 31-50: Moderate challenges, competitive market
   - 51-70: Stable workforce, manageable challenges
   - 71-100: Improving conditions, relief from mandates

   **Financial Sentiment (0-100):**
   - 0-30: Major reimbursement cuts, cost increases, margin pressure
   - 31-50: Modest financial challenges, stable margins
   - 51-70: Stable reimbursement, manageable costs
   - 71-100: Rate increases, cost relief, improved margins

3. **Top Issues**: List 3-5 most critical issues facing SNF operators in this state right now

4. **Action Items**: List 3-5 specific action items operators should take based on these articles

CRITICAL: You must respond with ONLY a valid JSON object. Do not include any explanatory text before or after the JSON.

Return JSON in this exact structure:
{
  "state": "${state}",
  "articlesAnalyzed": ${articles.length},
  "summary": "Comprehensive 3-4 paragraph summary of the state environment",
  "sentiment": {
    "regulatory": {
      "score": 45,
      "trend": "declining",
      "description": "Brief explanation of regulatory environment"
    },
    "staffing": {
      "score": 38,
      "trend": "stable",
      "description": "Brief explanation of staffing situation"
    },
    "financial": {
      "score": 42,
      "trend": "improving",
      "description": "Brief explanation of financial outlook"
    }
  },
  "overallSentiment": {
    "score": 42,
    "description": "Overall environment is challenging but manageable"
  },
  "topIssues": [
    "Issue 1",
    "Issue 2",
    "Issue 3"
  ],
  "actionItems": [
    "Action 1",
    "Action 2",
    "Action 3"
  ],
  "lastUpdated": "${new Date().toISOString()}"
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].text.trim()

    let analysis
    try {
      analysis = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError)
      console.error('Response was:', responseText)
      throw new Error('AI response was not valid JSON')
    }

    console.log(`✅ State analysis complete for ${state}`)
    console.log(`   Overall sentiment: ${analysis.overallSentiment.score}/100`)

    return {
      success: true,
      analysis
    }

  } catch (error) {
    console.error('Error generating state summary:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export default { generateStateSummary }
