import { useState, useEffect } from 'react'
import { Building2, TrendingUp, Search, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://snf-news-aggregator.onrender.com'

function IndustryPlayers() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/ma/companies`)
      const data = await response.json()

      if (data.success) {
        setCompanies(data.companies)
        setError(null)
      } else {
        setError('Failed to load companies')
      }
    } catch (err) {
      console.error('Error fetching companies:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2em', color: '#6b7280' }}>Loading industry players...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2em', color: '#ef4444', marginBottom: '16px' }}>{error}</div>
        <button
          onClick={fetchCompanies}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2em', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Building2 size={32} style={{ color: '#3b82f6' }} />
          Industry Players
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.1em', marginBottom: '24px' }}>
          All companies mentioned in M&A activity across the skilled nursing and senior care sectors
        </p>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 44px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1em',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div style={{ padding: '16px 24px', backgroundColor: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '2em', fontWeight: '700', color: '#1e40af' }}>{companies.length}</div>
          <div style={{ fontSize: '0.9em', color: '#6b7280' }}>Total Companies</div>
        </div>
        <div style={{ padding: '16px 24px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '2em', fontWeight: '700', color: '#047857' }}>
            {companies.filter(c => c.role?.includes('acquirer')).length}
          </div>
          <div style={{ fontSize: '0.9em', color: '#6b7280' }}>Active Acquirers</div>
        </div>
        <div style={{ padding: '16px 24px', backgroundColor: '#fef3c7', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '2em', fontWeight: '700', color: '#d97706' }}>
            {companies.filter(c => c.role?.includes('target')).length}
          </div>
          <div style={{ fontSize: '0.9em', color: '#6b7280' }}>Acquisition Targets</div>
        </div>
      </div>

      {/* Companies Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
        {filteredCompanies.map((company) => (
          <Link
            key={company.id}
            to={`/ma/company/${encodeURIComponent(company.name)}`}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <Building2 size={24} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <h3 style={{ margin: 0, fontSize: '1.1em', fontWeight: '600', color: '#111827' }}>
                  {company.name}
                </h3>
              </div>
              <ExternalLink size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {company.role?.includes('acquirer') && (
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '4px',
                  fontSize: '0.8em',
                  fontWeight: '600'
                }}>
                  Acquirer
                </span>
              )}
              {company.role?.includes('target') && (
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  borderRadius: '4px',
                  fontSize: '0.8em',
                  fontWeight: '600'
                }}>
                  Target
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.9em', color: '#6b7280' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <TrendingUp size={14} />
                <span>{company.deal_count || 0} deals</span>
              </div>
              {company.recent_activity && (
                <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#9ca3af' }}>
                  Last activity: {new Date(company.recent_activity).toLocaleDateString()}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
          <Building2 size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2em', color: '#374151', marginBottom: '8px' }}>No Companies Found</h3>
          <p style={{ color: '#6b7280' }}>
            {searchTerm ? `No companies matching "${searchTerm}"` : 'No companies in the database yet'}
          </p>
        </div>
      )}
    </div>
  )
}

export default IndustryPlayers
