/**
 * Specialized M&A Deal Analysis
 * Deep extraction of M&A transaction details for SNF operators
 * This runs ONLY on articles classified as category='M&A'
 */

import fetch from 'node-fetch'
import * as db from '../database/db.js'

/**
 * Extract detailed M&A information using specialized AI analysis
 * @param {Object} article - Article object with title, summary, url, etc.
 * @returns {Promise<Object>} Detailed M&A extraction
 */
export async function analyzeMADeal(article) {
  const prompt = `You are an expert M&A analyst specializing in the skilled nursing facility (SNF) industry. Analyze this deal announcement and extract ALL relevant transaction details.

**Article Information:**
Title: ${article.title}
Summary: ${article.summary || 'N/A'}
Source: ${article.source}
URL: ${article.url}

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

6. **states** (array of strings):
   State codes (2-letter) where facilities are located.
   Examples: ["PA", "OH"], ["CA"], ["TX", "OK", "LA"]
   If not mentioned: []
   If "multiple states" without specifics: []

7. **acquirerType** (string):
   ONE of: "Public Company", "Private Equity", "REIT", "Non-Profit", "Family Office", "Health System", "Unknown"
   Use context clues:
   - Public Company: Traded on NYSE/NASDAQ
   - Private Equity: Investment firm (Carlyle, KKR, etc.)
   - REIT: Real Estate Investment Trust
   - Non-Profit: 501(c)(3) organization
   - Family Office: Wealthy family's investment vehicle
   - Health System: Hospital/healthcare delivery system
   - Unknown: Not enough info

8. **sellerType** (string):
   Same categories as acquirerType:
   "Public Company", "Private Equity", "REIT", "Non-Profit", "Family Office", "Health System", "Individual Owner", "Unknown"

9. **strategicRationale** (string):
   2-3 sentences explaining WHY this deal matters to SNF operators:
   - What is the strategic logic? (Geographic expansion, vertical integration, portfolio optimization?)
   - What does this signal about market trends? (Consolidation, REITs exiting operations, PE buying distressed assets?)
   - How does this affect competitive dynamics? (New major player entering market, competitor gaining scale?)

10. **dealStructure** (string):
   If mentioned, describe deal structure:
   Examples: "All-cash transaction", "Stock and cash ($20M cash + 2M shares)", "Seller financing with earnout", "Lease structure with option to buy", "Unknown"

11. **closingTimeline** (string):
   Expected or actual closing date/timeframe:
   Examples: "Q4 2024", "Closed January 15, 2024", "Expected to close within 90 days", "Subject to regulatory approval", "Unknown"

12. **postAcquisitionPlan** (string):
   If mentioned, what happens after closing?
   Examples: "Will maintain current operations and branding", "Plans to rebrand under acquirer name", "Will invest $5M in capital improvements", "Unknown"

13. **marketContext** (string):
   2-3 sentences on market context and competitive implications:
   - How does this deal fit into recent M&A trends?
   - What does this tell us about valuations or market sentiment?
   - Who are the likely winners/losers from this deal?

**Response Format:**
Return ONLY a valid JSON object. No markdown code blocks. No extra text.

{
  "acquirer": "Full company name",
  "target": "Facility/company being acquired",
  "dealValue": "$XX million or Undisclosed",
  "dealType": "Acquisition",
  "facilityCount": 5,
  "states": ["PA", "OH"],
  "acquirerType": "Private Equity",
  "sellerType": "Individual Owner",
  "strategicRationale": "This deal signals PE firms targeting distressed SNF assets in Medicaid-heavy markets. The acquirer gains regional density in Pennsylvania's competitive post-acute market. This follows a pattern of consolidation in the Midwest where operators with scale can better negotiate with managed care payers.",
  "dealStructure": "All-cash transaction with seller financing",
  "closingTimeline": "Expected Q2 2024 pending regulatory approval",
  "postAcquisitionPlan": "Will invest $3M in facility upgrades and implement standardized clinical protocols across portfolio",
  "marketContext": "This is the third major SNF acquisition by this PE firm in 2024, suggesting continued investor appetite despite reimbursement pressures. The implied valuation of $9M per facility is below the 2023 average of $12M, indicating potential distress sale pricing. Competitors in the region should expect increased competition for managed care contracts."
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
        max_tokens: 2000,
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
