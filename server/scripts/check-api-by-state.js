import fetch from 'node-fetch'

const CMS_API_URL = 'https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0'

async function checkByState() {
  try {
    // Try filtering by state (California)
    const url = `${CMS_API_URL}?filters[state]=CA&limit=3`
    const response = await fetch(url)
    const data = await response.json()

    console.log(`\n🔍 Sample CMS API results for California:`)
    console.log(`Total results: ${data.results ? data.results.length : 0}\n`)

    if (data.results && data.results.length > 0) {
      data.results.forEach((r, i) => {
        console.log(`Record ${i + 1}:`)
        console.log(`  Provider: ${r.cms_certification_number_ccn} - ${r.provider_name}`)
        console.log(`  Survey Date: ${r.survey_date}`)
        console.log(`  Tag: ${r.deficiency_prefix}${r.deficiency_tag_number}`)
        console.log(`  Scope/Severity: ${r.scope_severity_code}`)
        console.log()
      })
    }

    // Now check if 056039 exists
    console.log('\n🔍 Checking for provider 056039...')
    const url2 = `${CMS_API_URL}?filters[cms_certification_number_ccn]=056039&limit=1`
    const response2 = await fetch(url2)
    const data2 = await response2.json()

    if (data2.results && data2.results.length > 0) {
      console.log(`✅ Found provider 056039`)
      console.log(JSON.stringify(data2.results[0], null, 2))
    } else {
      console.log(`❌ Provider 056039 not found in CMS API`)
    }

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkByState()
