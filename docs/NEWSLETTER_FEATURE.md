# Weekly Newsletter Feature

## Overview
AI-powered weekly newsletter that curates the top 5 stories every SNF operator needs to know.

## ✅ What's Been Built

### 1. Newsletter Service (`server/services/newsletter.js`)
Core logic for generating newsletters:
- **`generateWeeklyNewsletter(articles, options)`** - AI-powered curation using Claude Sonnet 4
- **`formatNewsletterAsMarkdown(newsletter)`** - Formats as readable markdown
- **`formatNewsletterAsHTML(newsletter)`** - Formats as HTML email

### 2. Standalone Generator (`server/generate-newsletter.js`)
Command-line tool to generate newsletters:
```bash
node server/generate-newsletter.js
```

**What it does:**
- Loads articles from `analyzed-articles.json`
- Filters to past 7 days (configurable)
- Uses Claude AI to select top 5 most important stories
- Generates 3 files:
  - `weekly-newsletter.md` - Markdown format
  - `weekly-newsletter.html` - HTML email format
  - `weekly-newsletter.json` - Raw JSON data

## 🎯 Selection Criteria

The AI selects stories based on:

1. **Regulatory Changes** - New rules, deadlines, compliance
2. **Financial Impact** - Reimbursement, costs, revenue changes
3. **Operational Requirements** - Staffing rules, quality measures
4. **Industry Trends** - M&A, market shifts, workforce
5. **Risk Management** - Legal issues, enforcement, safety

## 📊 Newsletter Structure

Each newsletter includes:

### Top Stories (5 selected)
For each story:
- **Title & URL**
- **Category** (Regulatory, Finance, etc.)
- **Impact Level** (High/Medium/Low)
- **Geographic Scope** (National/State/Regional/Local)
- **Why It Matters** - 2-3 sentence explanation
- **Key Takeaways** - Bullet points
- **Action Items** - What operators should do
- **Financial Implication** - How it affects the bottom line
- **Deadline** - If applicable

### Additional Sections
- **Industry Snapshot** - Overview of the week's themes
- **Looking Ahead** - What to watch for next week

## 🚀 How to Use

### Option 1: Generate Standalone Newsletter
```bash
# Make sure ANTHROPIC_API_KEY is set
export ANTHROPIC_API_KEY=your_key_here

# Generate newsletter
node server/generate-newsletter.js
```

**Output files:**
- `server/data/weekly-newsletter.md`
- `server/data/weekly-newsletter.html`
- `server/data/weekly-newsletter.json`

### Option 2: API Endpoint (Coming Next)
```bash
GET /api/newsletter/weekly
```

**Query parameters:**
- `daysBack` - Number of days to analyze (default: 7)
- `limit` - Number of top stories (default: 5)
- `format` - Response format: `json`, `markdown`, `html`

**Example:**
```bash
curl "http://localhost:3001/api/newsletter/weekly?format=html&daysBack=7"
```

## 📋 Configuration Options

```javascript
const options = {
  limit: 5,              // Number of top stories
  daysBack: 7,           // Days to look back
  focusAreas: [          // Categories to prioritize
    'Regulatory',
    'Finance',
    'Operations',
    'Workforce'
  ]
}
```

## 🧪 Testing

### Test with Current Articles
```bash
# Will analyze whatever articles are in analyzed-articles.json
node server/generate-newsletter.js
```

### Test with Database (After Migration)
Once articles are migrated to PostgreSQL, the API endpoint will query the database directly.

## 📝 Example Output

### Markdown Format
```markdown
# SNF Industry Newsletter
## Week of 2025-10-03 to 2025-10-10

## 📊 Industry Snapshot
This week saw significant regulatory changes affecting Medicare reimbursement...

## 🔥 Top 5 Stories Every Operator Needs to Know

### 1. CMS Announces New Reimbursement Formula

**Category:** Regulatory | **Impact:** HIGH | **Scope:** National

**Why This Matters:**
The new formula will affect payment rates for all SNFs starting Q1 2026...

**Key Takeaways:**
- Average 2.3% reduction in base rates
- Quality bonuses can offset up to 3%
- Implementation deadline: December 31, 2025

**Action Items:**
- [ ] Review current quality scores
- [ ] Model financial impact on your facility
- [ ] Update budget projections

**💰 Financial Implication:**
Estimated $150-300 per patient-day impact for typical 100-bed facility

**⏰ Deadline:** December 31, 2025

[Read Full Article →](https://example.com/article)
```

### HTML Email Format
Beautiful formatted HTML email with:
- Color-coded impact badges
- Styled takeaway boxes
- Action item checklists
- Financial highlights
- Click-through links

## 🔄 Automation (Future)

Potential automations:
1. **Daily Cron Job** - Generate newsletter every Monday morning
2. **Email Integration** - Auto-send to subscriber list
3. **Web Dashboard** - View past newsletters
4. **RSS Feed** - Subscribe to newsletter feed
5. **Slack/Teams Integration** - Post to channels

## 💡 Future Enhancements

1. **Personalization**
   - Filter by user's state
   - Custom focus areas
   - Facility-specific relevance

2. **Analytics**
   - Track story engagement
   - Measure click-through rates
   - Trend analysis over time

3. **Multi-Format**
   - PDF generation
   - Social media posts
   - Podcast script

4. **Interactive Features**
   - Comment on stories
   - Share with team
   - Archive search

## 🐛 Troubleshooting

### Issue: "No articles found in the past week"
**Solution:** Wait for article analysis to complete, or adjust `daysBack` parameter

### Issue: "AI response was not valid JSON"
**Solution:** Check ANTHROPIC_API_KEY is set correctly and has credits

### Issue: "Module not found"
**Solution:** Make sure all dependencies are installed: `npm install`

## 📚 Related Files

- `server/services/newsletter.js` - Core newsletter logic
- `server/generate-newsletter.js` - CLI generator
- `server/data/weekly-newsletter.*` - Generated output files
- API endpoint (to be added to `server/index.js`)

## 🎯 Next Steps

1. ✅ Newsletter service created
2. ✅ Standalone generator working
3. ⏳ Add API endpoint to server
4. ⏳ Test with real articles (when analysis completes)
5. ⏳ Build frontend UI component
6. ⏳ Add email sending capability
