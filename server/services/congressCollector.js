import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import * as billsDB from '../database/bills.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';

// Target committees for SNF-relevant legislation
const TARGET_COMMITTEES = {
  house: [
    'House Committee on Ways and Means',
    'House Committee on Energy and Commerce',
    'House Committee on Appropriations',
  ],
  senate: [
    'Senate Committee on Finance',
    'Senate Committee on Health, Education, Labor, and Pensions',
    'Senate Committee on Appropriations',
  ]
};

// SNF-related keywords for initial filtering
const SNF_KEYWORDS = [
  'skilled nursing',
  'nursing facility',
  'nursing home',
  'SNF',
  'post-acute care',
  'long-term care',
  'medicare part a',
  'medicaid nursing',
  'nursing facility services',
  'swing bed',
  // Broader Medicare/Medicaid terms (will be filtered by AI)
  'medicare',
  'medicaid',
  'health care',
  'healthcare',
];

/**
 * Fetch bills from Congress.gov API
 */
async function fetchCongressBills(options = {}) {
  const {
    congress = getCurrentCongress(),
    fromDate = null,
    limit = 250,
    offset = 0
  } = options;

  let url = `${CONGRESS_API_BASE}/bill/${congress}?api_key=${CONGRESS_API_KEY}&format=json&limit=${limit}&offset=${offset}`;

  if (fromDate) {
    url += `&fromDateTime=${fromDate}`;
  }

  console.log(`🌐 API URL: ${url}\n`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Congress.gov API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.bills || [];
}

/**
 * Fetch detailed bill information
 */
async function fetchBillDetails(congress, billType, billNumber) {
  const url = `${CONGRESS_API_BASE}/bill/${congress}/${billType}/${billNumber}?api_key=${CONGRESS_API_KEY}&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Congress.gov API error for bill details: ${response.status}`);
  }

  const data = await response.json();
  return data.bill;
}

/**
 * Fetch bill summaries
 */
async function fetchBillSummaries(congress, billType, billNumber) {
  const url = `${CONGRESS_API_BASE}/bill/${congress}/${billType}/${billNumber}/summaries?api_key=${CONGRESS_API_KEY}&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    return data.summaries || [];
  } catch (error) {
    return null;
  }
}

/**
 * Fetch bill actions
 */
async function fetchBillActions(congress, billType, billNumber) {
  const url = `${CONGRESS_API_BASE}/bill/${congress}/${billType}/${billNumber}/actions?api_key=${CONGRESS_API_KEY}&format=json&limit=10`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    return data.actions || [];
  } catch (error) {
    return [];
  }
}

/**
 * Get current Congress number (118th Congress = 2023-2024)
 */
function getCurrentCongress() {
  const year = new Date().getFullYear();
  return Math.floor((year - 1789) / 2) + 1;
}

/**
 * Filter bills by SNF-related keywords
 */
function filterByKeywords(bills) {
  return bills.filter(bill => {
    const searchText = `${bill.title || ''} ${bill.latestAction?.text || ''}`.toLowerCase();
    return SNF_KEYWORDS.some(keyword => searchText.includes(keyword.toLowerCase()));
  });
}

/**
 * Analyze bill relevance with AI
 */
export async function analyzeBillRelevance(bill, billDetails, summaries) {
  try {
    const prompt = `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs) running on 1-2% margins. Your goal is to identify BOTH direct SNF impacts AND strategic ecosystem impacts from federal legislation.

BILL TO ANALYZE:
- Bill Number: ${bill.number}
- Title: ${bill.title}
- Latest Action: ${bill.latestAction?.text || 'N/A'} (${bill.latestAction?.actionDate || 'N/A'})
- Sponsor: ${billDetails?.sponsor?.firstName || ''} ${billDetails?.sponsor?.lastName || ''} (${billDetails?.sponsor?.party || ''}-${billDetails?.sponsor?.state || ''})
- Summary: ${summaries && summaries.length > 0 ? summaries[0].text : 'No summary available'}
- Committees: ${Array.isArray(billDetails?.committees) ? billDetails.committees.map(c => c.name).join(', ') : 'N/A'}
- Cosponsors Count: ${billDetails?.cosponsors?.count || 0}

ANALYSIS REQUIREMENTS:

