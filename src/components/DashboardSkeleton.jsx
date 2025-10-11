import './LoadingSkeleton.css'

function DashboardSkeleton() {
  return (
    <div className="skeleton-dashboard">
      {/* Map Container Skeleton */}
      <div className="skeleton-map-container">
        <div className="skeleton-map-header">
          <div className="skeleton skeleton-title"></div>
        </div>
        <div className="skeleton-map-grid">
          {/* Metrics Sidebar */}
          <div className="skeleton-metrics">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton skeleton-metric-card"></div>
            ))}
          </div>
          {/* Map */}
          <div className="skeleton skeleton-map"></div>
        </div>
      </div>

      {/* Regulatory Alerts Skeleton */}
      <div className="skeleton-alerts-container">
        <div className="skeleton-alerts-header">
          <div className="skeleton skeleton-alerts-title"></div>
          <div className="skeleton skeleton-alerts-count"></div>
        </div>
        <div className="skeleton-alerts-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton skeleton-alert-card"></div>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="skeleton-table">
        <div className="skeleton skeleton-title" style={{ marginBottom: '1rem' }}></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton skeleton-table-row"></div>
        ))}
      </div>
    </div>
  )
}

export default DashboardSkeleton
