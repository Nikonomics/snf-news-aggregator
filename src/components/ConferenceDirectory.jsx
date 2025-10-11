import { useState, useMemo, useEffect } from 'react'
import { Calendar, MapPin, ExternalLink, Search, Filter, ArrowUp, ArrowDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'

function ConferenceDirectory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedState, setSelectedState] = useState('All States')
  const [conferenceTypes, setConferenceTypes] = useState({
    state: true,
    national: true,
    all: false
  })
  const [conferences, setConferences] = useState({ state: [], national: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'asc' // ascending = earliest to latest
  })

  // Fetch conferences from API
  useEffect(() => {
    const fetchConferences = async () => {
      try {
        setLoading(true)
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://snf-news-aggregator.onrender.com'
        const response = await fetch(`${API_BASE_URL}/api/conferences`)
        const data = await response.json()

        if (data.success) {
          setConferences({
            state: data.stateConferences,
            national: data.nationalConferences
          })
        }
        setLoading(false)
      } catch (err) {
        setError('Failed to load conferences')
        setLoading(false)
      }
    }

    fetchConferences()
  }, [])

  // Get unique states for dropdown
  const states = useMemo(() => {
    const uniqueStates = [...new Set(conferences.state.map(c => c.stateName))]
    return ['All States', ...uniqueStates.sort()]
  }, [conferences.state])

  // Handle conference type dropdown change
  const handleTypeChange = (value) => {
    if (value === 'all') {
      setConferenceTypes({ state: true, national: true, all: false })
    } else if (value === 'state') {
      setConferenceTypes({ state: true, national: false, all: false })
    } else if (value === 'national') {
      setConferenceTypes({ state: false, national: true, all: false })
    }
  }

  // Get current conference type selection for dropdown
  const getCurrentType = () => {
    if (conferenceTypes.state && conferenceTypes.national) return 'all'
    if (conferenceTypes.state) return 'state'
    if (conferenceTypes.national) return 'national'
    return 'all'
  }

  // Handle column sort
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Filter and sort conferences
  const filteredConferences = useMemo(() => {
    // Combine conferences based on selected types
    let conferencesToFilter = []
    if (conferenceTypes.state) {
      conferencesToFilter = [...conferencesToFilter, ...conferences.state]
    }
    if (conferenceTypes.national) {
      conferencesToFilter = [...conferencesToFilter, ...conferences.national]
    }

    const filtered = conferencesToFilter.filter(conf => {
      const matchesSearch = searchTerm === '' ||
        conf.association?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conf.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conf.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conf.location.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesState = !conf.state || // National conferences don't have state
        selectedState === 'All States' ||
        conf.stateName === selectedState

      return matchesSearch && matchesState
    })

    // Sort based on sortConfig
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue

      switch (sortConfig.key) {
        case 'organization':
          aValue = (a.association || a.organization || '').toLowerCase()
          bValue = (b.association || b.organization || '').toLowerCase()
          break
        case 'event':
          aValue = (a.event || '').toLowerCase()
          bValue = (b.event || '').toLowerCase()
          break
        case 'date':
          aValue = new Date(a.dateStart).getTime()
          bValue = new Date(b.dateStart).getTime()
          break
        case 'location':
          aValue = (a.location || '').toLowerCase()
          bValue = (b.location || '').toLowerCase()
          break
        case 'state':
          aValue = (a.state || '').toLowerCase()
          bValue = (b.state || '').toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })

    return sorted
  }, [conferences, conferenceTypes, searchTerm, selectedState, sortConfig])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading conferences...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-banner">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="conference-directory">
      {/* Header */}
      <div className="conference-header">
        <h2>Conference Directory</h2>
        <p className="conference-subtitle">Find state and national conferences for the skilled nursing industry</p>
      </div>

      {/* Horizontal Filter Row */}
      <div className="conference-filter-row">
        <div className="filter-row-left">
          {/* Search Box */}
          <div className="conference-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search conferences..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="conference-search-input"
            />
          </div>

          {/* Conference Type Dropdown */}
          <div className="filter-dropdown-wrapper">
            <label className="filter-dropdown-label">CONFERENCE TYPE</label>
            <select
              value={getCurrentType()}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="filter-dropdown"
            >
              <option value="all">All Conferences</option>
              <option value="state">State Conferences</option>
              <option value="national">National Conferences</option>
            </select>
          </div>

          {/* State Filter Dropdown */}
          <div className="filter-dropdown-wrapper">
            <label className="filter-dropdown-label">STATE</label>
            <div className="filter-dropdown-with-icon">
              <MapPin size={14} className="dropdown-icon" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="filter-dropdown with-icon"
              >
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Conference Count */}
        <div className="filter-row-right">
          <span className="conference-count">
            {filteredConferences.length} conference{filteredConferences.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Conference Table */}
      <div className="conference-table-wrapper">
        <div className="conference-table-container">
        <table className="conference-table">
          <thead>
            <tr>
              <th className="sortable-header" onClick={() => handleSort('organization')}>
                Organization/Association
                {sortConfig.key === 'organization' && (
                  sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                )}
              </th>
              <th className="sortable-header" onClick={() => handleSort('event')}>
                Event
                {sortConfig.key === 'event' && (
                  sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                )}
              </th>
              <th className="sortable-header" onClick={() => handleSort('date')}>
                Date
                {sortConfig.key === 'date' && (
                  sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                )}
              </th>
              <th className="sortable-header" onClick={() => handleSort('location')}>
                Location
                {sortConfig.key === 'location' && (
                  sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                )}
              </th>
              <th className="sortable-header" onClick={() => handleSort('state')}>
                State
                {sortConfig.key === 'state' && (
                  sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                )}
              </th>
              <th>Website</th>
            </tr>
          </thead>
          <tbody>
            {filteredConferences.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-results">
                  No conferences found matching your criteria
                </td>
              </tr>
            ) : (
              filteredConferences.map(conf => (
                <tr key={conf.id}>
                  <td className="org-cell">
                    {conf.association || conf.organization}
                  </td>
                  <td className="event-cell">
                    <div className="event-name">{conf.event}</div>
                    {conf.category && (
                      <div className="event-category">{conf.category}</div>
                    )}
                  </td>
                  <td>
                    <div className="date-cell">
                      <Calendar size={14} />
                      <div className="date-range">
                        {conf.dateStart === '2025-12-31' ? (
                          'TBD'
                        ) : conf.dateEnd === conf.dateStart ? (
                          // Single day event
                          format(parseISO(conf.dateStart), 'MMM d, yyyy')
                        ) : (
                          (() => {
                            const startDate = parseISO(conf.dateStart)
                            const endDate = parseISO(conf.dateEnd)
                            const startMonth = format(startDate, 'MMM')
                            const endMonth = format(endDate, 'MMM')
                            const startYear = format(startDate, 'yyyy')
                            const endYear = format(endDate, 'yyyy')

                            if (startMonth === endMonth && startYear === endYear) {
                              // Same month and year: "Sep 21-24, 2025"
                              return `${startMonth} ${format(startDate, 'd')}-${format(endDate, 'd')}, ${startYear}`
                            } else if (startYear === endYear) {
                              // Different months, same year: "Sep 28 - Oct 1, 2025"
                              return `${startMonth} ${format(startDate, 'd')} - ${endMonth} ${format(endDate, 'd')}, ${startYear}`
                            } else {
                              // Different years
                              return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
                            }
                          })()
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="location-cell">
                      <MapPin size={14} />
                      {conf.location}
                    </div>
                  </td>
                  <td className="state-column">
                    {conf.state || ''}
                  </td>
                  <td className="website-cell">
                    <a
                      href={conf.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="website-link"
                    >
                      Visit <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

export default ConferenceDirectory
