import { ChevronLeft, ChevronRight } from 'lucide-react'

function Pagination({ pagination, onPageChange }) {
  const { page, totalPages, hasNextPage, hasPrevPage, totalCount } = pagination

  if (totalPages <= 1) return null

  const renderPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2))
    let endPage = Math.min(totalPages, startPage + maxVisible - 1)

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }

    // First page
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className="pagination-number"
        >
          1
        </button>
      )
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" className="pagination-ellipsis">...</span>)
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`pagination-number ${i === page ? 'active' : ''}`}
        >
          {i}
        </button>
      )
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="pagination-ellipsis">...</span>)
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className="pagination-number"
        >
          {totalPages}
        </button>
      )
    }

    return pages
  }

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing page {page} of {totalPages} ({totalCount} total articles)
      </div>

      <div className="pagination-controls">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          className="pagination-btn"
          title="Previous page"
        >
          <ChevronLeft size={18} />
          Previous
        </button>

        <div className="pagination-numbers">
          {renderPageNumbers()}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="pagination-btn"
          title="Next page"
        >
          Next
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

export default Pagination
