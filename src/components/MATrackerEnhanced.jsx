import { useState, useEffect } from 'react'
import { TrendingUp, Building2, DollarSign, MapPin, Calendar, ExternalLink, Users, PieChart, Filter, X, Target, TrendingDown, Award, Briefcase } from 'lucide-react'
import { format } from 'date-fns'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://snf-news-aggregator.onrender.com'

function MATrackerEnhanced() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDeal, setSelectedDeal] = useState(null)

  // Simple year filter state
  const [selectedYear, setSelectedYear] = useState('all')
  const [leaderboard, setLeaderboard] = useState(null)

  // Advanced filters (hidden by default)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    states: [],
    dealType: '',
    acquirer: ''
  })

  useEffect(() => {
    fetchMADashboard()
    fetchLeaderboard()
  }, [selectedYear, advancedFilters])

  const fetchMADashboard = async () => {
    try {
      setLoading(true)

      // Build query string with year filter
      const params = new URLSearchParams()

      // Convert year filter to date range
      if (selectedYear !== 'all') {
        params.append('dateFrom', `${selectedYear}-01-01`)
        params.append('dateTo', `${selectedYear}-12-31`)
      }

      // Advanced filters
      if (advancedFilters.dealType) params.append('dealType', advancedFilters.dealType)
      if (advancedFilters.acquirer) params.append('acquirer', advancedFilters.acquirer)
      advancedFilters.states.forEach(state => params.append('states', state))

      const response = await fetch(`${API_BASE_URL}/api/ma/dashboard?${params}`)
      const data = await response.json()

      if (data.success) {
        setDashboardData(data)
        setError(null)
      } else {
        setError('Failed to load M&A data')
      }
    } catch (err) {
      console.error('Error fetching M&A dashboard:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ma/acquirer-leaderboard`)
      const data = await response.json()

      if (data.success) {
        setLeaderboard(data)
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
    }
  }

  const clearFilters = () => {
    setSelectedYear('all')
    setAdvancedFilters({
      states: [],
      dealType: '',
      acquirer: ''
    })
  }

  const hasActiveFilters = selectedYear !== 'all' || advancedFilters.states.length > 0 || advancedFilters.dealType || advancedFilters.acquirer

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2em', color: '#6b7280' }}>Loading M&A data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2em', color: '#ef4444' }}>{error}</div>
      </div>
    )
  }

  const { stats, recentDeals } = dashboardData

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '2em', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <TrendingUp size={32} />
              M&A Tracker
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1.1em' }}>
              Track merger and acquisition activity with enhanced operator intelligence
            </p>
          </div>

          {/* Advanced Filter Toggle */}
          {hasActiveFilters && (
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                padding: '12px 20px',
                backgroundColor: showAdvancedFilters ? '#3b82f6' : 'white',
                color: showAdvancedFilters ? 'white' : '#374151',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '1em'
              }}
            >
              <Filter size={18} />
              Advanced
            </button>
          )}
        </div>

        {/* Simple Year Filter Buttons - Always Visible */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#6b7280', fontWeight: '600', fontSize: '0.95em' }}>Filter by Year:</span>
          {['all', '2025', '2024', '2023', '2022'].map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              style={{
                padding: '10px 20px',
                backgroundColor: selectedYear === year ? '#3b82f6' : 'white',
                color: selectedYear === year ? 'white' : '#374151',
                border: selectedYear === year ? '2px solid #3b82f6' : '2px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.95em',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedYear !== year) {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.backgroundColor = '#eff6ff'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedYear !== year) {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.backgroundColor = 'white'
                }
              }}
            >
              {year === 'all' ? 'All Years' : year}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: '10px 16px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '2px solid #fecaca',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Panel - Hidden by Default */}
      {showAdvancedFilters && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2em', fontWeight: '600', color: '#111827', margin: 0 }}>Advanced Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.9em'
                }}
              >
                Clear All
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Deal Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                Deal Type
              </label>
              <select
                value={advancedFilters.dealType}
                onChange={(e) => setAdvancedFilters({...advancedFilters, dealType: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.95em'
                }}
              >
                <option value="">All Types</option>
                {Object.keys(stats.dealsByType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Acquirer Search */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                Acquirer
              </label>
              <input
                type="text"
                placeholder="Search acquirer..."
                value={advancedFilters.acquirer}
                onChange={(e) => setAdvancedFilters({...advancedFilters, acquirer: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.95em'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout: Stats + Chart on Left, Leaderboard on Right */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', alignItems: 'flex-start' }}>

        {/* Left Column: Stats Cards + Quarterly Chart */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Stats Cards in 2x2 Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <Building2 size={20} style={{ color: '#3b82f6' }} />
                <h3 style={{ fontSize: '0.85em', fontWeight: '600', color: '#6b7280', margin: 0 }}>Total Deals</h3>
              </div>
              <div style={{ fontSize: '2.2em', fontWeight: '700', color: '#111827' }}>{stats.totalDeals}</div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <MapPin size={20} style={{ color: '#10b981' }} />
                <h3 style={{ fontSize: '0.85em', fontWeight: '600', color: '#6b7280', margin: 0 }}>Total Facilities</h3>
              </div>
              <div style={{ fontSize: '2.2em', fontWeight: '700', color: '#111827' }}>{stats.totalFacilities}</div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <DollarSign size={20} style={{ color: '#f59e0b' }} />
                <h3 style={{ fontSize: '0.85em', fontWeight: '600', color: '#6b7280', margin: 0 }}>Deals w/ Value</h3>
              </div>
              <div style={{ fontSize: '2.2em', fontWeight: '700', color: '#111827' }}>{stats.dealsWithValue}</div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <Users size={20} style={{ color: '#8b5cf6' }} />
                <h3 style={{ fontSize: '0.85em', fontWeight: '600', color: '#6b7280', margin: 0 }}>Active Acquirers</h3>
              </div>
              <div style={{ fontSize: '2.2em', fontWeight: '700', color: '#111827' }}>{stats.topAcquirers.length}</div>
            </div>
          </div>

          {/* Quarterly Chart */}
          <QuarterlyDealsChart dealsByMonth={stats.dealsByMonth} />
        </div>

        {/* Right Column: YTD Leaderboard */}
        {leaderboard && leaderboard.leaderboard && leaderboard.leaderboard.length > 0 && (
          <div style={{ width: '320px', flexShrink: 0, backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '2px solid #f59e0b' }}>
              <h3 style={{ fontSize: '0.95em', fontWeight: '700', color: '#111827', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={18} style={{ color: '#f59e0b' }} />
                {leaderboard.year} Leaderboard
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.75em', margin: 0 }}>
                Top acquirers by deal count
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {leaderboard.leaderboard.slice(0, 10).map((acquirer, index) => (
                <div
                  key={acquirer.acquirer}
                  style={{
                    padding: '10px',
                    backgroundColor: index < 3 ? '#fef3c7' : '#f9fafb',
                    borderRadius: '6px',
                    border: index < 3 ? '1px solid #fbbf24' : '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#d1d5db' : index === 2 ? '#f59e0b' : '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '0.8em',
                    color: index < 3 ? 'white' : '#6b7280',
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </div>

                  {/* Acquirer Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.85em', color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {acquirer.acquirer}
                    </div>
                    <div style={{ fontSize: '0.7em', color: '#6b7280' }}>
                      {acquirer.dealCount} deal{acquirer.dealCount !== 1 ? 's' : ''}
                      {acquirer.totalBeds > 0 && ` • ${acquirer.totalBeds} beds`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deal Cards with Enhanced Data */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.3em', fontWeight: '700', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} />
          Recent Deals ({recentDeals.length})
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {recentDeals.map((deal) => (
            <div
              key={deal.id}
              onClick={() => setSelectedDeal(deal)}
              style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                borderLeft: '4px solid #3b82f6',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
                e.currentTarget.style.transform = 'translateX(4px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb'
                e.currentTarget.style.transform = 'translateX(0)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1em', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>
                    {deal.maDetails.acquirer} → {deal.maDetails.target}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85em', color: '#6b7280' }}>
                    {deal.date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {format(new Date(deal.date), 'MMM d, yyyy')}
                      </div>
                    )}
                    {deal.maDetails.dealType && (
                      <div style={{ padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontWeight: '500' }}>
                        {deal.maDetails.dealType}
                      </div>
                    )}
                    {deal.maDetails.facilityCount && (
                      <div>{deal.maDetails.facilityCount} {deal.maDetails.facilityCount === 1 ? 'facility' : 'facilities'}</div>
                    )}
                    {deal.maDetails.states?.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} />
                        {deal.maDetails.states.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                {deal.maDetails.dealValue && deal.maDetails.dealValue !== 'Undisclosed' && deal.maDetails.dealValue !== 'N/A' && (
                  <div style={{
                    padding: '8px 16px',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '1em',
                    whiteSpace: 'nowrap'
                  }}>
                    {deal.maDetails.dealValue}
                  </div>
                )}
              </div>

              {/* Competitive Signal Preview */}
              {deal.maDetails.competitiveImplications && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '6px',
                  borderLeft: '3px solid #f59e0b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Target size={14} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: '0.8em', fontWeight: '600', color: '#92400e' }}>COMPETITIVE SIGNAL</span>
                  </div>
                  <p style={{ margin: 0, color: '#78350f', fontSize: '0.9em', lineHeight: '1.5' }}>
                    {deal.maDetails.competitiveImplications.substring(0, 150)}...
                  </p>
                </div>
              )}

              <div style={{
                marginTop: '12px',
                fontSize: '0.85em',
                color: '#3b82f6',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                Click for full analysis →
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </div>
  )
}

// Quarterly Deals Chart Component
function QuarterlyDealsChart({ dealsByMonth }) {
  // Convert monthly data to quarterly data for last 3 years
  const getQuarterlyData = () => {
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 2 // Last 3 years

    const quarterlyData = {}

    // Initialize all quarters for last 3 years
    for (let year = startYear; year <= currentYear; year++) {
      for (let q = 1; q <= 4; q++) {
        quarterlyData[`${year} Q${q}`] = 0
      }
    }

    // Aggregate monthly data into quarters
    Object.entries(dealsByMonth || {}).forEach(([monthStr, count]) => {
      const [year, month] = monthStr.split('-').map(Number)
      if (year >= startYear && year <= currentYear) {
        const quarter = Math.ceil(month / 3)
        const key = `${year} Q${quarter}`
        quarterlyData[key] += count
      }
    })

    // Convert to array and sort chronologically
    return Object.entries(quarterlyData)
      .sort(([a], [b]) => {
        const [yearA, qA] = a.split(' Q')
        const [yearB, qB] = b.split(' Q')
        return yearA === yearB ? Number(qA) - Number(qB) : Number(yearA) - Number(yearB)
      })
      .map(([quarter, count]) => ({ quarter, count }))
  }

  const data = getQuarterlyData()
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ fontSize: '1.1em', fontWeight: '700', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <PieChart size={20} style={{ color: '#3b82f6' }} />
        Quarterly Deal Activity
      </h3>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', padding: '0 10px' }}>
        {data.map(({ quarter, count }) => {
          const height = maxCount > 0 ? (count / maxCount) * 160 : 0

          return (
            <div key={quarter} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              {/* Bar */}
              <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                height: '160px',
                position: 'relative'
              }}>
                <div
                  style={{
                    width: '100%',
                    height: `${height}px`,
                    backgroundColor: count > 0 ? '#3b82f6' : '#e5e7eb',
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (count > 0) {
                      e.currentTarget.style.backgroundColor = '#2563eb'
                      e.currentTarget.style.transform = 'scaleY(1.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (count > 0) {
                      e.currentTarget.style.backgroundColor = '#3b82f6'
                      e.currentTarget.style.transform = 'scaleY(1)'
                    }
                  }}
                >
                  {count > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.75em',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {count}
                    </div>
                  )}
                </div>
              </div>

              {/* Label */}
              <div style={{
                fontSize: '0.7em',
                color: '#6b7280',
                fontWeight: '500',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}>
                {quarter}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Deal Detail Modal Component
function DealDetailModal({ deal, onClose }) {
  const { maDetails } = deal

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '32px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <X size={24} color="#6b7280" />
        </button>

        {/* Header */}
        <h2 style={{ fontSize: '1.8em', fontWeight: '700', color: '#111827', marginBottom: '8px', paddingRight: '40px' }}>
          {maDetails.acquirer} acquires {maDetails.target}
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {deal.date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9em', color: '#6b7280' }}>
              <Calendar size={16} />
              {format(new Date(deal.date), 'MMMM d, yyyy')}
            </div>
          )}
          {maDetails.dealType && (
            <div style={{ padding: '4px 12px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '6px', fontWeight: '600', fontSize: '0.9em' }}>
              {maDetails.dealType}
            </div>
          )}
        </div>

        {/* Key Deal Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8em', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>DEAL VALUE</div>
            <div style={{ fontSize: '1.5em', fontWeight: '700', color: '#111827' }}>{maDetails.dealValue || 'Undisclosed'}</div>
          </div>
          {maDetails.facilityCount && (
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8em', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>FACILITIES</div>
              <div style={{ fontSize: '1.5em', fontWeight: '700', color: '#111827' }}>{maDetails.facilityCount}</div>
            </div>
          )}
          {maDetails.states?.length > 0 && (
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8em', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>STATES</div>
              <div style={{ fontSize: '1.2em', fontWeight: '700', color: '#111827' }}>{maDetails.states.join(', ')}</div>
            </div>
          )}
        </div>

        {/* Valuation Metrics */}
        {maDetails.valuationMetrics && (
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#ecfdf5', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
            <h3 style={{ fontSize: '1.2em', fontWeight: '700', color: '#065f46', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={20} />
              Valuation Analysis
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {maDetails.valuationMetrics.pricePerFacility && (
                <div>
                  <div style={{ fontSize: '0.8em', color: '#065f46', fontWeight: '600' }}>Price per Facility</div>
                  <div style={{ fontSize: '1.3em', fontWeight: '700', color: '#047857' }}>{maDetails.valuationMetrics.pricePerFacility}</div>
                </div>
              )}
              {maDetails.valuationMetrics.impliedMultiple && (
                <div>
                  <div style={{ fontSize: '0.8em', color: '#065f46', fontWeight: '600' }}>Implied Multiple</div>
                  <div style={{ fontSize: '1.3em', fontWeight: '700', color: '#047857' }}>{maDetails.valuationMetrics.impliedMultiple}</div>
                </div>
              )}
            </div>
            {maDetails.valuationMetrics.valuationContext && (
              <p style={{ marginTop: '12px', color: '#065f46', fontSize: '0.95em', lineHeight: '1.6' }}>
                {maDetails.valuationMetrics.valuationContext}
              </p>
            )}
          </div>
        )}

        {/* Asset Quality */}
        {maDetails.assetQuality && maDetails.assetQuality !== 'Unknown' && (
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#eff6ff', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
            <h3 style={{ fontSize: '1.2em', fontWeight: '700', color: '#1e40af', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} />
              Asset Quality
            </h3>
            <p style={{ margin: 0, color: '#1e40af', fontSize: '0.95em', lineHeight: '1.6' }}>
              {maDetails.assetQuality}
            </p>
          </div>
        )}

        {/* Acquirer Profile */}
        {maDetails.acquirerProfile && (
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f5f3ff', borderRadius: '12px', borderLeft: '4px solid #8b5cf6' }}>
            <h3 style={{ fontSize: '1.2em', fontWeight: '700', color: '#6b21a8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={20} />
              Acquirer Intelligence
            </h3>

            {maDetails.acquirerProfile.acquisitionHistory && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.9em', fontWeight: '700', color: '#6b21a8', marginBottom: '8px' }}>Acquisition History</h4>
                <p style={{ margin: 0, color: '#5b21b6', fontSize: '0.95em', lineHeight: '1.6' }}>{maDetails.acquirerProfile.acquisitionHistory}</p>
              </div>
            )}

            {maDetails.acquirerProfile.strategicFocus && maDetails.acquirerProfile.strategicFocus !== 'Unknown' && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.9em', fontWeight: '700', color: '#6b21a8', marginBottom: '8px' }}>Strategic Focus</h4>
                <p style={{ margin: 0, color: '#5b21b6', fontSize: '0.95em', lineHeight: '1.6' }}>{maDetails.acquirerProfile.strategicFocus}</p>
              </div>
            )}

            {maDetails.acquirerProfile.operationalApproach && maDetails.acquirerProfile.operationalApproach !== 'Unknown' && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.9em', fontWeight: '700', color: '#6b21a8', marginBottom: '8px' }}>Operational Approach</h4>
                <p style={{ margin: 0, color: '#5b21b6', fontSize: '0.95em', lineHeight: '1.6' }}>{maDetails.acquirerProfile.operationalApproach}</p>
              </div>
            )}

            {maDetails.acquirerProfile.marketReputation && maDetails.acquirerProfile.marketReputation !== 'Unknown' && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.9em', fontWeight: '700', color: '#6b21a8', marginBottom: '8px' }}>Market Reputation</h4>
                <p style={{ margin: 0, color: '#5b21b6', fontSize: '0.95em', lineHeight: '1.6' }}>{maDetails.acquirerProfile.marketReputation}</p>
              </div>
            )}

            {maDetails.acquirerProfile.competitiveSignal && (
              <div>
                <h4 style={{ fontSize: '0.9em', fontWeight: '700', color: '#6b21a8', marginBottom: '8px' }}>Competitive Signal</h4>
                <p style={{ margin: 0, color: '#5b21b6', fontSize: '0.95em', lineHeight: '1.6' }}>{maDetails.acquirerProfile.competitiveSignal}</p>
              </div>
            )}
          </div>
        )}

        {/* Competitive Implications */}
        {maDetails.competitiveImplications && (
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#fef3c7', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
            <h3 style={{ fontSize: '1.2em', fontWeight: '700', color: '#92400e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={20} />
              Competitive Implications
            </h3>
            <p style={{ margin: 0, color: '#78350f', fontSize: '0.95em', lineHeight: '1.6' }}>
              {maDetails.competitiveImplications}
            </p>
          </div>
        )}

        {/* Strategic Rationale */}
        {maDetails.strategicRationale && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1em', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>Strategic Rationale</h3>
            <p style={{ margin: 0, color: '#374151', fontSize: '0.95em', lineHeight: '1.7' }}>
              {maDetails.strategicRationale}
            </p>
          </div>
        )}

        {/* Additional Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {maDetails.acquirerType && (
            <div>
              <h4 style={{ fontSize: '0.85em', fontWeight: '700', color: '#6b7280', marginBottom: '6px' }}>Acquirer Type</h4>
              <p style={{ margin: 0, color: '#111827', fontSize: '0.95em' }}>{maDetails.acquirerType}</p>
            </div>
          )}
          {maDetails.sellerType && (
            <div>
              <h4 style={{ fontSize: '0.85em', fontWeight: '700', color: '#6b7280', marginBottom: '6px' }}>Seller Type</h4>
              <p style={{ margin: 0, color: '#111827', fontSize: '0.95em' }}>{maDetails.sellerType}</p>
            </div>
          )}
        </div>

        {/* Source Link */}
        <a
          href={deal.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '1em'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          Read Full Article
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  )
}

export default MATrackerEnhanced