1. **Direct SNF Relevance** (0-100): Does this explicitly regulate or fund SNFs?
   - 90-100: Direct SNF regulation/payment changes
   - 70-89: Medicare Part A changes affecting SNFs
   - 50-69: Medicaid LTSS changes
   - 30-49: General healthcare workforce/quality measures
   - 0-29: Minimal/no SNF impact

2. **Ecosystem Relevance** (0-100): How does this affect SNFs through the healthcare ecosystem?
   - Payment philosophy signals (value-based care expansion, site-neutral payment)
   - Competitive dynamics (IRF, LTCH, home health regulatory changes)
   - Patient flow patterns (hospital discharge planning, MA plan rules)
   - Workforce spillover (nursing scope of practice, immigration)
   - Payer behavior shifts (MA overpayments, Medicaid expansion)

3. **Overall Relevance** = (Direct * 0.7) + (Ecosystem * 0.3)
   - ONLY include bills with Overall Relevance >= 50

4. **Impact Type**: Select ONE that best fits:
   - "Direct SNF Regulation"
   - "Medicare Part A Payment"
   - "Medicaid LTSS Policy"
   - "Healthcare Workforce"
   - "Competitive Dynamics"
   - "Patient Flow & Discharge"
   - "Value-Based Care"
   - "Quality & Compliance"

5. **Priority Level**:
   - "critical": Direct payment cuts/increases, major regulatory changes, high passage likelihood
   - "high": Significant workforce/quality impacts, moderate passage likelihood
   - "medium": Indirect effects, lower passage likelihood
   - "watch-list": Early-stage bills, precedent-setting proposals
   - "low": Minimal impact

6. **Passage Likelihood** (0-100):
   - Consider: bipartisan support, committee leadership, budget implications, political climate
   - 80-100: Strong bipartisan support, budget reconciliation, must-pass vehicle
   - 50-79: Moderate support, moving through committees
   - 20-49: Partisan, early stage, uncertain
   - 0-19: Unlikely to pass

7. **Legislative Stage**: Current status (Introduced, Committee Review, Passed House, Passed Senate, Enacted, etc.)

8. **Key Provisions**: List 2-4 bullet points of most important provisions

9. **Financial Impact**: Be SPECIFIC with numbers. For a 100-bed facility:
   - Per-bed annual impact (e.g., "+$2,500/bed/year if case-mix adjustment increases")
   - Per-patient-day impact (e.g., "-$8/patient-day if therapy cuts enacted")
   - Total facility impact range (e.g., "$150K-$400K additional cost for 100-bed facility")
   - If unknown, provide range based on similar historical changes

10. **Affected Operators**: Who wins/loses?
    - By facility type (hospital-based vs freestanding, rural vs urban)
    - By size (small <100 beds vs large chains)
    - By payor mix (high Medicaid vs high Medicare)
    - By quality rating (5-star vs 1-2 star)

11. **Strategic Actions**: What should operators do? Be specific with timeframes:
    - Immediate (next 30 days): e.g., "Model financial impact using current case-mix data"
    - Short-term (1-3 months): e.g., "Engage with state association on amendments"
    - Medium-term (3-12 months): e.g., "Prepare operational changes if enacted"

12. **Implementation Timeline**: If enacted, when would this take effect?
    - Immediate, 6 months, 1 year, fiscal year 2026, etc.

13. **Implementation Complexity**: "Low", "Medium", or "High"
    - Consider: operational changes required, IT system updates, staff training, policy development

14. **Urgency Score** (0-100): How time-sensitive is operator action?
    - Consider: passage likelihood, comment periods, implementation timeline
    - 90-100: Imminent vote or comment deadline
    - 70-89: Active legislative movement
    - 50-69: Committee stage with momentum
    - 30-49: Early stage but important to monitor
    - 0-29: Low urgency

15. **Impact Factors**: Which facilities are most affected?
{
  "facilityTypes": ["hospital-based", "freestanding", "rural", "urban"],
  "bedSizes": ["small", "medium", "large"],
  "payorMix": ["high-medicare", "high-medicaid", "dual-eligible-heavy"],
  "geography": ["states", "regions"],
  "ownershipTypes": ["for-profit", "non-profit", "government", "REIT"]
}

