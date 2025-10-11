import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { geoPath, geoAlbersUsa } from 'd3-geo'
import { feature } from 'topojson-client'
import './GeographicUSMap.css'

const RealGeographicUSMap = () => {
  const navigate = useNavigate()
  const [hoveredState, setHoveredState] = useState(null)
  const [selectedState, setSelectedState] = useState(() => {
    return localStorage.getItem('myState') || null
  })
  const [statesData, setStatesData] = useState(null)

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
        // Convert TopoJSON to GeoJSON
        const geojson = feature(topology, topology.objects.states)
        setStatesData(geojson.features)
      })
      .catch(error => {
        console.error('Error loading state data:', error)
      })
  }, [])

  const handleStateClick = (stateCode) => {
    localStorage.setItem('myState', stateCode)
    setSelectedState(stateCode)
    navigate(`/state/${stateCode}`)
  }

  // Create projection and path generator
  const projection = geoAlbersUsa()
    .scale(1300)
    .translate([487.5, 305])

  const pathGenerator = geoPath().projection(projection)

  if (!statesData) {
    return <div className="geographic-map-container">Loading map...</div>
  }

  return (
    <div className="geographic-map-container">
      {hoveredState && (
        <div className="state-name-tooltip">
          {stateFullNames[hoveredState]}
        </div>
      )}

      <svg
        viewBox="0 0 975 610"
        className="geographic-us-map"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g>
          {statesData.map((stateFeature) => {
            const fipsCode = stateFeature.id
            const stateCode = stateNames[fipsCode]

            if (!stateCode) return null

            const path = pathGenerator(stateFeature)
            const centroid = pathGenerator.centroid(stateFeature)

            return (
              <g key={stateCode}>
                <path
                  d={path}
                  className={`state-path ${selectedState === stateCode ? 'selected' : ''} ${hoveredState === stateCode ? 'hovered' : ''}`}
                  onClick={() => handleStateClick(stateCode)}
                  onMouseEnter={() => setHoveredState(stateCode)}
                  onMouseLeave={() => setHoveredState(null)}
                />
                <text
                  x={centroid[0]}
                  y={centroid[1]}
                  className="state-code-label"
                  pointerEvents="none"
                >
                  {stateCode}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {selectedState && (
        <div className="selected-state-banner">
          <strong>Selected State:</strong> {stateFullNames[selectedState]}
        </div>
      )}
    </div>
  )
}

export default RealGeographicUSMap
