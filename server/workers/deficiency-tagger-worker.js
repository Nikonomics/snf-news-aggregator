import fetch from 'node-fetch'
import pool from '../database/db.js'

/**
 * Continuous Deficiency Tagging Worker
 * Runs on Render as a background worker to populate all deficiency tags
 */

const CMS_API_URL = 'https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0'
const BATCH_SIZE = 100 // Process 100 providers at a time
const RATE_LIMIT_MS = 300 // 300ms between requests
const BATCH_DELAY_MS = 5000 // 5 seconds between batches

function parseDate(dateStr) {
  if (!dateStr) return null
  try {
    return new Date(dateStr)
  } catch {
    return null
  }
}

async function fetchAndUpdateDeficienciesForProvider(providerId) {
  try {
    // Only fetch deficiencies from the last 3 years
    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

    const url = `${CMS_API_URL}?filters[cms_certification_number_ccn]=${providerId}&limit=1000`
    const response = await fetch(url)
    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      return 0
    }

    let updated = 0

    for (const record of data.results) {
      // Only update if the survey is from the last 3 years
      const surveyDate = parseDate(record.survey_date)
      if (!surveyDate || surveyDate < threeYearsAgo) {
        continue // Skip old deficiencies
      }

      const result = await pool.query(`
        UPDATE cms_facility_deficiencies
        SET
          deficiency_tag = $1,
          deficiency_prefix = $2,
          scope_severity = $3,
          deficiency_text = $4
        WHERE
          federal_provider_number = $5
          AND survey_date = $6
          AND survey_type = $7
          AND survey_date >= $8
          AND (deficiency_tag IS NULL OR scope_severity IS NULL)
      `, [
        record.deficiency_tag_number,
        record.deficiency_prefix,
        record.scope_severity_code,
        record.deficiency_description,
        record.cms_certification_number_ccn,
        surveyDate,
        record.survey_type,
        threeYearsAgo
      ])

      if (result.rowCount > 0) {
        updated += result.rowCount
      }
    }

    return updated
  } catch (error) {
    console.error(`Error updating ${providerId}:`, error.message)
    return 0
  }
}

async function getProvidersNeedingUpdates(limit) {
  // Only process deficiencies from the last 3 years
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

  const query = `
    SELECT DISTINCT federal_provider_number, COUNT(*) as deficiency_count
    FROM cms_facility_deficiencies
    WHERE (deficiency_tag IS NULL OR scope_severity IS NULL)
      AND survey_date >= $1
    GROUP BY federal_provider_number
    ORDER BY deficiency_count DESC
    LIMIT $2
  `
  const result = await pool.query(query, [threeYearsAgo, limit])
  return result.rows
}

async function getProgress() {
  // Only count deficiencies from the last 3 years
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

  const result = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(deficiency_tag) as tagged,
      COUNT(*) - COUNT(deficiency_tag) as remaining
    FROM cms_facility_deficiencies
    WHERE survey_date >= $1
  `, [threeYearsAgo])
  return result.rows[0]
}

async function processBatch() {
  const providers = await getProvidersNeedingUpdates(BATCH_SIZE)

  if (providers.length === 0) {
    console.log('✅ All deficiencies have been tagged!')
    return false // No more work to do
  }

  console.log(`\n📦 Processing batch of ${providers.length} providers...`)

  let totalUpdated = 0
  let processed = 0

  for (const row of providers) {
    const providerId = row.federal_provider_number
    processed++

    console.log(`[${processed}/${providers.length}] Updating ${providerId}...`)

    const updated = await fetchAndUpdateDeficienciesForProvider(providerId)
    totalUpdated += updated

    if (updated > 0) {
      console.log(`  ✓ Updated ${updated} records`)
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS))
  }

  // Show progress
  const progress = await getProgress()
  const percentComplete = ((progress.tagged / progress.total) * 100).toFixed(1)

  console.log('\n📊 Overall Progress:')
  console.log(`  Tagged: ${progress.tagged.toLocaleString()} / ${progress.total.toLocaleString()} (${percentComplete}%)`)
  console.log(`  Remaining: ${progress.remaining.toLocaleString()}`)
  console.log(`  Batch updated: ${totalUpdated} records\n`)

  return true // More work to do
}

async function runWorker() {
  console.log('======================================================================')
  console.log('  DEFICIENCY TAGGING WORKER STARTED')
  console.log('======================================================================')
  console.log(`  Batch size: ${BATCH_SIZE} providers`)
  console.log(`  Rate limit: ${RATE_LIMIT_MS}ms between requests`)
  console.log(`  Batch delay: ${BATCH_DELAY_MS}ms between batches`)
  console.log('======================================================================\n')

  const startProgress = await getProgress()
  console.log(`📊 Starting status:`)
  console.log(`  Total: ${startProgress.total.toLocaleString()}`)
  console.log(`  Tagged: ${startProgress.tagged.toLocaleString()}`)
  console.log(`  Remaining: ${startProgress.remaining.toLocaleString()}\n`)

  let batchNumber = 1
  let hasMoreWork = true

  while (hasMoreWork) {
    console.log(`\n🔄 Batch ${batchNumber}`)
    console.log('─────────────────────────────────────────')

    try {
      hasMoreWork = await processBatch()

      if (hasMoreWork) {
        console.log(`⏳ Waiting ${BATCH_DELAY_MS}ms before next batch...\n`)
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
        batchNumber++
      }
    } catch (error) {
      console.error(`❌ Error in batch ${batchNumber}:`, error)
      console.log(`⏳ Waiting 30 seconds before retry...\n`)
      await new Promise(resolve => setTimeout(resolve, 30000))
    }
  }

  const finalProgress = await getProgress()
  console.log('\n======================================================================')
  console.log('  DEFICIENCY TAGGING WORKER COMPLETED')
  console.log('======================================================================')
  console.log(`  Total batches: ${batchNumber}`)
  console.log(`  Final tagged: ${finalProgress.tagged.toLocaleString()} / ${finalProgress.total.toLocaleString()}`)
  console.log(`  Tagged in this run: ${(finalProgress.tagged - startProgress.tagged).toLocaleString()}`)
  console.log('======================================================================\n')

  process.exit(0)
}

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

// Start the worker
runWorker().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