16. **Structured Entities**: Extract key entities
{
  "organizations": ["CMS", "HHS", "AHCA", "specific operator names"],
  "regulations": ["Medicare Part A", "Medicaid LTSS", "specific CFR citations"],
  "financialFigures": [
    {"amount": "$500M", "context": "total program funding over 5 years"}
  ]
}

17. **Temporal Signals**:
{
  "isRecurring": false,
  "precedents": ["Similar 2019 legislation increased rates by 2.3%"],
  "cyclicality": "Annual budget reconciliation",
  "leadTime": "18 months from introduction to typical enactment"
}

18. **Market Forces**: Array of competitive/economic dynamics at play
["Hospital discharge pressure increasing", "MA plan growth accelerating", "Workforce shortage intensifying"]

19. **Competitive Intelligence**: Which operators/regions are positioned better or worse?
"Large chains with diversified payor mix better positioned to absorb cuts; rural facilities with high Medicaid may face closure risk."

20. **Strategic Implications**: What are the 2nd and 3rd order effects?
"If enacted, expect consolidation pressure on small operators, potential shift to hospital-at-home models, increased MA plan steering to lower-cost sites."

21. **Compliance Timeline**: Key dates operators need to track
[
  {"date": "2025-03-15", "milestone": "Comment period closes", "action": "Submit comments via regulations.gov"},
  {"date": "2025-10-01", "milestone": "Rule effective date", "action": "Implement new documentation requirements"}
]

RESPONSE FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "directSNFRelevance": <0-100>,
  "ecosystemRelevance": <0-100>,
  "overallRelevance": <calculated score>,
  "impactType": "<type>",
  "priority": "<critical|high|medium|watch-list|low>",
  "passageLikelihood": <0-100>,
  "legislativeStage": "<stage>",
  "keyProvisions": ["provision 1", "provision 2", ...],
  "financialImpact": "<specific financial description>",
  "affectedOperators": "<who wins/loses>",
  "strategicActions": [
    {"timeframe": "immediate", "action": "specific action"},
    {"timeframe": "short-term", "action": "specific action"}
  ],
  "implementationTimeline": "<when>",
  "implementationComplexity": "<Low|Medium|High>",
  "urgencyScore": <0-100>,
  "impactFactors": {...},
  "entities": {...},
  "temporalSignals": {...},
  "marketForces": [...],
  "competitiveIntelligence": "<analysis>",
  "strategicImplications": "<2nd/3rd order effects>",
  "complianceTimeline": [...],
  "reasoning": "<brief explanation of scores>"
}

IF the bill has Overall Relevance < 50, return:
{
  "directSNFRelevance": <score>,
  "ecosystemRelevance": <score>,
  "overallRelevance": <score>,
  "reasoning": "Not SNF-relevant because..."
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error(`   ✗ AI analysis error: ${error.message}`);
    return null;
  }
}

/**
 * Convert Congress.gov bill to database format
 */
