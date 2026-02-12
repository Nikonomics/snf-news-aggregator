import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api'
import { Star, MapPin, TrendingUp, AlertCircle, Building2, Map } from 'lucide-react'
import StateMarketMap from './StateMarketMap'
import './StateMarketMap.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const mapContainerStyle = {
  width: '100%',
  height: '690px'
}

// State center coordinates
const STATE_CENTERS = {
  AL: { lat: 32.8, lng: -86.8, zoom: 7 },
  AK: { lat: 64, lng: -152, zoom: 5 },
  AZ: { lat: 34.3, lng: -111.5, zoom: 7 },
  AR: { lat: 34.9, lng: -92.4, zoom: 7 },
  CA: { lat: 37.2, lng: -119.5, zoom: 6 },
  CO: { lat: 39, lng: -105.5, zoom: 7 },
  CT: { lat: 41.6, lng: -72.7, zoom: 8 },
  DE: { lat: 39, lng: -75.5, zoom: 9 },
  FL: { lat: 28, lng: -81.5, zoom: 7 },
  GA: { lat: 32.7, lng: -83.5, zoom: 7 },
  HI: { lat: 20.5, lng: -157, zoom: 7 },
  ID: { lat: 45.3, lng: -114.5, zoom: 6 },
  IL: { lat: 40, lng: -89.2, zoom: 7 },
  IN: { lat: 40, lng: -86.3, zoom: 7 },
  IA: { lat: 42, lng: -93.5, zoom: 7 },
  KS: { lat: 38.5, lng: -98.5, zoom: 7 },
  KY: { lat: 37.8, lng: -85.3, zoom: 7 },
  LA: { lat: 31, lng: -91.8, zoom: 7 },
  ME: { lat: 45.5, lng: -69, zoom: 7 },
  MD: { lat: 39, lng: -76.6, zoom: 8 },
  MA: { lat: 42.3, lng: -71.8, zoom: 8 },
  MI: { lat: 44.5, lng: -85, zoom: 7 },
  MN: { lat: 46.3, lng: -94.3, zoom: 7 },
  MS: { lat: 32.7, lng: -89.7, zoom: 7 },
  MO: { lat: 38.5, lng: -92.5, zoom: 7 },
  MT: { lat: 47, lng: -109.5, zoom: 6 },
  NE: { lat: 41.5, lng: -99.8, zoom: 7 },
  NV: { lat: 39, lng: -116.8, zoom: 6 },
  NH: { lat: 43.7, lng: -71.6, zoom: 8 },
  NJ: { lat: 40.2, lng: -74.6, zoom: 8 },
  NM: { lat: 34.4, lng: -106, zoom: 7 },
  NY: { lat: 43, lng: -75.5, zoom: 7 },
  NC: { lat: 35.5, lng: -79.5, zoom: 7 },
  ND: { lat: 47.5, lng: -100.5, zoom: 7 },
  OH: { lat: 40.4, lng: -82.7, zoom: 7 },
  OK: { lat: 35.5, lng: -97.5, zoom: 7 },
  OR: { lat: 44, lng: -120.5, zoom: 7 },
  PA: { lat: 41, lng: -77.8, zoom: 7 },
  RI: { lat: 41.7, lng: -71.5, zoom: 9 },
  SC: { lat: 33.8, lng: -81, zoom: 7 },
  SD: { lat: 44.4, lng: -100.3, zoom: 7 },
  TN: { lat: 35.8, lng: -86.3, zoom: 7 },
  TX: { lat: 31.5, lng: -99.5, zoom: 6 },
  UT: { lat: 39.3, lng: -111.5, zoom: 7 },
  VT: { lat: 44, lng: -72.7, zoom: 8 },
  VA: { lat: 37.5, lng: -78.8, zoom: 7 },
  WA: { lat: 47.5, lng: -120.5, zoom: 7 },
  WV: { lat: 38.6, lng: -80.5, zoom: 7 },
  WI: { lat: 44.5, lng: -89.7, zoom: 7 },
  WY: { lat: 43, lng: -107.5, zoom: 7 }
}

