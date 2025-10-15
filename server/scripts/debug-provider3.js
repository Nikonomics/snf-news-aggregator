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

    // Fetch from CMS API
    const url = `${CMS_API_URL}?filters[cms_certification_number_ccn]=${providerId}&limit=1000`
    const response = await fetch(url)
    const data = await response.json()

    // Filter for May 15, 2025
    const mayRecords = data.results.filter(r => r.survey_date === '2025-05-15')

    console.log(`\n🌐 CMS API Records for 2025-05-15: ${mayRecords.length}`)

    if (mayRecords.length > 0) {
      console.log('\n  First 3 records:')
      mayRecords.slice(0, 3).forEach((r, i) => {
        console.log(`\n  Record ${i + 1}:`)
        console.log(`    Survey Type: ${r.survey_type}`)
        console.log(`    Tag: ${r.deficiency_tag_number}`)
        console.log(`    Prefix: ${r.deficiency_prefix}`)
        console.log(`    Scope/Severity: ${r.scope_severity_code}`)
        console.log(`    Text: ${r.deficiency_description ? r.deficiency_description.substring(0, 50) + '...' : 'NULL'}`)
      })
    }

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

debug()