function convertToDBFormat(bill, billDetails, summaries, actions, analysis) {
  const latestAction = actions && actions.length > 0 ? actions[0] : bill.latestAction;

  return {
    bill_number: bill.number,
    external_id: `${bill.congress}-${bill.type}-${bill.number}`,
    title: bill.title,
    summary: summaries && summaries.length > 0 ? summaries[0].text : analysis.keyProvisions?.join('; '),
    full_text: billDetails?.textVersions?.length > 0 ? billDetails.textVersions[0].formats?.[0]?.url : null,
    source: 'congress',
    jurisdiction: 'federal',
    state: null,
    document_type: bill.type,
    status: latestAction?.text || 'Introduced',
    sponsor: billDetails?.sponsor ? `${billDetails.sponsor.firstName} ${billDetails.sponsor.lastName} (${billDetails.sponsor.party}-${billDetails.sponsor.state})` : null,
    committee: Array.isArray(billDetails?.committees) ? billDetails.committees.map(c => c.name).join('; ') : null,
    introduced_date: bill.introducedDate || null,
    last_action_date: latestAction?.actionDate || bill.updateDate || null,
    url: bill.url || `https://www.congress.gov/bill/${bill.congress}th-congress/${bill.type.toLowerCase()}-bill/${bill.number.replace(/\D/g, '')}`,
    api_url: `${CONGRESS_API_BASE}/bill/${bill.congress}/${bill.type}/${bill.number}`,
    pdf_url: billDetails?.textVersions?.length > 0 ? billDetails.textVersions[0].formats?.find(f => f.type === 'PDF')?.url : null,

    // AI Analysis fields
    ai_relevance_score: analysis.overallRelevance || null,
    ai_impact_type: analysis.impactType || null,
    ai_explanation: analysis.reasoning || null,
    ai_summary: analysis.keyProvisions?.join('; ') || null,

    // Financial impact
    financial_impact_pbpy: null, // Not applicable for legislation (use description instead)
    annual_facility_impact: null,
    financial_impact_description: analysis.financialImpact || null,

    // Risk scores (not used for Congress bills)
    reimbursement_risk: null,
    staffing_risk: null,
    compliance_risk: null,
    quality_risk: null,

    operational_area: null, // Could derive from impactType if needed
    implementation_timeline: analysis.implementationTimeline || null,
    implementation_steps: null,

    // Comment period (not applicable for legislation)
    has_comment_period: false,
    comment_deadline: null,
    comment_url: null,
    effective_date: null, // Use implementation_timeline instead

    priority: analysis.priority || 'medium',
    passage_likelihood: analysis.passageLikelihood || null,
    tracking_enabled: true,

    topics: null,
    snf_keywords_matched: null,
    analyzed_at: new Date(),
    analysis: {
      legislative_stage: analysis.legislativeStage,
      key_provisions: analysis.keyProvisions,
      cosponsors_count: billDetails?.cosponsors?.count || 0,
      committees: Array.isArray(billDetails?.committees) ? billDetails.committees.map(c => c.name) : []
    },

    // Ecosystem fields
    direct_relevance_score: analysis.directSNFRelevance || null,
    ecosystem_relevance_score: analysis.ecosystemRelevance || null,
    impact_type: analysis.impactType || null,
    ecosystem_impact: null, // Not explicitly structured in analysis
    strategic_actions: analysis.strategicActions || null,
    affected_operators: analysis.affectedOperators || null,
    key_impact: analysis.keyProvisions?.[0] || null,
    action_required: analysis.urgencyScore >= 70,
    publication_date: bill.introducedDate || latestAction?.actionDate || bill.updateDate || null,
    categories: null,
    agencies: analysis.entities?.organizations || null,

    // Enhanced analysis fields
    urgency_score: analysis.urgencyScore || null,
    implementation_complexity: analysis.implementationComplexity || null,
    competitive_intelligence: analysis.competitiveIntelligence || null,
    strategic_implications: analysis.strategicImplications || null,
    impact_factors: analysis.impactFactors || null,
    entities: analysis.entities || null,
    temporal_signals: analysis.temporalSignals || null,
    market_forces: analysis.marketForces || null,
    compliance_timeline: analysis.complianceTimeline || null
  };
}

/**
 * Main collection function
 */