const GoogleStateMarketMap = ({ stateCode }) => {
  const [viewMode, setViewMode] = useState('facilities') // 'facilities' or 'counties'
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [map, setMap] = useState(null)
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 })

  // Filter states
  const [filters, setFilters] = useState({
    minRating: 0,
    maxRating: 5,
    ownershipType: 'all',
    hasDeficiencies: 'all',
    minBeds: 0,
    maxBeds: 1000,
    ownershipCompany: 'all',
    facilityType: 'both' // 'snf', 'alf', or 'both'
  })

  // Get unique ownership companies for filter
  const ownershipCompanies = [...new Set(
    facilities
      .map(f => f.ownership || f.ownershipCompany)
      .filter(o => o && o.trim())
  )].sort()

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places']
  })

  useEffect(() => {
    fetchFacilities()
  }, [stateCode])

  const fetchFacilities = async () => {
    try {
      setLoading(true)

      // Fetch both SNF and ALF facilities in parallel
      const [snfResponse, alfResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/state/${stateCode}/facilities`),
        fetch(`${API_BASE_URL}/api/state/${stateCode}/alf-facilities?limit=1000`)
      ])

      const snfData = await snfResponse.json()
      const alfData = await alfResponse.json()

      const allFacilities = []

      // Add SNF facilities with type tag
      if (snfData.success) {
        const validSNFs = snfData.facilities
          .filter(f => f.address && f.city && f.state)
          .map(f => ({ ...f, facilityType: 'snf' }))
        allFacilities.push(...validSNFs)
      }

      // Add ALF facilities with type tag
      if (alfData.success) {
        const validALFs = alfData.facilities
          .filter(f => f.address && f.city && f.state)
          .map(f => ({ ...f, facilityType: 'alf' }))
        allFacilities.push(...validALFs)
      }

      if (allFacilities.length === 0 && (!snfData.success || !alfData.success)) {
        setError('Failed to load facilities')
      }

      setFacilities(allFacilities)
    } catch (err) {
      setError('Error loading facilities: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Geocode an address using Google's Geocoding API
  const geocodeAddress = async (facility) => {
    try {
      const address = `${facility.address}, ${facility.city}, ${facility.state} ${facility.zip_code}`
      const geocoder = new window.google.maps.Geocoder()

      return new Promise((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location
            resolve({
              lat: location.lat(),
              lng: location.lng()
            })
          } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        })
      })
    } catch (error) {
      console.error(`Failed to geocode ${facility.facility_name}:`, error)
      return null
    }
  }

  // Save coordinates to database
  const saveCoordinates = async (providerNumber, latitude, longitude) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/facility/${providerNumber}/coordinates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ latitude, longitude })
      })
      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Failed to save coordinates:', error)
      return false
    }
  }

  // Geocode facilities without coordinates
  useEffect(() => {
    if (!isLoaded || facilities.length === 0) return

    const geocodeFacilities = async () => {
      const facilitiesWithoutCoords = facilities.filter(f => !f.latitude || !f.longitude)

      if (facilitiesWithoutCoords.length === 0) return

      setGeocodingProgress({ current: 0, total: facilitiesWithoutCoords.length })

      // Geocode in batches to respect API rate limits
      for (let i = 0; i < facilitiesWithoutCoords.length; i++) {
        const facility = facilitiesWithoutCoords[i]

        try {
          const coords = await geocodeAddress(facility)

          if (coords) {
            // Update facility in state
            setFacilities(prev => prev.map(f =>
              f.federal_provider_number === facility.federal_provider_number
                ? { ...f, latitude: coords.lat, longitude: coords.lng }
                : f
            ))

            // Save to database
            await saveCoordinates(facility.federal_provider_number, coords.lat, coords.lng)
          }

          setGeocodingProgress({ current: i + 1, total: facilitiesWithoutCoords.length })

          // Rate limit: 50 requests per second for Maps API
          if (i < facilitiesWithoutCoords.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        } catch (error) {
          console.error(`Error geocoding facility ${facility.facility_name}:`, error)
        }
      }

      setGeocodingProgress({ current: 0, total: 0 })
    }

    geocodeFacilities()
  }, [facilities.length, isLoaded])

  const getMarkerColor = (rating) => {
    if (!rating || rating === 0) return '#94a3b8' // gray
    if (rating >= 4) return '#22c55e' // green
    if (rating >= 3) return '#eab308' // yellow
    if (rating >= 2) return '#f97316' // orange
    return '#ef4444' // red
  }

  const onLoad = useCallback((map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // Filter facilities based on current filters
  const filteredFacilities = facilities.filter(facility => {
    // Facility type filter
    if (filters.facilityType !== 'both') {
      if (facility.facilityType !== filters.facilityType) return false
    }

    const rating = facility.overall_rating || 0
    const beds = facility.total_beds || facility.numberOfBeds || facility.capacity || 0

    // Rating filter (only for SNF facilities)
    if (facility.facilityType === 'snf' && (rating < filters.minRating || rating > filters.maxRating)) {
      return false
    }

    // Bed range filter
    if (beds < filters.minBeds || beds > filters.maxBeds) return false

    // Ownership type filter (only for SNF facilities)
    if (facility.facilityType === 'snf' && filters.ownershipType !== 'all') {
      const ownershipType = (facility.ownership_type || '').toLowerCase()
      if (filters.ownershipType === 'for-profit' && !ownershipType.includes('profit')) return false
      if (filters.ownershipType === 'non-profit' && !ownershipType.includes('non')) return false
      if (filters.ownershipType === 'government' && !ownershipType.includes('government')) return false
    }

    // Ownership company filter
    if (filters.ownershipCompany !== 'all') {
      const company = facility.ownership || facility.ownershipCompany || ''
      if (company !== filters.ownershipCompany) return false
    }

    // Deficiencies filter (only for SNF facilities)
    if (facility.facilityType === 'snf') {
      if (filters.hasDeficiencies === 'yes' && (!facility.total_deficiencies || facility.total_deficiencies === '0')) return false
      if (filters.hasDeficiencies === 'no' && facility.total_deficiencies && facility.total_deficiencies !== '0') return false
    }

    return true
  })

  if (loadError) {
    return <div className="map-error">Error loading Google Maps</div>
  }

  if (!isLoaded || loading) {
    return <div className="map-loading">Loading map...</div>
  }

  const center = STATE_CENTERS[stateCode] || { lat: 39.8283, lng: -98.5795, zoom: 4 }

  // If county view is selected, show the original D3 map
  if (viewMode === 'counties') {
    return (
      <div>
        <div className="map-view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'facilities' ? 'active' : ''}`}
            onClick={() => setViewMode('facilities')}
          >
            <Building2 size={16} />
            Facility View
          </button>
          <button
            className={`toggle-btn ${viewMode === 'counties' ? 'active' : ''}`}
            onClick={() => setViewMode('counties')}
          >
            <Map size={16} />
            County View
          </button>
        </div>
        <StateMarketMap stateCode={stateCode} />
      </div>
    )
  }

  return (
    <div>
      <div className="map-view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'facilities' ? 'active' : ''}`}
          onClick={() => setViewMode('facilities')}
        >
          <Building2 size={16} />
          Facility View
        </button>
        <button
          className={`toggle-btn ${viewMode === 'counties' ? 'active' : ''}`}
          onClick={() => setViewMode('counties')}
        >
          <Map size={16} />
          County View
        </button>
      </div>

      {/* Filter Controls */}
      <div className="map-filters">
        <div className="filter-group">
          <label>Facility Type:</label>
          <select
            value={filters.facilityType}
            onChange={(e) => setFilters({...filters, facilityType: e.target.value})}
          >
            <option value="both">Both SNF & ALF</option>
            <option value="snf">SNF Only</option>
            <option value="alf">ALF Only</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Star Rating:</label>
          <select
            value={filters.minRating}
            onChange={(e) => setFilters({...filters, minRating: Number(e.target.value)})}
            disabled={filters.facilityType === 'alf'}
          >
            <option value={0}>Any</option>
            <option value={1}>1+</option>
            <option value={2}>2+</option>
            <option value={3}>3+</option>
            <option value={4}>4+</option>
            <option value={5}>5 Stars</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Bed Range:</label>
          <select
            value={`${filters.minBeds}-${filters.maxBeds}`}
            onChange={(e) => {
              const [min, max] = e.target.value.split('-').map(Number)
              setFilters({...filters, minBeds: min, maxBeds: max})
            }}
          >
            <option value="0-1000">All Sizes</option>
            <option value="0-50">Small (1-50)</option>
            <option value="51-100">Medium (51-100)</option>
            <option value="101-150">Large (101-150)</option>
            <option value="151-1000">Very Large (151+)</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Ownership Type:</label>
          <select
            value={filters.ownershipType}
            onChange={(e) => setFilters({...filters, ownershipType: e.target.value})}
          >
            <option value="all">All Types</option>
            <option value="for-profit">For Profit</option>
            <option value="non-profit">Non-Profit</option>
            <option value="government">Government</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Ownership Company:</label>
          <select
            value={filters.ownershipCompany}
            onChange={(e) => setFilters({...filters, ownershipCompany: e.target.value})}
          >
            <option value="all">All Companies</option>
            {ownershipCompanies.map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Deficiencies:</label>
          <select
            value={filters.hasDeficiencies}
            onChange={(e) => setFilters({...filters, hasDeficiencies: e.target.value})}
          >
            <option value="all">All</option>
            <option value="yes">Has Deficiencies</option>
            <option value="no">No Deficiencies</option>
          </select>
        </div>

        <div className="filter-results">
          Showing {filteredFacilities.length} of {facilities.length} facilities
        </div>
      </div>

      <div className="google-map-container">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={{ lat: center.lat, lng: center.lng }}
        zoom={center.zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true
        }}
      >
        <MarkerClusterer
          options={{
            minimumClusterSize: 5,
            maxZoom: 11,
            gridSize: 40,
            averageCenter: true
          }}
        >
          {(clusterer) =>
            filteredFacilities
              .filter(f => f.latitude && f.longitude) // Only show facilities with coordinates
              .map((facility) => {
                // Use appropriate key for SNF vs ALF
                const facilityKey = facility.facilityType === 'alf'
                  ? `alf-${facility.id}`
                  : facility.federal_provider_number

                // Get marker color based on facility type
                const markerColor = facility.facilityType === 'alf'
                  ? '#3b82f6' // Blue for ALF facilities
                  : getMarkerColor(facility.overall_rating || facility.overallRating)

                return (
                  <Marker
                    key={facilityKey}
                    clusterer={clusterer}
                    position={{
                      lat: parseFloat(facility.latitude),
                      lng: parseFloat(facility.longitude)
                    }}
                    title={facility.facility_name || facility.providerName}
                    onClick={() => setSelectedFacility(facility)}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: 8,
                      fillColor: markerColor,
                      fillOpacity: 0.9,
                      strokeColor: '#ffffff',
                      strokeWeight: 2
                    }}
                  />
                )
              })
          }
        </MarkerClusterer>

        {selectedFacility && selectedFacility.latitude && selectedFacility.longitude && (
          <InfoWindow
            position={{
              lat: parseFloat(selectedFacility.latitude),
              lng: parseFloat(selectedFacility.longitude)
            }}
            onCloseClick={() => setSelectedFacility(null)}
          >
            <div className="facility-info-window">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <h3 style={{ margin: 0 }}>{selectedFacility.facility_name || selectedFacility.providerName}</h3>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: selectedFacility.facilityType === 'alf' ? '#3b82f6' : '#10b981',
                  color: 'white'
                }}>
                  {selectedFacility.facilityType === 'alf' ? 'ALF' : 'SNF'}
                </span>
              </div>

              <div className="info-row">
                <MapPin size={14} />
                <span>{selectedFacility.city}, {selectedFacility.state}</span>
              </div>

              {selectedFacility.facilityType === 'snf' && selectedFacility.overall_rating > 0 && (
                <div className="info-row">
                  <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                  <span>{selectedFacility.overall_rating} Stars</span>
                </div>
              )}

              {(selectedFacility.total_beds || selectedFacility.numberOfBeds || selectedFacility.capacity) && (
                <div className="info-row">
                  <TrendingUp size={14} />
                  <span>{selectedFacility.total_beds || selectedFacility.numberOfBeds || selectedFacility.capacity} {selectedFacility.facilityType === 'alf' ? 'Capacity' : 'Beds'}</span>
                </div>
              )}

              {selectedFacility.facilityType === 'snf' && (selectedFacility.total_deficiencies > 0 || selectedFacility.deficiency_count > 0) && (
                <div className="info-row warning">
                  <AlertCircle size={14} />
                  <span>{selectedFacility.total_deficiencies || selectedFacility.deficiency_count} Deficiencies</span>
                </div>
              )}

              {selectedFacility.facilityType === 'alf' && selectedFacility.state_facility_type_1 && (
                <div className="facility-type">
                  {selectedFacility.state_facility_type_1}
                </div>
              )}

              {selectedFacility.facilityType === 'snf' && (selectedFacility.ownership_type || selectedFacility.ownershipType) && (
                <div className="facility-type">
                  {selectedFacility.ownership_type || selectedFacility.ownershipType}
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {error && (
        <div className="map-error-banner">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {geocodingProgress.total > 0 && (
        <div className="map-info-banner" style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#3b82f6',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          <MapPin size={16} style={{ display: 'inline', marginRight: '8px' }} />
          Geocoding facilities: {geocodingProgress.current} / {geocodingProgress.total}
        </div>
      )}

      <div className="map-legend">
        <h4>Facility Ratings</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#22c55e' }}></span>
            <span>4-5 Stars</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#eab308' }}></span>
            <span>3 Stars</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#f97316' }}></span>
            <span>2 Stars</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#ef4444' }}></span>
            <span>1 Star</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#94a3b8' }}></span>
            <span>Not Rated</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default GoogleStateMarketMap
