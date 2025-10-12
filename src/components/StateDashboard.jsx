import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  MapPin, TrendingUp, TrendingDown, Minus, Building2,
  ExternalLink, Linkedin, Globe, AlertCircle, Calendar,
  ArrowLeft, Loader, Newspaper, BarChart3
} from 'lucide-react'
import ArticleList from './ArticleList'
import MetricsCardGrid from './MetricsCardGrid'
import FacilityMap from './FacilityMap'
import FacilityTable from './FacilityTable'
import RegulatoryAlerts from './RegulatoryAlerts'
import DashboardSkeleton from './DashboardSkeleton'
import './StateDashboard.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://snf-news-aggregator.onrender.com'

function StateDashboard() {
  const { stateCode } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stateData, setStateData] = useState(null)
  const [activeTab, setActiveTab] = useState('news')
  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [savedArticles, setSavedArticles] = useState(() => {
    const saved = localStorage.getItem('savedArticles')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    loadStateData()
  }, [stateCode])

  useEffect(() => {
    if (activeTab === 'intelligence' && !dashboardData) {
      loadDashboardData()
    }
  }, [activeTab])

  const loadStateData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_BASE_URL}/api/state/${stateCode}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load state data')
      }

      setStateData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      setDashboardLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/state/${stateCode}/dashboard`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || data.error || 'Failed to load dashboard data')
      }

      setDashboardData(data)
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setDashboardData({ error: err.message })
    } finally {
      setDashboardLoading(false)
    }
  }

  const toggleSaveArticle = (articleUrl) => {
    setSavedArticles(prev => {
      const newSaved = prev.includes(articleUrl)
        ? prev.filter(url => url !== articleUrl)
        : [...prev, articleUrl]
      localStorage.setItem('savedArticles', JSON.stringify(newSaved))
      return newSaved
    })
  }

  const getSentimentIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingUp size={16} />
      case 'declining': return <TrendingDown size={16} />
      default: return <Minus size={16} />
    }
  }

  const getSentimentColor = (score) => {
    if (score >= 70) return '#10b981' // green
    if (score >= 50) return '#f59e0b' // yellow
    if (score >= 30) return '#f97316' // orange
    return '#ef4444' // red
  }

  if (loading) {
    return (
      <div className="state-dashboard-loading">
        <Loader size={48} className="spinner" />
        <p>Loading {stateCode} state data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="state-dashboard-error">
        <AlertCircle size={48} />
        <h2>Error Loading State Data</h2>
        <p>{error}</p>
        <Link to="/" className="btn-primary">Back to News Feed</Link>
      </div>
    )
  }

  const { associations, articles, summary } = stateData

  return (
    <div className="state-dashboard">
      <div className="state-header">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          Back to News Feed
        </Link>
        <h1>
          <MapPin size={32} />
          {stateCode} State Dashboard
        </h1>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
        >
          <Newspaper size={18} />
          News & Articles
        </button>
        <button
          className={`tab-button ${activeTab === 'intelligence' ? 'active' : ''}`}
          onClick={() => setActiveTab('intelligence')}
        >
          <BarChart3 size={18} />
          Market Intelligence
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'news' && (
        <div className="tab-content">
          {/* State Associations */}
          {associations && associations.length > 0 && (
            <section className="associations-section">
              <h2>
                <Building2 size={24} />
                State Associations
              </h2>
              <div className="associations-grid">
                {associations.map((assoc, idx) => (
                  <div key={idx} className="association-card">
                    <h3>{assoc.association}</h3>
                    <div className="association-links">
                      {assoc.website && (
                        <a href={assoc.website} target="_blank" rel="noopener noreferrer" className="assoc-link">
                          <Globe size={16} />
                          Website
                        </a>
                      )}
                      {assoc.linkedin && (
                        <a href={assoc.linkedin} target="_blank" rel="noopener noreferrer" className="assoc-link">
                          <Linkedin size={16} />
                          LinkedIn
                        </a>
                      )}
                    </div>
                    {assoc.event && (
                      <div className="next-event">
                        <Calendar size={14} />
                        <span>{assoc.event}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* AI State Summary */}
          {summary && (
            <>
              <section className="summary-section">
                <h2>State Environment Summary</h2>
                <div className="summary-content">
                  <p>{summary.summary}</p>
                </div>
              </section>

              {/* Sentiment Scores */}
              <section className="sentiment-section">
                <h2>Sentiment Analysis</h2>
                <div className="sentiment-grid">
                  {/* Regulatory */}
                  <div className="sentiment-card">
                    <div className="sentiment-header">
                      <h3>Regulatory</h3>
                      {getSentimentIcon(summary.sentiment.regulatory.trend)}
                    </div>
                    <div className="sentiment-score-container">
                      <div
                        className="sentiment-score"
                        style={{ color: getSentimentColor(summary.sentiment.regulatory.score) }}
                      >
                        {summary.sentiment.regulatory.score}
                      </div>
                      <div className="sentiment-bar">
                        <div
                          className="sentiment-fill"
                          style={{
                            width: `${summary.sentiment.regulatory.score}%`,
                            backgroundColor: getSentimentColor(summary.sentiment.regulatory.score)
                          }}
                        />
                      </div>
                    </div>
                    <p className="sentiment-description">{summary.sentiment.regulatory.description}</p>
                    <span className={`sentiment-trend ${summary.sentiment.regulatory.trend}`}>
                      {summary.sentiment.regulatory.trend}
                    </span>
                  </div>

                  {/* Staffing */}
                  <div className="sentiment-card">
                    <div className="sentiment-header">
                      <h3>Staffing</h3>
                      {getSentimentIcon(summary.sentiment.staffing.trend)}
                    </div>
                    <div className="sentiment-score-container">
                      <div
                        className="sentiment-score"
                        style={{ color: getSentimentColor(summary.sentiment.staffing.score) }}
                      >
                        {summary.sentiment.staffing.score}
                      </div>
                      <div className="sentiment-bar">
                        <div
                          className="sentiment-fill"
                          style={{
                            width: `${summary.sentiment.staffing.score}%`,
                            backgroundColor: getSentimentColor(summary.sentiment.staffing.score)
                          }}
                        />
                      </div>
                    </div>
                    <p className="sentiment-description">{summary.sentiment.staffing.description}</p>
                    <span className={`sentiment-trend ${summary.sentiment.staffing.trend}`}>
                      {summary.sentiment.staffing.trend}
                    </span>
                  </div>

                  {/* Financial */}
                  <div className="sentiment-card">
                    <div className="sentiment-header">
                      <h3>Financial</h3>
                      {getSentimentIcon(summary.sentiment.financial.trend)}
                    </div>
                    <div className="sentiment-score-container">
                      <div
                        className="sentiment-score"
                        style={{ color: getSentimentColor(summary.sentiment.financial.score) }}
                      >
                        {summary.sentiment.financial.score}
                      </div>
                      <div className="sentiment-bar">
                        <div
                          className="sentiment-fill"
                          style={{
                            width: `${summary.sentiment.financial.score}%`,
                            backgroundColor: getSentimentColor(summary.sentiment.financial.score)
                          }}
                        />
                      </div>
                    </div>
                    <p className="sentiment-description">{summary.sentiment.financial.description}</p>
                    <span className={`sentiment-trend ${summary.sentiment.financial.trend}`}>
                      {summary.sentiment.financial.trend}
                    </span>
                  </div>

                  {/* Overall */}
                  <div className="sentiment-card overall">
                    <div className="sentiment-header">
                      <h3>Overall Environment</h3>
                    </div>
                    <div className="sentiment-score-container">
                      <div
                        className="sentiment-score"
                        style={{ color: getSentimentColor(summary.overallSentiment.score) }}
                      >
                        {summary.overallSentiment.score}
                      </div>
                      <div className="sentiment-bar">
                        <div
                          className="sentiment-fill"
                          style={{
                            width: `${summary.overallSentiment.score}%`,
                            backgroundColor: getSentimentColor(summary.overallSentiment.score)
                          }}
                        />
                      </div>
                    </div>
                    <p className="sentiment-description">{summary.overallSentiment.description}</p>
                  </div>
                </div>
              </section>

              {/* Top Issues */}
              <section className="issues-section">
                <div className="issues-column">
                  <h3>Top Issues</h3>
                  <ul className="issues-list">
                    {summary.topIssues.map((issue, idx) => (
                      <li key={idx}>
                        <AlertCircle size={16} />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="issues-column">
                  <h3>Action Items</h3>
                  <ul className="action-items-list">
                    {summary.actionItems.map((action, idx) => (
                      <li key={idx}>
                        <input type="checkbox" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </>
          )}

          {/* State Articles */}
          <section className="articles-section">
            <h2>
              {stateCode} Articles ({articles.length})
            </h2>
            {articles.length === 0 ? (
              <div className="no-articles">
                <p>No state-specific articles found yet.</p>
              </div>
            ) : (
              <ArticleList
                articles={articles}
                savedArticles={savedArticles}
                onToggleSave={toggleSaveArticle}
                onAnalyze={() => {}}
                onViewDetails={() => {}}
              />
            )}
          </section>
        </div>
      )}

      {/* Market Intelligence Tab */}
      {activeTab === 'intelligence' && (
        <div className="tab-content">
          {dashboardLoading ? (
            <DashboardSkeleton />
          ) : dashboardData?.error ? (
            <div className="dashboard-error-state">
              <AlertCircle size={48} />
              <h3>Error Loading Dashboard Data</h3>
              <p>{dashboardData.error}</p>
              <button onClick={loadDashboardData} className="retry-btn">
                Retry
              </button>
            </div>
          ) : dashboardData ? (
            <>
              {/* Facility Map with Integrated Metrics */}
              {dashboardData.facilities && (
                <FacilityMap
                  facilities={dashboardData.facilities}
                  metrics={dashboardData.topMetrics}
                />
              )}

              {/* Regulatory Alerts */}
              {dashboardData.regulatoryAlerts && (
                <RegulatoryAlerts alerts={dashboardData.regulatoryAlerts} />
              )}

              {/* Facility Table */}
              {dashboardData.facilities && (
                <section className="table-section">
                  <FacilityTable facilities={dashboardData.facilities} />
                </section>
              )}

              {/* Detailed Metrics by Category */}
              {dashboardData.metrics && (
                <section className="detailed-metrics-section">
                  <h2 className="section-title">
                    <TrendingUp size={24} />
                    Detailed Market Metrics
                  </h2>

                  {Object.entries(dashboardData.metrics).map(([category, categoryMetrics]) => (
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
              )}

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
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default StateDashboard
