# Regulatory Feed Implementation Status

## ✅ COMPLETED: Enhanced Federal Register Collection

### What Was Done

1. **Fixed Database Schema Issues**
   - Created migration `005_increase_varchar_limits.sql` to fix VARCHAR(100) length constraints
   - Increased `impact_type` to VARCHAR(255)
   - Changed `financial_impact_description` to TEXT (unlimited)
   - Temporarily dropped and recreated views (`urgent_bills`, `recent_federal_bills`, `active_state_bills`)

2. **Enhanced AI Analysis Prompt**
   - Merged sophisticated analysis elements from article analyzer
   - Added 20+ structured analysis requirements:
     - Dual relevance scoring (Direct + Ecosystem)
     - Financial specificity (per-bed, per-patient-day estimates)
     - Urgency scoring (0-100)
     - Implementation complexity (Low/Medium/High)
     - Impact factors (facility types, bed sizes, payor mix, geography)
     - Structured entities (organizations, regulations, financial figures)
     - Temporal signals (precedents, cyclicality, lead times)
     - Market forces and competitive intelligence
     - Strategic implications (2nd and 3rd order effects)
     - Compliance timeline with key dates

3. **Database Schema Enhancements**
   - Migration 003: Added ecosystem fields (direct_relevance_score, ecosystem_relevance_score, impact_type, etc.)
   - Migration 004: Added enhanced analysis fields (urgency_score, implementation_complexity, competitive_intelligence, strategic_implications, impact_factors, entities, temporal_signals, market_forces, compliance_timeline)
   - Migration 005: Fixed VARCHAR length constraints

4. **Current Status**
   - Federal Register collection running (analyzing document 18/50)
   - Should find ~6-7 relevant bills from last 90 days
   - Bills will appear at http://localhost:5176/regulatory once collection completes

## ✅ COMPLETED: Congress.gov Bill Collector

### What Was Built

Created a complete Congress.gov integration with:

1. **Service Layer** (`services/congressCollector.js`)
   - Fetches bills from Congress.gov API
   - Pre-filters with SNF-related keywords
   - Analyzes each bill with AI using same dual-relevance framework
   - Fetches bill details, summaries, actions, cosponsors
   - Stores high-relevance bills (score >= 50) in database

2. **CLI Script** (`collect-congress.js`)
   - Run manual collections with custom parameters
   - Usage: `node collect-congress.js [daysBack] [minRelevanceScore] [congress]`

3. **Documentation** (`CONGRESS_COLLECTOR_SETUP.md`)
   - Step-by-step API key setup
   - Usage examples
   - Technical details on filtering, analysis, rate limiting
   - Cost estimates
   - Troubleshooting guide

4. **Key Features**
   - **Keyword Pre-Filtering**: 10 SNF-related keywords
   - **AI Analysis**: Same framework as Federal Register (direct + ecosystem relevance)
   - **Enhanced Fields**: Passage likelihood, legislative stage, cosponsors, key provisions
   - **Deduplication**: Checks existing bills before AI analysis
   - **Rate Limiting**: 1-second delay between analyses

### What's Needed to Run

1. **Get Congress.gov API Key**
   - Sign up at: https://api.data.gov/signup/
   - Instant approval

2. **Add to .env**
   ```bash
   CONGRESS_API_KEY=your_api_key_here
   ```

3. **Run Initial Collection**
   ```bash
   node collect-congress.js 90 50
   ```

4. **Add to Daily Schedule** (optional)
   - Integrate into server/index.js alongside Federal Register
   - Run daily to catch new bills

## 🎯 ECOSYSTEM INTELLIGENCE FRAMEWORK

Both collectors use a sophisticated dual-relevance scoring system:

### Direct SNF Relevance (0-100)
- Does this explicitly mention or regulate SNFs?
- 90-100: Direct SNF regulation/payment changes
- 70-89: Medicare Part A / PPS changes
- 50-69: Medicaid LTSS / quality measures
- 30-49: General healthcare policy
- 0-29: Minimal/no SNF impact

### Ecosystem Relevance (0-100)
Five key channels:

1. **Competitive Dynamics**
   - IRF, LTCH, home health regulatory changes
   - Site-neutral payment expansion signals
   - Example: IRF payment increase → patient steering away from SNFs

2. **Patient Flow Patterns**
   - Hospital discharge planning rules
   - MA plan network design changes
   - Example: Hospital-at-home expansion → reduces SNF referrals

3. **Payer Behavior Shifts**
   - MA overpayment corrections
   - Medicaid expansion/contraction
   - Example: MA rate cuts → tighter authorization, lower census

4. **Workforce Spillover**
   - Nursing scope of practice expansion
   - Immigration policy changes
   - Example: State allows NPs to work independently → workforce shortage worsens

5. **Payment Philosophy Signals**
   - Value-based care expansion
   - Bundled payment models
   - Example: CJR expansion → hospitals vertically integrate, reduce SNF use

### Overall Relevance
**Formula**: (Direct × 0.4) + (Ecosystem × 0.6)

Why weight ecosystem higher?
- Operators miss these indirect impacts
- Ecosystem changes often have larger long-term effects
- Early warning system for competitive shifts

## 📊 ANALYSIS OUTPUT STRUCTURE

Each regulatory item includes:

### Financial Impact
- Per-bed annual impact (e.g., "+$2,500/bed/year")
- Per-patient-day impact (e.g., "-$8/patient-day")
- Total facility impact range (e.g., "$150K-$400K additional cost for 100-bed facility")

### Affected Operators
- By facility type (hospital-based vs freestanding, rural vs urban)
- By size (small <100 beds vs large chains)
- By payor mix (high Medicaid vs high Medicare)
- By quality rating (5-star vs 1-2 star)

