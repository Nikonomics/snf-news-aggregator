/**
 * Decode Google News redirect URLs to get the actual article URL
 * Google News URLs look like: https://news.google.com/rss/articles/CBMi...
 * The article URL is base64-encoded in the string after "articles/"
 */

export function decodeGoogleNewsUrl(googleNewsUrl) {
  try {
    // Extract the encoded part after /articles/
    const match = googleNewsUrl.match(/\/articles\/([^?]+)/)
    if (!match) {
      return null
    }

    const encoded = match[1]

    // Google News uses a custom base64 variant
    // The encoded string starts with CBMi (or similar prefix) which indicates the encoding type
    // We need to decode the base64 portion

    // Try to extract URL from the base64 data
    // The actual URL is often embedded as a string in the decoded bytes
    try {
      // Remove URL-safe base64 characters and decode
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
      const decoded = Buffer.from(base64, 'base64').toString('utf-8')

      // Look for http or https URLs in the decoded string
      const urlMatch = decoded.match(/https?:\/\/[^\s\x00-\x1f\x7f]+/i)
      if (urlMatch) {
        // Clean up the URL (remove any trailing garbage bytes)
        let url = urlMatch[0]

        // Remove common trailing garbage characters
        url = url.replace(/[\x00-\x1f\x7f]+$/, '')

        // Validate it's a reasonable URL
        if (url.includes('.') && url.length > 10 && url.length < 500) {
          return url
        }
      }
    } catch (decodeError) {
      // Decoding failed, return null
    }

    return null
  } catch (error) {
    return null
  }
}

// Test function
export function testDecoder() {
  const testUrls = [
    'https://news.google.com/rss/articles/CBMiggFBVV95cUxQVElWYTBGRzJPRURERkpYaExPaTR0WXBlRzVSOTJhZktjdmZJN0lwTXU5ZG54WWRFbUNPQ0t2aE9sS0dxLXlLa01IYUo2RGRMUzBSVGJ6aVlVcDUxdU5WNHlLYU84d0FvTFU1TVh6cVZQZ0RVLXF5ZzN1Q2JEQWtFaw',
    'https://news.google.com/rss/articles/CBMiWmh0dHBzOi8vd3d3LmhlYWx0aGNhcmVmaW5hbmNlbmV3cy5jb20vbmV3cy9hbnRoZW0tc2V0cy1iYW5rcnVwdGN5LWhlYXJpbmctZGF0ZdIBAA'
  ]

  console.log('Testing Google News URL decoder:\n')
  testUrls.forEach((url, i) => {
    console.log(`Test ${i + 1}:`)
    console.log(`  Input:  ${url.substring(0, 100)}...`)
    const decoded = decodeGoogleNewsUrl(url)
    console.log(`  Output: ${decoded || '(failed to decode)'}`)
    console.log()
  })
}
