#!/usr/bin/env node

/**
 * Generate weekly newsletter from analyzed articles
 * Run with: node server/generate-newsletter.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateWeeklyNewsletter, formatNewsletterAsMarkdown, formatNewsletterAsHTML } from './services/newsletter.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  console.log('📰 SNF Weekly Newsletter Generator\n')

  // Load articles from JSON file
  const articlesPath = path.join(__dirname, 'data/analyzed-articles.json')

  if (!fs.existsSync(articlesPath)) {
    console.error('❌ No analyzed-articles.json file found')
    process.exit(1)
  }

  const articlesData = JSON.parse(fs.readFileSync(articlesPath, 'utf8'))
  const validArticles = articlesData.filter(article => article !== null && article.title)

  console.log(`📊 Loaded ${validArticles.length} articles\n`)

  if (validArticles.length === 0) {
    console.error('❌ No valid articles found')
    process.exit(1)
  }

  // Generate newsletter
  const result = await generateWeeklyNewsletter(validArticles, {
    limit: 5,
    daysBack: 7
  })

  if (!result.success) {
    console.error('❌ Failed to generate newsletter:', result.error)
    process.exit(1)
  }

  const { newsletter, metadata } = result

  console.log('\n✅ Newsletter generated successfully!\n')
  console.log('📊 Statistics:')
  console.log(`   - Articles analyzed: ${metadata.articlesAnalyzed}`)
  console.log(`   - Days back: ${metadata.daysBack}`)
  console.log(`   - Top issues: ${newsletter.topIssues.length}`)
  console.log(`   - Week: ${newsletter.weekStartDate} to ${newsletter.weekEndDate}\n`)

  // Format as markdown
  const markdown = formatNewsletterAsMarkdown(newsletter)
  const markdownPath = path.join(__dirname, 'data/weekly-newsletter.md')
  fs.writeFileSync(markdownPath, markdown, 'utf8')
  console.log(`✅ Markdown saved to: ${markdownPath}`)

  // Format as HTML
  const html = formatNewsletterAsHTML(newsletter)
  const htmlPath = path.join(__dirname, 'data/weekly-newsletter.html')
  fs.writeFileSync(htmlPath, html, 'utf8')
  console.log(`✅ HTML saved to: ${htmlPath}`)

  // Save raw JSON
  const jsonPath = path.join(__dirname, 'data/weekly-newsletter.json')
  fs.writeFileSync(jsonPath, JSON.stringify(newsletter, null, 2), 'utf8')
  console.log(`✅ JSON saved to: ${jsonPath}\n`)

  // Display top issues
  console.log('🔥 Top Issues:\n')
  newsletter.topIssues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.theme}`)
    console.log(`   Impact: ${issue.impact.toUpperCase()} | Scope: ${issue.scope} | ${issue.articlesCount} articles`)
    console.log(`   ${issue.summary}`)
    console.log('')
  })

  console.log('📊 Industry Snapshot:')
  console.log(`   ${newsletter.industrySnapshot}\n`)

  console.log('🔮 Looking Ahead:')
  console.log(`   ${newsletter.lookAhead}\n`)

  console.log('✅ Done! Check the generated files in server/data/\n')
}

main().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
