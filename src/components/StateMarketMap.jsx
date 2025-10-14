import { useState, useEffect, useMemo } from 'react'
import { geoPath, geoMercator } from 'd3-geo'
import { feature } from 'topojson-client'
import { scaleLinear, scaleQuantize } from 'd3-scale'
import './StateMarketMap.css'

const API_BASE_URL = 'http://localhost:3001'

// State bounding boxes for proper centering and zoom
const STATE_BOUNDS = {
  AL: { scale: 6000, center: [-86.8, 32.8] },
  AK: { scale: 1200, center: [-152, 64] },
  AZ: { scale: 4500, center: [-111.5, 34.3] },
  AR: { scale: 6000, center: [-92.4, 34.9] },
  CA: { scale: 2800, center: [-119.5, 37.2] },
  CO: { scale: 4800, center: [-105.5, 39] },
  CT: { scale: 15000, center: [-72.7, 41.6] },
  DE: { scale: 20000, center: [-75.5, 39] },
  FL: { scale: 3800, center: [-81.5, 28] },
  GA: { scale: 5500, center: [-83.5, 32.7] },
  HI: { scale: 10000, center: [-157, 20.5] },
  ID: { scale: 3600, center: [-114.5, 45.3] },
  IL: { scale: 5000, center: [-89.2, 40] },
  IN: { scale: 7000, center: [-86.3, 40] },
  IA: { scale: 5800, center: [-93.5, 42] },
  KS: { scale: 5000, center: [-98.5, 38.5] },
  KY: { scale: 6500, center: [-85.3, 37.8] },
  LA: { scale: 6000, center: [-91.8, 31] },
  ME: { scale: 6000, center: [-69, 45.5] },
  MD: { scale: 10000, center: [-76.6, 39] },
  MA: { scale: 12000, center: [-71.8, 42.3] },
  MI: { scale: 4500, center: [-85, 44.5] },
  MN: { scale: 4500, center: [-94.3, 46.3] },
  MS: { scale: 6500, center: [-89.7, 32.7] },
  MO: { scale: 5500, center: [-92.5, 38.5] },
  MT: { scale: 3500, center: [-109.5, 47] },
  NE: { scale: 5000, center: [-99.8, 41.5] },
  NV: { scale: 3500, center: [-116.8, 39] },
  NH: { scale: 11000, center: [-71.6, 43.7] },
  NJ: { scale: 13000, center: [-74.6, 40.2] },
  NM: { scale: 4200, center: [-106, 34.4] },
  NY: { scale: 5000, center: [-75.5, 43] },
  NC: { scale: 5500, center: [-79.5, 35.5] },
  ND: { scale: 5000, center: [-100.5, 47.5] },
  OH: { scale: 7000, center: [-82.7, 40.4] },
  OK: { scale: 5000, center: [-97.5, 35.5] },
  OR: { scale: 4500, center: [-120.5, 44] },
  PA: { scale: 6500, center: [-77.8, 41] },
  RI: { scale: 25000, center: [-71.5, 41.7] },
  SC: { scale: 7500, center: [-81, 33.8] },
  SD: { scale: 5000, center: [-100.3, 44.4] },
  TN: { scale: 6000, center: [-86.3, 35.8] },
  TX: { scale: 2900, center: [-99.5, 31.5] },
  UT: { scale: 4500, center: [-111.5, 39.3] },
  VT: { scale: 12000, center: [-72.7, 44] },
  VA: { scale: 6000, center: [-78.8, 37.5] },
  WA: { scale: 5000, center: [-120.5, 47.5] },
  WV: { scale: 8000, center: [-80.5, 38.6] },
  WI: { scale: 5500, center: [-89.7, 44.5] },
  WY: { scale: 4500, center: [-107.5, 43] }
}

// Helper to get 2-digit FIPS code from state abbreviation
const getStateFipsCode = (stateAbbr) => {
  const fipsMap = {
    AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10',
    FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20',
    KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28',
    MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36',
    NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45',
    SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
    WI: '55', WY: '56'
  }
  return fipsMap[stateAbbr.toUpperCase()] || '01'
}

