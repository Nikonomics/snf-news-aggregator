/**
 * ENHANCED M&A Deal Analysis (v2)
 * Deep extraction with operator profiling and valuation intelligence
 * This runs ONLY on articles classified as category='M&A'
 */

import fetch from 'node-fetch'
import * as db from '../database/db.js'
import { getArticleTextForAnalysis } from '../utils/articleFetcher.js'

/**
 * Extract acquirer name from article for historical lookup
 * @param {Object} article - Article object
 * @returns {string|null} Extracted acquirer name
 */
function extractAcquirerName(article) {
  // Simple heuristic: look for company names in title
  // This is rough but works for MVP - can be improved with NER later
  const title = article.title.toLowerCase()
  const summary = (article.summary || '').toLowerCase()

  // Common patterns: "Company acquires...", "Company to acquire...", "Company buys..."
  const patterns = [
    /^([A-Z][A-Za-z\s&]+?)\s+(acquires|to acquire|buys|purchases)/,
    /([A-Z][A-Za-z\s&]+?)\s+(acquires|buys|purchases)\s+/,
  ]

  for (const pattern of patterns) {
    const match = article.title.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}

/**
 * Query database for articles mentioning an organization
 * @param {string} organizationName - Name of the organization
 * @param {number} currentArticleId - ID of current article to exclude
 * @returns {Promise<Array>} Articles mentioning this organization
 */
async function getArticlesAboutOrganization(organizationName, currentArticleId) {
  try {
    const query = `
      SELECT
        id, title, summary, published_date, category,
        analysis->'entities'->'organizations' as organizations,
        analysis->>'keyInsights' as key_insights
      FROM articles
      WHERE
        -- Check if organization is in the organizations array
        analysis->'entities'->'organizations' @> $1::jsonb
        AND id != $2
        AND published_date > NOW() - INTERVAL '2 years'
      ORDER BY published_date DESC
      LIMIT 15
    `

    const result = await db.query(query, [
      JSON.stringify([organizationName]),
      currentArticleId
    ])

    return result.rows || []
  } catch (error) {
    console.error(`Error querying articles about ${organizationName}:`, error.message)
    return []
  }
}

/**
 * Extract detailed M&A information using specialized AI analysis
 * @param {Object} article - Article object with title, summary, url, etc.
 * @returns {Promise<Object>} Detailed M&A extraction
 */
export async function analyzeMADeal(article) {
  // Fetch full article content from URL (with fallback to summary)
  console.log('  Fetching full article content...')
  const articleText = await getArticleTextForAnalysis(article)
  console.log(`  Using ${articleText.source} content (${articleText.length} chars)`)

  // Try to extract acquirer name for historical lookup
  const acquirerName = extractAcquirerName(article)
  let relatedArticles = []

  if (acquirerName) {
    console.log(`  Looking up historical articles about "${acquirerName}"...`)
    relatedArticles = await getArticlesAboutOrganization(acquirerName, article.id)
    console.log(`  Found ${relatedArticles.length} related articles`)
  }

  // Build context string from related articles
  let historicalContext = ''
  if (relatedArticles.length > 0) {
    historicalContext = `\n**Historical Context (from our database):**
We have ${relatedArticles.length} recent articles mentioning "${acquirerName}":

${relatedArticles.slice(0, 10).map((a, i) =>
  `${i + 1}. [${new Date(a.published_date).toLocaleDateString()}] ${a.title}`
).join('\n')}

Use this context to enrich your acquirerProfile analysis with specific facts about their acquisition history and strategy.
`
  }

  const prompt = `You are an expert M&A analyst specializing in the skilled nursing facility (SNF) industry. Analyze this deal announcement and extract ALL relevant transaction details with deep strategic intelligence.

**Article Information:**
Title: ${article.title}
Article Content: ${articleText.text}
Source: ${article.source}
URL: ${article.url}
${historicalContext}

**Your Task:**
Extract comprehensive M&A transaction details to help SNF operators understand competitive dynamics, valuation trends, and strategic positioning in the market.

**Required Fields:**

1. **acquirer** (string):
   Full legal name of the acquiring company/entity. Be precise.
   Examples: "Genesis HealthCare", "The Ensign Group", "Omega Healthcare Investors (REIT)"
   If multiple acquirers: "Welltower REIT & ProMedica Health System (Joint Venture)"

2. **target** (string):
   Name of the facility, portfolio, or company being acquired.
   Examples: "5 skilled nursing facilities in Ohio", "Sunrise Senior Living portfolio", "Complete Health Services LLC"
   Be as specific as possible about what's being acquired.

3. **dealValue** (string):
   Transaction value with currency and specificity.
   Examples: "$45 million", "$2.3 billion", "Approximately $150M", "Undisclosed"
   If not mentioned: "Undisclosed"
   If partial info: "Estimated at $XX million" or "Greater than $XX million"

4. **dealType** (string):
   ONE of: "Acquisition", "Merger", "Joint Venture", "Asset Sale", "Portfolio Sale", "Recapitalization"
   - Acquisition: One company buys another outright
   - Merger: Two companies combine into new entity
   - Joint Venture: New entity created by two parents
   - Asset Sale: Specific facilities/assets sold
   - Portfolio Sale: Multiple facilities sold as package
   - Recapitalization: Ownership restructuring/refinancing

5. **facilityCount** (integer or null):
   Exact number of facilities involved in the transaction.
   If mentioned: 5
   If not mentioned: null
   If "approximately": use the approximate number

6. **totalBeds** (integer or null):
   Total number of licensed beds across all facilities in the transaction.
   Examples: 450, 1200, null
   If article mentions "120-bed facility": 120
   If article mentions "3 facilities with 80 beds each": 240
   If NOT mentioned at all: null
   This is CRITICAL for tracking operator acquisition activity by bed count.

7. **states** (array of strings):
   State codes (2-letter) where facilities are located.
   Examples: ["PA", "OH"], ["CA"], ["TX", "OK", "LA"]
   If not mentioned: []
   If "multiple states" without specifics: []

8. **acquirerType** (string):
   ONE of: "Public Company", "Private Equity", "REIT", "Non-Profit", "Family Office", "Health System", "Unknown"
   Use context clues:
   - Public Company: Traded on NYSE/NASDAQ
   - Private Equity: Investment firm (Carlyle, KKR, etc.)
   - REIT: Real Estate Investment Trust
   - Non-Profit: 501(c)(3) organization
   - Family Office: Wealthy family's investment vehicle
   - Health System: Hospital/healthcare delivery system
   - Unknown: Not enough info

9. **sellerType** (string):
   Same categories as acquirerType:
   "Public Company", "Private Equity", "REIT", "Non-Profit", "Family Office", "Health System", "Individual Owner", "Unknown"

10. **strategicRationale** (string):
   2-3 sentences explaining WHY this deal happens NOW:
   - What is the buyer's strategic logic? (Geographic expansion, vertical integration, portfolio optimization?)
   - What does the seller's decision signal? (Exit strategy, distress, portfolio rebalancing?)
   - How does this affect competitive dynamics? (New major player, competitor gaining scale?)

11. **dealStructure** (string):
    If mentioned, describe deal structure and financing:
    Examples:
    - "All-cash transaction"
    - "Stock and cash ($20M cash + 2M shares)"
    - "Seller financing with earnout based on EBITDA performance"
    - "Sale-leaseback structure with 15-year lease"
    - "$30M equity + $15M senior debt from XYZ Bank"
    If not mentioned: "Unknown"

12. **closingTimeline** (string):
    Expected or actual closing date/timeframe:
    Examples: "Q4 2024", "Closed January 15, 2024", "Expected to close within 90 days pending regulatory approval", "Unknown"

13. **postAcquisitionPlan** (string):
    If mentioned, what happens after closing?
    Examples:
    - "Will maintain current operations and branding"
    - "Plans to invest $5M in capital improvements over 18 months"
    - "Will integrate into existing regional platform and rebrand"
    If not mentioned: "Unknown"

14. **marketContext** (string):
    2-3 sentences on market context and valuation environment:
    - How does this deal fit into recent M&A trends?
    - What does this tell us about valuations or market sentiment?
    - Are valuations rising, falling, or stable?

15. **valuationMetrics** (object or null):
    If dealValue and facilityCount are both known, calculate and provide:
    {
      "pricePerFacility": "$9.0M per facility" (calculate: dealValue / facilityCount),
      "impliedMultiple": "If revenue/EBITDA mentioned, calculate multiple, otherwise 'Unknown'",
      "valuationContext": "Brief 1-sentence context: Is this premium/discount vs market norms?"
    }
    If cannot calculate: null

16. **assetQuality** (string):
    If mentioned, describe quality/operational status of acquired facilities:
    - Quality ratings (e.g., "Portfolio averaged 3.2 stars")
    - Payor mix (e.g., "Medicare-focused with 65% Medicare census")
    - Occupancy levels (e.g., "Running at 85% occupancy")
    - Operational status (e.g., "Distressed assets with recent survey deficiencies")
    If not mentioned: "Unknown"

17. **acquirerProfile** (object):
    Strategic intelligence about the acquiring entity:
    {
      "acquisitionHistory": "Recent M&A activity mentioned in article or historical context",
        // Examples:
        // "Third acquisition in 2024, following Ohio (8 facilities, Q1) and Texas (12 facilities, Q2)"
        // "First SNF acquisition; previously focused on assisted living"
        // "Part of $200M deployment plan announced in Q4 2023"
        // "Unknown - no recent acquisition history mentioned"

      "strategicFocus": "Their stated acquisition criteria/strategy if mentioned",
        // Examples:
        // "Targets distressed assets in Medicaid-heavy markets for operational turnarounds"
        // "Building regional density in Midwest - now operates 45 facilities across 5 states"
        // "Vertical integration play - owns home health and seeks SNF partnerships"
        // "Unknown"

      "operationalApproach": "How they typically operate acquired facilities if mentioned",
        // Examples:
        // "Known for aggressive cost reduction and technology implementation"
        // "Maintains local management teams and branding"
        // "Implements standardized clinical protocols and centralized billing"
        // "Unknown"

      "marketReputation": "Industry perception/competitive positioning if mentioned",
        // Examples:
        // "Premier operator with consistent 4+ star quality ratings"
        // "Growth-focused PE platform with track record of operational improvements"
        // "Distressed asset specialist - 8 acquisitions in 2023-2024"
        // "Unknown"

      "competitiveSignal": "What this acquisition reveals about their strategy",
        // Examples:
        // "First move into [STATE] market signals geographic expansion"
        // "Shift from Medicare-focused to Medicaid-heavy assets suggests strategic pivot"
        // "Continued consolidation play seeking scale advantages"
    }

18. **competitiveImplications** (string):
    Actionable intelligence: What should SNF operators DO in response? (2-3 sentences)
    - How should competitors in affected markets respond?
    - What opportunities or threats does this create?
    - Who is most at risk from this competitive move?
    Be specific and actionable, not just descriptive.

**Response Format:**
Return ONLY a valid JSON object. No markdown code blocks. No extra text. Start with { and end with }.

Example structure:
{
  "acquirer": "Full company name",
  "target": "Facility/company being acquired",
  "dealValue": "$45 million",
  "dealType": "Portfolio Sale",
  "facilityCount": 5,
  "totalBeds": 450,
  "states": ["PA", "OH"],
  "acquirerType": "Private Equity",
  "sellerType": "Individual Owner",
  "strategicRationale": "PE firm targeting distressed SNF assets in Medicaid-heavy markets. Seller appears to be exiting due to reimbursement pressures. This follows a pattern of consolidation in the Midwest.",
  "dealStructure": "All-cash transaction with seller financing",
  "closingTimeline": "Expected Q2 2024 pending regulatory approval",
  "postAcquisitionPlan": "Will invest $3M in facility upgrades over 12 months",
  "marketContext": "This is the third major SNF acquisition by this PE firm in 2024. The implied valuation of $9M per facility is below the 2023 average of $12M, indicating distress pricing. Market appetite remains strong despite reimbursement headwinds.",
  "valuationMetrics": {
    "pricePerFacility": "$9.0M per facility",
    "impliedMultiple": "Unknown",
    "valuationContext": "Below market average, suggesting distressed sale"
  },
  "assetQuality": "Facilities averaged 2.5 stars with 78% occupancy, primarily Medicaid census",
  "acquirerProfile": {
    "acquisitionHistory": "Third acquisition in 2024, deploying $150M capital plan announced Q4 2023",
    "strategicFocus": "Targets underperforming Medicaid-focused SNFs in PA, OH, and MI for operational turnarounds",
    "operationalApproach": "Implements technology platform, renegotiates managed care contracts, invests in clinical quality",
    "marketReputation": "Distressed asset specialist with track record of improving quality ratings within 18 months",
    "competitiveSignal": "Gaining regional scale in Midwest - now 45 facilities across 5 states, positioning for managed care negotiating leverage"
  },
  "competitiveImplications": "Competitors in PA/OH should expect increased pricing pressure on managed care contracts as this acquirer gains scale. Facilities with<80% occupancy or <3 star ratings may face acquisition offers. Operators should benchmark operational efficiency against this acquirer's post-acquisition improvements to remain competitive."
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // Premium model for M&A extraction
        max_tokens: 3000, // Increased for richer analysis
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`M&A Analysis API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    const textContent = result.content[0].text

    // Clean up response (remove markdown if present)
    let cleanedResponse = textContent.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '')
    }

    // Extract JSON
    const jsonStart = cleanedResponse.indexOf('{')
    const jsonEnd = cleanedResponse.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No valid JSON found in M&A analysis response')
    }

    const jsonText = cleanedResponse.substring(jsonStart, jsonEnd + 1)
    const maDetails = JSON.parse(jsonText)

    return maDetails

  } catch (error) {
    console.error(`Error analyzing M&A deal: ${error.message}`)
    throw error
  }
}

