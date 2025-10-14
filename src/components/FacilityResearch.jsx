import { useState, useEffect } from 'react'
import { Search, Loader, MapPin, Building2, Star, Users, TrendingUp, AlertCircle, Filter, X } from 'lucide-react'
import { geoPath, geoAlbersUsa } from 'd3-geo'
import { feature } from 'topojson-client'
import './FacilityResearch.css'

function FacilityResearch() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [topoStatesData, setTopoStatesData] = useState(null)
  const [selectedStates, setSelectedStates] = useState([])
  const [selectedChains, setSelectedChains] = useState([])
  const [showFilters, setShowFilters] = useState(true)
  const [availableChains, setAvailableChains] = useState([])
  const [hoveredState, setHoveredState] = useState(null)
  const [hoveredFacility, setHoveredFacility] = useState(null)
  const [selectedOwnership, setSelectedOwnership] = useState(null)

  const exampleQueries = [
    "Show me all skilled nursing facilities that are part of an ownership group of 10 or less in the Pacific Northwest",
    "Find high-rated facilities in California with more than 100 beds",
    "Independent non-profit facilities in the Midwest with 4+ star ratings",
    "Facilities in Texas that accept both Medicare and Medicaid with low deficiencies",
    "Large chain-owned facilities in Florida with high occupancy rates"
  ]

  const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
  ]

  const stateCodeToFips = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09',
    'DE': '10', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
    'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25',
    'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32',
    'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
    'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46', 'TN': '47',
    'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
  }

  const fipsToStateCode = Object.fromEntries(
    Object.entries(stateCodeToFips).map(([code, fips]) => [fips, code])
  )

  // Load TopoJSON data for map
  useEffect(() => {
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

  // Load available chains
  useEffect(() => {
    if (results && results.results) {
      const chains = [...new Set(
        results.results
          .map(f => f.ownership_chain)
          .filter(Boolean)
      )].sort()
      setAvailableChains(chains)
    }
  }, [results])

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/facilities/nl-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data)
    } catch (err) {
      console.error('Search error:', err)
      setError(err.message || 'Failed to search facilities')
    } finally {
      setLoading(false)
    }
  }

  const handleExampleClick = (exampleQuery) => {
    setQuery(exampleQuery)
    handleSearch(exampleQuery)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const toggleState = (stateCode) => {
    setSelectedStates(prev =>
      prev.includes(stateCode)
        ? prev.filter(s => s !== stateCode)
        : [...prev, stateCode]
    )
  }

  const toggleChain = (chain) => {
    setSelectedChains(prev =>
      prev.includes(chain)
        ? prev.filter(c => c !== chain)
        : [...prev, chain]
    )
  }

  const clearFilters = () => {
    setSelectedStates([])
    setSelectedChains([])
  }

  const applyFilters = () => {
    if (!results) return results

    let filtered = results.results

    // Filter by selected states
    if (selectedStates.length > 0) {
      filtered = filtered.filter(f => selectedStates.includes(f.state))
    }

    // Filter by selected chains
    if (selectedChains.length > 0) {
      filtered = filtered.filter(f => selectedChains.includes(f.ownership_chain))
    }

    return { ...results, results: filtered, total: filtered.length }
  }

  const filteredResults = applyFilters()

  // Group facilities by ownership chain
  const groupedFacilities = () => {
    if (!filteredResults || !filteredResults.results) return {}

    const groups = {}
    filteredResults.results.forEach(facility => {
      const chain = facility.ownership_chain || 'Independent / Other'
      if (!groups[chain]) {
        groups[chain] = []
      }
      groups[chain].push(facility)
    })

    // Sort chains by facility count (descending)
    return Object.fromEntries(
      Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
    )
  }

  const handleStateClick = (stateCode) => {
    toggleState(stateCode)
  }

  const getStateFillColor = (stateCode) => {
    if (selectedStates.includes(stateCode)) {
      return '#2563eb'
    }
    if (hoveredState === stateCode) {
      return '#60a5fa'
    }
    // Count facilities in this state
    if (results && results.results) {
      const count = results.results.filter(f => f.state === stateCode).length
      if (count > 0) {
        return '#dbeafe'
      }
    }
    return '#f3f4f6'
  }

  // Get facilities with valid coordinates for mapping
  const getFacilitiesForMap = () => {
    if (!filteredResults || !filteredResults.results) return []

    let facilities = filteredResults.results.filter(f =>
      f.latitude && f.longitude &&
      !isNaN(f.latitude) && !isNaN(f.longitude)
    )

    // If an ownership is selected, only show those facilities
    if (selectedOwnership) {
      facilities = facilities.filter(f => {
        const chain = f.ownership_chain || 'Independent / Other'
        return chain === selectedOwnership
      })
    }

    return facilities
  }

  const handleOwnershipClick = (chain) => {
    // Toggle selection - if already selected, deselect it
    setSelectedOwnership(selectedOwnership === chain ? null : chain)
  }

  // Get marker color based on facility rating
  const getMarkerColor = (facility) => {
    const rating = facility.overall_rating
    if (!rating) return '#9ca3af' // gray for no rating
    if (rating >= 4) return '#22c55e' // green for 4-5 stars
    if (rating >= 3) return '#fbbf24' // yellow for 3 stars
    return '#ef4444' // red for 1-2 stars
  }

  // Get marker size based on bed count
  const getMarkerSize = (facility) => {
    const beds = facility.total_beds || 0
    if (beds >= 200) return 8
    if (beds >= 100) return 6
    if (beds >= 50) return 4
    return 3
  }

  const renderFacilityCard = (facility) => {
    return (
      <div key={facility.id} className="facility-card">
        <div className="facility-header">
          <div className="facility-name-section">
            <h3>{facility.facility_name}</h3>
            {facility.ownership_chain && (
              <span className="chain-badge">
                <Building2 size={14} />
                {facility.ownership_chain}
                {facility.chain_facility_count && ` (${facility.chain_facility_count} facilities)`}
              </span>
            )}
          </div>
          {facility.overall_rating && (
            <div className="rating-badge">
              <Star size={16} fill="#fbbf24" stroke="#fbbf24" />
              <span>{facility.overall_rating}</span>
            </div>
          )}
        </div>

        <div className="facility-info">
          <div className="info-row">
            <MapPin size={16} />
            <span>{facility.city}, {facility.state} {facility.zip_code}</span>
          </div>

          {facility.county && (
            <div className="info-row">
              <span className="label">County:</span>
              <span>{facility.county}</span>
            </div>
          )}

          <div className="info-row">
            <span className="label">Ownership:</span>
            <span>{facility.ownership_type || 'Unknown'}</span>
          </div>

          {facility.total_beds && (
            <div className="info-row">
              <Users size={16} />
              <span>{facility.total_beds} beds</span>
              {facility.occupancy_rate && (
                <span className="occupancy">({facility.occupancy_rate}% occupied)</span>
              )}
            </div>
          )}

          <div className="ratings-grid">
            {facility.health_inspection_rating && (
              <div className="rating-item">
                <span className="rating-label">Health</span>
                <div className="rating-stars">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={i < facility.health_inspection_rating ? "#fbbf24" : "none"}
                      stroke={i < facility.health_inspection_rating ? "#fbbf24" : "#d1d5db"}
                    />
                  ))}
                </div>
              </div>
            )}
            {facility.staffing_rating && (
              <div className="rating-item">
                <span className="rating-label">Staffing</span>
                <div className="rating-stars">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={i < facility.staffing_rating ? "#fbbf24" : "none"}
                      stroke={i < facility.staffing_rating ? "#fbbf24" : "#d1d5db"}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {facility.health_deficiencies > 0 && (
            <div className="deficiencies-badge">
              <AlertCircle size={14} />
              {facility.health_deficiencies} deficiencies
            </div>
          )}

          <div className="participation-badges">
            {facility.accepts_medicare && <span className="badge">Medicare</span>}
            {facility.accepts_medicaid && <span className="badge">Medicaid</span>}
            {facility.special_focus_facility && (
              <span className="badge warning">Special Focus</span>
            )}
          </div>
        </div>

        {facility.phone && (
          <div className="facility-footer">
            <span className="phone">📞 {facility.phone}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="facility-research">
      <div className="research-header">
        <h1>Facility Research</h1>
        <p className="subtitle">Search skilled nursing facilities using natural language</p>
      </div>

      <div className="search-section">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="e.g., Show me all facilities in the Pacific Northwest with 4+ star ratings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button
            className="search-button"
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
          >
            {loading ? <Loader className="spinning" size={20} /> : 'Search'}
          </button>
        </div>

        {!results && !loading && (
          <div className="examples-section">
            <h3>Try these examples:</h3>
            <div className="example-queries">
              {exampleQueries.map((example, index) => (
                <button
                  key={index}
                  className="example-query"
                  onClick={() => handleExampleClick(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {results && (
        <div className="results-section">
          <div className="results-header">
            <div className="results-title-row">
              <h2>
                Found {filteredResults.total.toLocaleString()} facilities
                {results.hasMore && ' (showing first 1000)'}
              </h2>
              <button
                className="filter-toggle-btn"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={16} />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>

            {results.filters && Object.keys(results.filters).length > 0 && (
              <div className="applied-filters">
                <span className="filter-label">AI Search filters:</span>
                <div className="filter-tags">
                  {results.filters.states && results.filters.states.length > 0 && (
                    <span className="filter-tag">
                      States: {results.filters.states.join(', ')}
                    </span>
                  )}
                  {results.filters.chainSizeMax && (
                    <span className="filter-tag">
                      Chain size ≤ {results.filters.chainSizeMax}
                    </span>
                  )}
                  {results.filters.chainSizeMin && (
                    <span className="filter-tag">
                      Chain size ≥ {results.filters.chainSizeMin}
                    </span>
                  )}
                  {results.filters.minOverallRating && (
                    <span className="filter-tag">
                      Rating ≥ {results.filters.minOverallRating} stars
                    </span>
                  )}
                  {results.filters.minBeds && (
                    <span className="filter-tag">
                      Beds ≥ {results.filters.minBeds}
                    </span>
                  )}
                  {results.filters.maxBeds && (
                    <span className="filter-tag">
                      Beds ≤ {results.filters.maxBeds}
                    </span>
                  )}
                  {results.filters.multiFacilityChain === false && (
                    <span className="filter-tag">Independent</span>
                  )}
                  {results.filters.multiFacilityChain === true && (
                    <span className="filter-tag">Chain-owned</span>
                  )}
                  {results.filters.ownershipTypes && results.filters.ownershipTypes.length > 0 && (
                    <span className="filter-tag">
                      {results.filters.ownershipTypes.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {showFilters && (
            <div className="filters-panel">
              {/* Map */}
              <div className="filter-section map-section">
                <div className="map-header">
                  <div className="map-title-section">
                    <h3>Filter by State (click on map)</h3>
                    {selectedOwnership && (
                      <div className="map-filter-notice">
                        Showing: <strong>{selectedOwnership}</strong>
                        <button
                          className="clear-ownership-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOwnership(null)
                          }}
                          title="Show all facilities"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="map-legend">
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#22c55e' }}></div>
                      <span>4-5 stars</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#fbbf24' }}></div>
                      <span>3 stars</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
                      <span>1-2 stars</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#9ca3af' }}></div>
                      <span>No rating</span>
                    </div>
                  </div>
                </div>
                {topoStatesData && (
                  <div style={{ position: 'relative' }}>
                    <svg viewBox="0 0 960 600" className="us-map">
                      {/* States */}
                      <g>
                        {topoStatesData.map((state) => {
                          const projection = geoAlbersUsa()
                          const pathGenerator = geoPath().projection(projection)
                          const stateCode = fipsToStateCode[state.id]

                          return (
                            <path
                              key={state.id}
                              d={pathGenerator(state)}
                              fill={getStateFillColor(stateCode)}
                              stroke="#fff"
                              strokeWidth={1}
                              className="state-path"
                              onMouseEnter={() => setHoveredState(stateCode)}
                              onMouseLeave={() => setHoveredState(null)}
                              onClick={() => handleStateClick(stateCode)}
                              style={{ cursor: 'pointer' }}
                            />
                          )
                        })}
                      </g>

                      {/* Facility Markers */}
                      <g className="facility-markers">
                        {getFacilitiesForMap().map((facility) => {
                          const projection = geoAlbersUsa()
                          const coords = projection([
                            parseFloat(facility.longitude),
                            parseFloat(facility.latitude)
                          ])

                          if (!coords) return null // Skip if projection fails (e.g., Alaska, Hawaii)

                          const [x, y] = coords
                          const markerSize = getMarkerSize(facility)
                          const markerColor = getMarkerColor(facility)
                          const isHovered = hoveredFacility?.id === facility.id

                          return (
                            <g key={facility.id}>
                              <circle
                                cx={x}
                                cy={y}
                                r={isHovered ? markerSize * 1.5 : markerSize}
                                fill={markerColor}
                                stroke={isHovered ? '#1f2937' : '#fff'}
                                strokeWidth={isHovered ? 2 : 1}
                                opacity={0.8}
                                className="facility-marker"
                                onMouseEnter={() => setHoveredFacility(facility)}
                                onMouseLeave={() => setHoveredFacility(null)}
                                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                              />
                            </g>
                          )
                        })}
                      </g>
                    </svg>

                    {/* Tooltip for hovered facility */}
                    {hoveredFacility && (
                      <div className="map-tooltip">
                        <div className="tooltip-header">
                          <strong>{hoveredFacility.facility_name}</strong>
                          {hoveredFacility.overall_rating && (
                            <div className="tooltip-rating">
                              <Star size={12} fill="#fbbf24" stroke="#fbbf24" />
                              {hoveredFacility.overall_rating}
                            </div>
                          )}
                        </div>
                        <div className="tooltip-details">
                          <div>{hoveredFacility.city}, {hoveredFacility.state}</div>
                          {hoveredFacility.total_beds && (
                            <div>{hoveredFacility.total_beds} beds</div>
                          )}
                          {hoveredFacility.ownership_chain && (
                            <div className="tooltip-chain">{hoveredFacility.ownership_chain}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {selectedStates.length > 0 && (
                  <div className="selected-states">
                    <span className="filter-label">Selected states:</span>
                    {selectedStates.map(state => (
                      <span key={state} className="selected-tag">
                        {state}
                        <X
                          size={14}
                          onClick={() => toggleState(state)}
                          style={{ cursor: 'pointer' }}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Chain Filter */}
              {availableChains.length > 0 && (
                <div className="filter-section">
                  <h3>Filter by Chain/Owner</h3>
                  <div className="chain-filter-grid">
                    {availableChains.map(chain => {
                      const facilityCount = results.results.filter(
                        f => f.ownership_chain === chain
                      ).length
                      return (
                        <label key={chain} className="chain-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedChains.includes(chain)}
                            onChange={() => toggleChain(chain)}
                          />
                          <span className="chain-name">
                            {chain}
                            <span className="chain-count">({facilityCount})</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              {(selectedStates.length > 0 || selectedChains.length > 0) && (
                <button className="clear-filters-btn" onClick={clearFilters}>
                  <X size={16} />
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          <div className="facilities-by-ownership">
            {Object.entries(groupedFacilities()).map(([chain, facilities]) => (
              <div
                key={chain}
                className={`ownership-group ${selectedOwnership === chain ? 'selected' : ''}`}
              >
                <div
                  className="ownership-header"
                  onClick={() => handleOwnershipClick(chain)}
                  style={{ cursor: 'pointer' }}
                  title="Click to show/hide these facilities on map"
                >
                  <div className="ownership-info">
                    <Building2 size={20} />
                    <h3>{chain}</h3>
                    <span className="facility-count">{facilities.length} facilities</span>
                    {selectedOwnership === chain && (
                      <span className="map-indicator">
                        <MapPin size={14} />
                        On map
                      </span>
                    )}
                  </div>
                  {chain !== 'Independent / Other' && facilities[0]?.chain_facility_count && (
                    <span className="total-chain-size">
                      ({facilities[0].chain_facility_count} total in chain)
                    </span>
                  )}
                </div>
                <div className="facilities-scroll-container">
                  <div className="facilities-horizontal-grid">
                    {facilities.map(facility => renderFacilityCard(facility))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <Loader className="spinning" size={48} />
          <p>Searching facilities...</p>
        </div>
      )}
    </div>
  )
}

export default FacilityResearch
