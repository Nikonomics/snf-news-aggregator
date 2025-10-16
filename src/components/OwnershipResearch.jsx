import { useState, useEffect } from 'react'
import { Search, Building2, MapPin, TrendingUp, Users, Star, Bed, DollarSign, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import './OwnershipResearch.css'

function OwnershipResearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ownershipData, setOwnershipData] = useState([])
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [filters, setFilters] = useState({
    ownershipType: 'all',
    minFacilities: '',
    minBeds: '',
    state: 'all',
    sortBy: 'facilities' // facilities, beds, rating, name
  })
  const [topChains, setTopChains] = useState([])
  const [stats, setStats] = useState(null)

  // Load top chains on mount
  useEffect(() => {
    loadTopChains()
    loadOwnershipStats()
  }, [])

  const loadTopChains = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ownership/top-chains?limit=20')
      const data = await response.json()
      setTopChains(data)
    } catch (error) {
      console.error('Error loading top chains:', error)
    }
  }

  const loadOwnershipStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ownership/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error loading ownership stats:', error)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        ...filters
      })
      const response = await fetch(`http://localhost:3001/api/ownership/search?${params}`)
      const data = await response.json()
      setOwnershipData(data)
    } catch (error) {
      console.error('Error searching ownership:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadOwnerDetails = async (ownerName) => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:3001/api/ownership/${encodeURIComponent(ownerName)}/details`)
      const data = await response.json()
      setSelectedOwner(data)
    } catch (error) {
      console.error('Error loading owner details:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOwnershipTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'for profit': return '#f59e0b'
      case 'non-profit': return '#10b981'
      case 'government': return '#3b82f6'
      default: return '#6b7280'
    }
  }

  return (
    <div className="ownership-research">
      {/* Header */}
      <div className="ownership-header">
        <div className="ownership-header-content">
          <div className="ownership-title-section">
            <Building2 size={32} />
            <div>
              <h1>Ownership Research</h1>
              <p>Comprehensive database of SNF owners and operators nationwide</p>
            </div>
          </div>

        </div>
      </div>


      <div className="ownership-main">
        {/* Filters Sidebar */}
        <aside className="ownership-sidebar">
          {/* Search Bar */}
          <div className="search-section">
            <h3>Search</h3>
            <form onSubmit={handleSearch} className="ownership-search-form">
              <div className="ownership-search-bar">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Search by chain name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>
          </div>

          <div className="filter-section">
            <h3>Filters</h3>

            <div className="filter-group">
              <label>Ownership Type</label>
              <select
                value={filters.ownershipType}
                onChange={(e) => setFilters({ ...filters, ownershipType: e.target.value })}
              >
                <option value="all">All Types</option>
                <option value="For profit">For Profit</option>
                <option value="Non-profit">Non-Profit</option>
                <option value="Government">Government</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Minimum Facilities</label>
              <input
                type="number"
                placeholder="e.g., 5"
                value={filters.minFacilities}
                onChange={(e) => setFilters({ ...filters, minFacilities: e.target.value })}
              />
            </div>

            <div className="filter-group">
              <label>Minimum Total Beds</label>
              <input
                type="number"
                placeholder="e.g., 100"
                value={filters.minBeds}
                onChange={(e) => setFilters({ ...filters, minBeds: e.target.value })}
              />
            </div>

            <div className="filter-group">
              <label>Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              >
                <option value="facilities">Most Facilities</option>
                <option value="beds">Most Beds</option>
                <option value="rating">Highest Rating</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>

            <button
              className="filter-reset-btn"
              onClick={() => setFilters({
                ownershipType: 'all',
                minFacilities: '',
                minBeds: '',
                state: 'all',
                sortBy: 'facilities'
              })}
            >
              Reset Filters
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="ownership-content">
          {/* Top Chains List */}
          {!searchTerm && topChains.length > 0 && (
            <div className="top-chains-section">
              <h2>Top 20 SNF Chains Nationwide</h2>
              <div className="chains-list">
                {topChains.map((chain, index) => (
                  <div
                    key={index}
                    className="chain-card"
                    onClick={() => {
                      setSearchTerm(chain.ownership_chain)
                      loadOwnerDetails(chain.ownership_chain)
                    }}
                  >
                    <div className="chain-rank">#{chain.ranking || index + 1}</div>
                    <div className="chain-info">
                      <div className="chain-name">{chain.ownership_chain}</div>
                      <div className="chain-stats">
                        <span className="chain-stat">
                          <Building2 size={14} />
                          {chain.facility_count} facilities
                        </span>
                        <span className="chain-stat">
                          <Bed size={14} />
                          {chain.total_beds?.toLocaleString()} beds
                        </span>
                        <span className="chain-stat">
                          <MapPin size={14} />
                          {chain.state_count} states
                        </span>
                        {chain.avg_rating && (
                          <span className="chain-stat">
                            <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                            {parseFloat(chain.avg_rating).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={20} className="chain-arrow" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchTerm && ownershipData.length > 0 && (
            <div className="search-results">
              <h2>Search Results for "{searchTerm}"</h2>
              <div className="results-list">
                {ownershipData.map((owner, index) => (
                  <div
                    key={index}
                    className="owner-card"
                    onClick={() => loadOwnerDetails(owner.ownership_chain)}
                  >
                    <div className="owner-header">
                      <div className="owner-title-row">
                        <h3>{owner.ownership_chain}</h3>
                        {owner.ranking && (
                          <span className="owner-ranking">#{owner.ranking}</span>
                        )}
                      </div>
                      <span
                        className="ownership-type-badge"
                        style={{ backgroundColor: getOwnershipTypeColor(owner.ownership_type) }}
                      >
                        {owner.ownership_type}
                      </span>
                    </div>
                    <div className="owner-stats">
                      <div className="owner-stat">
                        <Building2 size={16} />
                        <span>{owner.facility_count} Facilities</span>
                      </div>
                      <div className="owner-stat">
                        <Bed size={16} />
                        <span>{owner.total_beds?.toLocaleString()} Beds</span>
                      </div>
                      <div className="owner-stat">
                        <MapPin size={16} />
                        <span>{owner.state_count} States</span>
                      </div>
                      {owner.avg_rating && (
                        <div className="owner-stat">
                          <Star size={16} />
                          <span>{parseFloat(owner.avg_rating || 0).toFixed(1)} Avg Rating</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Owner Details */}
          {selectedOwner && (
            <div className="owner-details-modal">
              <div className="owner-details-content">
                <div className="owner-details-header">
                  <div>
                    <h2>{selectedOwner.chainName}</h2>
                    <span
                      className="ownership-type-badge large"
                      style={{ backgroundColor: getOwnershipTypeColor(selectedOwner.ownershipType) }}
                    >
                      {selectedOwner.ownershipType}
                    </span>
                  </div>
                  <button
                    className="close-details-btn"
                    onClick={() => setSelectedOwner(null)}
                  >
                    ×
                  </button>
                </div>

                <div className="owner-details-grid">
                  <div className="detail-card">
                    <Building2 size={20} />
                    <div>
                      <div className="detail-label">Total Facilities</div>
                      <div className="detail-value">{selectedOwner.facilityCount}</div>
                    </div>
                  </div>
                  <div className="detail-card">
                    <Bed size={20} />
                    <div>
                      <div className="detail-label">Total Beds</div>
                      <div className="detail-value">{selectedOwner.totalBeds?.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="detail-card">
                    <MapPin size={20} />
                    <div>
                      <div className="detail-label">States Present</div>
                      <div className="detail-value">{selectedOwner.stateCount}</div>
                    </div>
                  </div>
                  <div className="detail-card">
                    <Star size={20} />
                    <div>
                      <div className="detail-label">Avg Rating</div>
                      <div className="detail-value">{parseFloat(selectedOwner.avgRating || 0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="detail-card">
                    <TrendingUp size={20} />
                    <div>
                      <div className="detail-label">Avg Occupancy</div>
                      <div className="detail-value">{parseFloat(selectedOwner.avgOccupancy || 0).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="detail-card">
                    <AlertTriangle size={20} />
                    <div>
                      <div className="detail-label">Avg Deficiencies</div>
                      <div className="detail-value">{parseFloat(selectedOwner.avgDeficiencies || 0).toFixed(1)}</div>
                    </div>
                  </div>
                </div>

                {/* State Breakdown */}
                {selectedOwner.stateBreakdown && (
                  <div className="state-breakdown-section">
                    <h3>State Breakdown</h3>
                    <div className="state-breakdown-list">
                      {selectedOwner.stateBreakdown.map((state, index) => (
                        <div key={index} className="state-breakdown-item">
                          <div className="state-name">{state.state}</div>
                          <div className="state-metrics">
                            <span>{state.facilityCount} facilities</span>
                            <span>{state.totalBeds} beds</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Facilities List */}
                {selectedOwner.facilities && (
                  <div className="facilities-list-section">
                    <h3>Facilities ({selectedOwner.facilities.length})</h3>
                    <div className="facilities-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Facility Name</th>
                            <th>Location</th>
                            <th>Beds</th>
                            <th>Rating</th>
                            <th>Occupancy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOwner.facilities.slice(0, 20).map((facility, index) => (
                            <tr key={index}>
                              <td className="facility-name">{facility.facility_name}</td>
                              <td>{facility.city}, {facility.state}</td>
                              <td>{facility.total_beds}</td>
                              <td>
                                <span className="rating-badge">
                                  <Star size={12} fill="#fbbf24" stroke="#fbbf24" />
                                  {facility.overall_rating || 'N/A'}
                                </span>
                              </td>
                              <td>{parseFloat(facility.occupancy_rate || 0).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {selectedOwner.facilities.length > 20 && (
                        <div className="table-footer">
                          Showing 20 of {selectedOwner.facilities.length} facilities
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {searchTerm && ownershipData.length === 0 && !loading && (
            <div className="empty-state">
              <Search size={48} />
              <h3>No results found</h3>
              <p>Try adjusting your search term or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OwnershipResearch
