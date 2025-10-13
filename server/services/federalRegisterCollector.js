import fetch from 'node-fetch';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';

/**
 * Federal Register Collector
 * Fetches recent documents from Federal Register API
 * Filters for SNF/healthcare relevance
 * Uses AI to score and analyze relevance
 */

// SNF-relevant keywords for filtering
const SNF_KEYWORDS = [
  'skilled nursing facility',
  'nursing home',
  'long-term care',
  'SNF',
  'medicare part a',
  'medicaid',
  'cms',
  'centers for medicare',
  'post-acute care',
  'nursing facility',
  'quality measure',
  'star rating',
  'minimum staffing',
  'pdpm',
  'patient driven payment',
  'swing bed',
  'prospective payment system',
  'pps',
  'case mix',
  'resource utilization',
  '42 cfr 483',
  'survey and certification',
  'state operations manual',
  'life safety code'
];

// Relevant agencies
const RELEVANT_AGENCIES = [
  'centers-for-medicare-medicaid-services',
  'health-and-human-services-department',
  'centers-for-disease-control-and-prevention'
];

/**
 * Fetch recent documents from Federal Register
 * @param {number} daysBack - Number of days to look back (default: 30)
 * @returns {Promise<Array>} Array of document objects
 */
export async function fetchFederalRegisterDocuments(daysBack = 30) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`\n📋 Fetching Federal Register documents from ${startDateStr} to ${endDateStr}...`);

    // Build search query - fetch ALL CMS documents and let AI + keyword filter do the work
    // This is more reliable than complex search terms which can break the API
    const conditions = {
      'conditions[agencies][]': 'centers-for-medicare-medicaid-services',
      'conditions[publication_date][gte]': startDateStr,
      'conditions[publication_date][lte]': endDateStr,
      'per_page': 100,
      'order': 'newest'
    };

    const queryString = new URLSearchParams(conditions).toString();
    const url = `${FEDERAL_REGISTER_API}/documents.json?${queryString}`;

    console.log(`🌐 API URL: ${url}\n`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Federal Register API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const documents = data.results || [];

    console.log(`✓ Fetched ${documents.length} documents from Federal Register`);

    // Filter for SNF relevance by keyword matching
    const relevantDocs = documents.filter(doc => {
      const searchText = `${doc.title} ${doc.abstract || ''} ${doc.type || ''}`.toLowerCase();
      return SNF_KEYWORDS.some(keyword => searchText.includes(keyword.toLowerCase()));
    });

    console.log(`✓ Filtered to ${relevantDocs.length} potentially SNF-relevant documents\n`);

    return relevantDocs;

  } catch (error) {
    console.error('Error fetching Federal Register documents:', error);
    throw error;
  }
}

/**
 * Analyze document with AI for SNF relevance
 * @param {Object} document - Federal Register document
 * @returns {Promise<Object>} Analysis result with relevance score and details
 */
