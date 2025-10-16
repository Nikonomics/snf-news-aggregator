import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import aiService from './aiService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Generate weekly top 5 stories newsletter
 * @param {Array} articles - All articles from the past week
 * @param {Object} options - Configuration options
 * @returns {Object} Newsletter content
 */
export async function generateWeeklyNewsletter(articles, options = {}) {
  const {
    limit = 5,
    daysBack = 7,
    focusAreas = ['Regulatory', 'Finance', 'Operations', 'Workforce']
  } = options

  // Filter articles from the past week
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - daysBack)

  const recentArticles = articles.filter(article => {
    const articleDate = new Date(article.date)
    return articleDate >= weekAgo
  })

  if (recentArticles.length === 0) {
    return {
      success: false,
      error: 'No articles found in the past week'
    }
  }

  console.log(`📊 Analyzing ${recentArticles.length} articles from the past ${daysBack} days...`)

  // Prepare article summaries for AI analysis
  const articleSummaries = recentArticles.map((article, index) => {
    return `
Article ${index + 1}:
Title: ${article.title}
Source: ${article.source}
Date: ${article.date}
Category: ${article.category}
Impact: ${article.impact}
Summary: ${article.summary}
Key Insights: ${article.analysis?.keyInsights?.join('; ') || 'N/A'}
Financial Impact: ${article.analysis?.financialImpact || 'N/A'}
Geographic Scope: ${article.analysis?.scope || 'N/A'} ${article.analysis?.state ? `(${article.analysis.state})` : ''}
URL: ${article.url}
---
`
  }).join('\n')

  // AI prompt to identify themes/issues across all articles
  const prompt = `You are an expert healthcare policy analyst specializing in skilled nursing facilities (SNFs). You're preparing a weekly newsletter for SNF operators and administrators who run facilities on 1-2% margins.

TASK: Analyze the following ${recentArticles.length} articles and identify the TOP ${limit} THEMES/ISSUES that emerged this week across ALL stories. DO NOT just pick 5 individual articles - instead, identify the major TOPICS that multiple articles discussed.

ARTICLES TO ANALYZE:
${articleSummaries}

ANALYSIS APPROACH:
1. **Cluster related articles** - Group articles that discuss the same topic/issue
2. **Identify patterns** - What themes appear across multiple sources?
3. **Synthesize insights** - Combine information from all articles about each theme
4. **Prioritize by impact** - Which themes will most affect SNF operators' bottom line?

THEME SELECTION CRITERIA (in order of priority):
1. **Regulatory Changes** - New rules, deadlines, compliance requirements
2. **Financial Impact** - Reimbursement changes, cost pressures, revenue impacts
3. **Operational Requirements** - Staffing mandates, quality measures, surveys
4. **Market Dynamics** - Industry consolidation, payer mix shifts, competitive pressures
5. **Risk Management** - Legal issues, enforcement trends, safety concerns

For each theme, consider:
- How many articles covered this topic?
- What's the consensus or key development?
- Will this directly affect SNF operators' bottom line?
- Are there action items or deadlines?
- Does this represent a threat or opportunity?

CRITICAL: You must respond with ONLY a valid JSON object. Do not include any explanatory text before or after the JSON.

Return a JSON object with this structure:
{
  "weekStartDate": "YYYY-MM-DD",
  "weekEndDate": "YYYY-MM-DD",
  "articlesAnalyzed": ${recentArticles.length},
  "topIssues": [
    {
      "rank": 1,
      "theme": "Clear, concise theme name (e.g., 'Medicare Advantage Reimbursement Pressure')",
      "articlesCount": 12,
      "impact": "high/medium/low",
      "scope": "National/State/Regional/Mixed",
      "summary": "2-3 sentence synthesis of what's happening with this issue across all related articles",
      "keyDevelopments": ["Development 1", "Development 2", "Development 3"],
      "actionItems": ["Action 1", "Action 2"],
      "financialImplication": "Brief description of financial impact",
      "deadline": "Date if applicable, or 'N/A'",
      "relatedArticles": [
        {"title": "Article title", "url": "URL"},
        {"title": "Article title", "url": "URL"}
      ]
    }
  ],
  "industrySnapshot": "2-3 sentence overview of the week's major themes and patterns",
  "lookAhead": "1-2 sentences about what to watch for next week based on emerging patterns"
}

Identify the ${limit} most significant THEMES/ISSUES. Group related articles together. Synthesize insights across multiple sources.`

  try {
    console.log('🤖 Asking AI to curate top stories...')

    const response = await aiService.analyzeContent(prompt, {
      maxTokens: 4096,
      temperature: 0.1
    })

    const responseText = response.content.trim()
    console.log(`🤖 Newsletter analysis using ${response.provider}`)

    // Parse JSON response
    let newsletter
    try {
      newsletter = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError)
      console.error('Response was:', responseText)
      throw new Error('AI response was not valid JSON')
    }

    console.log(`✅ Newsletter generated with ${newsletter.topIssues.length} issues`)

    return {
      success: true,
      newsletter,
      metadata: {
        articlesAnalyzed: recentArticles.length,
        daysBack,
        generatedAt: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('Error generating newsletter:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Format newsletter as markdown
 */
export function formatNewsletterAsMarkdown(newsletter) {
  const { weekStartDate, weekEndDate, topIssues, industrySnapshot, lookAhead } = newsletter

  let markdown = `# SNF Industry Newsletter
## Week of ${weekStartDate} to ${weekEndDate}

---

## 📊 Industry Snapshot

${industrySnapshot}

---

## 🔥 Top ${topIssues.length} Issues Every Operator Needs to Know

`

  topIssues.forEach((issue, index) => {
    markdown += `
### ${issue.rank}. ${issue.theme}

**Impact:** ${issue.impact.toUpperCase()} | **Scope:** ${issue.scope} | **${issue.articlesCount} related articles**

**Summary:**
${issue.summary}

**Key Developments:**
${issue.keyDevelopments.map(d => `- ${d}`).join('\n')}

${issue.actionItems.length > 0 ? `**Action Items:**
${issue.actionItems.map(a => `- [ ] ${a}`).join('\n')}
` : ''}

${issue.financialImplication ? `**💰 Financial Implication:**
${issue.financialImplication}
` : ''}

${issue.deadline !== 'N/A' ? `**⏰ Deadline:** ${issue.deadline}
` : ''}

**Related Articles:**
${issue.relatedArticles.map(a => `- [${a.title}](${a.url})`).join('\n')}

---
`
  })

  markdown += `
## 🔮 Looking Ahead

${lookAhead}

---

*Generated with AI-powered analysis of ${newsletter.articlesAnalyzed || 'industry'} articles*
`

  return markdown
}

/**
 * Format newsletter as HTML email
 */
export function formatNewsletterAsHTML(newsletter) {
  const { weekStartDate, weekEndDate, topIssues, industrySnapshot, lookAhead } = newsletter

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
    h2 { color: #667eea; margin-top: 30px; }
    h3 { color: #1a202c; }
    .issue { background: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .meta { color: #718096; font-size: 0.9em; margin-bottom: 10px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; margin-right: 8px; }
    .badge.high { background: #fed7d7; color: #c53030; }
    .badge.medium { background: #feebc8; color: #c05621; }
    .badge.low { background: #c6f6d5; color: #2f855a; }
    .badge.articles { background: #e6f7ff; color: #1a5490; }
    .developments { background: white; padding: 15px; border-radius: 4px; margin: 10px 0; }
    .developments li { margin: 8px 0; }
    .action-items { background: #fef5e7; padding: 15px; border-radius: 4px; margin: 10px 0; }
    .deadline { background: #ffe5e5; color: #c53030; padding: 8px 12px; border-radius: 4px; font-weight: 600; display: inline-block; margin: 10px 0; }
    .related-articles { background: white; padding: 15px; border-radius: 4px; margin: 10px 0; }
    .related-articles a { color: #667eea; text-decoration: none; display: block; margin: 5px 0; }
    .related-articles a:hover { text-decoration: underline; }
    .snapshot { background: #e6f7ff; padding: 20px; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; color: #718096; font-size: 0.9em; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <h1>📰 SNF Industry Newsletter</h1>
  <p style="color: #718096;">Week of ${weekStartDate} to ${weekEndDate}</p>

  <div class="snapshot">
    <h2>📊 Industry Snapshot</h2>
    <p>${industrySnapshot}</p>
  </div>

  <h2>🔥 Top ${topIssues.length} Issues Every Operator Needs to Know</h2>

  ${topIssues.map(issue => `
    <div class="issue">
      <h3>${issue.rank}. ${issue.theme}</h3>
      <div class="meta">
        <span class="badge ${issue.impact}">${issue.impact.toUpperCase()} IMPACT</span>
        <span class="badge">${issue.scope}</span>
        <span class="badge articles">${issue.articlesCount} articles</span>
      </div>

      <p><strong>Summary:</strong><br>${issue.summary}</p>

      <div class="developments">
        <strong>Key Developments:</strong>
        <ul>
          ${issue.keyDevelopments.map(d => `<li>${d}</li>`).join('')}
        </ul>
      </div>

      ${issue.actionItems.length > 0 ? `
        <div class="action-items">
          <strong>Action Items:</strong>
          <ul>
            ${issue.actionItems.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${issue.financialImplication ? `
        <p><strong>💰 Financial Implication:</strong><br>${issue.financialImplication}</p>
      ` : ''}

      ${issue.deadline !== 'N/A' ? `
        <div class="deadline">⏰ Deadline: ${issue.deadline}</div>
      ` : ''}

      <div class="related-articles">
        <strong>Related Articles (${issue.relatedArticles.length}):</strong>
        ${issue.relatedArticles.map(a => `<a href="${a.url}">${a.title}</a>`).join('')}
      </div>
    </div>
  `).join('')}

  <div class="snapshot">
    <h2>🔮 Looking Ahead</h2>
    <p>${lookAhead}</p>
  </div>

  <div class="footer">
    <p>Generated with AI-powered analysis of ${newsletter.articlesAnalyzed || 'industry'} articles</p>
    <p>© ${new Date().getFullYear()} SNF News Aggregator</p>
  </div>
</body>
</html>
`
}

export default {
  generateWeeklyNewsletter,
  formatNewsletterAsMarkdown,
  formatNewsletterAsHTML
}
