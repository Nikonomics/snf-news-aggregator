import pool from './db.js'

/**
 * Geocode facilities using their address information
 * This adds latitude/longitude coordinates for mapping
 */

// Simple geocoding using US Census Geocoder API (free, no API key needed)
async function geocodeAddress(address, city, state, zip) {
  try {
    // Clean up address
    const cleanAddress = `${address}, ${city}, ${state} ${zip}`.replace(/\s+/g, ' ').trim()

    // Use Census Geocoder API
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(cleanAddress)}&benchmark=2020&format=json`

    const response = await fetch(url)
    const data = await response.json()

    if (data.result?.addressMatches?.[0]?.coordinates) {
      const coords = data.result.addressMatches[0].coordinates
      return {
        latitude: coords.y,
        longitude: coords.x
      }
    }

    return null
  } catch (error) {
    console.error(`Error geocoding ${city}, ${state}:`, error.message)
    return null
  }
}

async function geocodeFacilities() {
  console.log('🌍 Starting facility geocoding...\n')

  try {
    // Get facilities without coordinates
    const result = await pool.query(`
      SELECT
        federal_provider_number,
        facility_name,
        address,
        city,
        state,
        zip_code
      FROM snf_facilities
      WHERE latitude IS NULL OR longitude IS NULL
      ORDER BY state, city
      LIMIT 100
    `)

    console.log(`📍 Found ${result.rows.length} facilities to geocode\n`)

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < result.rows.length; i++) {
      const facility = result.rows[i]

      console.log(`[${i + 1}/${result.rows.length}] Geocoding: ${facility.facility_name} (${facility.city}, ${facility.state})`)

      const coords = await geocodeAddress(
        facility.address,
        facility.city,
        facility.state,
        facility.zip_code
      )

      if (coords) {
        await pool.query(`
          UPDATE snf_facilities
          SET latitude = $1, longitude = $2
          WHERE federal_provider_number = $3
        `, [coords.latitude, coords.longitude, facility.federal_provider_number])

        console.log(`  ✅ Success: ${coords.latitude}, ${coords.longitude}`)
        successCount++
      } else {
        console.log(`  ❌ Failed to geocode`)
        failCount++
      }

      // Rate limiting - Census API allows 10k requests per day
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`\n✅ Geocoding complete!`)
    console.log(`   Success: ${successCount}`)
    console.log(`   Failed: ${failCount}`)

  } catch (error) {
    console.error('❌ Error geocoding facilities:', error)
    throw error
  }
}

// Run the script
geocodeFacilities()
  .then(() => {
    console.log('\n✅ Geocoding process complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error)
    process.exit(1)
  })