export async function analyzeDocumentRelevance(document) {
  try {
    const prompt = `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs).

Analyze this Federal Register document for relevance to SNF operators:

Title: ${document.title}
Agency: ${document.agencies ? document.agencies.map(a => a.name).join(', ') : 'N/A'}
Type: ${document.type}
Publication Date: ${document.publication_date}
Abstract: ${document.abstract || 'Not provided'}
Comment Deadline: ${document.comments_close_on || 'N/A'}

Requirements:

1. **Relevance Score** (0-100): How relevant is this to SNF operators?
   - 90-100: Critical impact on SNF operations, compliance, or finances
   - 70-89: Significant impact requiring attention and likely action
   - 50-69: Moderate relevance, affects some SNFs or specific situations
   - 30-49: Limited relevance, peripheral impact
   - 0-29: Minimal to no relevance to SNFs

2. **Priority Level**: "critical", "high", "medium", or "low"
   - critical: Immediate action required, major compliance or financial impact
   - high: Important, requires planning and preparation
   - medium: Worth monitoring, may require future action
   - low: Informational only

3. **Key Impact** (2-3 sentences): What does this mean for SNF operators? Be specific about operational, financial, or compliance implications.

4. **Affected Operators** (1-2 sentences): Which SNFs are most affected? (e.g., size, location, payor mix, ownership type)

5. **Financial Impact**: Estimate if possible. Use "High cost" / "Moderate cost" / "Low cost" / "Revenue positive" / "Neutral" / "Unknown"

6. **Action Required**: true/false - Does this require SNFs to take action (respond to comment period, change operations, update policies)?

7. **Comment Period**: true/false - Is there an active comment period SNFs should respond to?

8. **Categories**: Assign 2-4 categories from: ["Reimbursement", "Staffing", "Quality", "Compliance", "Survey", "Technology", "Safety", "Clinical", "Finance", "Enforcement", "Other"]

9. **Summary** (3-4 sentences): Plain English explanation of what this document does and why SNF operators should care.

CRITICAL: Respond with ONLY valid JSON. No text before or after. Start with { and end with }.

JSON Structure:
{
  "relevanceScore": 85,
  "priority": "high",
  "keyImpact": "Brief description of impact",
  "affectedOperators": "Description of who is affected",
  "financialImpact": "High cost",
  "actionRequired": true,
  "commentPeriod": false,
  "categories": ["Reimbursement", "Quality"],
  "summary": "Plain English summary",
  "reasoning": "1-2 sentences explaining the relevance score"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from response
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON object found in AI response');
    }

    const jsonText = responseText.substring(jsonStart, jsonEnd + 1);
    const analysis = JSON.parse(jsonText);

    return analysis;

  } catch (error) {
    console.error('Error analyzing document with AI:', error);
    throw error;
  }
}

/**
 * Convert Federal Register document to bill format for database
 * @param {Object} doc - Federal Register document
 * @param {Object} analysis - AI analysis result
 * @returns {Object} Bill object ready for database insertion
 */
export function convertToDBFormat(doc, analysis) {
  // Generate a unique bill number
  const billNumber = `FR-${doc.document_number}`;

  return {
    bill_number: billNumber,
    title: doc.title,
    summary: doc.abstract || analysis.summary,
    full_text_url: doc.html_url,
    pdf_url: doc.pdf_url,
    source: 'federal_register',
    jurisdiction: 'federal',
    state: null,
    agencies: doc.agencies ? doc.agencies.map(a => a.name) : [],
    document_type: doc.type,

    // Dates
    publication_date: doc.publication_date,
    comment_deadline: doc.comments_close_on || null,
    effective_date: doc.effective_on || null,

    // AI Analysis fields
    ai_relevance_score: analysis.relevanceScore,
    priority: analysis.priority,
    categories: analysis.categories || [],

    // Financial impact
    financial_impact_description: analysis.financialImpact,
    financial_impact_pbpy: null, // To be calculated separately if needed

    // Flags
    has_comment_period: analysis.commentPeriod || (doc.comments_close_on !== null),
    action_required: analysis.actionRequired,

    // Additional metadata
    affected_operators: analysis.affectedOperators,
    key_impact: analysis.keyImpact,

    // Status tracking
    status: doc.comments_close_on ? 'comment_period' : 'published',
    last_updated: new Date().toISOString()
  };
}

/**
 * Main collection function - fetch, analyze, and return bills
 * @param {number} daysBack - Number of days to look back
 * @param {number} minRelevanceScore - Minimum relevance score to include (default: 50)
 * @returns {Promise<Array>} Array of bills ready for database insertion
 */
export async function collectFederalRegisterBills(daysBack = 30, minRelevanceScore = 50) {
  try {
    console.log('\n🚀 Starting Federal Register bill collection...\n');

    // Step 1: Fetch documents
    const documents = await fetchFederalRegisterDocuments(daysBack);

    if (documents.length === 0) {
      console.log('No documents found matching criteria');
      return [];
    }

    // Step 2: Analyze each document with AI
    console.log(`🤖 Analyzing ${documents.length} documents with AI...\n`);
    const bills = [];
    let analyzedCount = 0;

    for (const doc of documents) {
      try {
        analyzedCount++;
        console.log(`[${analyzedCount}/${documents.length}] Analyzing: ${doc.title.substring(0, 80)}...`);

        const analysis = await analyzeDocumentRelevance(doc);

        // Filter by relevance score
        if (analysis.relevanceScore >= minRelevanceScore) {
          const bill = convertToDBFormat(doc, analysis);
          bills.push(bill);
          console.log(`   ✓ Relevance: ${analysis.relevanceScore}/100 - Priority: ${analysis.priority} - INCLUDED`);
        } else {
          console.log(`   ✗ Relevance: ${analysis.relevanceScore}/100 - FILTERED OUT (below ${minRelevanceScore})`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`   Error analyzing document: ${error.message}`);
        continue;
      }
    }

    console.log(`\n✅ Collection complete!`);
    console.log(`   Total documents fetched: ${documents.length}`);
    console.log(`   Documents analyzed: ${analyzedCount}`);
    console.log(`   Bills meeting criteria (score >= ${minRelevanceScore}): ${bills.length}\n`);

    return bills;

  } catch (error) {
    console.error('Error in collectFederalRegisterBills:', error);
    throw error;
  }
}

// Export all functions
export default {
  fetchFederalRegisterDocuments,
  analyzeDocumentRelevance,
  convertToDBFormat,
  collectFederalRegisterBills
};