/**
 * Save M&A analysis to database
 * @param {number} articleId - Article ID
 * @param {Object} maDetails - Extracted M&A details
 * @returns {Promise<void>}
 */
export async function saveMAAnalysis(articleId, maDetails) {
  try {
    const query = `
      UPDATE articles
      SET
        ma_analyzed = TRUE,
        ma_acquirer = $1,
        ma_target = $2,
        ma_deal_value = $3,
        ma_deal_type = $4,
        ma_facility_count = $5,
        ma_states = $6,
        ma_acquirer_type = $7,
        ma_seller_type = $8,
        ma_strategic_rationale = $9,
        ma_analyzed_at = CURRENT_TIMESTAMP,
        analysis = jsonb_set(
          COALESCE(analysis, '{}'::jsonb),
          '{maDetails}',
          $10::jsonb
        )
      WHERE id = $11
      RETURNING id, ma_acquirer, ma_target, ma_deal_value
    `

    const result = await db.query(query, [
      maDetails.acquirer || null,
      maDetails.target || null,
      maDetails.dealValue || 'Undisclosed',
      maDetails.dealType || null,
      maDetails.facilityCount || null,
      maDetails.states || [],
      maDetails.acquirerType || 'Unknown',
      maDetails.sellerType || 'Unknown',
      maDetails.strategicRationale || null,
      JSON.stringify(maDetails), // Store full details in analysis JSON too
      articleId
    ])

    return result.rows[0]

  } catch (error) {
    console.error(`Error saving M&A analysis: ${error.message}`)
    throw error
  }
}

