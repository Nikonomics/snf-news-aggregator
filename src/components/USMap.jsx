import React from 'react'
import './USMap.css'

// Simplified US map using a data-driven approach
// Each state has its position and size for a grid-like layout

function USMap({ onStateClick, onStateHover, selectedState }) {
  const statePositions = {
    // Row 1
    'WA': { row: 1, col: 2 }, 'MT': { row: 1, col: 5 }, 'ND': { row: 1, col: 7 }, 'MN': { row: 1, col: 9 }, 'WI': { row: 1, col: 11 }, 'MI': { row: 1, col: 13 }, 'VT': { row: 1, col: 17 }, 'NH': { row: 1, col: 18 }, 'ME': { row: 1, col: 19 },
    // Row 2
    'OR': { row: 2, col: 2 }, 'ID': { row: 2, col: 4 }, 'WY': { row: 2, col: 6 }, 'SD': { row: 2, col: 8 }, 'IA': { row: 2, col: 10 }, 'IL': { row: 2, col: 11 }, 'IN': { row: 2, col: 12 }, 'OH': { row: 2, col: 13 }, 'PA': { row: 2, col: 15 }, 'NY': { row: 2, col: 16 }, 'MA': { row: 2, col: 18 },
    // Row 3
    'CA': { row: 3, col: 1 }, 'NV': { row: 3, col: 3 }, 'UT': { row: 3, col: 5 }, 'CO': { row: 3, col: 7 }, 'NE': { row: 3, col: 9 }, 'MO': { row: 3, col: 11 }, 'KY': { row: 3, col: 12 }, 'WV': { row: 3, col: 14 }, 'VA': { row: 3, col: 15 }, 'MD': { row: 3, col: 16 }, 'NJ': { row: 3, col: 17 }, 'CT': { row: 3, col: 18 }, 'RI': { row: 3, col: 19 },
    // Row 4
    'AZ': { row: 4, col: 4 }, 'NM': { row: 4, col: 6 }, 'KS': { row: 4, col: 9 }, 'AR': { row: 4, col: 11 }, 'TN': { row: 4, col: 12 }, 'NC': { row: 4, col: 14 }, 'SC': { row: 4, col: 15 }, 'DC': { row: 4, col: 16 }, 'DE': { row: 4, col: 17 },
    // Row 5
    'OK': { row: 5, col: 8 }, 'LA': { row: 5, col: 10 }, 'MS': { row: 5, col: 11 }, 'AL': { row: 5, col: 12 }, 'GA': { row: 5, col: 13 },
    // Row 6
    'TX': { row: 6, col: 7, wide: true }, 'FL': { row: 6, col: 13, wide: true },
    // Insets
    'AK': { row: 7, col: 1 }, 'HI': { row: 7, col: 3 }
  }

  const stateNames = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  }

  return (
    <div className="us-map-grid">
      {Object.entries(statePositions).map(([code, pos]) => (
        <div
          key={code}
          className={`map-state ${pos.wide ? 'wide' : ''} ${selectedState === code ? 'selected' : ''}`}
          style={{
            gridRow: pos.row,
            gridColumn: pos.wide ? `${pos.col} / span 2` : pos.col
          }}
          onClick={() => onStateClick(code)}
          onMouseEnter={() => onStateHover(`${code} - ${stateNames[code]}`)}
          onMouseLeave={() => onStateHover(null)}
        >
          {code}
        </div>
      ))}
    </div>
  )
}

export default USMap
