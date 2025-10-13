/**
 * Article Content Fetcher
 * Fetches full article text from URLs using web scraping
 */

import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

/**
 * Fetch and extract article content from URL
 * @param {string} url - Article URL
 * @returns {Promise<string|null>} Extracted article text or null if failed
 */
export async function fetchArticleContent(url) {
  try {
    console.log(`  Fetching article content from: ${url}`)

    // Fetch the HTML (follow redirects automatically)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000, // 15 second timeout
      follow: 20, // Follow up to 20 redirects
      redirect: 'follow',
    })

    if (!response.ok) {
      console.warn(`  HTTP ${response.status} for ${url}`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ad, .social-share').remove()

    // Try different common article content selectors in priority order
    const contentSelectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.story-body',
      '.article-body',
    ]

    let articleText = ''

    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0) {
        articleText = element.text().trim()
        if (articleText.length > 200) {
          // Found substantial content
          break
        }
      }
    }

    // If no good content found, try body text as fallback
    if (articleText.length < 200) {
      articleText = $('body').text().trim()
    }

    // Clean up whitespace
    articleText = articleText
      .replace(/\s+/g, ' ')  // Replace multiple spaces/newlines with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim()

    // Truncate to reasonable length (Claude context limits)
    const maxLength = 8000 // characters
    if (articleText.length > maxLength) {
      articleText = articleText.substring(0, maxLength) + '...'
      console.log(`  Content truncated to ${maxLength} chars`)
    }

    if (articleText.length > 200) {
      console.log(`  ✓ Extracted ${articleText.length} characters`)
      return articleText
    } else {
      console.warn(`  Content too short (${articleText.length} chars), skipping`)
      return null
    }

  } catch (error) {
    console.warn(`  Failed to fetch article: ${error.message}`)
    return null
  }
}

/**
 * Get article text for analysis - tries full content first, falls back to summary
 * @param {Object} article - Article object with url, summary fields
 * @returns {Promise<Object>} Object with { text, source: 'full'|'summary' }
 */
export async function getArticleTextForAnalysis(article) {
  // Try to fetch full article content first
  const fullContent = await fetchArticleContent(article.url)

  if (fullContent) {
    return {
      text: fullContent,
      source: 'full',
      length: fullContent.length
    }
  }

  // Fall back to RSS summary
  console.log('  Using RSS summary as fallback')
  return {
    text: article.summary || article.title,
    source: 'summary',
    length: (article.summary || article.title).length
  }
}
