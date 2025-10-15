import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api'
import { Star, MapPin, TrendingUp, AlertCircle, Building2, Map } from 'lucide-react'
import StateMarketMap from './StateMarketMap'
import './StateMarketMap.css'

const API_BASE_URL = 'http://localhost:3001'

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

  // Filter states
  const [filters, setFilters] = useState({
    minRating: 0,
    maxRating: 5,
    ownershipType: 'all',
    hasDeficiencies: 'all',
    minBeds: 0,
    maxBeds: 1000,
    ownershipCompany: 'all'
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
      const response = await fetch(`${API_BASE_URL}/api/state/${stateCode}/facilities`)
      const data = await response.json()

      if (data.success) {
        // Filter facilities with valid addresses
        const validFacilities = data.facilities.filter(f =>
          f.address && f.city && f.state
        )
        setFacilities(validFacilities)
      } else {
        setError('Failed to load facilities')
      }
    } catch (err) {
      setError('Error loading facilities: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

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
    const rating = facility.overall_rating || 0
    const beds = facility.total_beds || facility.numberOfBeds || 0

    // Rating filter
    if (rating < filters.minRating || rating > filters.maxRating) return false

    // Bed range filter
    if (beds < filters.minBeds || beds > filters.maxBeds) return false

    // Ownership type filter
    if (filters.ownershipType !== 'all') {
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

    // Deficiencies filter
    if (filters.hasDeficiencies === 'yes' && (!facility.total_deficiencies || facility.total_deficiencies === '0')) return false
    if (filters.hasDeficiencies === 'no' && facility.total_deficiencies && facility.total_deficiencies !== '0') return false

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
          <label>Star Rating:</label>
          <select
            value={filters.minRating}
            onChange={(e) => setFilters({...filters, minRating: Number(e.target.value)})}
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
                return (
                  <Marker
                    key={facility.federal_provider_number}
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
                      fillColor: getMarkerColor(facility.overall_rating || facility.overallRating),
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
              <h3>{selectedFacility.facility_name || selectedFacility.providerName}</h3>

              <div className="info-row">
                <MapPin size={14} />
                <span>{selectedFacility.city}, {selectedFacility.state}</span>
              </div>

              {selectedFacility.overall_rating > 0 && (
                <div className="info-row">
                  <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                  <span>{selectedFacility.overall_rating} Stars</span>
                </div>
              )}

              {(selectedFacility.total_beds || selectedFacility.numberOfBeds) && (
                <div className="info-row">
                  <TrendingUp size={14} />
                  <span>{selectedFacility.total_beds || selectedFacility.numberOfBeds} Beds</span>
                </div>
              )}

              {(selectedFacility.total_deficiencies > 0 || selectedFacility.deficiency_count > 0) && (
                <div className="info-row warning">
                  <AlertCircle size={14} />
                  <span>{selectedFacility.total_deficiencies || selectedFacility.deficiency_count} Deficiencies</span>
                </div>
              )}

              <div className="facility-type">
                {selectedFacility.ownership_type || selectedFacility.ownershipType || 'Unknown Type'}
              </div>
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
