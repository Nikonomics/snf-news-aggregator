import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, MapPin, DollarSign, Users, Building2, Star, Calendar } from 'lucide-react'
import StateComparisonHeatMap from './StateComparisonHeatMap'
import './StateComparisonMap.css'

const API_BASE_URL = 'https://snf-news-aggregator.onrender.com'

function StateComparisonMap() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statesData, setStatesData] = useState([])
  const [rankings, setRankings] = useState(null)
  const [activeMetric, setActiveMetric] = useState('overall')
  const [hoveredState, setHoveredState] = useState(null)
  const [upcomingConferences, setUpcomingConferences] = useState([])

  // Load state comparison data
  useEffect(() => {
    loadComparisonData()
    loadUpcomingConferences()
  }, [activeMetric])

  const loadComparisonData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [comparisonRes, rankingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/states/comparison?metric=${activeMetric}`),
        fetch(`${API_BASE_URL}/api/states/rankings`)
      ])

      const comparisonData = await comparisonRes.json()
      const rankingsData = await rankingsRes.json()

      if (!comparisonData.success || !rankingsData.success) {
        throw new Error('Failed to load state data')
      }

      setStatesData(comparisonData.states)
      setRankings(rankingsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadUpcomingConferences = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conferences`)
      const data = await response.json()

      if (data.success) {
        const today = new Date()
        const threeMonthsFromNow = new Date()
        threeMonthsFromNow.setMonth(today.getMonth() + 3)

        // Combine state and national conferences
        const allConferences = [
          ...data.stateConferences,
          ...data.nationalConferences
        ]

        // Filter to next 3 months, exclude TBD/unannounced conferences, and sort by date
        const upcoming = allConferences
          .filter(conf => {
            // Exclude conferences with "No 2025 dates announced" or tentative status with year-end dates
            if (conf.event.includes('No 2025 dates announced') ||
                conf.event.includes('No dates announced')) {
              return false
            }

            // Exclude conferences scheduled for 12/31 (placeholder dates)
            const confDate = new Date(conf.dateStart)
            if (confDate.getMonth() === 11 && confDate.getDate() === 31) {
              return false
            }

            return confDate >= today && confDate <= threeMonthsFromNow
          })
          .sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart))

        setUpcomingConferences(upcoming)
      }
    } catch (err) {
      console.error('Error loading conferences:', err)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const metricViews = [
    { id: 'overall', label: 'Overall Score', icon: TrendingUp },
    { id: 'profitability', label: 'Profitability', icon: DollarSign },
    { id: 'reimbursement', label: 'Reimbursement', icon: DollarSign },
    { id: 'labor', label: 'Labor Market', icon: Users },
    { id: 'market', label: 'Market Supply/Demand', icon: Building2 },
    { id: 'quality', label: 'Quality', icon: Star }
  ]

  if (error) {
    return (
      <div className="state-comparison-error">
        <p>Error loading state comparison data: {error}</p>
      </div>
    )
  }

  return (
    <div className="state-comparison-container">
      <div className="content-with-sidebar">
        <div className="main-column">
          <div className="comparison-header">
            <div className="header-content">
              <h1>
                <MapPin size={32} />
                State Market Analysis
              </h1>
              <p className="header-subtitle">
                Compare all 50 states based on market conditions, profitability, and operating environment
              </p>

              {/* Explainer Paragraph */}
              <p className="explainer-text">
                Compare all 50 states across key metrics affecting SNF operations. Our scoring system analyzes reimbursement rates, labor markets, regulatory environment, and quality standards. Each state receives an Overall Score (0-100) combining: Profitability (30%), Reimbursement (30%), Labor Market (20%), Market Supply/Demand (15%), and Quality (5%). <a href="#methodology" className="methodology-link">Learn more about our methodology.</a>
              </p>
            </div>
          </div>

          {/* Metric Toggle Buttons */}
          <div className="metric-toggle-section">
            <div className="metric-buttons">
              {metricViews.map(view => {
                const Icon = view.icon
                return (
                  <button
                    key={view.id}
                    className={`metric-button ${activeMetric === view.id ? 'active' : ''}`}
                    onClick={() => setActiveMetric(view.id)}
                  >
                    <Icon size={16} />
                    {view.label}
                  </button>
                )
              })}
            </div>
            <div className="last-updated">
              Data last updated: October 2025
            </div>
          </div>

          {loading ? (
            <div className="comparison-loading">
              <div className="spinner" />
              <p>Loading state comparison data...</p>
            </div>
          ) : (
            <>
              {/* Three-column layout: Map, Rankings, Conferences */}
              <div className="three-column-layout">
                {/* Heat Map (Priority 1) */}
                <StateComparisonHeatMap
                  statesData={statesData}
                  activeMetric={activeMetric}
                />

                {/* Top and Bottom Performers (Priority 2) */}
                {rankings && (
                  <div className="rankings-beside-map">
                    <div className="rankings-column-compact">
                      <h3>Top 5 States</h3>
                      <div className="ranking-list">
                        {rankings.top10.slice(0, 5).map((state, idx) => (
                          <div
                            key={state.code}
                            className="ranking-item"
                            onClick={() => navigate(`/state/${state.code}`)}
                          >
                            <div className="rank-number">{idx + 1}</div>
                            <div className="rank-details">
                              <div className="rank-name">{state.name}</div>
                              <div className="rank-score">Score: {state.scores.overallScore.toFixed(1)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rankings-column-compact">
                      <h3>Bottom 5 States</h3>
                      <div className="ranking-list">
                        {rankings.bottom10.slice(0, 5).map((state, idx) => (
                          <div
                            key={state.code}
                            className="ranking-item"
                            onClick={() => navigate(`/state/${state.code}`)}
                          >
                            <div className="rank-number">{50 - idx}</div>
                            <div className="rank-details">
                              <div className="rank-name">{state.name}</div>
                              <div className="rank-score">Score: {state.scores.overallScore.toFixed(1)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Conferences (Priority 3) */}
                {upcomingConferences.length > 0 && (
                  <div className="conferences-section-inline">
                    <h3>
                      <Calendar size={18} />
                      Upcoming Conferences
                    </h3>
                    <div className="conferences-list">
                      {upcomingConferences.map(conf => (
                        <div key={conf.id} className="conference-card">
                          <div className="conference-date">
                            <span className="date-month">{formatDate(conf.dateStart).split(' ')[0]}</span>
                            <span className="date-day">{formatDate(conf.dateStart).split(' ')[1].replace(',', '')}</span>
                          </div>
                          <div className="conference-details">
                            <div className="conference-title">{conf.event}</div>
                            <div className="conference-org">{conf.organization || conf.association}</div>
                            <div className="conference-location">
                              <MapPin size={12} />
                              {conf.location}
                            </div>
                            {conf.dateEnd && conf.dateEnd !== conf.dateStart && (
                              <div className="conference-dates-range">
                                {formatDate(conf.dateStart)} - {formatDate(conf.dateEnd)}
                              </div>
                            )}
                          </div>
                          {conf.website && (
                            <a
                              href={conf.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="conference-link"
                            >
                              Details →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Color Legend - Gradient */}
              <div className="color-legend">
                <div className="legend-title">Score Range (Heat Map)</div>
                <div className="legend-gradient-container">
                  <div className="legend-gradient">
                    <div className="gradient-bar" style={{
                      background: 'linear-gradient(to right, #dc2626 0%, #f97316 25%, #fbbf24 50%, #a3e635 75%, #22c55e 100%)'
                    }} />
                    <div className="gradient-labels">
                      <span>0</span>
                      <span>25</span>
                      <span>50</span>
                      <span>75</span>
                      <span>100</span>
                    </div>
                  </div>
                  <div className="gradient-description">
                    <span className="description-label">Challenging</span>
                    <span className="description-label">Favorable</span>
                  </div>
                </div>
              </div>


              {/* Methodology Note */}
              <div className="methodology-note">
                <h4>Scoring Methodology</h4>
                <p>
                  The composite score is calculated using a weighted formula that prioritizes profitability
                  and market conditions for SNF operators:
                </p>
                <ul>
                  <li><strong>Labor Cost Index (25%):</strong> Lower wages and staffing requirements improve score</li>
                  <li><strong>Reimbursement Index (25%):</strong> Higher Medicaid rates improve score</li>
                  <li><strong>Profitability Ratio (20%):</strong> Ratio of reimbursement to labor costs</li>
                  <li><strong>Market Opportunity (20%):</strong> Senior population growth + market saturation</li>
                  <li><strong>Quality Environment (10%):</strong> Star ratings and occupancy rates</li>
                </ul>
                <p className="prototype-disclaimer">
                  <strong>Note:</strong> This prototype uses representative dummy data. In production, data
                  would be sourced from CMS, BLS, state Medicaid agencies, and Census Bureau.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default StateComparisonMap
