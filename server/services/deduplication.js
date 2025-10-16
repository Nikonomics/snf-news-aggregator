import * as articlesDB from '../database/articles.js'
import aiService from './aiService.js'

// Configuration
const CONFIG = {
  AI_ENABLED: process.env.DEDUP_AI_ENABLED !== 'false', // Default true
  TITLE_SIMILARITY_THRESHOLD: parseFloat(process.env.DEDUP_TITLE_SIMILARITY_THRESHOLD) || 0.7,
  DATE_WINDOW_DAYS: parseInt(process.env.DEDUP_DATE_WINDOW_DAYS) || 7,
  CONTENT_CHARS: parseInt(process.env.DEDUP_CONTENT_CHARS) || 500,
  MAX_CANDIDATES: parseInt(process.env.DEDUP_MAX_CANDIDATES) || 5
}

// Normalize text for comparison
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}

// Calculate simple text similarity (fallback if pg_trgm fails)
function calculateSimilarity(str1, str2) {
  const s1 = normalizeText(str1)
  const s2 = normalizeText(str2)

  if (s1 === s2) return 1.0

  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(s1, s2)
  return (longer.length - editDistance) / longer.length
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
  const matrix = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

// AI classification of duplicate candidates
async function aiClassifyDuplicate(newArticle, candidates) {
  if (!CONFIG.AI_ENABLED) {
    console.log('AI deduplication disabled, skipping AI check')
    return { isDuplicate: false }
  }

  try {
    const prompt = `You are a news deduplication expert. Determine if the NEW article is a duplicate of any EXISTING articles.

NEW ARTICLE:
- Title: "${newArticle.title}"
- Source: ${newArticle.source}
- Date: ${newArticle.date}
- First 500 chars: "${newArticle.summary.substring(0, 500)}"

EXISTING ARTICLES (potential duplicates):
${candidates.map((c, i) => `
${i + 1}. Title: "${c.title}"
   Source: ${c.source}
   Date: ${c.published_date}
   First 500 chars: "${c.summary ? c.summary.substring(0, 500) : 'N/A'}"
   Similarity: ${(c.title_similarity * 100).toFixed(1)}%
`).join('\n')}

RULES:
- Mark as duplicate if it's the SAME story/event, even if titles differ slightly
- Syndicated content = duplicate
- Updated versions of same article = duplicate
- Different stories about same topic = NOT duplicate
- Similar titles but different events = NOT duplicate

Respond ONLY with valid JSON:
{
  "isDuplicate": true/false,
  "matchedId": <id of matching article, or null>,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

If multiple candidates match, return the best match.`

    // Use unified AI service with automatic fallback
    const response = await aiService.analyzeContent(prompt, {
      maxTokens: 500,
      temperature: 0.1
    })

    const responseText = response.content
    console.log(`AI deduplication response (${response.provider}):`, responseText.substring(0, 200))

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('AI response not valid JSON:', responseText)
      return { isDuplicate: false }
    }

    const result = JSON.parse(jsonMatch[0])

    // Find the actual candidate if matched
    if (result.isDuplicate && result.matchedId) {
      const matched = candidates.find(c => c.id === result.matchedId)
      if (matched) {
        return {
          isDuplicate: true,
          matchedId: result.matchedId,
          matchedArticle: matched,
          confidence: result.confidence,
          reasoning: result.reasoning,
          method: 'ai'
        }
      }
    }

    return {
      isDuplicate: false,
      reasoning: result.reasoning,
      method: 'ai'
    }

  } catch (error) {
    console.error('AI classification error:', error.message)
    // Fallback: not a duplicate if AI fails
    return {
      isDuplicate: false,
      error: error.message
    }
  }
}

// Main deduplication check (4-stage process)
export async function checkDuplicate(article) {
  const stats = {
    stages: [],
    aiCalled: false
  }

  try {
    // Stage 1: Exact URL match
    const urlMatch = await articlesDB.findArticleByURL(article.url)
    if (urlMatch) {
      stats.stages.push('stage1_url')

      // Check if content changed significantly
      const newHash = articlesDB.generateContentHash(article.title, article.summary)
      const contentChanged = urlMatch.content_hash !== newHash

      return {
        isDuplicate: true,
        matchedId: urlMatch.id,
        matchedArticle: urlMatch,
        contentChanged,
        method: 'url',
        stats
      }
    }

    // Stage 2: Content hash match
    const contentHash = articlesDB.generateContentHash(article.title, article.summary)
    const hashMatch = await articlesDB.findArticleByContentHash(contentHash)
    if (hashMatch) {
      stats.stages.push('stage2_hash')
      return {
        isDuplicate: true,
        matchedId: hashMatch.id,
        matchedArticle: hashMatch,
        contentChanged: false,
        method: 'content_hash',
        stats
      }
    }

    // Stage 3: Find similar candidates
    const candidates = await articlesDB.findSimilarArticles(
      article.title,
      article.date,
      CONFIG.DATE_WINDOW_DAYS,
      CONFIG.MAX_CANDIDATES
    )

    if (candidates.length === 0) {
      stats.stages.push('stage3_no_candidates')
      return {
        isDuplicate: false,
        method: 'no_similar',
        stats
      }
    }

    stats.stages.push('stage3_found_candidates')

    // Filter candidates by similarity threshold
    const strongCandidates = candidates.filter(c =>
      c.title_similarity >= CONFIG.TITLE_SIMILARITY_THRESHOLD
    )

    if (strongCandidates.length === 0) {
      return {
        isDuplicate: false,
        method: 'low_similarity',
        candidatesChecked: candidates.length,
        stats
      }
    }

    // Stage 4: AI classification
    stats.stages.push('stage4_ai_check')
    stats.aiCalled = true

    const aiResult = await aiClassifyDuplicate(article, strongCandidates)

    return {
      ...aiResult,
      candidatesChecked: strongCandidates.length,
      stats
    }

  } catch (error) {
    console.error('Deduplication error:', error)
    return {
      isDuplicate: false,
      error: error.message,
      stats
    }
  }
}

// Get deduplication statistics
export async function getDeduplicationStats() {
  return await articlesDB.getDuplicateStats()
}

export default {
  checkDuplicate,
  getDeduplicationStats,
  CONFIG
}
