import { Filter, Search, Globe, X, ArrowUpDown, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function FilterPanel({ filters, onFilterChange, searchTerm, onSearchChange, sortBy, onSortChange, stateCounts = {}, filterStats = null }) {
  const navigate = useNavigate()
  const handleStateToggle = (state) => {
    const currentStates = filters.states || []
    const newStates = currentStates.includes(state)
      ? currentStates.filter(s => s !== state)
      : [...currentStates, state]
    onFilterChange('states', newStates)
  }

  const clearAllStates = () => {
    onFilterChange('states', [])
  }

  // Get categories dynamically from filterStats, or use defaults
  // Always ensure M&A is included even if no articles exist yet
  const allCategories = [
    'All',
    'Regulatory',
    'Finance',
    'M&A',
    'Operations',
    'Workforce',
    'Quality',
    'Technology'
  ]

  const categories = filterStats?.categories
    ? ['All', ...new Set([...Object.keys(filterStats.categories), 'M&A']).values()].sort((a, b) => {
        if (a === 'All') return -1
        if (b === 'All') return 1
        return a.localeCompare(b)
      })
    : allCategories

  const impacts = ['all', 'high', 'medium', 'low']

  const sources = [
    'All Sources',
    'Skilled Nursing News'
    // Note: McKnight's and other sites block automated RSS access
  ]

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ]

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <Filter size={20} />
        <h3>Filters</h3>
      </div>

      <div className="filter-section">
        <label className="filter-label">Search</label>
        <div className="search-box-container">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <X
              size={14}
              className="clear-search-btn"
              onClick={() => onSearchChange('')}
            />
          )}
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label">
          <ArrowUpDown size={16} style={{ display: 'inline', marginRight: '4px' }} />
          Sort By
        </label>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="filter-select"
        >
          <option value="recent">Most Recent</option>
          <option value="impact">Highest Impact</option>
          <option value="relevant">Most Relevant</option>
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">Category</label>
        <select
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="filter-select"
        >
          {categories.map((cat) => {
            const count = cat === 'All'
              ? filterStats?.total
              : filterStats?.categories?.[cat]
            return (
              <option key={cat} value={cat}>
                {cat}{count !== undefined ? ` (${count})` : ''}
              </option>
            )
          })}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">Impact Level</label>
        <select
          value={filters.impact}
          onChange={(e) => onFilterChange('impact', e.target.value)}
          className="filter-select"
        >
          {impacts.map((imp) => {
            const count = imp === 'all'
              ? filterStats?.total
              : filterStats?.impacts?.[imp]
            const label = imp.charAt(0).toUpperCase() + imp.slice(1)
            return (
              <option key={imp} value={imp}>
                {label}{count !== undefined ? ` (${count})` : ''}
              </option>
            )
          })}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">Source</label>
        <select
          value={filters.source}
          onChange={(e) => onFilterChange('source', e.target.value)}
          className="filter-select"
        >
          {sources.map((src) => {
            const count = src === 'All Sources'
              ? filterStats?.total
              : filterStats?.sources?.[src]
            return (
              <option key={src} value={src}>
                {src}{count !== undefined ? ` (${count})` : ''}
              </option>
            )
          })}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">Date Range</label>
        <select
          value={filters.dateRange}
          onChange={(e) => onFilterChange('dateRange', e.target.value)}
          className="filter-select"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
          <option value="quarter">Past Quarter</option>
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">
          <Globe size={16} style={{ display: 'inline', marginRight: '4px' }} />
          Geographic Scope
        </label>
        <select
          value={filters.scope || 'all'}
          onChange={(e) => onFilterChange('scope', e.target.value)}
          className="filter-select"
        >
          {[
            { value: 'all', label: 'All Stories' },
            { value: 'National', label: 'National' },
            { value: 'Regional', label: 'Regional' },
            { value: 'State', label: 'State-Specific' },
            { value: 'Local', label: 'Local' }
          ].map(({ value, label }) => {
            const count = value === 'all'
              ? filterStats?.total
              : filterStats?.scopes?.[value]
            return (
              <option key={value} value={value}>
                {label}{count !== undefined ? ` (${count})` : ''}
              </option>
            )
          })}
        </select>
      </div>

      {filters.scope === 'State' && (
        <div className="filter-section">
          <div className="filter-label-with-action">
            <label className="filter-label">Select States</label>
            {filters.states?.length > 0 && (
              <button
                className="clear-states-btn"
                onClick={clearAllStates}
                title="Clear all states"
              >
                Clear ({filters.states.length})
              </button>
            )}
          </div>

          {/* Selected states display */}
          {filters.states?.length > 0 && (
            <div className="selected-states">
              {filters.states.map((state) => (
                <span key={state} className="state-tag">
                  {state}
                  <X
                    size={14}
                    className="remove-state"
                    onClick={() => handleStateToggle(state)}
                  />
                </span>
              ))}
            </div>
          )}

          {/* Multi-select dropdown */}
          <select
            multiple
            value={filters.states || []}
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
              onFilterChange('states', selectedOptions)
            }}
            className="filter-select state-multi-select"
            size="8"
          >
            {states.map((state) => {
              const count = filterStats?.states?.[state] || stateCounts[state] || 0
              return (
                <option
                  key={state}
                  value={state}
                  className={filters.states?.includes(state) ? 'selected' : ''}
                >
                  {state} {count > 0 ? `(${count})` : ''}
                </option>
              )
            })}
          </select>
          <p className="filter-hint">Hold Ctrl/Cmd to select multiple states</p>
        </div>
      )}

      <button
        className="btn-reset"
        onClick={() => onFilterChange('reset')}
      >
        Reset Filters
      </button>

      <div className="state-dashboard-link">
        <label className="filter-label">
          <MapPin size={16} style={{ display: 'inline', marginRight: '4px' }} />
          My State Dashboard
        </label>
        <select
          className="filter-select"
          onChange={(e) => {
            if (e.target.value) {
              navigate(`/state/${e.target.value}`)
            }
          }}
          defaultValue=""
        >
          <option value="">Select your state...</option>
          {states.map((state) => {
            const count = filterStats?.states?.[state] || stateCounts[state] || 0
            return (
              <option key={state} value={state}>
                {state} {count > 0 ? `(${count})` : ''}
              </option>
            )
          })}
        </select>
        <p className="filter-hint">View your state's intelligence dashboard</p>
      </div>
    </div>
  )
}

export default FilterPanel
