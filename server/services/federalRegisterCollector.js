import fetch from 'node-fetch';
import aiService from './aiService.js';

// Using unified AI service with automatic fallback

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
    const prompt = `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs) running on 1-2% margins. Your goal is to identify BOTH direct SNF impacts AND strategic ecosystem impacts that will affect SNF operations even if SNFs aren't explicitly mentioned.

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

3. **Overall Relevance** = (Direct * 0.7) + (Ecosystem * 0.3)
   - ONLY include bills with Overall Relevance >= 50

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

9. **Financial Impact**: Be SPECIFIC with numbers. For a 100-bed facility, estimate:
   - Per-bed or per-patient-day costs if applicable
   - One-time vs. ongoing costs
   - Revenue impact (e.g., "$X per patient per day", "2-3% margin pressure", "$Xk annual cost")
   If no direct financial impact, state "No direct financial impact - [brief reason]"

10. **Action Required**: true/false - Does this require SNF action (comment, strategy change, preparation)?

11. **Strategic Actions** (if actionRequired = true):
    List 2-4 SPECIFIC actions with timeframes. Examples:
    - "Model census impact if IRF captures 15% of current rehab volume by Q1 2026"
    - "Review MA contracts for prior auth language by November 30"
    - "Budget $X for compliance training by effective date"

12. **Compliance Timeline**:
    - commentDeadline: Exact date from document or "N/A"
    - effectiveDate: Exact date from document or "N/A"
    - prepTime: Estimated prep time needed (e.g., "90 days", "6 months") or "N/A"
    - criticalDates: Array of key dates with context, or empty array

13. **Implementation Complexity**: "Low", "Medium", or "High"
    - Low: Informational only, minimal action needed
    - Medium: Some operational changes, training, policy updates
    - High: Major operational overhaul, capital investment, significant compliance effort

14. **Urgency Score** (0-100): Weighted composite score based on impact type and time-sensitivity.

    **Primary Factors (60% of score):**
    - Regulatory/Compliance Impact (30%): CMS rules, certification requirements, enforcement policies
    - Financial Impact (30%): Reimbursement changes, rate adjustments, payment reforms, margin impact >1%

    **Secondary Factors (40% of score):**
    - Time Sensitivity (25%): Comment period deadlines, effective dates, implementation timelines
    - Operational Disruption (15%): Staffing requirements, workflow changes, documentation burdens

    **Scoring Guidelines:**
    - 90-100: Critical regulatory rule OR major financial impact (>5% margin) + immediate action/comment deadline
    - 75-89: Significant regulatory/financial impact with near-term deadline (30-90 days)
    - 60-74: Important regulatory/financial changes with longer timeline (3-12 months) or 2-5% margin impact
    - 40-59: Proposed rules, advance notices, moderate impact (<2%)
    - 20-39: General notices, informational documents, long-term policy discussions
    - 0-19: Low priority notices, minor administrative updates

15. **Impact Factors** (who is most affected):
    - facilityTypes: Array from ["SNF", "ALF", "Memory Care", "CCRC", "All Post-Acute"]
    - bedSizes: Array from ["<50 beds", "50-100 beds", "100-200 beds", "200+ beds", "All sizes"]
    - payorMix: Array from ["High Medicaid", "High Medicare", "High Private Pay", "Mixed", "All"]
    - geography: Array from ["Urban", "Suburban", "Rural", "All"]
    - ownershipTypes: Array from ["Chain-owned", "Independent", "Non-Profit", "For-Profit", "All"]

16. **Structured Entities** (for pattern recognition):
    - organizations: Array of mentioned orgs (e.g., ["CMS", "AHCA", "Genesis HealthCare"])
    - regulations: Array of specific regs cited (e.g., ["42 CFR 483.70", "SNF PPS Final Rule 2026"])
    - financialFigures: Array with context (e.g., [{"amount": "2.8%", "context": "Medicare rate increase FY2026"}])

17. **Temporal Signals**:
    - isRecurring: true/false - Annual regulation? (e.g., PPS updates)
    - precedents: Array of similar past events (e.g., ["Similar IRF rate differential in FY2025"])
    - cyclicality: "annual" | "quarterly" | "ad-hoc" | "unknown"
    - leadTime: Typical advance warning (e.g., "90 days", "6 months", "none")

18. **Market Forces**: Array of dynamics at play (e.g., ["margin-compression", "patient-steering", "consolidation", "labor-shortage", "regulatory-burden"])

19. **Competitive Intelligence** (1-2 sentences):
    Which operators/chains are mentioned or positioned better/worse? How does this create competitive advantages/disadvantages? Or "N/A" if not applicable.

20. **Strategic Implications** (2-3 sentences):
    Beyond immediate impact, what are the 2nd and 3rd order effects? How might this change competitive dynamics or require downstream operational shifts?

21. **Categories**: Assign 2-4 from: ["Reimbursement", "Staffing", "Quality", "Compliance", "Survey", "Technology", "Safety", "Clinical", "Finance", "Enforcement", "Competitive Intelligence", "Market Strategy", "Payer Relations"]

22. **Summary** (4-5 sentences): Plain English. Explain what this does AND why SNF operators should care even if it's not directly about SNFs.

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
  "financialImpact": "For 100-bed facility: ~$180k annual revenue loss if IRF captures 15% of rehab volume ($50 lower per-patient-day x 10 beds x 365 days)",
  "actionRequired": true,
  "strategicActions": [
    "Model census impact if IRF captures 15% of current rehab volume by Q1 2026",
    "Develop outcomes benchmarking vs local IRFs to retain hospital referrals by December 2025",
    "Identify clinical niches where SNF has advantage over IRF (medically complex rehab) by November 2025"
  ],
  "complianceTimeline": {
    "commentDeadline": "MM/DD/YYYY or N/A",
    "effectiveDate": "10/01/2025",
    "prepTime": "90 days",
    "criticalDates": ["10/01/2025: New rates effective", "12/31/2025: First quarterly impact visible"]
  },
  "implementationComplexity": "Medium",
  "urgencyScore": 65,
  "impactFactors": {
    "facilityTypes": ["SNF"],
    "bedSizes": ["50-100 beds", "100-200 beds"],
    "payorMix": ["High Medicare"],
    "geography": ["Urban", "Suburban"],
    "ownershipTypes": ["For-Profit", "Chain-owned"]
  },
  "entities": {
    "organizations": ["CMS", "AHCA"],
    "regulations": ["42 CFR 412 Subpart P"],
    "financialFigures": [
      {"amount": "3.2%", "context": "IRF rate increase FY2026"},
      {"amount": "2.8%", "context": "SNF rate increase FY2026"}
    ]
  },
  "temporalSignals": {
    "isRecurring": true,
    "precedents": ["Similar IRF rate differential in FY2025 led to 8% volume shift"],
    "cyclicality": "annual",
    "leadTime": "90 days"
  },
  "marketForces": ["margin-compression", "patient-steering", "competitive-intensity"],
  "competitiveIntelligence": "Large chains with co-located IRF and SNF units can optimize patient placement; independent SNFs lose referral leverage",
  "strategicImplications": "Sustained IRF rate advantages will force SNFs to either develop specialized clinical programs or accept lower-acuity, lower-margin patients. May accelerate SNF-IRF consolidation.",
  "commentPeriod": false,
  "categories": ["Competitive Intelligence", "Market Strategy", "Finance", "Reimbursement"],
  "summary": "Plain English explanation including WHY this matters to SNFs even if not directly mentioned",
  "reasoning": "2-3 sentences explaining the relevance scores and strategic intelligence value"
}`;

    const response = await aiService.analyzeContent(prompt, {
      maxTokens: 3000,
      temperature: 0.3
    });

    const responseText = response.content;
    console.log(`🤖 Federal Register analysis using ${response.provider}`);

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
    url: doc.html_url,  // Changed from full_text_url to url
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

    // Enhanced analysis fields (from article prompt)
    urgency_score: analysis.urgencyScore || null,
    implementation_complexity: analysis.implementationComplexity || null,
    competitive_intelligence: analysis.competitiveIntelligence || null,
    strategic_implications: analysis.strategicImplications || null,
    impact_factors: analysis.impactFactors || null,
    entities: analysis.entities || null,
    temporal_signals: analysis.temporalSignals || null,
    market_forces: analysis.marketForces || null,
    compliance_timeline: analysis.complianceTimeline || null,

    // Status tracking
    status: doc.comments_close_on ? 'comment_period' : 'published',
    last_updated: new Date().toISOString()
  };
}

