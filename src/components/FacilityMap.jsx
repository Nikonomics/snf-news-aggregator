import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { geoPath, geoMercator } from 'd3-geo'
import { feature } from 'topojson-client'
import './FacilityMap.css'

function FacilityMap({ facilities, metrics }) {
  const [idahoGeoJSON, setIdahoGeoJSON] = useState(null)

  useEffect(() => {
    // Load Idaho state boundary from TopoJSON
    fetch('/us-states-10m.json')
      .then(response => response.json())
      .then(topology => {
        const states = feature(topology, topology.objects.states)
        // Idaho FIPS code is 16
        const idaho = states.features.find(d => d.id === '16')
        setIdahoGeoJSON(idaho)
      })
      .catch(err => console.error('Error loading Idaho map:', err))
  }, [])

  const getStarColor = (rating) => {
    if (rating >= 5) return '#10b981'
    if (rating >= 4) return '#22c55e'
    if (rating >= 3) return '#f59e0b'
    if (rating >= 2) return '#f97316'
    return '#ef4444'
  }

  // Real approximate coordinates for Idaho cities (longitude, latitude)
  const cityCoordinates = {
    'Boise': [-116.2023, 43.6150],
    'Meridian': [-116.3915, 43.6121],
    'Nampa': [-116.5638, 43.5407],
    'Idaho Falls': [-112.0339, 43.4916],
    'Pocatello': [-112.4455, 42.8713],
    'Coeur d\'Alene': [-116.7805, 47.6777],
    'Twin Falls': [-114.4608, 42.5630],
    'Lewiston': [-117.0177, 46.4165]
  }

  // Create projection for Idaho - show full state including panhandle
  const projection = geoMercator()
    .center([-114.7, 45.0])
    .scale(2600)
    .translate([200, 320])

  const pathGenerator = geoPath().projection(projection)

  // Map facilities to coordinates
  const facilitiesWithCoords = facilities.map(facility => {
    const coords = cityCoordinates[facility.city] || [-114.5, 44.5]
    const [x, y] = projection(coords)
    return { ...facility, x, y }
  })

  if (!idahoGeoJSON) {
    return (
      <div className="facility-map-container">
        <div className="map-placeholder">
          <p>Loading Idaho map...</p>
        </div>
      </div>
    )
  }

  const getTrendIcon = (trend) => {
    if (trend === 'up') return '▲'
    if (trend === 'down') return '▼'
    return '●'
  }

  const getTrendColor = (trend) => {
    if (trend === 'up') return '#10b981'
    if (trend === 'down') return '#ef4444'
    return '#6b7280'
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
              <div
                key={metric.id}
                className="metric-compact-card"
              >
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

        {/* Right Column - Map */}
        <div className="map-placeholder">
        <svg className="idaho-map-svg" viewBox="0 0 400 640" xmlns="http://www.w3.org/2000/svg">
          {/* Idaho state outline from real TopoJSON data */}
          <path
            d={pathGenerator(idahoGeoJSON)}
            className="state-outline"
          />

          {/* Facility markers */}
          {facilitiesWithCoords.map((facility) => (
            <g key={facility.providerId}>
              <circle
                cx={facility.x}
                cy={facility.y}
                r="8"
                fill={getStarColor(facility.overallRating)}
                stroke="white"
                strokeWidth="2"
                className="facility-marker-dot"
                style={{ cursor: 'pointer' }}
              />
              <title>
                {facility.facility_name || facility.name} - {facility.city}
                {'\n'}{facility.overall_rating || facility.overallRating || 'N/A'} stars
                {'\n'}{facility.certified_beds || facility.certifiedBeds || 0} beds
                {'\n'}{parseFloat(facility.occupancy_rate || facility.occupancyRate || 0).toFixed(1)}% occupancy
              </title>
            </g>
          ))}
        </svg>

          <div className="map-note">
            📍 <strong>Prototype View:</strong> In production, this will be an interactive Mapbox map with real geographic coordinates,
            zoom controls, and facility clustering.
          </div>
        </div>
      </div>
    </div>
  )
}

export default FacilityMap
