import fetch from 'node-fetch'

// Test resolving a Google News redirect URL
async function testRedirectResolution() {
  console.log('Testing Google News redirect resolution...\n')

  // Get a sample Google News URL from the database
  const testUrl = 'https://news.google.com/rss/articles/CBMiggFBVV95cUxQVElWYTBGRzJPRURERkpYaExPaTR0WXBlRzVSOTJhZktjdmZJN0lwTXU5ZG54WWRFbUNPQ0t2aE9sS0dxLXlLa01IYUo2RGRMUzBSVGJ6aVlVcDUxdU5WNHlLYU84d0FvTFU1TVh6cVZQZ0RVLXF5ZzN1Q2JEQWtFaw'

  console.log('Test URL:', testUrl)
  console.log('Is Google News URL:', testUrl.includes('news.google.com/rss/articles/'))

  try {
    console.log('\nAttempting HEAD request to follow redirect...')
    const response = await fetch(testUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    console.log('\n✓ Redirect resolved!')
    console.log('Final URL:', response.url)
    console.log('Status:', response.status)
    console.log('Content-Type:', response.headers.get('content-type'))

    // Now try to fetch Open Graph image from the resolved URL
    console.log('\nAttempting to fetch page and extract og:image...')
    const pageResponse = await fetch(response.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    })

    const html = await pageResponse.text()

    // Simple regex to find og:image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)

    if (ogImageMatch) {
      console.log('✓ Found og:image:', ogImageMatch[1])
    } else {
      console.log('✗ No og:image found in HTML')
      console.log('First 500 chars of HTML:', html.substring(0, 500))
    }

  } catch (error) {
    console.error('✗ Error:', error.message)
    console.error('Error details:', error)
  }
}

testRedirectResolution()