/**
 * Main collection function - fetch, analyze, and return bills
 * @param {number} daysBack - Number of days to look back
 * @param {number} minRelevanceScore - Minimum OVERALL relevance score to include (default: 50)
 * @param {Set<string>} existingBillNumbers - Set of existing bill numbers to skip (optional)
 * @returns {Promise<Array>} Array of bills ready for database insertion
 */
export async function collectFederalRegisterBills(daysBack = 30, minRelevanceScore = 50, existingBillNumbers = new Set()) {
  try {
    console.log('\n🚀 Starting Federal Register bill collection...\n');

    // Step 1: Fetch documents
    const documents = await fetchFederalRegisterDocuments(daysBack);

    if (documents.length === 0) {
      console.log('No documents found matching criteria');
      return [];
    }

    // Step 2: Filter out already-analyzed documents BEFORE AI analysis
    const newDocuments = documents.filter(doc => {
      const billNumber = `FR-${doc.document_number}`;
      return !existingBillNumbers.has(billNumber);
    });

    const duplicateCount = documents.length - newDocuments.length;

    console.log(`📊 Deduplication check:`);
    console.log(`   Total documents fetched: ${documents.length}`);
    console.log(`   Already in database: ${duplicateCount}`);
    console.log(`   New documents to analyze: ${newDocuments.length}\n`);

    if (newDocuments.length === 0) {
      console.log('✅ No new documents to analyze. All documents already in database.\n');
      return [];
    }

    // Step 3: Analyze ONLY new documents with AI
    console.log(`🤖 Analyzing ${newDocuments.length} NEW documents with AI...\n`);
    const bills = [];
    let analyzedCount = 0;

    for (const doc of newDocuments) {
      try {
        analyzedCount++;
        console.log(`[${analyzedCount}/${newDocuments.length}] Analyzing: ${doc.title.substring(0, 80)}...`);

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
    console.log(`   Documents skipped (already in DB): ${duplicateCount}`);
    console.log(`   New documents analyzed: ${analyzedCount}`);
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
