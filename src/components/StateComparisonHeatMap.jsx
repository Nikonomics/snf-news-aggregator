import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { geoPath, geoAlbersUsa } from 'd3-geo'
import { feature } from 'topojson-client'
import { scaleLinear } from 'd3-scale'
import './StateComparisonHeatMap.css'

const StateComparisonHeatMap = ({ statesData, activeMetric }) => {
  const navigate = useNavigate()
  const [hoveredState, setHoveredState] = useState(null)
  const [topoStatesData, setTopoStatesData] = useState(null)

  const stateNames = {
    '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
    '08': 'CO', '09': 'CT', '10': 'DE', '12': 'FL', '13': 'GA',
    '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
    '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD',
    '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO',
    '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ',
    '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
    '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC',
    '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT',
    '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY'
  }

  const stateFullNames = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
    MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
    NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
    ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
    RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
    TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
    WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
  }

  useEffect(() => {
    // Load TopoJSON data
    fetch('/us-states-10m.json')
      .then(response => response.json())
      .then(topology => {
        const geojson = feature(topology, topology.objects.states)
        setTopoStatesData(geojson.features)
      })
      .catch(error => {
        console.error('Error loading state data:', error)
      })
  }, [])

  // Get score for a state based on active metric
  const getStateScore = (stateCode) => {
    const state = statesData.find(s => s.code === stateCode)
    if (!state) return null

    switch (activeMetric) {
      case 'overall':
        return state.scores.overallScore
      case 'profitability':
        return state.scores.components.profitabilityRatio
      case 'reimbursement':
        return state.scores.components.reimbursementIndex
      case 'labor':
        return state.scores.components.laborIndex
      case 'market':
        return state.scores.components.marketOpportunity
      case 'quality':
        return state.scores.components.qualityEnvironment
      default:
        return state.scores.overallScore
    }
  }

  // Get state data for tooltip
  const getStateData = (stateCode) => {
    return statesData.find(s => s.code === stateCode)
  }

  // Create color scale - smooth gradient from red to yellow to green
  const getColorForScore = (score) => {
    if (score === null || score === undefined) return '#e5e7eb'

    // Create a smooth gradient: red (0) -> orange (25) -> yellow (50) -> yellow-green (75) -> green (100)
    const colorScale = scaleLinear()
      .domain([0, 25, 50, 75, 100])
      .range(['#dc2626', '#f97316', '#fbbf24', '#a3e635', '#22c55e'])
      .clamp(true)

    return colorScale(score)
  }

  const handleStateClick = (stateCode) => {
    navigate(`/state/${stateCode}`)
  }

  // Create projection and path generator
  const projection = geoAlbersUsa()
    .scale(1300)
    .translate([487.5, 305])

  const pathGenerator = geoPath().projection(projection)

  if (!topoStatesData) {
    return (
      <div className="heat-map-container">
        <div className="heat-map-loading">Loading map...</div>
      </div>
    )
  }

  return (
    <div className="heat-map-container">
      <svg
        viewBox="0 0 975 610"
        className="heat-map-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2"/>
          </filter>
        </defs>

        <g>
          {topoStatesData.map((stateFeature) => {
            const fipsCode = stateFeature.id
            const stateCode = stateNames[fipsCode]

            if (!stateCode) return null

            const score = getStateScore(stateCode)
            const color = getColorForScore(score)
            const path = pathGenerator(stateFeature)
            const centroid = pathGenerator.centroid(stateFeature)
            const isHovered = hoveredState === stateCode

            return (
              <g key={stateCode}>
                <path
                  d={path}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? "2" : "1"}
                  className={`heat-map-state ${isHovered ? 'hovered' : ''}`}
                  onClick={() => handleStateClick(stateCode)}
                  onMouseEnter={() => setHoveredState(stateCode)}
                  onMouseLeave={() => setHoveredState(null)}
                  style={{
                    filter: isHovered ? 'url(#shadow) brightness(0.95)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                />
                <text
                  x={centroid[0]}
                  y={centroid[1]}
                  className="state-label"
                  pointerEvents="none"
                  style={{
                    fill: score > 50 ? '#ffffff' : '#1f2937',
                    fontSize: '11px',
                    fontWeight: '600',
                    textAnchor: 'middle',
                    dominantBaseline: 'middle',
                    textShadow: score > 50 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                  }}
                >
                  {stateCode}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Hover Tooltip */}
      {hoveredState && (
        <div className="heat-map-tooltip">
          {(() => {
            const data = getStateData(hoveredState)
            if (!data) return null

            const score = getStateScore(hoveredState)

            return (
              <>
                <div className="tooltip-header">
                  <strong>{stateFullNames[hoveredState]}</strong>
                  <span className="tooltip-score" style={{ color: getColorForScore(score) }}>
                    {score?.toFixed(1)}
                  </span>
                </div>
                <div className="tooltip-details">
                  <div className="tooltip-row">
                    <span>Medicaid Rate:</span>
                    <span>${data.medicaidRate}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Avg RN Wage:</span>
                    <span>${data.avgRNWage}/hr</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Star Rating:</span>
                    <span>{data.avgStarRating} ⭐</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Occupancy:</span>
                    <span>{data.occupancyRate}%</span>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default StateComparisonHeatMap
