import fetch from 'node-fetch'

const providerId = '056039'
const CMS_API_URL = 'https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0'

async function checkFields() {
  try {
    const url = `${CMS_API_URL}?filters[cms_certification_number_ccn]=${providerId}&limit=1`
    const response = await fetch(url)
    const data = await response.json()

    if (data.results && data.results.length > 0) {
      console.log('\n🔍 CMS API Response Fields:')
      console.log(JSON.stringify(data.results[0], null, 2))
    } else {
      console.log('\n❌ No results found')
    }

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkFields()
