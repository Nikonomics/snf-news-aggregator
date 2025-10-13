import fetch from 'node-fetch'

/**
 * BLS OEWS Wages Collector
 * Collects RN, LPN, CNA wages by state from Bureau of Labor Statistics
 *
 * API Docs: https://www.bls.gov/developers/api_signature_v2.htm
 * Dataset: Occupational Employment and Wage Statistics (OEWS)
 */

const BLS_API_KEY = process.env.BLS_API_KEY
const BLS_API_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/'

// SOC Codes for nursing occupations
const OCCUPATION_CODES = {
  RN: '29-1141',      // Registered Nurses
  LPN: '29-2061',     // Licensed Practical/Vocational Nurses
  CNA: '31-1131',     // Nursing Assistants
  MANAGER: '11-9111'  // Medical and Health Services Managers
}

// Industry code for SNFs
const SNF_INDUSTRY_CODE = '623110' // Nursing Care Facilities (Skilled Nursing)

// State FIPS codes
const STATE_CODES = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
  '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
  '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM',
  '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY'
}

/**
 * Build BLS series ID for a specific state and occupation
 * Format: OEUM[STATE][INDUSTRY]0000[SOC]03
 * Example: OEUM0600000000291141103 = California, All Industries, RN, Mean Hourly Wage
 */
function buildSeriesId(stateFips, socCode, dataType = '03') {
  // OEWS series format:
  // OEU = Occupational Employment
  // M = Mean wage
  // [STATE] = 2-digit FIPS
  // 000000 = All industries (or 6-digit NAICS)
  // 0000 = All ownership
  // [SOC] = 7-digit SOC code (with hyphen removed)
  // [DATATYPE] = 03 for mean hourly wage, 04 for annual wage

  const socClean = socCode.replace(/-/g, '')
  return `OEUM${stateFips}00000000000${socClean}${dataType}`
}

/**
 * Fetch wage data from BLS API
 */
async function fetchBLSWageData(year = 2023) {
  if (!BLS_API_KEY) {
    throw new Error('BLS_API_KEY environment variable not set')
  }

  console.log(`\n📊 Fetching BLS wage data for ${year}...\n`)

  const allStateData = {}

  // Process each occupation
  for (const [occupation, socCode] of Object.entries(OCCUPATION_CODES)) {
    console.log(`\n🔍 Fetching ${occupation} wages (SOC ${socCode})...`)

    // Build series IDs for all states (max 50 per request)
    const seriesIds = Object.keys(STATE_CODES).map(fips => buildSeriesId(fips, socCode))

    // BLS API allows max 50 series per request, so batch if needed
    const batchSize = 50
    for (let i = 0; i < seriesIds.length; i += batchSize) {
      const batch = seriesIds.slice(i, i + batchSize)

      const requestBody = {
        seriesid: batch,
        startyear: year.toString(),
        endyear: year.toString(),
        registrationkey: BLS_API_KEY
      }

      try {
        const response = await fetch(BLS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          throw new Error(`BLS API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        if (data.status !== 'REQUEST_SUCCEEDED') {
          console.error(`BLS API error: ${data.message}`)
          continue
        }

        // Process results
        for (const series of data.Results.series) {
          const seriesId = series.seriesID
          const stateFips = seriesId.substring(4, 6)
          const stateCode = STATE_CODES[stateFips]

          if (!stateCode) continue

          if (!allStateData[stateCode]) {
            allStateData[stateCode] = {
              stateCode,
              year,
              wages: {}
            }
          }

          // Get most recent value
          const latestData = series.data[0]
          if (latestData) {
            allStateData[stateCode].wages[occupation] = {
              hourlyWage: parseFloat(latestData.value),
              year: parseInt(latestData.year),
              period: latestData.period
            }
          }
        }

        console.log(`  ✓ Processed batch ${Math.floor(i / batchSize) + 1}`)

        // Rate limiting - BLS allows 500 requests per day
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`  ✗ Error fetching batch: ${error.message}`)
      }
    }
  }

  return allStateData
}

/**
 * Main collection function
 */
export async function collectBLSWages(year = 2023) {
  try {
    console.log('======================================================================')
    console.log('  BLS OEWS WAGES COLLECTOR')
    console.log('======================================================================')
    console.log(`  Year: ${year}`)
    console.log(`  API Key: ${BLS_API_KEY ? 'Set ✓' : 'Missing ✗'}`)
    console.log(`  Occupations: RN, LPN, CNA, Manager`)
    console.log('======================================================================\n')

    if (!BLS_API_KEY) {
      console.error('❌ BLS_API_KEY not found in environment variables')
      console.log('\n💡 Register for API key at: https://data.bls.gov/registrationEngine/\n')
      return
    }

    // Step 1: Fetch wage data
    const wageData = await fetchBLSWageData(year)

    console.log(`\n✓ Fetched wage data for ${Object.keys(wageData).length} states\n`)

    // Step 2: Display results
    console.log('======================================================================')
    console.log('  WAGE DATA SUMMARY')
    console.log('======================================================================\n')

    for (const [stateCode, data] of Object.entries(wageData)) {
      console.log(`${stateCode}:`)
      if (data.wages.RN) {
        console.log(`  RN:      $${data.wages.RN.hourlyWage.toFixed(2)}/hr`)
      }
      if (data.wages.LPN) {
        console.log(`  LPN:     $${data.wages.LPN.hourlyWage.toFixed(2)}/hr`)
      }
      if (data.wages.CNA) {
        console.log(`  CNA:     $${data.wages.CNA.hourlyWage.toFixed(2)}/hr`)
      }
      if (data.wages.MANAGER) {
        console.log(`  Manager: $${data.wages.MANAGER.hourlyWage.toFixed(2)}/hr`)
      }
      console.log()
    }

    console.log('======================================================================\n')
    console.log('✅ BLS wage data collection complete!\n')

    // Note: Saving to database would require a wages table
    // For now, just return the data
    return {
      success: true,
      year,
      states: wageData
    }

  } catch (error) {
    console.error('❌ Error collecting BLS wage data:', error)
    throw error
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const year = process.argv[2] ? parseInt(process.argv[2]) : 2023
  collectBLSWages(year)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export default { collectBLSWages }
