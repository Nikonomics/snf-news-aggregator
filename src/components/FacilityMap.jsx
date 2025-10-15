import { useState } from 'react'
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api'
import { MapPin, Bed, Star, Building2, Users, TrendingUp, TrendingDown } from 'lucide-react'
import './FacilityMap.css'

// Minimal Google Maps styling
const mapStyles = [
  {
    featureType: 'all',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }, { saturation: -100 }, { lightness: 40 }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ lightness: 100 }, { visibility: 'simplified' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#d4e9f7' }]
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }]
  },
  {
    featureType: 'poi',
    elementType: 'all',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    elementType: 'all',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c9c9c9' }, { weight: 1 }]
  }
]

const getStarColor = (rating) => {
  if (rating >= 5) return '#10b981'
  if (rating >= 4) return '#22c55e'
  if (rating >= 3) return '#f59e0b'
  if (rating >= 2) return '#f97316'
  return '#ef4444'
}

const getTrendIcon = (trend) => {
  if (trend === 'up') return <TrendingUp size={14} />
  if (trend === 'down') return <TrendingDown size={14} />
  return <span>●</span>
}

const getTrendColor = (trend) => {
  if (trend === 'up') return '#10b981'
  if (trend === 'down') return '#ef4444'
  return '#6b7280'
}

function FacilityMap({ facilities, metrics }) {
  const [selectedFacility, setSelectedFacility] = useState(null)

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  })

  // Filter facilities with valid coordinates
  const validFacilities = facilities.filter(f =>
    f.latitude && f.longitude &&
    !isNaN(f.latitude) && !isNaN(f.longitude)
  )

  // Calculate center based on facilities
  const center = validFacilities.length > 0
    ? {
        lat: validFacilities.reduce((sum, f) => sum + f.latitude, 0) / validFacilities.length,
        lng: validFacilities.reduce((sum, f) => sum + f.longitude, 0) / validFacilities.length
      }
    : { lat: 44.0, lng: -114.5 } // Idaho center as fallback

  if (loadError) {
    return (
      <div className="facility-map-container">
        <div className="map-placeholder">
          <p style={{ color: '#ef4444' }}>Error loading map</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="facility-map-container">
        <div className="map-placeholder">
          <p>Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="facility-map-container">
      <div className="map-header">
        <h3>
          <MapPin size={20} />
          Facility Locations & Key Metrics
        </h3>
        <div className="map-legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: '#10b981' }}></div>
            <span>5 Star</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: '#22c55e' }}></div>
            <span>4 Star</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: '#f59e0b' }}></div>
            <span>3 Star</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: '#f97316' }}></div>
            <span>2 Star</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: '#ef4444' }}></div>
            <span>1 Star</span>
          </div>
        </div>
      </div>

      <div className="map-content-grid">
        {/* Left Column - Key Metrics */}
        {metrics && metrics.length > 0 && (
          <div className="metrics-sidebar">
            {metrics.map((metric) => (
              <div key={metric.id} className="metric-compact-card">
                <div className="metric-label-small">{metric.label}</div>
                <div className="metric-value-section">
                  <div className="metric-value-small">{metric.value}</div>
                  <div className="metric-comparison-small">
                    <span className="trend-indicator" style={{ color: getTrendColor(metric.trend) }}>
                      {getTrendIcon(metric.trend)}
                    </span>
                    <span>{metric.comparison}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Right Column - Google Map */}
        <div className="map-placeholder" style={{ position: 'relative', height: '640px' }}>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '8px' }}
            center={center}
            zoom={7}
            options={{
              styles: mapStyles,
              disableDefaultUI: false,
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            }}
          >
            {/* Facility Markers */}
            {validFacilities.map((facility) => (
              <Marker
                key={facility.providerId || facility.federal_provider_number}
                position={{ lat: facility.latitude, lng: facility.longitude }}
                onClick={() => setSelectedFacility(facility)}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: getStarColor(facility.overallRating || facility.overall_rating),
                  fillOpacity: 0.85,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                  scale: 8
                }}
              />
            ))}

            {/* Info Window */}
            {selectedFacility && (
              <InfoWindow
                position={{
                  lat: selectedFacility.latitude,
                  lng: selectedFacility.longitude
                }}
                onCloseClick={() => setSelectedFacility(null)}
              >
                <div style={{ padding: '0.5rem', maxWidth: '300px' }}>
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>
                    {selectedFacility.facility_name || selectedFacility.name}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                    <Star size={16} />
                    <span>{selectedFacility.overall_rating || selectedFacility.overallRating || 'N/A'} Stars</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                    <Bed size={16} />
                    <span>{selectedFacility.certified_beds || selectedFacility.certifiedBeds || selectedFacility.total_beds || 'N/A'} Beds</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                    <Building2 size={16} />
                    <span>{selectedFacility.ownership_type || selectedFacility.ownershipType || 'N/A'}</span>
                  </div>

                  {(selectedFacility.occupancy_rate || selectedFacility.occupancyRate) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: (selectedFacility.occupancy_rate || selectedFacility.occupancyRate) < 80 ? '#f97316' : '#64748b' }}>
                      <Users size={16} />
                      <span>{parseFloat(selectedFacility.occupancy_rate || selectedFacility.occupancyRate).toFixed(1)}% Occupancy</span>
                    </div>
                  )}

                  {selectedFacility.city && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                      {selectedFacility.city}
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>
      </div>
    </div>
  )
}

export default FacilityMap