export async function collectCongressBills(options = {}) {
  const {
    daysBack = 30,
    minRelevanceScore = 50,
    congress = getCurrentCongress()
  } = options;

  console.log('\n======================================================================');
  console.log('  CONGRESS.GOV BILL COLLECTOR');
  console.log('======================================================================');
  console.log(`  Congress: ${congress}`);
  console.log(`  Days back: ${daysBack}`);
  console.log(`  Min relevance score: ${minRelevanceScore}`);
  console.log('======================================================================\n');

  if (!CONGRESS_API_KEY) {
    throw new Error('CONGRESS_API_KEY environment variable not set');
  }

  // Check for existing bills
  console.log('📊 Checking for existing bills in database...\n');
  const existingBills = await billsDB.getBills({ source: 'congress', limit: 1000 });
  const existingBillNumbers = new Set(existingBills.bills.map(b => b.bill_number));
  console.log(`   Found ${existingBillNumbers.size} existing Congress bills\n\n`);

  // Calculate date range
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);
  const fromDateStr = fromDate.toISOString().split('T')[0] + 'T00:00:00Z';

  console.log('🚀 Starting Congress.gov bill collection...\n\n');
  console.log(`📋 Fetching bills from Congress ${congress} (updated since ${fromDateStr})...\n`);

  // Fetch bills
  const bills = await fetchCongressBills({ congress, fromDate: fromDateStr });
  console.log(`✓ Fetched ${bills.length} bills from Congress.gov`);

  // Filter by keywords
  const filteredBills = filterByKeywords(bills);
  console.log(`✓ Filtered to ${filteredBills.length} potentially SNF-relevant bills\n`);

  // Deduplicate
  const newBills = filteredBills.filter(bill => !existingBillNumbers.has(bill.number));
  console.log(`📊 Deduplication check:`);
  console.log(`   Total bills fetched: ${filteredBills.length}`);
  console.log(`   Already in database: ${filteredBills.length - newBills.length}`);
  console.log(`   New bills to analyze: ${newBills.length}\n`);

  if (newBills.length === 0) {
    console.log('✅ No new bills to analyze!\n');
    return { success: true, billsAnalyzed: 0, billsInserted: 0 };
  }

  // Analyze bills with AI
  console.log(`🤖 Analyzing ${newBills.length} NEW bills with AI...\n`);

  const billsToInsert = [];
  let analyzed = 0;
  let errors = 0;

  for (const bill of newBills) {
    analyzed++;
    const truncatedTitle = bill.title.substring(0, 80) + (bill.title.length > 80 ? '...' : '');
    console.log(`[${analyzed}/${newBills.length}] Analyzing: ${truncatedTitle}`);

    try {
      // Fetch detailed information
      const [billDetails, summaries, actions] = await Promise.all([
        fetchBillDetails(bill.congress, bill.type, bill.number),
        fetchBillSummaries(bill.congress, bill.type, bill.number),
        fetchBillActions(bill.congress, bill.type, bill.number)
      ]);

      // Analyze with AI
      const analysis = await analyzeBillRelevance(bill, billDetails, summaries);

      if (!analysis) {
        console.log(`   ✗ Analysis failed - skipping\n`);
        errors++;
        continue;
      }

      const overallScore = analysis.overallRelevance || 0;
      const directScore = analysis.directSNFRelevance || 0;
      const ecosystemScore = analysis.ecosystemRelevance || 0;

      if (overallScore >= minRelevanceScore) {
        console.log(`   ✓ Overall: ${overallScore}/100 (Direct: ${directScore}, Ecosystem: ${ecosystemScore}) - Priority: ${analysis.priority} - INCLUDED\n`);
        const dbBill = convertToDBFormat(bill, billDetails, summaries, actions, analysis);
        billsToInsert.push(dbBill);
      } else {
        console.log(`   ✗ Overall: ${overallScore}/100 (Direct: ${directScore}, Ecosystem: ${ecosystemScore}) - FILTERED OUT (below ${minRelevanceScore})\n`);
      }

      // Rate limit: wait 1 second between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`   ✗ Error analyzing bill: ${error.message}\n`);
      errors++;
    }
  }

  console.log(`✅ Analysis complete!`);
  console.log(`   Total bills fetched: ${filteredBills.length}`);
  console.log(`   Bills skipped (already in DB): ${filteredBills.length - newBills.length}`);
  console.log(`   New bills analyzed: ${analyzed}`);
  console.log(`   Bills meeting criteria (score >= ${minRelevanceScore}): ${billsToInsert.length}\n`);

  // Insert bills
  if (billsToInsert.length > 0) {
    console.log('💾 Inserting new bills into database...\n');
    let inserted = 0;

    for (const bill of billsToInsert) {
      try {
        await billsDB.insertBill(bill);
        console.log(`   ✓ Inserted ${bill.bill_number}: ${bill.title.substring(0, 60)}...`);
        inserted++;
      } catch (error) {
        console.log(`   ✗ Error inserting ${bill.bill_number}: ${error.message}`);
        errors++;
      }
    }

    console.log('\n======================================================================');
    console.log('  COLLECTION SUMMARY');
    console.log('======================================================================');
    console.log(`  Successfully inserted: ${inserted}`);
    console.log(`  Errors: ${errors}`);
    console.log('======================================================================\n');
  }

  console.log('✅ Congress.gov collection complete!\n\n');

  return {
    success: true,
    billsAnalyzed: analyzed,
    billsInserted: billsToInsert.length,
    errors
  };
}

// Export helper functions for testing
export { getCurrentCongress, fetchCongressBills, fetchBillDetails };
