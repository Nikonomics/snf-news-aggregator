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
 * Enhanced with multiple fallback strategies for higher success rate
 */
export async function fetchOpenGraphImage(url, retryCount = 0) {
  try {
    // Skip Google News redirect URLs - they're slow and won't have og:image
    if (url.includes('news.google.com/rss/articles/')) {
      return null
    }

    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000) // 20 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      redirect: 'follow' // Follow redirects automatically
    })

    clearTimeout(timeout)

    if (!response.ok) {
      // Retry once on 5xx errors
      if (response.status >= 500 && retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return fetchOpenGraphImage(url, retryCount + 1)
      }
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Strategy 1: Try Open Graph image (most reliable)
    let ogImage = $('meta[property="og:image"]').attr('content') ||
                  $('meta[property="og:image:url"]').attr('content')
    if (ogImage && isValidImageUrl(ogImage)) {
      return makeAbsoluteUrl(ogImage, url)
    }

    // Strategy 2: Try Twitter Card image
    let twitterImage = $('meta[name="twitter:image"]').attr('content') ||
                       $('meta[name="twitter:image:src"]').attr('content') ||
                       $('meta[property="twitter:image"]').attr('content')
    if (twitterImage && isValidImageUrl(twitterImage)) {
      return makeAbsoluteUrl(twitterImage, url)
    }

    // Strategy 3: Try schema.org structured data
    const schemaScripts = $('script[type="application/ld+json"]')
    for (let i = 0; i < schemaScripts.length; i++) {
      try {
        const schemaText = $(schemaScripts[i]).html()
        if (!schemaText) continue

        const schema = JSON.parse(schemaText)
        const schemas = Array.isArray(schema) ? schema : [schema]

        for (const s of schemas) {
          if (s.image) {
            const imageUrl = typeof s.image === 'string' ? s.image :
                           (Array.isArray(s.image) ? s.image[0] : s.image.url)
            if (imageUrl && typeof imageUrl === 'string' && isValidImageUrl(imageUrl)) {
              return makeAbsoluteUrl(imageUrl, url)
            }
          }
        }
      } catch (e) {
        // Schema parsing failed, continue to next
      }
    }

    // Strategy 4: Try link rel="image_src"
    const linkImage = $('link[rel="image_src"]').attr('href')
    if (linkImage && isValidImageUrl(linkImage)) {
      return makeAbsoluteUrl(linkImage, url)
    }

    // Strategy 5: Try finding featured/hero image in article
    const heroImages = $(
      'article img.featured, ' +
      'article img.hero, ' +
      '.article-image img, ' +
      '.featured-image img, ' +
      '.post-thumbnail img, ' +
      '.entry-image img, ' +
      'figure.featured img, ' +
      '.article-hero img'
    )
    if (heroImages.length > 0) {
      const src = heroImages.first().attr('src') || heroImages.first().attr('data-src')
      if (src && isValidImageUrl(src)) {
        return makeAbsoluteUrl(src, url)
      }
    }

    // Strategy 6: Try first image in article content (but filter out small icons/logos)
    const articleImages = $('article img, .article img, .content img, .post-content img, main img')
    for (let i = 0; i < Math.min(articleImages.length, 3); i++) {
      const img = $(articleImages[i])
      const src = img.attr('src') || img.attr('data-src')
      const width = img.attr('width')
      const height = img.attr('height')

      // Skip small images (likely icons/logos)
      if (width && height && (parseInt(width) < 200 || parseInt(height) < 150)) {
        continue
      }

      // Skip images with icon/logo in class name
      const imgClass = img.attr('class') || ''
      if (imgClass.match(/icon|logo|avatar|thumbnail/i)) {
        continue
      }

      if (src && isValidImageUrl(src)) {
        return makeAbsoluteUrl(src, url)
      }
    }

    return null
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`⏱️  Timeout fetching image from ${url}`)
    } else if (retryCount === 0 && error.message.includes('fetch')) {
      // Retry once on network errors
      await new Promise(resolve => setTimeout(resolve, 2000))
      return fetchOpenGraphImage(url, retryCount + 1)
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
 * Generate a placeholder image for articles without images
 * Uses a simple gradient based on the article title
 */
function generatePlaceholderImage(title = 'News') {
  // Use first letter of title
  const letter = title.charAt(0).toUpperCase()

  // Generate color based on first letter (consistent hashing)
  const charCode = letter.charCodeAt(0)
  const hue = (charCode * 137.508) % 360 // Golden angle for nice distribution

  // Convert HSL to RGB for hex color
  const h = hue / 360
  const s = 0.7 // 70% saturation for vibrant colors
  const l = 0.5 // 50% lightness for good contrast

  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  // Convert to hex
  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  const bgColor = toHex(r) + toHex(g) + toHex(b)

  // Use placeholder image service with custom colors
  // Using ui-avatars.com which generates images with letters
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(letter)}&size=400&background=${bgColor}&color=fff&bold=true&format=png`
}

/**
 * Main function: Extract image with fallback strategy
 * 1. Try RSS feed image
 * 2. Fall back to Open Graph scraping
 * 3. Return null if no image found (placeholder handled by frontend)
 */
export async function getArticleImage(feedItem, articleUrl, articleTitle = 'News') {
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

  // Return null if no image found - frontend will show placeholder
  return null
}
