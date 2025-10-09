import { Filter, Search } from 'lucide-react'

function FilterPanel({ filters, onFilterChange, searchTerm, onSearchChange }) {
  const categories = [
    'All',
    'Regulatory',
    'Finance',
    'Operations',
    'Workforce',
    'Quality',
    'Technology'
  ]

  const impacts = ['all', 'high', 'medium', 'low']

  const sources = [
    'All Sources',
    'Skilled Nursing News'
    // Note: McKnight's and other sites block automated RSS access
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
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label">Category</label>
        <select
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="filter-select"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">Impact Level</label>
        <select
          value={filters.impact}
          onChange={(e) => onFilterChange('impact', e.target.value)}
          className="filter-select"
        >
          {impacts.map((imp) => (
            <option key={imp} value={imp}>
              {imp.charAt(0).toUpperCase() + imp.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">Source</label>
        <select
          value={filters.source}
          onChange={(e) => onFilterChange('source', e.target.value)}
          className="filter-select"
        >
          {sources.map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
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

      <button
        className="btn-reset"
        onClick={() => onFilterChange('reset')}
      >
        Reset Filters
      </button>
    </div>
  )
}

export default FilterPanel
