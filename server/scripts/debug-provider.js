import fetch from 'node-fetch'
import pool from '../database/db.js'

const providerId = '056039'
const CMS_API_URL = 'https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0'

function parseDate(dateStr) {
  if (!dateStr) return null
  try {
    return new Date(dateStr)
  } catch {
    return null
  }
}

async function debug() {
  try {
    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

    console.log(`\n🔍 Debugging provider ${providerId}`)
    console.log(`   3 years ago: ${threeYearsAgo.toISOString()}\n`)

    // Check what's in our database
    const dbRecords = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(deficiency_tag) as with_tags,
        COUNT(*) FILTER (WHERE deficiency_tag IS NULL) as without_tags,
        MIN(survey_date) as oldest_survey,
        MAX(survey_date) as newest_survey
      FROM cms_facility_deficiencies
      WHERE federal_provider_number = $1
        AND survey_date >= $2
    `, [providerId, threeYearsAgo])

    console.log('📊 Database Records (Last 3 Years):')
    console.log(`   Total: ${dbRecords.rows[0].total}`)
    console.log(`   With tags: ${dbRecords.rows[0].with_tags}`)
    console.log(`   Without tags: ${dbRecords.rows[0].without_tags}`)
    console.log(`   Oldest survey: ${dbRecords.rows[0].oldest_survey}`)
    console.log(`   Newest survey: ${dbRecords.rows[0].newest_survey}\n`)

    // Fetch from CMS API
    const url = `${CMS_API_URL}?filters[cms_certification_number_ccn]=${providerId}&limit=1000`
    const response = await fetch(url)
    const data = await response.json()

    const recentRecords = data.results.filter(record => {
      const surveyDate = parseDate(record.survey_date)
      return surveyDate && surveyDate >= threeYearsAgo
    })

    console.log('🌐 CMS API Records (Last 3 Years):')
    console.log(`   Total: ${recentRecords.length}\n`)

    // Sample first record
    if (recentRecords.length > 0) {
      const sample = recentRecords[0]
      console.log('📋 Sample CMS Record:')
      console.log(`   Survey date: ${sample.survey_date}`)
      console.log(`   Survey type: ${sample.survey_type}`)
      console.log(`   Tag: ${sample.deficiency_tag_number}`)
      console.log(`   Prefix: ${sample.deficiency_prefix}`)
      console.log(`   Scope/Severity: ${sample.scope_severity_code}\n`)

      // Check if this exact record exists in DB
      const matchQuery = await pool.query(`
        SELECT
          deficiency_tag,
          scope_severity,
          survey_date,
          survey_type
        FROM cms_facility_deficiencies
        WHERE federal_provider_number = $1
          AND survey_date = $2
          AND survey_type = $3
        LIMIT 1
      `, [providerId, parseDate(sample.survey_date), sample.survey_type])

      if (matchQuery.rows.length > 0) {
        console.log('✅ Found matching DB record:')
        console.log(`   Tag in DB: ${matchQuery.rows[0].deficiency_tag}`)
        console.log(`   Scope/Severity in DB: ${matchQuery.rows[0].scope_severity}`)
      } else {
        console.log('❌ No matching DB record found for this CMS record')
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

debug()
