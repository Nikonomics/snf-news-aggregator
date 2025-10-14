import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  MapPin, TrendingUp, TrendingDown, Minus, Building2,
  ExternalLink, Linkedin, Globe, AlertCircle, Calendar,
  ArrowLeft, Loader, Newspaper, BarChart3, Users
} from 'lucide-react'
import ArticleList from './ArticleList'
import MetricsCardGrid from './MetricsCardGrid'
import FacilityTable from './FacilityTable'
import RegulatoryAlerts from './RegulatoryAlerts'
import DashboardSkeleton from './DashboardSkeleton'
import StateMarketMap from './StateMarketMap'
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
  const [scorecardData, setScorecardData] = useState(null)
  const [savedArticles, setSavedArticles] = useState(() => {
    const saved = localStorage.getItem('savedArticles')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    loadStateData()
    loadScorecardData()
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

  const loadScorecardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/state/${stateCode}/analysis`)
      const data = await response.json()

      if (data.success) {
        setScorecardData(data.data)
      }
    } catch (err) {
      console.error('Error loading scorecard:', err)
    }
  }

  const transformAnalysisToMetrics = (analysis) => {
    const data = analysis.data

    return {
      success: true,
      metrics: {
        demographics: [
          {
            name: 'population_65_plus',
            displayName: 'Population 65+',
            value: data.demographics.population65Plus,
            unit: 'count',
            description: 'Total population age 65 and older in ' + data.stateName
          },
          {
            name: 'population_85_plus',
            displayName: 'Population 85+',
            value: data.demographics.population85Plus,
            unit: 'count',
            description: 'Total population age 85 and older in ' + data.stateName
          }
        ],
        quality: [
          {
            name: 'avg_overall_rating',
            displayName: 'Average Overall Star Rating',
            value: data.quality.avgOverallRating,
            nationalAvg: data.quality.nationalAvgRating,
            regionalAvg: data.quality.regionalAvgRating,
            percentDiff: data.quality.avgOverallRatingVsNational,
            percentDiffRegional: data.quality.avgOverallRatingVsRegional,
            unit: 'stars',
            description: 'Mean CMS 5-star overall quality rating'
          },
          {
            name: 'avg_deficiencies',
            displayName: 'Average Deficiencies per Facility',
            value: data.quality.avgDeficiencies,
            nationalAvg: data.quality.nationalAvgDeficiencies,
            regionalAvg: data.quality.regionalAvgDeficiencies,
            percentDiff: data.quality.avgDeficienciesVsNational,
            percentDiffRegional: data.quality.avgDeficienciesVsRegional,
            unit: 'count',
            description: 'Mean number of health survey deficiencies cited'
          },
          {
            name: 'five_star_percent',
            displayName: 'Percent 5-Star Facilities',
            value: data.quality.fiveStarPercent,
            nationalAvg: data.quality.nationalFiveStarPercent,
            percentDiff: data.quality.nationalFiveStarPercent
              ? ((data.quality.fiveStarPercent - data.quality.nationalFiveStarPercent) / data.quality.nationalFiveStarPercent * 100)
              : 0,
            unit: '%',
            description: 'Percentage of facilities with 5-star overall rating'
          },
          {
            name: 'one_star_percent',
            displayName: 'Percent 1-Star Facilities',
            value: data.quality.oneStarPercent,
            nationalAvg: data.quality.nationalOneStarPercent,
            percentDiff: data.quality.nationalOneStarPercent
              ? ((data.quality.oneStarPercent - data.quality.nationalOneStarPercent) / data.quality.nationalOneStarPercent * 100)
              : 0,
            unit: '%',
            description: 'Percentage of facilities with 1-star overall rating'
          }
        ],
        market: [
          {
            name: 'total_facilities',
            displayName: 'Total Facilities',
            value: data.market.totalFacilities,
            unit: 'count',
            description: 'Number of Medicare/Medicaid certified nursing facilities'
          },
          {
            name: 'total_beds',
            displayName: 'Total Certified Beds',
            value: data.market.totalBeds,
            unit: 'count',
            description: 'Total number of certified nursing home beds'
          },
          {
            name: 'avg_beds_per_facility',
            displayName: 'Average Beds per Facility',
            value: data.market.avgBedsPerFacility,
            nationalAvg: data.market.nationalAvgBedsPerFacility,
            percentDiff: data.market.avgBedsVsNational,
            unit: 'count',
            description: 'Mean number of beds per facility in the state'
          },
          {
            name: 'avg_occupancy',
            displayName: 'Average Occupancy Rate',
            value: data.market.avgOccupancyRate,
            nationalAvg: data.market.nationalAvgOccupancy,
            percentDiff: data.market.avgOccupancyVsNational,
            unit: '%',
            description: 'Average percentage of certified beds occupied'
          },
          {
            name: 'beds_per_1000_seniors',
            displayName: 'SNF Beds per 1,000 Seniors',
            value: data.market.bedsPerThousandSeniors,
            nationalAvg: data.market.nationalBedsPerThousandSeniors,
            percentDiff: data.market.bedsPerThousandSeniorsVsNational,
            percentDiffRegional: data.market.bedsPerThousandSeniorsVsRegional,
            regionalAvg: data.market.regionalBedsPerThousandSeniors,
            unit: 'per 1000',
            description: 'Number of certified nursing home beds per 1,000 population 65+',
            inverseGood: true  // Lower is better (less market saturation)
          },
          {
            name: 'chain_ownership_percent',
            displayName: 'Chain Ownership Percentage',
            value: data.market.chainOwnershipPercent,
            nationalAvg: data.market.nationalChainOwnershipPercent,
            percentDiff: data.market.chainOwnershipPercentVsNational,
            unit: '%',
            description: 'Percentage of facilities owned by multi-facility organizations'
          }
        ]
      },
      topOperators: {
        byFacilities: data.market.topOperatorByFacilities,
        byBeds: data.market.topOperatorByBeds
      }
    }
  }

  const loadDashboardData = async () => {
    try {
      setDashboardLoading(true)

      // Fetch both analysis and facilities data in parallel
      const [analysisResponse, facilitiesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/state/${stateCode}/analysis`),
        fetch(`${API_BASE_URL}/api/state/${stateCode}/facilities?limit=100`)
      ])

      const analysisData = await analysisResponse.json()
      const facilitiesData = await facilitiesResponse.json()

      if (!analysisData.success) {
        throw new Error(analysisData.message || analysisData.error || 'Failed to load dashboard data')
      }

      // Transform the analysis data into the format the UI expects
      const transformedData = transformAnalysisToMetrics(analysisData)

      // Add facilities data
      transformedData.facilities = facilitiesData.facilities || []

      setDashboardData(transformedData)
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

  const formatMetricValue = (value, unit) => {
    // Convert string to number if needed
    const numValue = typeof value === 'string' ? parseFloat(value) : value

    if (isNaN(numValue)) return value // Return as-is if not a number

    switch (unit) {
      case '%':
        return numValue.toFixed(1)
      case 'count':
        return Math.round(numValue).toLocaleString()
      case 'stars':
      case 'per 1000':
      case 'rating':
        return numValue.toFixed(1)
      case '$':
        return numValue.toFixed(2)
      case '$/kWh':
        return `$${numValue.toFixed(3)}/kWh`
      default:
        return numValue.toLocaleString()
    }
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
        <Link to="/state-comparison" className="back-link">
          <ArrowLeft size={16} />
          Back to State Analysis
        </Link>
        <h1>
          <MapPin size={32} />
          {stateCode} State Dashboard
        </h1>
      </div>

      {/* Scorecard */}
      {scorecardData && (
        <div className="state-scorecard">
          <div className="scorecard-header">
            <h3>{scorecardData.stateName} Market Overview</h3>
            {scorecardData.cmsRegionName && (
              <span className="scorecard-region">CMS Region: {scorecardData.cmsRegionName}</span>
            )}
          </div>

          <div className="scorecard-grid">
            <div className="scorecard-item">
              <div className="scorecard-icon">
                <Building2 size={24} />
              </div>
              <div className="scorecard-content">
                <div className="scorecard-value">{scorecardData.market.totalFacilities.toLocaleString()}</div>
                <div className="scorecard-label">Facilities</div>
              </div>
            </div>

            <div className="scorecard-item">
              <div className="scorecard-icon">
                <Users size={24} />
              </div>
              <div className="scorecard-content">
                <div className="scorecard-value">{scorecardData.market.totalBeds.toLocaleString()}</div>
                <div className="scorecard-label">Licensed Beds</div>
                {scorecardData.market.nationalAvgBeds && (
                  <div className="scorecard-comparison">
                    <span className="comparison-label">National Avg:</span>
                    <span className="comparison-value">{Math.round(scorecardData.market.nationalAvgBeds).toLocaleString()}</span>
                    {scorecardData.market.avgBedsVsNational !== 0 && (
                      <span className={`comparison-indicator ${scorecardData.market.avgBedsVsNational > 0 ? 'positive' : 'negative'}`}>
                        {scorecardData.market.avgBedsVsNational > 0 ? '+' : ''}{scorecardData.market.avgBedsVsNational.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="scorecard-item">
              <div className="scorecard-icon">
                <Users size={24} />
              </div>
              <div className="scorecard-content">
                <div className="scorecard-value">{scorecardData.demographics.population65Plus.toLocaleString()}</div>
                <div className="scorecard-label">Population 65+</div>
              </div>
            </div>

            <div className="scorecard-item">
              <div className="scorecard-icon">
                <TrendingUp size={24} />
              </div>
              <div className="scorecard-content">
                <div className="scorecard-value">{scorecardData.market.bedsPerThousandSeniors.toFixed(1)}</div>
                <div className="scorecard-label">Beds per 1,000 Seniors</div>
                {scorecardData.market.nationalBedsPerThousandSeniors && (
                  <div className="scorecard-comparison">
                    <span className="comparison-label">National:</span>
                    <span className="comparison-value">{scorecardData.market.nationalBedsPerThousandSeniors.toFixed(1)}</span>
                    {scorecardData.market.bedsPerThousandSeniorsVsNational !== 0 && (
                      <span className={`comparison-indicator ${scorecardData.market.bedsPerThousandSeniorsVsNational < 0 ? 'positive' : 'negative'}`}>
                        {scorecardData.market.bedsPerThousandSeniorsVsNational > 0 ? '+' : ''}{scorecardData.market.bedsPerThousandSeniorsVsNational.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
                {scorecardData.market.regionalBedsPerThousandSeniors && (
                  <div className="scorecard-comparison">
                    <span className="comparison-label">Regional:</span>
                    <span className="comparison-value">{scorecardData.market.regionalBedsPerThousandSeniors.toFixed(1)}</span>
                    {scorecardData.market.bedsPerThousandSeniorsVsRegional !== 0 && (
                      <span className={`comparison-indicator ${scorecardData.market.bedsPerThousandSeniorsVsRegional < 0 ? 'positive' : 'negative'}`}>
                        {scorecardData.market.bedsPerThousandSeniorsVsRegional > 0 ? '+' : ''}{scorecardData.market.bedsPerThousandSeniorsVsRegional.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
              {/* State Market Map */}
              <section className="market-map-section">
                <h2 className="section-title">
                  <MapPin size={24} />
                  {stateCode} Market Map
                </h2>
                <StateMarketMap stateCode={stateCode} />
              </section>

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

              {/* Top Operators */}
              {dashboardData.topOperators && (dashboardData.topOperators.byFacilities || dashboardData.topOperators.byBeds) && (
                <section className="top-operators-section">
                  <h2 className="section-title">
                    <Building2 size={24} />
                    Largest Operators in {stateCode}
                  </h2>
                  <div className="operators-grid">
                    {dashboardData.topOperators.byFacilities && (
                      <div className="operator-card">
                        <h3>By Number of Facilities</h3>
                        <div className="operator-name">{dashboardData.topOperators.byFacilities.name}</div>
                        <div className="operator-stats">
                          <div className="operator-stat">
                            <span className="stat-label">Facilities:</span>
                            <span className="stat-value">{dashboardData.topOperators.byFacilities.facilityCount}</span>
                          </div>
                          <div className="operator-stat">
                            <span className="stat-label">Total Beds:</span>
                            <span className="stat-value">{dashboardData.topOperators.byFacilities.totalBeds.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {dashboardData.topOperators.byBeds && (
                      <div className="operator-card">
                        <h3>By Number of Beds</h3>
                        <div className="operator-name">{dashboardData.topOperators.byBeds.name}</div>
                        <div className="operator-stats">
                          <div className="operator-stat">
                            <span className="stat-label">Total Beds:</span>
                            <span className="stat-value">{dashboardData.topOperators.byBeds.totalBeds.toLocaleString()}</span>
                          </div>
                          <div className="operator-stat">
                            <span className="stat-label">Facilities:</span>
                            <span className="stat-value">{dashboardData.topOperators.byBeds.facilityCount}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
                                <div className={`metric-comparison-badge ${
                                  metric.inverseGood
                                    ? (metric.percentDiff < 0 ? 'positive' : 'negative')
                                    : (metric.percentDiff < 0 ? 'negative' : 'positive')
                                }`}>
                                  {metric.percentDiff > 0 ? '+' : ''}{metric.percentDiff.toFixed(1)}%
                                </div>
                              )}
                            </div>
                            <div className="metric-detail-value">
                              {metric.unit === '$' && '$'}
                              {formatMetricValue(metric.value, metric.unit)}
                              {metric.unit === '%' && '%'}
                            </div>
                            {metric.nationalAvg && (
                              <div className="metric-national-avg">
                                National avg: {metric.unit === '$' ? '$' : ''}{formatMetricValue(metric.nationalAvg, metric.unit)}{metric.unit === '%' ? '%' : ''}
                              </div>
                            )}
                            {metric.regionalAvg && (
                              <div className="metric-regional-avg">
                                Regional avg: {metric.unit === '$' ? '$' : ''}{formatMetricValue(metric.regionalAvg, metric.unit)}{metric.unit === '%' ? '%' : ''}
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
