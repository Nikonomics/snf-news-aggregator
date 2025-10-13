import { useState, useEffect } from 'react'
import { TrendingUp, Building2, DollarSign, MapPin, Calendar, ExternalLink, Users, PieChart } from 'lucide-react'
import { format } from 'date-fns'

function MATracker() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMADashboard()
  }, [])

  const fetchMADashboard = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:3001/api/ma/dashboard')
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
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2em', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TrendingUp size={32} />
          M&A Tracker
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.1em' }}>
          Track merger and acquisition activity in the skilled nursing industry
        </p>
      </div>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Building2 size={24} style={{ color: '#3b82f6' }} />
            <h3 style={{ fontSize: '0.9em', fontWeight: '600', color: '#6b7280', margin: 0 }}>Total Deals</h3>
          </div>
          <div style={{ fontSize: '2.5em', fontWeight: '700', color: '#111827' }}>{stats.totalDeals}</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <MapPin size={24} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '0.9em', fontWeight: '600', color: '#6b7280', margin: 0 }}>Total Facilities</h3>
          </div>
          <div style={{ fontSize: '2.5em', fontWeight: '700', color: '#111827' }}>{stats.totalFacilities}</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <DollarSign size={24} style={{ color: '#f59e0b' }} />
            <h3 style={{ fontSize: '0.9em', fontWeight: '600', color: '#6b7280', margin: 0 }}>Deals w/ Value</h3>
          </div>
          <div style={{ fontSize: '2.5em', fontWeight: '700', color: '#111827' }}>{stats.dealsWithValue}</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Users size={24} style={{ color: '#8b5cf6' }} />
            <h3 style={{ fontSize: '0.9em', fontWeight: '600', color: '#6b7280', margin: 0 }}>Active Acquirers</h3>
          </div>
          <div style={{ fontSize: '2.5em', fontWeight: '700', color: '#111827' }}>{stats.topAcquirers.length}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Deals by Month */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.3em', fontWeight: '700', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} />
            Deals by Month
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(stats.dealsByMonth)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 12)
              .map(([month, count]) => {
                const maxCount = Math.max(...Object.values(stats.dealsByMonth))
                const percentage = (count / maxCount) * 100

                return (
                  <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ minWidth: '80px', fontSize: '0.9em', color: '#6b7280' }}>
                      {format(new Date(month + '-01'), 'MMM yyyy')}
                    </div>
                    <div style={{ flex: 1, height: '32px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s ease'
                      }} />
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '12px',
                        transform: 'translateY(-50%)',
                        fontSize: '0.85em',
                        fontWeight: '600',
                        color: percentage > 30 ? 'white' : '#111827'
                      }}>
                        {count} {count === 1 ? 'deal' : 'deals'}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Deal Types */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.3em', fontWeight: '700', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={20} />
            Deal Types
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(stats.dealsByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.95em', color: '#374151', fontWeight: '500' }}>{type}</span>
                  <span style={{ fontSize: '1.1em', fontWeight: '700', color: '#111827' }}>{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Top Acquirers */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.3em', fontWeight: '700', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} />
          Most Active Acquirers
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {stats.topAcquirers.slice(0, 10).map((acquirer, index) => (
            <div
              key={acquirer.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: index < 3 ? '#eff6ff' : '#f9fafb',
                borderRadius: '8px',
                borderLeft: index < 3 ? '4px solid #3b82f6' : 'none'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.95em' }}>{acquirer.name}</div>
                <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '4px' }}>
                  {acquirer.dealCount} {acquirer.dealCount === 1 ? 'deal' : 'deals'}
                </div>
              </div>
              {index < 3 && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.9em'
                }}>
                  #{index + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Geographic Distribution */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.3em', fontWeight: '700', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={20} />
          Geographic Distribution
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
          {Object.entries(stats.dealsByState)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 20)
            .map(([state, count]) => (
              <div
                key={state}
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  fontSize: '0.9em'
                }}
              >
                <div style={{ fontWeight: '700', color: '#111827', fontSize: '1.2em' }}>{state}</div>
                <div style={{ color: '#6b7280', fontSize: '0.85em', marginTop: '4px' }}>{count}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Recent Deals */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.3em', fontWeight: '700', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} />
          Recent Deals
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {recentDeals.map((deal) => (
            <div
              key={deal.id}
              style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                borderLeft: '4px solid #3b82f6'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1em', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>
                    {deal.maDetails.acquirer} acquires {deal.maDetails.target}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85em', color: '#6b7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} />
                      {format(new Date(deal.published_date), 'MMM d, yyyy')}
                    </div>
                    {deal.maDetails.dealType && (
                      <div style={{ padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontWeight: '500' }}>
                        {deal.maDetails.dealType}
                      </div>
                    )}
                    {deal.maDetails.facilityCount && (
                      <div>
                        {deal.maDetails.facilityCount} {deal.maDetails.facilityCount === 1 ? 'facility' : 'facilities'}
                      </div>
                    )}
                    {deal.maDetails.states?.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} />
                        {deal.maDetails.states.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                {deal.maDetails.dealValue && deal.maDetails.dealValue !== 'N/A' && (
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

              {deal.maDetails.strategicRationale && (
                <p style={{ margin: '12px 0', color: '#374151', fontSize: '0.95em', lineHeight: '1.6' }}>
                  {deal.maDetails.strategicRationale}
                </p>
              )}

              <a
                href={deal.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '0.9em',
                  fontWeight: '500',
                  marginTop: '8px'
                }}
              >
                Read full article
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Industry Leaders Section */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '32px' }}>
        <h2 style={{ fontSize: '1.3em', fontWeight: '700', color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} />
          Industry Leaders
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.95em', marginBottom: '16px' }}>
          All companies actively acquiring in the skilled nursing sector
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {stats.industryLeaders.map((company) => (
            <div
              key={company}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                fontSize: '0.9em',
                color: '#374151',
                fontWeight: '500'
              }}
            >
              {company}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MATracker
