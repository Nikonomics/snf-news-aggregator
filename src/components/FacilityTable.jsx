import { useState } from 'react'
import { Star, MapPin, Phone, ExternalLink, Building2, TrendingUp } from 'lucide-react'
import './FacilityTable.css'

function FacilityTable({ facilities }) {
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [searchTerm, setSearchTerm] = useState('')

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
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
          onChange={(e) => setSearchTerm(e.target.value)}
          className="facility-search"
        />
      </div>

      <div className="table-wrapper">
        <table className="facility-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                Facility Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Location</th>
              <th onClick={() => handleSort('rating')} className="sortable">
                Rating {sortField === 'rating' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('beds')} className="sortable">
                Beds {sortField === 'beds' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('occupancy')} className="sortable">
                Occupancy {sortField === 'occupancy' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Ownership</th>
              <th onClick={() => handleSort('deficiencies')} className="sortable">
                Deficiencies {sortField === 'deficiencies' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedFacilities.map((facility) => (
              <tr key={facility.federal_provider_number || facility.providerId} className="facility-row">
                <td className="facility-name-cell">
                  <div className="facility-name">{facility.facility_name || facility.name}</div>
                  {(facility.ownership_chain || facility.chainOrganization) && (
                    <div className="chain-badge">{facility.ownership_chain || facility.chainOrganization}</div>
                  )}
                </td>
                <td>
                  <div className="location-cell">
                    <MapPin size={14} />
                    <span>{facility.city}, {facility.county}</span>
                  </div>
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

                    return (
                      <div className="deficiency-info">
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
    </div>
  )
}

export default FacilityTable
