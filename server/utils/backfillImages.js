import * as db from '../database/db.js'
import { fetchOpenGraphImage } from './imageExtractor.js'

/**
 * Backfill images for articles that don't have image_url set
 * This script scrapes Open Graph images from article URLs
 */
async function backfillImages() {
  console.log('🖼️  Starting image backfill process...\n')

  try {
    // Query articles without images
    const query = `
      SELECT id, url, title
      FROM articles
      WHERE image_url IS NULL
      ORDER BY published_date DESC
    `

    const result = await db.query(query)
    const articlesWithoutImages = result.rows

    console.log(`📊 Found ${articlesWithoutImages.length} articles without images\n`)

    if (articlesWithoutImages.length === 0) {
      console.log('✅ All articles already have images!')
      process.exit(0)
    }

    let successCount = 0
    let failureCount = 0
    let skippedCount = 0
    const batchSize = 10
    const delayBetweenBatches = 2000 // 2 seconds between batches

    // Process in batches to avoid overwhelming servers
    for (let i = 0; i < articlesWithoutImages.length; i += batchSize) {
      const batch = articlesWithoutImages.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(articlesWithoutImages.length / batchSize)

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (articles ${i + 1}-${Math.min(i + batchSize, articlesWithoutImages.length)})`)

      // Process batch in parallel
      const promises = batch.map(async (article) => {
        try {
          // Skip if URL is invalid
          if (!article.url || !article.url.startsWith('http')) {
            skippedCount++
            return { success: false, skipped: true }
          }

          // Fetch Open Graph image
          const imageUrl = await fetchOpenGraphImage(article.url)

          if (imageUrl) {
            // Update database
            const updateQuery = `
              UPDATE articles
              SET image_url = $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `
            await db.query(updateQuery, [imageUrl, article.id])

            successCount++
            console.log(`  ✅ ${article.title.substring(0, 60)}...`)
            return { success: true }
          } else {
            failureCount++
            console.log(`  ⚠️  No image found: ${article.title.substring(0, 60)}...`)
            return { success: false }
          }
        } catch (error) {
          failureCount++
          console.error(`  ❌ Error processing article ${article.id}:`, error.message)
          return { success: false }
        }
      })

      await Promise.all(promises)

      // Delay between batches to be respectful to servers
      if (i + batchSize < articlesWithoutImages.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Backfill Summary:')
    console.log('='.repeat(60))
    console.log(`Total articles processed: ${articlesWithoutImages.length}`)
    console.log(`✅ Successfully added images: ${successCount}`)
    console.log(`⚠️  No image found: ${failureCount}`)
    console.log(`⏭️  Skipped (invalid URL): ${skippedCount}`)
    console.log(`📈 Success rate: ${((successCount / articlesWithoutImages.length) * 100).toFixed(1)}%`)
    console.log('='.repeat(60))

    process.exit(0)
  } catch (error) {
    console.error('❌ Fatal error during backfill:', error)
    process.exit(1)
  }
}

// Run the backfill
backfillImages()
