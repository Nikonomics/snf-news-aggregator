# Enhanced Ecosystem Impact Analysis Prompt

## Context
You are analyzing Federal Register documents for skilled nursing facility (SNF) operators. Your goal is NOT just to identify direct SNF regulations, but to surface **strategic intelligence** about ecosystem changes that will impact SNF operations, even if the document doesn't mention SNFs explicitly.

## Analysis Framework

### 1. Direct Impact Analysis (Traditional)
- Does this explicitly mention SNFs, nursing homes, or nursing facilities?
- Are there specific SNF payment, quality, or compliance changes?

### 2. Ecosystem Impact Analysis (NEW - This is where we add unique value)

#### A. Competitive Dynamics
Ask: "How does this change the competitive landscape?"
- **IRF/LTCH Competition**: If IRF or LTCH rates increase relative to SNF rates, SNFs lose profitable patients
- **Home Health Competition**: Home health payment changes affect SNF discharge timing
- **Hospital Behavior**: Hospital payment pressure affects which patients they discharge to SNFs (acuity, timing)
- **Observation Stays**: More observation = fewer 3-day qualifying stays = lower SNF census

#### B. Patient Flow Impact
Ask: "How does this affect patient flow TO or FROM SNFs?"
- **Upstream (Hospitals)**:
  - Readmission penalties → hospitals keep patients longer → fewer SNF admissions
  - Discharge planning requirements → affects referral quality
  - Bundled payments → hospitals pressure SNFs on cost
- **Downstream (Post-SNF)**:
  - Home health cuts → SNFs must keep patients longer
  - Hospice eligibility → earlier SNF exits
  - Assisted living regulations → affects discharge destination

#### C. Payer Behavior Signals
Ask: "What does this tell us about how payers will behave?"
- **Medicare Advantage**: Star rating changes, prior auth changes, network strategies
- **ACOs**: New ACO rules affect SNF preferred network status
- **Bundled Payments**: New bundles that include SNF services
- **Quality Incentives**: Quality measures that create upstream/downstream pressure

#### D. Workforce & Operational Spillover
Ask: "If this applies to hospitals/IRFs, will it eventually hit SNFs?"
- Minimum wage/staffing ratio changes in other settings = future SNF pressure
- Technology requirements (EHR, interoperability) often roll out to all settings
- Safety regulations (fire safety, infection control) typically expand across settings

#### E. Financial Modeling Clues
Ask: "What does this reveal about CMS payment philosophy?"
- Payment methodology changes (shifting to value-based, outcomes)
- Cost assumptions (labor, capital, overhead benchmarks)
- Quality-payment linkages
- Regional adjustment factors

### 3. Strategic Intelligence Extraction

For documents that DON'T directly mention SNFs but have ecosystem impact, extract:

```json
{
  "directSNFRelevance": 20,  // Low - doesn't mention SNFs
  "ecosystemRelevance": 75,  // HIGH - major competitive/flow impact
  "overallRelevance": 65,    // Weighted: (directSNFRelevance * 0.4) + (ecosystemRelevance * 0.6)

  "ecosystemImpact": {
    "category": "Competitive Dynamics" | "Patient Flow" | "Payer Behavior" | "Workforce/Ops" | "Payment Philosophy",

    "competitiveIntelligence": {
      "affectedCompetitors": ["IRF", "LTCH"],
      "relativeAdvantage": "IRF payment increase 3.2% vs SNF 2.8% = SNFs lose high-value rehab patients",
      "patientSteering": "Hospitals incentivized to discharge complex rehab to IRFs instead of SNFs",
      "timeframe": "Effective Oct 1 2026"
    },

    "patientFlowImpact": {
      "direction": "upstream" | "downstream" | "parallel",
      "mechanism": "Hospital readmission penalties create pressure to keep patients longer",
      "snfEffect": "10-15% reduction in 'quick turnaround' SNF admissions",
      "acuityShift": "Patients arriving to SNF are sicker, shorter LOS expected",
      "censusImpact": "Negative - fewer admissions, shorter stays"
    },

    "payerSignals": {
      "payerType": "Medicare Advantage" | "Traditional Medicare" | "Medicaid" | "ACO",
      "behaviorShift": "MA plans adding prior auth for SNF admits over 20 days",
      "networkImplications": "Preferred SNF networks will tighten, reimbursement pressure",
      "snfResponse": "Need to demonstrate outcomes data to secure network status"
    },

    "precedentValue": {
      "isPrecedent": true,
      "historicalPattern": "Payment policy changes typically roll from hospitals → IRFs → SNFs within 12-24 months",
      "predictiveValue": "This IRF change signals likely SNF change in 2027-2028",
      "prepTime": "18 months to prepare"
    }
  },

  "operatorActionItems": {
    "strategic": [
      "Model financial impact if IRF captures 15% more of current SNF rehab volume",
      "Develop clinical protocols to demonstrate superior outcomes vs IRF for specific diagnoses",
      "Engage hospital discharge planners on SNF value proposition vs IRF cost"
    ],
    "financial": [
      "Stress test budget assuming 10% census decline from IRF competition",
      "Analyze payer mix - which patients are most at risk of being steered to IRF",
      "Calculate break-even point if forced to accept lower rates to compete"
    ],
    "operational": [
      "Review clinical capabilities - can we serve more complex cases IRFs don't want?",
      "Benchmark SNF outcomes vs local IRF outcomes data",
      "Strengthen hospital relationships before they shift referral patterns"
    ]
  },

  "signalType": "Leading Indicator" | "Concurrent Change" | "Lagging Confirmation",
  "urgencyMultiplier": 1.5,  // Multiply base urgency by this for ecosystem impacts requiring proactive response

  "whyThisMatters": "Even though this document is about IRF payments, it directly affects SNF competitive positioning. When IRF rates increase relative to SNF rates, hospitals and payers steer profitable rehab patients to IRFs, leaving SNFs with more complex medical cases at lower payment rates. Operators need 12-18 months to reposition clinically and financially before this hits their census."
}
```