const StateMarketMap = ({ stateCode }) => {
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('facilities') // 'facilities' or 'counties'
  const [hoveredItem, setHoveredItem] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [countyGeoData, setCountyGeoData] = useState(null)

  useEffect(() => {
    fetchMapData()
    fetchCountyGeoData()
  }, [stateCode])


  const fetchMapData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/state/${stateCode}/map-data`)
      const data = await response.json()

      if (data.success) {
        setMapData(data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCountyGeoData = async () => {
    try {
      const response = await fetch('/us-counties-10m.json')
      const topology = await response.json()
      const geojson = feature(topology, topology.objects.counties)

      // Filter to only counties in this state (using FIPS state code)
      const stateFips = getStateFipsCode(stateCode)
      const stateCounties = geojson.features.filter(f =>
        f.id.toString().startsWith(stateFips)
      )

      setCountyGeoData(stateCounties)
    } catch (err) {
      console.error('Error loading county geodata:', err)
    }
  }

  // Create projection for this specific state
  const projection = useMemo(() => {
    const bounds = STATE_BOUNDS[stateCode.toUpperCase()] || { scale: 5000, center: [-98, 38] }
    return geoMercator()
      .scale(bounds.scale)
      .center(bounds.center)
      .translate([400, 300])
  }, [stateCode])

  const pathGenerator = geoPath().projection(projection)

  // Color scale for facilities based on star rating
  const facilityColorScale = useMemo(() => {
    return scaleLinear()
      .domain([1, 3, 5])
      .range(['#ef4444', '#fbbf24', '#22c55e'])
      .clamp(true)
  }, [])

  // Color scale for counties based on beds per 1000 seniors
  const countyColorScale = useMemo(() => {
    if (!mapData?.counties) return null

    const values = mapData.counties
      .map(c => c.beds_per_1000_seniors)
      .filter(v => v != null && v > 0)

    if (values.length === 0) return null

    const min = Math.min(...values)
    const max = Math.max(...values)

    return scaleQuantize()
      .domain([min, max])
      .range(['#22c55e', '#84cc16', '#fbbf24', '#fb923c', '#ef4444'])
  }, [mapData])

  const handleMouseMove = (item, event, type) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHoveredItem({ ...item, type })
    setTooltipPos({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    })
  }

  const handleMouseLeave = () => {
    setHoveredItem(null)
  }

  if (loading) {
    return (
      <div className="state-market-map loading">
        <div className="loading-spinner">Loading map data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="state-market-map error">
        <div className="error-message">Error loading map: {error}</div>
      </div>
    )
  }

  if (!mapData) {
    return null
  }

  return (
    <div className="state-market-map">
      <div className="map-controls">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'facilities' ? 'active' : ''}`}
            onClick={() => setViewMode('facilities')}
          >
            Facilities ({mapData.facilityCount})
          </button>
          <button
            className={`toggle-btn ${viewMode === 'counties' ? 'active' : ''}`}
            onClick={() => setViewMode('counties')}
          >
            Counties ({mapData.countyCount})
          </button>
        </div>

        {viewMode === 'facilities' && (
          <div className="legend">
            <div className="legend-title">Star Rating</div>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
                <span>1-2 ⭐</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#fbbf24' }}></div>
                <span>3 ⭐</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#22c55e' }}></div>
                <span>4-5 ⭐</span>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'counties' && countyColorScale && (
          <div className="legend">
            <div className="legend-title">Beds per 1,000 Seniors</div>
            <div className="legend-gradient">
              <div className="gradient-bar" style={{
                background: 'linear-gradient(to right, #22c55e, #84cc16, #fbbf24, #fb923c, #ef4444)'
              }}></div>
              <div className="gradient-labels">
                <span>Low (Better Opportunity)</span>
                <span>High (More Saturated)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="map-and-stats-container" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', width: '100%' }}>
        <div className="map-container" style={{ flex: '1', minWidth: '0' }}>
          <svg
            viewBox="0 0 800 600"
            className="state-map-svg"
            preserveAspectRatio="xMidYMid meet"
          >
          <defs>
            <filter id="map-shadow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3"/>
            </filter>
          </defs>

          {viewMode === 'facilities' && (
            <>
              {/* County boundaries as background */}
              {countyGeoData && (
                <g className="counties-background">
                  {countyGeoData.map((county) => (
                    <path
                      key={county.id}
                      d={pathGenerator(county)}
                      fill="#f9fafb"
                      stroke="#d1d5db"
                      strokeWidth="0.5"
                      opacity="1"
                    />
                  ))}
                </g>
              )}

              {/* Facility markers on top */}
              <g className="facilities-layer">
                {mapData.facilities.map((facility) => {
                  if (!facility.latitude || !facility.longitude) return null

                  const coords = projection([facility.longitude, facility.latitude])
                  if (!coords || coords[0] < 0 || coords[0] > 800 || coords[1] < 0 || coords[1] > 600) {
                    return null
                  }

                  const color = facilityColorScale(facility.overall_rating || 3)
                  const radius = 4

                  return (
                    <circle
                      key={facility.federal_provider_number}
                      cx={coords[0]}
                      cy={coords[1]}
                      r={radius}
                      fill={color}
                      stroke="#fff"
                      strokeWidth="1"
                      opacity="0.8"
                      className="facility-marker"
                      onMouseMove={(e) => handleMouseMove(facility, e, 'facility')}
                      onMouseLeave={handleMouseLeave}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    />
                  )
                })}
              </g>
            </>
          )}

          {viewMode === 'counties' && countyGeoData && (
            <g className="counties-layer">
              {countyGeoData.map((county, idx) => {
                const countyFips = county.id
                const fipsString = countyFips.toString().padStart(5, '0')
                const countyData = mapData.counties.find(c => {
                  // Try multiple matching strategies
                  return c.county_fips === fipsString ||
                         c.county_fips === countyFips.toString() ||
                         parseInt(c.county_fips) === countyFips
                })


                const color = countyData && countyColorScale
                  ? countyColorScale(countyData.beds_per_1000_seniors || 0)
                  : '#e5e7eb'

                const path = pathGenerator(county)

                return (
                  <path
                    key={countyFips}
                    d={path}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="county-path"
                    onMouseMove={(e) => countyData && handleMouseMove(countyData, e, 'county')}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      cursor: countyData ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      opacity: countyData ? 0.8 : 0.3
                    }}
                  />
                )
              })}
            </g>
          )}
          </svg>

          {/* Tooltip */}
          {hoveredItem && (
            <div
              className="map-tooltip"
              style={{
                left: tooltipPos.x + 10,
                top: tooltipPos.y + 10,
                position: 'absolute',
                pointerEvents: 'none'
              }}
            >
            {hoveredItem.type === 'facility' && (
              <>
                <div className="tooltip-header">
                  <strong>{hoveredItem.facility_name}</strong>
                </div>
                <div className="tooltip-details">
                  <div className="tooltip-row">
                    <span>Rating:</span>
                    <span>{hoveredItem.overall_rating || 'N/A'} ⭐</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Beds:</span>
                    <span>{hoveredItem.total_beds || 'N/A'}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Occupancy:</span>
                    <span>{hoveredItem.occupancy_rate ? `${hoveredItem.occupancy_rate}%` : 'N/A'}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Ownership:</span>
                    <span>{hoveredItem.ownership_type || 'N/A'}</span>
                  </div>
                  {hoveredItem.county && (
                    <div className="tooltip-row">
                      <span>County:</span>
                      <span>{hoveredItem.county}</span>
                    </div>
                  )}
                </div>
              </>
            )}
            {hoveredItem.type === 'county' && (
              <>
                <div className="tooltip-header">
                  <strong>{hoveredItem.county_name} County</strong>
                </div>
                <div className="tooltip-details">
                  <div className="tooltip-row">
                    <span>Population 65+:</span>
                    <span>{hoveredItem.population_65_plus?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Facilities:</span>
                    <span>{parseInt(hoveredItem.facility_count) || 0}</span>
                  </div>
                  {parseInt(hoveredItem.facility_count) > 0 ? (
                    <>
                      <div className="tooltip-row">
                        <span>Total Beds:</span>
                        <span>{hoveredItem.total_beds?.toLocaleString() || 0}</span>
                      </div>
                      <div className="tooltip-row">
                        <span>Beds per 1K:</span>
                        <span>{hoveredItem.beds_per_1000_seniors ? parseFloat(hoveredItem.beds_per_1000_seniors).toFixed(1) : 'N/A'}</span>
                      </div>
                      <div className="tooltip-row">
                        <span>Avg Rating:</span>
                        <span>{hoveredItem.avg_facility_rating ? `${parseFloat(hoveredItem.avg_facility_rating).toFixed(1)} ⭐` : 'N/A'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="tooltip-row" style={{ fontStyle: 'italic', color: '#64748b' }}>
                      <span>No facilities in county</span>
                    </div>
                  )}
                </div>
              </>
            )}
            </div>
          )}
        </div>

        <div className="map-stats" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '220px', flexShrink: '0' }}>
        {viewMode === 'facilities' && (
          <>
            <div className="stat-card">
              <div className="stat-label">Total Facilities</div>
              <div className="stat-value">{mapData.facilityCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Star Rating</div>
              <div className="stat-value">
                {(mapData.facilities.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / mapData.facilities.filter(f => f.overall_rating).length || 0).toFixed(1)} ⭐
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Beds</div>
              <div className="stat-value">
                {mapData.facilities.reduce((sum, f) => sum + (f.total_beds || 0), 0).toLocaleString()}
              </div>
            </div>
          </>
        )}
        {viewMode === 'counties' && (
          <>
            <div className="stat-card">
              <div className="stat-label">Counties</div>
              <div className="stat-value">{mapData.countyCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Beds per 1K</div>
              <div className="stat-value">
                {(mapData.counties.reduce((sum, c) => sum + (parseFloat(c.beds_per_1000_seniors) || 0), 0) / mapData.counties.filter(c => c.beds_per_1000_seniors).length || 0).toFixed(1)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Pop 65+</div>
              <div className="stat-value">
                {mapData.counties.reduce((sum, c) => sum + (parseInt(c.population_65_plus) || 0), 0).toLocaleString()}
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}

export default StateMarketMap
