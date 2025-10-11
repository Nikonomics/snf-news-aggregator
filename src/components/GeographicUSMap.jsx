import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './GeographicUSMap.css'
import { statePathsData } from './statePathsData'

const GeographicUSMap = () => {
  const navigate = useNavigate()
  const [hoveredState, setHoveredState] = useState(null)
  const [selectedState, setSelectedState] = useState(() => {
    return localStorage.getItem('myState') || null
  })

  const handleStateClick = (stateCode) => {
    localStorage.setItem('myState', stateCode)
    setSelectedState(stateCode)
    navigate(`/state/${stateCode}`)
  }

  const stateNames = {
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

  return (
    <div className="geographic-map-container">
      {hoveredState && (
        <div className="state-name-tooltip">
          {stateNames[hoveredState]}
        </div>
      )}

      <svg
        viewBox="0 0 960 600"
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

        {/* Main 48 states */}
        <g id="main-states">
          {Object.entries(statePathsData)
            .filter(([code]) => code !== 'AK' && code !== 'HI')
            .map(([code, pathData]) => (
              <g key={code}>
                <path
                  d={pathData.path}
                  className={`state-path ${selectedState === code ? 'selected' : ''} ${hoveredState === code ? 'hovered' : ''}`}
                  onClick={() => handleStateClick(code)}
                  onMouseEnter={() => setHoveredState(code)}
                  onMouseLeave={() => setHoveredState(null)}
                />
                <text
                  x={pathData.labelX}
                  y={pathData.labelY}
                  className="state-code-label"
                  pointerEvents="none"
                >
                  {code}
                </text>
              </g>
            ))}
        </g>

        {/* Alaska (scaled and repositioned) */}
        <g id="alaska" transform="translate(50, 420) scale(0.35)">
          <path
            d={statePathsData.AK.path}
            className={`state-path ${selectedState === 'AK' ? 'selected' : ''} ${hoveredState === 'AK' ? 'hovered' : ''}`}
            onClick={() => handleStateClick('AK')}
            onMouseEnter={() => setHoveredState('AK')}
            onMouseLeave={() => setHoveredState(null)}
          />
          <text x="200" y="100" className="state-code-label" pointerEvents="none">AK</text>
        </g>

        {/* Hawaii (scaled and repositioned) */}
        <g id="hawaii" transform="translate(300, 500) scale(1)">
          <path
            d={statePathsData.HI.path}
            className={`state-path ${selectedState === 'HI' ? 'selected' : ''} ${hoveredState === 'HI' ? 'hovered' : ''}`}
            onClick={() => handleStateClick('HI')}
            onMouseEnter={() => setHoveredState('HI')}
            onMouseLeave={() => setHoveredState(null)}
          />
          <text x="40" y="15" className="state-code-label" pointerEvents="none">HI</text>
        </g>
      </svg>

      {selectedState && (
        <div className="selected-state-banner">
          <strong>Selected State:</strong> {stateNames[selectedState]}
        </div>
      )}
    </div>
  )
}

export default GeographicUSMap
