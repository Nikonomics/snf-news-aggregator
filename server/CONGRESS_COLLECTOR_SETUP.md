# Congress.gov Bill Collector Setup

## Overview

The Congress.gov Bill Collector monitors federal legislation for SNF-relevant bills by:
1. Fetching bills from the Congress.gov API
2. Pre-filtering with SNF-related keywords
3. Analyzing relevance with AI using the same framework as Federal Register
4. Storing high-relevance bills in the database

## API Key Setup

### 1. Get a Congress.gov API Key

Visit: https://api.data.gov/signup/

Fill out the form with:
- First Name
- Last Name
- Email address
- (Optional) Website/Organization

You'll receive an API key instantly via email.

### 2. Add to Environment Variables

Add to your `.env` file in the `server/` directory:

```bash
CONGRESS_API_KEY=your_api_key_here
```

## Usage

### Run Manual Collection

```bash
# Default: 30 days back, minimum relevance score 50, current congress
node collect-congress.js

# Custom parameters: 90 days back, minimum score 60
node collect-congress.js 90 60

# Specify congress (118th = 2023-2024, 119th = 2025-2026)
node collect-congress.js 30 50 118
```

### Add to Automated Schedule

The collector can be added to the daily automation schedule alongside Federal Register collection:

```javascript
// In server/index.js
import { collectCongressBills } from './services/congressCollector.js';

// Run daily at 6 AM
schedule.scheduleJob('0 6 * * *', async () => {
  console.log('Running daily Congress.gov collection...');
  await collectCongressBills({ daysBack: 7, minRelevanceScore: 50 });
});
```

## How It Works

### 1. Keyword Pre-Filtering

Before AI analysis, bills are filtered for SNF-related keywords:
- skilled nursing
- nursing facility
- nursing home
- SNF
- post-acute care
- long-term care
- medicare part A
- medicaid nursing
- nursing facility services
- swing bed

### 2. AI Analysis

Uses Claude 3.5 Sonnet to analyze each bill with the same dual-relevance framework as Federal Register:

- **Direct SNF Relevance** (0-100): Does this explicitly regulate or fund SNFs?
- **Ecosystem Relevance** (0-100): Indirect impacts through competitive dynamics, patient flow, workforce, payment philosophy
- **Overall Relevance** = (Direct × 0.4) + (Ecosystem × 0.6)

Only bills scoring >= 50 overall are included.

### 3. Enhanced Analysis Fields

Each bill is analyzed for:

- **Financial Impact**: Specific per-bed or per-patient-day estimates for 100-bed facilities
- **Passage Likelihood** (0-100): Based on bipartisan support, committee status, political climate
- **Legislative Stage**: Introduced, Committee Review, Passed House, Passed Senate, Enacted
- **Affected Operators**: Who wins/loses by facility type, size, payor mix, quality rating
- **Strategic Actions**: What operators should do and when (immediate, short-term, medium-term)
- **Implementation Timeline**: When changes would take effect if enacted
- **Urgency Score** (0-100): How time-sensitive is operator action
- **Competitive Intelligence**: Which operators/regions are better positioned
- **Strategic Implications**: 2nd and 3rd order effects

### 4. Data Enrichment

For each bill, the collector fetches:
- Bill details (sponsor, committees, cosponsors)
- Official summaries (from Congressional Research Service)
- Recent actions (votes, committee hearings, passage events)

## Target Committees

The collector focuses on key committees with jurisdiction over healthcare:

**House:**
- Ways and Means (Medicare/Medicaid)
- Energy and Commerce (Healthcare policy)
- Appropriations (Funding)

**Senate:**
- Finance (Medicare/Medicaid)
- Health, Education, Labor, and Pensions (Healthcare policy)
- Appropriations (Funding)

## Rate Limiting

The Congress.gov API has generous rate limits (1000 requests/hour for registered users).

The collector includes a 1-second delay between bill analyses to be respectful of API resources.

## Cost Estimation

AI analysis costs:
- ~$0.15 per bill analyzed (Claude 3.5 Sonnet)
- Typical 30-day run: 5-15 bills analyzed = $0.75-$2.25
- Typical 90-day initial run: 20-40 bills analyzed = $3.00-$6.00

## Deduplication

The collector checks for existing bills in the database by bill number before AI analysis to avoid:
- Duplicate records
- Redundant API costs
- Stale data (bills are only analyzed once)

## Next Steps

After setting up the Congress collector:

1. **Test the collector**: Run `node collect-congress.js 30 50` to analyze the last 30 days
2. **Review results**: Check http://localhost:5176/regulatory to see Congress bills alongside Federal Register
3. **Add to schedule**: Integrate into daily automated collection
4. **Build additional sources**: State legislatures (LegiScan), CMS QSO Memos, MAC bulletins, OIG reports

## Troubleshooting

**Error: "CONGRESS_API_KEY environment variable not set"**
- Make sure you've added `CONGRESS_API_KEY=...` to your `.env` file
- Restart your server after adding the key

**Error: "Congress.gov API error: 401"**
- Your API key is invalid
- Sign up for a new key at https://api.data.gov/signup/

**Error: "Congress.gov API error: 429"**
- Rate limit exceeded (unlikely with 1000 requests/hour)
- Wait and try again later

**No bills found**
- Try increasing `daysBack` parameter: `node collect-congress.js 90 50`
- Check if Congress is in session (summer/winter recess periods have less activity)
- Lower `minRelevanceScore` to see if bills are being filtered out: `node collect-congress.js 30 40`
