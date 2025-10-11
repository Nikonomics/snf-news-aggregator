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
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.city.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aVal, bVal

      switch (sortField) {
        case 'name':
          aVal = a.name
          bVal = b.name
          break
        case 'rating':
          aVal = a.overallRating || 0
          bVal = b.overallRating || 0
          break
        case 'beds':
          aVal = a.certifiedBeds
          bVal = b.certifiedBeds
          break
        case 'occupancy':
          aVal = a.occupancyRate || 0
          bVal = b.occupancyRate || 0
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
              <th>Deficiencies</th>
            </tr>
          </thead>
          <tbody>
            {sortedFacilities.map((facility) => (
              <tr key={facility.providerId} className="facility-row">
                <td className="facility-name-cell">
                  <div className="facility-name">{facility.name}</div>
                  {facility.chainOrganization && (
                    <div className="chain-badge">{facility.chainOrganization}</div>
                  )}
                </td>
                <td>
                  <div className="location-cell">
                    <MapPin size={14} />
                    <span>{facility.city}, {facility.county}</span>
                  </div>
                </td>
                <td>
                  <div className={`rating-cell ${getStarRatingClass(facility.overallRating)}`}>
                    <div className="rating-number">{facility.overallRating}</div>
                    {renderStars(facility.overallRating)}
                  </div>
                </td>
                <td className="beds-cell">{facility.certifiedBeds}</td>
                <td>
                  <div className="occupancy-cell">
                    <TrendingUp size={14} />
                    {facility.occupancyRate.toFixed(1)}%
                  </div>
                </td>
                <td className="ownership-cell">
                  <span className={`ownership-badge ${facility.ownershipType.toLowerCase().replace('-', '')}`}>
                    {facility.ownershipType}
                  </span>
                </td>
                <td className="deficiencies-cell">
                  <span className={facility.recentDeficiencies <= 5 ? 'def-low' : 'def-high'}>
                    {facility.recentDeficiencies}
                  </span>
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
