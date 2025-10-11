import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, ArrowLeft, Loader, AlertCircle, TrendingUp, Building2 } from 'lucide-react'
import MetricsCardGrid from './MetricsCardGrid'
import FacilityMap from './FacilityMap'
import FacilityTable from './FacilityTable'
import RegulatoryAlerts from './RegulatoryAlerts'
import './EnhancedStateDashboard.css'

function EnhancedStateDashboard() {
  const { stateCode } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [stateCode])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`http://localhost:3001/api/state/${stateCode}/dashboard`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || data.error || 'Failed to load dashboard data')
      }

      setDashboardData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Loader size={48} className="spinner" />
        <p>Loading {stateCode} dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <AlertCircle size={48} />
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <div className="error-actions">
          <Link to="/states" className="btn-primary">
            <MapPin size={16} />
            Select Different State
          </Link>
          <button onClick={loadDashboardData} className="btn-secondary">
            <TrendingUp size={16} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { state, summaryStats, topMetrics, facilities, metrics, regulatoryAlerts } = dashboardData

  return (
    <div className="enhanced-state-dashboard">
      {/* State Header */}
      <div className="dashboard-header">
        <Link to="/states" className="back-link">
          <ArrowLeft size={16} />
          Back to State Selector
        </Link>

        <div className="state-title-section">
          <h1>
            <MapPin size={36} />
            {state.name} Market Intelligence Dashboard
          </h1>
          <p className="state-subtitle">Comprehensive SNF market data and analytics</p>
        </div>

        <div className="summary-stats">
          <div className="stat-item">
            <div className="stat-label">Facilities</div>
            <div className="stat-value">{summaryStats.totalFacilities}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Avg Rating</div>
            <div className="stat-value">{summaryStats.avgStarRating.toFixed(1)} ★</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Beds</div>
            <div className="stat-value">{summaryStats.totalCertifiedBeds.toLocaleString()}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Occupancy</div>
            <div className="stat-value">{summaryStats.avgOccupancyRate.toFixed(1)}%</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Medicaid Rate</div>
            <div className="stat-value">${summaryStats.avgMedicaidRate.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-container">
        {/* Regulatory Alerts */}
        <RegulatoryAlerts alerts={regulatoryAlerts} />

        {/* Key Metrics Cards */}
        <section className="metrics-section">
          <h2 className="section-title">Key Market Metrics</h2>
          <MetricsCardGrid metrics={topMetrics} />
        </section>

        {/* Facility Map */}
        <section className="map-section">
          <FacilityMap facilities={facilities} />
        </section>

        {/* Facility Table */}
        <section className="table-section">
          <FacilityTable facilities={facilities} />
        </section>

        {/* Detailed Metrics by Category */}
        <section className="detailed-metrics-section">
          <h2 className="section-title">
            <TrendingUp size={24} />
            Detailed Market Metrics
          </h2>

          {Object.entries(metrics).map(([category, categoryMetrics]) => (
            <div key={category} className="metric-category-section">
              <h3 className="category-title">{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
              <div className="metrics-grid">
                {categoryMetrics.map((metric) => (
                  <div key={metric.name} className="metric-detail-card">
                    <div className="metric-detail-header">
                      <div className="metric-detail-name">{metric.displayName}</div>
                      {metric.nationalAvg && (
                        <div className={`metric-comparison-badge ${metric.percentDiff < 0 ? 'negative' : 'positive'}`}>
                          {metric.percentDiff > 0 ? '+' : ''}{metric.percentDiff.toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div className="metric-detail-value">
                      {metric.unit === '$' && '$'}
                      {metric.unit === '%' && metric.value.toFixed(1)}
                      {metric.unit === 'count' && metric.value.toLocaleString()}
                      {metric.unit === 'stars' && metric.value.toFixed(1)}
                      {metric.unit === 'per 1000' && metric.value.toFixed(1)}
                      {metric.unit === 'rating' && metric.value.toFixed(1)}
                      {metric.unit === '$' && metric.value.toFixed(2)}
                      {metric.unit === '$/kWh' && `$${metric.value.toFixed(3)}/kWh`}
                      {metric.unit === '%' ? '%' : metric.unit === 'count' ? '' : ''}
                    </div>
                    {metric.nationalAvg && (
                      <div className="metric-national-avg">
                        National avg: {metric.unit === '$' ? '$' : ''}{metric.nationalAvg.toFixed(metric.unit === '$' ? 2 : 1)}{metric.unit === '%' ? '%' : ''}
                      </div>
                    )}
                    <div className="metric-description">{metric.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Prototype Notice */}
        <div className="prototype-notice">
          <h4>🚀 Prototype Dashboard</h4>
          <p>
            This is a visual prototype using dummy data to demonstrate the final dashboard design.
            In production, this will connect to live data sources including:
          </p>
          <ul>
            <li>CMS Nursing Home Compare API for facility ratings and quality metrics</li>
            <li>BLS OEWS for wage data and labor market statistics</li>
            <li>State Medicaid agencies for reimbursement rates</li>
            <li>Census Bureau for demographic trends</li>
            <li>Federal Register and state legislative tracking for regulatory alerts</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default EnhancedStateDashboard
