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
 * Analyze document with AI for SNF relevance INCLUDING ecosystem impacts
 * @param {Object} document - Federal Register document
 * @returns {Promise<Object>} Analysis result with relevance score and details
 */
export async function analyzeDocumentRelevance(document) {
  try {
    const prompt = `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs). Your goal is to identify BOTH direct SNF impacts AND strategic ecosystem impacts that will affect SNF operations even if SNFs aren't explicitly mentioned.

CRITICAL CONTEXT: SNF operators need to understand:
- How changes in OTHER settings (hospitals, IRFs, home health) affect patient flow TO/FROM SNFs
- How competitive payment changes affect which patients SNFs get (or lose)
- How payer behavior changes upstream affect SNF operations downstream
- How regulations in other settings signal future SNF regulations

Analyze this Federal Register document:

Title: ${document.title}
Agency: ${document.agencies ? document.agencies.map(a => a.name).join(', ') : 'N/A'}
Type: ${document.type}
Publication Date: ${document.publication_date}
Abstract: ${document.abstract || 'Not provided'}
Comment Deadline: ${document.comments_close_on || 'N/A'}

ANALYSIS REQUIREMENTS:

1. **Direct SNF Relevance** (0-100): Does this explicitly mention or regulate SNFs?
   - 90-100: Direct SNF regulations (PPS, quality, staffing, etc.)
   - 50-89: Mentions SNFs in broader post-acute context
   - 0-49: No direct SNF mentions

2. **Ecosystem Relevance** (0-100): How does this affect SNFs through the healthcare ecosystem?
   Consider:
   - COMPETITIVE DYNAMICS: IRF/LTCH/Home Health payment changes → patient steering
   - PATIENT FLOW: Hospital penalties → admission patterns, discharge destination pressure
   - PAYER BEHAVIOR: MA/ACO changes → utilization management, network strategies
   - WORKFORCE: Wage/staffing rules in other settings → SNF cost pressure coming
   - PAYMENT PHILOSOPHY: CMS methodology changes → signals future SNF changes

   Scoring:
   - 90-100: Major competitive/flow impact affecting >20% of SNF patients/revenue
   - 70-89: Significant impact on specific patient segments or payer relationships
   - 50-69: Moderate strategic impact, requires monitoring
   - 30-49: Minor indirect effect
   - 0-29: No ecosystem impact

3. **Overall Relevance** = (Direct * 0.4) + (Ecosystem * 0.6)
   We weight ecosystem impacts MORE because operators can find direct regs elsewhere. Our value is surfacing non-obvious strategic intelligence.

4. **Impact Type** (select primary type):
   - "Direct Regulation": Explicitly regulates SNFs
   - "Competitive Dynamics": Affects competitors (IRF, LTCH, home health, hospice)
   - "Patient Flow": Changes upstream (hospital) or downstream (discharge) patterns
   - "Payer Behavior": MA, ACO, bundled payment, prior auth changes
   - "Workforce/Operations": Labor, staffing, technology, safety regulations
   - "Payment Philosophy": CMS methodology signals for future SNF changes

5. **Priority Level**: "critical", "high", "medium", "watch-list", or "low"
   - critical: overallRelevance ≥ 85 OR ecosystemRelevance ≥ 90
   - high: overallRelevance 70-84
   - medium: overallRelevance 50-69
   - watch-list: overallRelevance 35-49 (track for future relevance)
   - low: overallRelevance < 35

6. **Ecosystem Impact Details** (if ecosystemRelevance > 40):
   Provide specific strategic intelligence:
   - competitorEffect: How does this change competitive positioning?
   - patientFlowEffect: How does this affect admissions/discharges?
   - payerSignal: What does this reveal about payer strategy?
   - timingSignal: Is this a leading indicator of future SNF changes?

7. **Key Impact** (3-4 sentences): Explain BOTH direct and ecosystem impacts. Be specific about strategic implications, not just descriptive.

8. **Affected Operators** (2-3 sentences): Who is most affected and WHY? Consider payor mix, acuity level, geography, competitive environment.

9. **Financial Impact**: Be specific. Options: "High cost", "Moderate cost", "Low cost", "Revenue positive", "Revenue pressure", "Competitive threat", "Neutral", "Unknown"

10. **Action Required**: true/false - Does this require SNF action (comment, strategy change, preparation)?

11. **Strategic Actions** (if actionRequired = true):
    List 2-4 specific strategic, financial, or operational actions operators should take.

12. **Categories**: Assign 2-4 from: ["Reimbursement", "Staffing", "Quality", "Compliance", "Survey", "Technology", "Safety", "Clinical", "Finance", "Enforcement", "Competitive Intelligence", "Market Strategy", "Payer Relations"]

13. **Summary** (4-5 sentences): Plain English. Explain what this does AND why SNF operators should care even if it's not directly about SNFs.

CRITICAL: Respond with ONLY valid JSON. No text before or after. Start with { and end with }.

JSON Structure:
{
  "directSNFRelevance": 25,
  "ecosystemRelevance": 75,
  "overallRelevance": 55,
  "impactType": "Competitive Dynamics",
  "priority": "medium",
  "keyImpact": "Detailed explanation of direct AND ecosystem impacts",
  "ecosystemImpact": {
    "competitorEffect": "IRF rates increase 3.2% vs SNF 2.8% = patient steering to IRFs for profitable rehab cases",
    "patientFlowEffect": "Hospitals incentivized to discharge complex rehab to IRFs, leaving SNFs with medical-only patients",
    "payerSignal": "CMS prioritizing rehab outcomes over medical management in payment methodology",
    "timingSignal": "This IRF change typically signals SNF methodology changes in 12-18 months"
  },
  "affectedOperators": "High Medicare, rehab-focused SNFs in competitive markets with nearby IRFs will see volume pressure on stroke, joint replacement, and trauma admissions",
  "financialImpact": "Competitive threat",
  "actionRequired": true,
  "strategicActions": [
    "Model census impact if IRF captures 15% of current rehab volume",
    "Develop outcomes benchmarking vs local IRFs to retain hospital referrals",
    "Identify clinical niches where SNF has advantage over IRF (medically complex rehab)"
  ],
  "commentPeriod": false,
  "categories": ["Competitive Intelligence", "Market Strategy", "Finance"],
  "summary": "Plain English explanation including WHY this matters to SNFs even if not directly mentioned",
  "reasoning": "2-3 sentences explaining the relevance scores and strategic intelligence value"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
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

    // AI Analysis fields - NEW ecosystem scoring
    ai_relevance_score: analysis.overallRelevance || analysis.relevanceScore, // Use overallRelevance if available
    direct_relevance_score: analysis.directSNFRelevance || null,
    ecosystem_relevance_score: analysis.ecosystemRelevance || null,
    impact_type: analysis.impactType || 'Direct Regulation',
    priority: analysis.priority,
    categories: analysis.categories || [],

    // Ecosystem impact details (store as JSON)
    ecosystem_impact: analysis.ecosystemImpact || null,
    strategic_actions: analysis.strategicActions || [],

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
 * @param {number} minRelevanceScore - Minimum OVERALL relevance score to include (default: 50)
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

        // Filter by OVERALL relevance score (weighted: direct 40% + ecosystem 60%)
        const relevanceScore = analysis.overallRelevance || analysis.relevanceScore || 0;
        if (relevanceScore >= minRelevanceScore) {
          const bill = convertToDBFormat(doc, analysis);
          bills.push(bill);
          console.log(`   ✓ Overall: ${relevanceScore}/100 (Direct: ${analysis.directSNFRelevance || 'N/A'}, Ecosystem: ${analysis.ecosystemRelevance || 'N/A'}) - Priority: ${analysis.priority} - INCLUDED`);
        } else {
          console.log(`   ✗ Overall: ${relevanceScore}/100 (Direct: ${analysis.directSNFRelevance || 'N/A'}, Ecosystem: ${analysis.ecosystemRelevance || 'N/A'}) - FILTERED OUT (below ${minRelevanceScore})`);
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
