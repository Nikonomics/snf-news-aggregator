import { Search, X } from 'lucide-react'

function SearchBar({ searchTerm, onSearchChange, onClear }) {
  return (
    <div className="search-bar">
      <Search className="search-icon" size={20} />
      <input
        type="text"
        placeholder="Search articles by title, summary, or tags..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="search-input"
      />
      {searchTerm && (
        <button
          className="clear-btn"
          onClick={onClear}
          aria-label="Clear search"
        >
          <X size={20} />
        </button>
      )}
    </div>
  )
}

export default SearchBar
