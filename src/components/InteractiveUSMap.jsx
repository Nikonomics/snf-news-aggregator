import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './InteractiveUSMap.css'

const InteractiveUSMap = () => {
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

  // Simplified state paths - using basic rectangles positioned geographically with more spacing
  const states = [
    // West Coast
    { code: 'WA', x: 50, y: 30, w: 90, h: 55 },
    { code: 'OR', x: 50, y: 95, w: 90, h: 60 },
    { code: 'CA', x: 20, y: 165, w: 100, h: 180 }, // 20% longer

    // Mountain West
    { code: 'MT', x: 155, y: 30, w: 120, h: 55 },
    { code: 'ID', x: 155, y: 95, w: 70, h: 100 },
    { code: 'WY', x: 235, y: 95, w: 90, h: 65 },
    { code: 'NV', x: 135, y: 165, w: 85, h: 95 },
    { code: 'UT', x: 230, y: 170, w: 70, h: 80 },
    { code: 'CO', x: 310, y: 170, w: 90, h: 65 },
    { code: 'AZ', x: 165, y: 270, w: 85, h: 90 },
    { code: 'NM', x: 260, y: 245, w: 85, h: 110 },

    // Great Plains
    { code: 'ND', x: 340, y: 30, w: 105, h: 55 }, // Wider
    { code: 'SD', x: 340, y: 95, w: 105, h: 55 }, // Wider
    { code: 'NE', x: 360, y: 160, w: 75, h: 55 }, // Slimmer, moved left to not overlap CO
    { code: 'KS', x: 385, y: 225, w: 90, h: 55 },
    { code: 'OK', x: 390, y: 290, w: 105, h: 55 },
    { code: 'TX', x: 370, y: 370, w: 145, h: 140 }, // Moved down 15px

    // Midwest
    { code: 'MN', x: 445, y: 30, w: 90, h: 80 },
    { code: 'IA', x: 470, y: 120, w: 80, h: 55 },
    { code: 'MO', x: 490, y: 185, w: 85, h: 75 },
    { code: 'AR', x: 510, y: 270, w: 75, h: 65 },
    { code: 'LA', x: 510, y: 345, w: 90, h: 75 },
    { code: 'WI', x: 550, y: 40, w: 75, h: 80 },
    { code: 'IL', x: 565, y: 130, w: 60, h: 100 },
    { code: 'MS', x: 595, y: 295, w: 60, h: 90 },

    // Great Lakes
    { code: 'MI', x: 640, y: 50, w: 90, h: 100 },
    { code: 'IN', x: 635, y: 160, w: 60, h: 70 },
    { code: 'OH', x: 705, y: 140, w: 75, h: 80 },
    { code: 'KY', x: 670, y: 235, w: 100, h: 50 },
    { code: 'TN', x: 675, y: 295, w: 115, h: 50 },
    { code: 'AL', x: 670, y: 355, w: 65, h: 85 },
    { code: 'GA', x: 745, y: 335, w: 80, h: 95 },
    { code: 'FL', x: 795, y: 440, w: 50, h: 120 }, // Much narrower and taller, more FL-shaped
    { code: 'SC', x: 790, y: 310, w: 70, h: 55 },
    { code: 'NC', x: 780, y: 250, w: 110, h: 50 },

    // Northeast
    { code: 'WV', x: 785, y: 210, w: 60, h: 60 },
    { code: 'VA', x: 850, y: 225, w: 90, h: 55 },
    { code: 'MD', x: 915, y: 200, w: 40, h: 35 },
    { code: 'DE', x: 950, y: 195, w: 20, h: 35 },
    { code: 'PA', x: 850, y: 150, w: 100, h: 55 },
    { code: 'NJ', x: 950, y: 165, w: 30, h: 45 },
    { code: 'NY', x: 875, y: 85, w: 100, h: 75 },
    { code: 'CT', x: 975, y: 140, w: 35, h: 25 },
    { code: 'RI', x: 1005, y: 140, w: 20, h: 25 },
    { code: 'MA', x: 985, y: 105, w: 50, h: 35 },
    { code: 'VT', x: 970, y: 60, w: 35, h: 50 },
    { code: 'NH', x: 1000, y: 60, w: 35, h: 50 },
    { code: 'ME', x: 1030, y: 20, w: 60, h: 95 },

    // Alaska & Hawaii (insets)
    { code: 'AK', x: 30, y: 520, w: 110, h: 65 },
    { code: 'HI', x: 230, y: 545, w: 90, h: 45 }
  ]

  return (
    <div className="interactive-map-container">
      {hoveredState && (
        <div className="state-tooltip">
          {stateNames[hoveredState]}
        </div>
      )}

      <svg viewBox="0 0 1120 610" className="us-map-svg">
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
          </filter>
        </defs>

        {states.map(({ code, x, y, w, h }) => (
          <rect
            key={code}
            x={x}
            y={y}
            width={w}
            height={h}
            className={`map-state ${selectedState === code ? 'selected' : ''} ${hoveredState === code ? 'hovered' : ''}`}
            onClick={() => handleStateClick(code)}
            onMouseEnter={() => setHoveredState(code)}
            onMouseLeave={() => setHoveredState(null)}
            rx="4"
          />
        ))}

        {/* State labels */}
        {states.map(({ code, x, y, w, h }) => (
          <text
            key={`label-${code}`}
            x={x + w / 2}
            y={y + h / 2}
            className="state-label"
            pointerEvents="none"
          >
            {code}
          </text>
        ))}
      </svg>

      {selectedState && (
        <div className="selected-state-info">
          <strong>Selected:</strong> {stateNames[selectedState]}
        </div>
      )}
    </div>
  )
}

export default InteractiveUSMap
