import * as cheerio from 'cheerio'

/**
 * Extract image URL from RSS feed item
 * Checks multiple common RSS image fields
 */
export function extractImageFromFeed(item) {
  try {
    // Check for media:content (most common in RSS feeds)
    if (item['media:content'] && item['media:content'].$?.url) {
      return item['media:content'].$.url
    }

    // Check for media:thumbnail
    if (item['media:thumbnail'] && item['media:thumbnail'].$?.url) {
      return item['media:thumbnail'].$.url
    }

    // Check for enclosure (podcast/media)
    if (item.enclosure && item.enclosure.$) {
      const type = item.enclosure.$.type || ''
      if (type.startsWith('image/')) {
        return item.enclosure.$.url
      }
    }

    // Check for image tag
    if (item.image && typeof item.image === 'string') {
      return item.image
    }

    // Parse description/content for images
    const description = item.description || item['content:encoded'] || item.content || ''
    if (description) {
      const imageUrl = extractImageFromHTML(description)
      if (imageUrl) return imageUrl
    }

    return null
  } catch (error) {
    console.error('Error extracting image from feed:', error.message)
    return null
  }
}

/**
 * Extract first image URL from HTML content
 */
export function extractImageFromHTML(html) {
  try {
    const $ = cheerio.load(html)

    // Find first img tag
    const img = $('img').first()
    if (img.length > 0) {
      const src = img.attr('src')
      if (src && isValidImageUrl(src)) {
        return src
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting image from HTML:', error.message)
    return null
  }
}

/**
 * Fetch and extract Open Graph image from article URL
 * This is a fallback when RSS doesn't provide an image
 */
export async function fetchOpenGraphImage(url) {
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SNF News Aggregator/1.0)'
      }
    })

    clearTimeout(timeout)

    if (!response.ok) return null

    const html = await response.text()
    const $ = cheerio.load(html)

    // Try Open Graph image
    let ogImage = $('meta[property="og:image"]').attr('content')
    if (ogImage && isValidImageUrl(ogImage)) {
      return makeAbsoluteUrl(ogImage, url)
    }

    // Try Twitter Card image
    let twitterImage = $('meta[name="twitter:image"]').attr('content')
    if (twitterImage && isValidImageUrl(twitterImage)) {
      return makeAbsoluteUrl(twitterImage, url)
    }

    // Try schema.org image
    const schemaScript = $('script[type="application/ld+json"]').html()
    if (schemaScript) {
      try {
        const schema = JSON.parse(schemaScript)
        if (schema.image) {
          const imageUrl = typeof schema.image === 'string' ? schema.image : schema.image.url
          if (imageUrl && isValidImageUrl(imageUrl)) {
            return makeAbsoluteUrl(imageUrl, url)
          }
        }
      } catch (e) {
        // Schema parsing failed, continue
      }
    }

    // Try finding first prominent image in article
    const articleImages = $('article img, .article img, .content img, .post img')
    if (articleImages.length > 0) {
      const src = articleImages.first().attr('src')
      if (src && isValidImageUrl(src)) {
        return makeAbsoluteUrl(src, url)
      }
    }

    return null
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`⏱️  Timeout fetching image from ${url}`)
    } else {
      console.error(`Error fetching Open Graph image from ${url}:`, error.message)
    }
    return null
  }
}

/**
 * Check if URL is a valid image URL
 */
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false

  // Remove query params and fragments for extension check
  const urlWithoutParams = url.split('?')[0].split('#')[0].toLowerCase()

  // Check for common image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
  const hasImageExtension = imageExtensions.some(ext => urlWithoutParams.endsWith(ext))

  // Also accept URLs that start with common image hosting patterns
  const imageHostPatterns = [
    'image',
    'img',
    'photo',
    'picture',
    'media',
    'cdn',
    'assets'
  ]
  const hasImagePattern = imageHostPatterns.some(pattern => url.toLowerCase().includes(pattern))

  return hasImageExtension || (hasImagePattern && (url.startsWith('http://') || url.startsWith('https://')))
}

/**
 * Convert relative URL to absolute URL
 */
function makeAbsoluteUrl(imageUrl, baseUrl) {
  try {
    // Already absolute
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl
    }

    // Protocol-relative URL
    if (imageUrl.startsWith('//')) {
      return 'https:' + imageUrl
    }

    // Relative URL
    const base = new URL(baseUrl)
    if (imageUrl.startsWith('/')) {
      return `${base.protocol}//${base.host}${imageUrl}`
    } else {
      return `${base.protocol}//${base.host}${base.pathname}/${imageUrl}`
    }
  } catch (error) {
    console.error('Error making absolute URL:', error.message)
    return imageUrl
  }
}

/**
 * Main function: Extract image with fallback strategy
 * 1. Try RSS feed image
 * 2. Fall back to Open Graph scraping
 */
export async function getArticleImage(feedItem, articleUrl) {
  // Try RSS feed first (fast, most relevant)
  const feedImage = extractImageFromFeed(feedItem)
  if (feedImage) {
    return feedImage
  }

  // Fall back to scraping article page for Open Graph image
  const ogImage = await fetchOpenGraphImage(articleUrl)
  if (ogImage) {
    return ogImage
  }

  // No image found
  return null
}