/**
 * Process M&A article: analyze and save
 * @param {Object} article - Article object from database
 * @returns {Promise<Object>} Updated article with M&A details
 */
export async function processMAArticle(article) {
  try {
    console.log(`\nAnalyzing M&A deal: ${article.title.substring(0, 60)}...`)

    // Run M&A extraction
    const maDetails = await analyzeMADeal(article)

    // Save to database
    const updated = await saveMAAnalysis(article.id, maDetails)

    console.log(`✓ M&A analysis complete:`)
    console.log(`  Acquirer: ${maDetails.acquirer}`)
    console.log(`  Target: ${maDetails.target}`)
    console.log(`  Deal Value: ${maDetails.dealValue}`)
    console.log(`  Type: ${maDetails.dealType}`)
    if (maDetails.facilityCount) {
      console.log(`  Facilities: ${maDetails.facilityCount}`)
    }
    if (maDetails.states && maDetails.states.length > 0) {
      console.log(`  States: ${maDetails.states.join(', ')}`)
    }
    if (maDetails.valuationMetrics) {
      console.log(`  Valuation: ${maDetails.valuationMetrics.pricePerFacility}`)
    }

    return { ...article, ...maDetails, ma_analyzed: true }

  } catch (error) {
    console.error(`Failed to process M&A article ${article.id}: ${error.message}`)
    throw error
  }
}

export default {
  analyzeMADeal,
  saveMAAnalysis,
  processMAArticle
}
