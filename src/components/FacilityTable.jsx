import { useState } from 'react'
import { Star, MapPin, Phone, ExternalLink, Building2, TrendingUp, X, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react'
import './FacilityTable.css'

// Tag prefix information and CMS links
const TAG_INFO = {
  'F': {
    name: 'Quality of Care',
    description: 'Federal regulatory requirements for quality of care in nursing homes',
    url: 'https://www.cms.gov/medicare/provider-enrollment-and-certification/guidanceforlawsandregulations/nursing-homes'
  },
  'G': {
    name: 'Administration',
    description: 'Administrative requirements including governing body, medical director, and management',
    url: 'https://www.cms.gov/medicare/provider-enrollment-and-certification/guidanceforlawsandregulations/nursing-homes'
  },
  'K': {
    name: 'Life Safety Code',
    description: 'Life Safety Code requirements for building safety and fire protection',
    url: 'https://www.cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/life-safety-code-informationl'
  },
  'E': {
    name: 'Environment',
    description: 'Physical environment requirements for nursing homes',
    url: 'https://www.cms.gov/medicare/provider-enrollment-and-certification/guidanceforlawsandregulations/nursing-homes'
  }
}

// Scope and Severity information
const SCOPE_SEVERITY_INFO = {
  'A': 'Isolated / No actual harm with potential for minimal harm',
  'B': 'Pattern / No actual harm with potential for minimal harm',
  'C': 'Widespread / No actual harm with potential for minimal harm',
  'D': 'Isolated / No actual harm with potential for more than minimal harm',
  'E': 'Pattern / No actual harm with potential for more than minimal harm',
  'F': 'Widespread / No actual harm with potential for more than minimal harm',
  'G': 'Isolated / Actual harm that is not immediate jeopardy',
  'H': 'Pattern / Actual harm that is not immediate jeopardy',
  'I': 'Widespread / Actual harm that is not immediate jeopardy',
  'J': 'Isolated / Immediate jeopardy to resident health or safety',
  'K': 'Pattern / Immediate jeopardy to resident health or safety',
  'L': 'Widespread / Immediate jeopardy to resident health or safety'
}

function FacilityTable({ facilities }) {
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [deficiencies, setDeficiencies] = useState([])
  const [loadingDeficiencies, setLoadingDeficiencies] = useState(false)
  const [expandedDeficiency, setExpandedDeficiency] = useState(null)
  const [prefixFilter, setPrefixFilter] = useState('all')
  const [availablePrefixes, setAvailablePrefixes] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(30)

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const fetchDeficiencies = async (providerId, facilityName, prefix = 'all') => {
    setSelectedFacility({ providerId, facilityName })
    setLoadingDeficiencies(true)
    setDeficiencies([])

    try {
      const url = `/api/facilities/${providerId}/deficiencies?prefix=${prefix}&years=3`
      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setDeficiencies(data.deficiencies)

        // Extract unique prefixes for filter dropdown
        const prefixes = [...new Set(data.deficiencies.map(d => d.deficiency_prefix).filter(Boolean))]
        setAvailablePrefixes(prefixes.sort())
      } else {
        console.error('Error fetching deficiencies:', data.error)
        setDeficiencies([])
      }
    } catch (error) {
      console.error('Error fetching deficiencies:', error)
      setDeficiencies([])
    } finally {
      setLoadingDeficiencies(false)
    }
  }

  const handlePrefixFilterChange = (newPrefix) => {
    setPrefixFilter(newPrefix)
    if (selectedFacility) {
      fetchDeficiencies(selectedFacility.providerId, selectedFacility.facilityName, newPrefix)
    }
  }

  const closeModal = () => {
    setSelectedFacility(null)
    setDeficiencies([])
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const sortedFacilities = [...facilities]
    .filter(f =>
      (f.facility_name || f.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.city || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aVal, bVal

      switch (sortField) {
        case 'name':
          aVal = a.facility_name || a.name || ''
          bVal = b.facility_name || b.name || ''
          break
        case 'rating':
          aVal = a.overall_rating || a.overallRating || 0
          bVal = b.overall_rating || b.overallRating || 0
          break
        case 'beds':
          aVal = a.certified_beds || a.certifiedBeds || 0
          bVal = b.certified_beds || b.certifiedBeds || 0
          break
        case 'occupancy':
          aVal = parseFloat(a.occupancy_rate || a.occupancyRate || 0)
          bVal = parseFloat(b.occupancy_rate || b.occupancyRate || 0)
          break
        case 'deficiencies':
          aVal = a.total_deficiencies || a.health_deficiencies || a.recentDeficiencies || 0
          bVal = b.total_deficiencies || b.health_deficiencies || b.recentDeficiencies || 0
          break
        default:
          return 0
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      } else {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
    })

  const getStarRatingClass = (rating) => {
    if (rating >= 5) return 'rating-5'
    if (rating >= 4) return 'rating-4'
    if (rating >= 3) return 'rating-3'
    if (rating >= 2) return 'rating-2'
    return 'rating-1'
  }

  const renderStars = (rating) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={14}
            fill={i <= rating ? 'currentColor' : 'none'}
            className={i <= rating ? 'star-filled' : 'star-empty'}
          />
        ))}
      </div>
    )
  }

  // Pagination
  const totalPages = Math.ceil(sortedFacilities.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentFacilities = sortedFacilities.slice(startIndex, endIndex)

  // Reset to page 1 when search term changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  return (
    <div className="facility-table-container">
      <div className="table-header">
        <h3>
          <Building2 size={20} />
          Facilities ({sortedFacilities.length})
        </h3>
        <input
          type="search"
          placeholder="Search facilities..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="facility-search"
        />
      </div>

      {searchTerm && sortedFacilities.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
          No facilities found matching "{searchTerm}"
        </div>
      )}

      <div className="table-wrapper">
        <table className="facility-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                Facility Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>City</th>
              <th>County</th>
              <th>Ownership Company</th>
              <th onClick={() => handleSort('rating')} className="sortable">
                Rating {sortField === 'rating' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('beds')} className="sortable">
                Beds {sortField === 'beds' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('occupancy')} className="sortable">
                Occupancy {sortField === 'occupancy' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Type</th>
              <th onClick={() => handleSort('deficiencies')} className="sortable">
                Deficiencies {sortField === 'deficiencies' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {currentFacilities.map((facility, idx) => (
              <tr key={`${facility.federal_provider_number || facility.providerId}-${idx}`} className="facility-row">
                <td className="facility-name-cell">
                  <div className="facility-name">{facility.facility_name || facility.name}</div>
                </td>
                <td>
                  <div className="location-cell">
                    <MapPin size={14} />
                    <span>{facility.city}</span>
                  </div>
                </td>
                <td className="county-cell">{facility.county}</td>
                <td className="ownership-company-cell">
                  {facility.ownership_chain || facility.chainOrganization || '-'}
                </td>
                <td>
                  <div className={`rating-cell ${getStarRatingClass(facility.overall_rating || facility.overallRating)}`}>
                    <div className="rating-number">{facility.overall_rating || facility.overallRating || 'N/A'}</div>
                    {renderStars(facility.overall_rating || facility.overallRating)}
                  </div>
                </td>
                <td className="beds-cell">{facility.certified_beds || facility.certifiedBeds || 0}</td>
                <td>
                  <div className="occupancy-cell">
                    <TrendingUp size={14} />
                    {parseFloat(facility.occupancy_rate || facility.occupancyRate || 0).toFixed(1)}%
                  </div>
                </td>
                <td className="ownership-cell">
                  <span className={`ownership-badge ${(facility.ownership_type || facility.ownershipType || '').toLowerCase().replace(/[\s-]/g, '')}`}>
                    {facility.ownership_type || facility.ownershipType || 'Unknown'}
                  </span>
                </td>
                <td className="deficiencies-cell">
                  {(() => {
                    const totalDef = facility.total_deficiencies || facility.health_deficiencies || facility.recentDeficiencies || 0
                    const seriousDef = facility.serious_deficiencies || 0
                    const uncorrectedDef = facility.uncorrected_deficiencies || 0
                    const providerId = facility.federal_provider_number || facility.providerId
                    const facilityName = facility.facility_name || facility.name

                    return (
                      <div
                        className={`deficiency-info ${totalDef > 0 ? 'clickable' : ''}`}
                        onClick={() => totalDef > 0 && fetchDeficiencies(providerId, facilityName)}
                        title={totalDef > 0 ? 'Click to view deficiency details' : ''}
                      >
                        <span className={totalDef <= 5 ? 'def-low' : totalDef <= 15 ? 'def-medium' : 'def-high'}>
                          {totalDef}
                        </span>
                        {seriousDef > 0 && (
                          <span className="serious-def" title={`${seriousDef} serious deficiencies`}>
                            {seriousDef} serious
                          </span>
                        )}
                        {uncorrectedDef > 0 && (
                          <span className="uncorrected-def" title={`${uncorrectedDef} uncorrected deficiencies`}>
                            {uncorrectedDef} uncorrected
                          </span>
                        )}
                      </div>
                    )
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          padding: '20px',
          marginTop: '10px'
        }}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              background: currentPage === 1 ? '#F3F4F6' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              background: currentPage === 1 ? '#F3F4F6' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            Previous
          </button>
          <span style={{ padding: '8px 16px', color: '#374151', fontWeight: 500 }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              background: currentPage === totalPages ? '#F3F4F6' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              background: currentPage === totalPages ? '#F3F4F6' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            Last
          </button>
        </div>
      )}

      {selectedFacility && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="deficiency-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedFacility.facilityName}</h3>
                <p className="modal-subtitle">Provider ID: {selectedFacility.providerId}</p>
              </div>
              <button onClick={closeModal} className="close-btn" aria-label="Close modal">
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {loadingDeficiencies ? (
                <div className="loading-state">
                  <Clock size={32} className="spin" />
                  <p>Loading deficiencies...</p>
                </div>
              ) : deficiencies.length === 0 ? (
                <div className="empty-state">
                  <AlertTriangle size={48} />
                  <p>No deficiencies found for this facility</p>
                </div>
              ) : (
                <>
                  <div className="deficiency-summary">
                    <div className="summary-row">
                      <p className="deficiency-count">
                        <strong>{deficiencies.length}</strong> deficiencies (last 3 years)
                      </p>
                      {availablePrefixes.length > 1 && (
                        <div className="prefix-filter">
                          <label htmlFor="prefix-select">Filter by type:</label>
                          <select
                            id="prefix-select"
                            value={prefixFilter}
                            onChange={(e) => handlePrefixFilterChange(e.target.value)}
                            className="prefix-select"
                          >
                            <option value="all">All Types</option>
                            {availablePrefixes.map(prefix => (
                              <option key={prefix} value={prefix}>{prefix}-Tag</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="deficiencies-list">
                    {deficiencies.map((def, idx) => {
                      const tagInfo = TAG_INFO[def.deficiency_prefix]
                      const severityInfo = SCOPE_SEVERITY_INFO[def.scope_severity]
                      const fullTag = `${def.deficiency_prefix}${def.deficiency_tag}`

                      return (
                        <div
                          key={def.id || idx}
                          className={`deficiency-item ${expandedDeficiency === def.id ? 'expanded' : ''}`}
                        >
                          <div className="deficiency-header-row">
                            <div className="survey-info">
                              <span className="survey-type">{def.survey_type || 'Health'} Survey</span>
                              <span className="survey-date">{formatDate(def.survey_date)}</span>
                            </div>
                            <div className="status-badges">
                              {def.deficiency_tag && tagInfo && (
                                <a
                                  href={tagInfo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="deficiency-tag clickable-tag"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`${tagInfo.name}: ${tagInfo.description}`}
                                >
                                  <span className="tag-code">{fullTag}</span>
                                  <ExternalLink size={12} />
                                </a>
                              )}
                              {!tagInfo && def.deficiency_tag && (
                                <span className="deficiency-tag">Tag: {fullTag}</span>
                              )}
                              {def.is_corrected ? (
                                <span className="status-corrected">
                                  <CheckCircle size={14} /> Corrected {formatDate(def.correction_date)}
                                </span>
                              ) : (
                                <span className="status-uncorrected">
                                  <AlertTriangle size={14} /> Not Corrected
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Tag and Severity Information */}
                          {(tagInfo || severityInfo) && (
                            <div className="deficiency-metadata">
                              {tagInfo && (
                                <div className="tag-info-row">
                                  <Info size={14} className="info-icon" />
                                  <span className="tag-category">{tagInfo.name}:</span>
                                  <span className="tag-description">{tagInfo.description}</span>
                                </div>
                              )}
                              {severityInfo && (
                                <div className="severity-info-row">
                                  <span className={`severity-badge severity-${def.scope_severity?.toLowerCase()}`}>
                                    Severity: {def.scope_severity}
                                  </span>
                                  <span className="severity-description">{severityInfo}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            className="deficiency-text-container"
                            onClick={() => setExpandedDeficiency(expandedDeficiency === def.id ? null : def.id)}
                          >
                            <p className={`deficiency-text ${expandedDeficiency === def.id ? '' : 'collapsed'}`}>
                              {def.deficiency_text}
                            </p>
                            {expandedDeficiency !== def.id && def.deficiency_text.length > 150 && (
                              <span className="expand-hint">Click to read more...</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FacilityTable