## Relevance Scoring Formula

```
overallRelevance = (directSNFMentions * 0.40) + (ecosystemImpact * 0.60)
```

This weights ecosystem impact MORE HEAVILY than direct mentions, because our users can already find direct SNF regulations elsewhere. Our value-add is surfacing the non-obvious strategic intelligence.

### Scoring Guidelines:

**Direct SNF Relevance (0-100)**
- 90-100: Explicitly about SNF PPS, quality, or compliance
- 50-89: Mentions SNFs in context of broader post-acute policy
- 0-49: No SNF mentions

**Ecosystem Relevance (0-100)**
- 90-100: Major competitive/flow impact, affects >20% of SNF patients/revenue
- 70-89: Significant competitive/flow impact, affects specific patient segments
- 50-69: Moderate impact, affects operational strategy or specific payer relationships
- 30-49: Minor impact, weak signal or indirect effect
- 0-29: No meaningful ecosystem impact

**Priority Classification**
- **Critical**: overallRelevance ≥ 85 OR ecosystemRelevance ≥ 90
- **High**: overallRelevance 70-84
- **Medium**: overallRelevance 50-69
- **Watch List**: overallRelevance 35-49 (track but don't alert immediately)
- **Low**: overallRelevance < 35

## Examples

### Example 1: IRF PPS Rule (High Ecosystem Relevance)
```json
{
  "directSNFRelevance": 15,
  "ecosystemRelevance": 85,
  "overallRelevance": 57,  // (15 * 0.4) + (85 * 0.6) = 57
  "priority": "medium",
  "ecosystemImpact": {
    "category": "Competitive Dynamics",
    "competitiveIntelligence": {
      "affectedCompetitors": ["IRF"],
      "relativeAdvantage": "IRF payment +3.5%, SNF payment +2.1% = 1.4% differential",
      "patientSteering": "Profitable stroke, joint replacement, trauma patients shift to IRF"
    }
  }
}
```

### Example 2: Physician Fee Schedule (Medium Ecosystem Relevance)
```json
{
  "directSNFRelevance": 35,  // Some SNF physician billing codes
  "ecosystemRelevance": 65,  // Affects ancillary revenue
  "overallRelevance": 53,
  "priority": "medium",
  "ecosystemImpact": {
    "category": "Financial Impact",
    "financialDetails": "SNF physician visit codes (99304-99310) see 2.1% cut, affects Part B ancillary revenue stream (~8% of total SNF revenue)"
  }
}
```

### Example 3: Hospital IPPS with SNF Readmission Focus (High Ecosystem Relevance)
```json
{
  "directSNFRelevance": 25,
  "ecosystemRelevance": 90,  // Major patient flow impact
  "overallRelevance": 64,
  "priority": "high",
  "ecosystemImpact": {
    "category": "Patient Flow",
    "patientFlowImpact": {
      "direction": "upstream",
      "mechanism": "Hospital readmission penalties now include SNF-to-hospital readmissions",
      "snfEffect": "Hospitals will be extremely selective about SNF referrals, demanding outcomes data",
      "censusImpact": "High-quality SNFs gain volume, low-quality SNFs lose referrals"
    }
  }
}
```

## Output Format

Always return valid JSON with ALL fields, even if some are null or empty arrays.