### Strategic Actions
- **Immediate** (next 30 days): What to do right now
- **Short-term** (1-3 months): Preparation steps
- **Medium-term** (3-12 months): Operational changes

### Implementation Details
- **Timeline**: When changes take effect
- **Complexity**: Low/Medium/High
- **Urgency Score**: 0-100 (how time-sensitive is action?)

### Intelligence Fields
- **Competitive Intelligence**: Who wins/loses and why
- **Strategic Implications**: 2nd and 3rd order effects
- **Market Forces**: Competitive/economic dynamics at play
- **Compliance Timeline**: Key dates operators must track

## 📋 NEXT STEPS

### Priority 1: Test Congress Collector
1. Get API key from https://api.data.gov/signup/
2. Add `CONGRESS_API_KEY` to .env
3. Run: `node collect-congress.js 90 50`
4. Verify bills appear in regulatory feed

### Priority 2: Verify Federal Register Bills
1. Wait for current collection to complete (~30 min remaining)
2. Check http://localhost:5176/regulatory
3. Verify 6-7 bills with enhanced analysis

### Priority 3: Add to Automated Schedule
```javascript
// In server/index.js
import { collectCongressBills } from './services/congressCollector.js';
import { collectFederalRegisterBills } from './services/federalRegisterCollector.js';

// Run daily at 6 AM
schedule.scheduleJob('0 6 * * *', async () => {
  console.log('Running daily regulatory collection...');
  await collectFederalRegisterBills({ daysBack: 7, minRelevanceScore: 50 });
  await collectCongressBills({ daysBack: 7, minRelevanceScore: 50 });
});
```

### Priority 4: Additional Data Sources

Based on your comprehensive catalog, here are the next sources to build:

**Tier 1 - High Priority**
1. ✅ Federal Register (DONE)
2. ✅ Congress.gov (DONE)
3. **CMS QSO Memos** - Survey guidance (highest operator value)
4. **State Legislatures via LegiScan** - Multi-state tracking with single API

**Tier 2 - Medium Priority**
5. **MAC Bulletins** - Region-specific guidance (4 MAC regions)
6. **OIG Reports** - Fraud/compliance trends
7. **MedPAC Reports** - Payment policy signals

**Tier 3 - Lower Priority**
8. State Health Department Sites - State-specific rules (requires 50 scrapers)
9. Trade Association Alerts - AHCA, LeadingAge
10. CMS MLN Matters - Provider education

## 💰 COST ESTIMATES

### Current Collections (per run)

**Federal Register**
- Initial 90-day run: 50 documents analyzed × $0.30 = $15
- Daily run (7 days): 0-2 new documents × $0.30 = $0-$0.60
- Monthly cost: ~$15 initial + ~$9/month ongoing = $24/month

**Congress.gov**
- Initial 90-day run: 20-40 bills analyzed × $0.15 = $3-$6
- Daily run (7 days): 0-2 new bills × $0.15 = $0-$0.30
- Monthly cost: ~$5 initial + ~$4/month ongoing = $9/month

**Total Regulatory Feed**
- Setup: ~$20
- Ongoing: ~$13/month (~$0.43/day)

This is a tiny fraction of the value provided to operators. A single missed regulation could cost a 100-bed facility $100K+.

## 🎓 KEY LEARNINGS

### Migration Strategy
- Always check for dependent views before altering columns
- Drop views, alter columns, recreate views in same transaction
- Use `IF NOT EXISTS` and `IF EXISTS` for idempotency

### AI Analysis Best Practices
- Structure prompts with explicit scoring guidelines
- Require specific financial estimates (not ranges)
- Include reasoning field for score transparency
- Use temperature 0.3 for consistent scoring
- Validate JSON response parsing

### Deduplication Strategy
- Check existing bills by bill_number before AI analysis
- Saves API costs (~$0.30 per analysis)
- For daily runs, only analyze truly new content
- Track external_id (e.g., "FR-2025-12345") for Federal Register
- Track bill_number (e.g., "HR 1234") for Congress

### Database Schema Design
- Use TEXT for any AI-generated description fields (not VARCHAR)
- Use JSONB for complex structured data (impact_factors, entities, temporal_signals)
- Create views for common queries (urgent_bills, recent_federal_bills)
- Index on source, jurisdiction, priority, last_action_date

## 🐛 ISSUES RESOLVED

1. ✅ Fixed VARCHAR(100) length constraint error
2. ✅ Fixed missing urgency_score column error
3. ✅ Fixed view dependency blocking column alterations
4. ✅ Enhanced AI prompt with article analyzer elements
5. ✅ Built Congress.gov collector with complete documentation

## 📊 METRICS TO TRACK

Once both collectors are running:

1. **Collection Stats**
   - Bills collected per day/week
   - AI analysis cost per day/week
   - Average relevance scores

2. **Operator Value**
   - Number of critical priority items flagged
   - Average urgency score
   - Comment periods identified

3. **Quality Metrics**
   - False positive rate (bills marked relevant but aren't)
   - False negative rate (missed bills)
   - Operator feedback on analysis quality

## 🚀 FUTURE ENHANCEMENTS

1. **Email Alerts**
   - Daily digest of new high-priority items
   - Immediate alerts for critical items (urgency >= 90)

2. **State-Level Tracking**
   - Filter by operator's states
   - State-specific summaries

3. **Trend Analysis**
   - Track regulatory themes over time
   - Predict upcoming policy changes

4. **Comparative Intelligence**
   - How does your state compare to others?
   - Competitive positioning by regulation

5. **Portfolio Impact Modeling**
   - Multi-facility impact calculations
   - Aggregate financial impact across portfolio
