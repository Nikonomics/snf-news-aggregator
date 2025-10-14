import { Routes, Route, Link, useLocation } from 'react-router-dom'
import MATrackerEnhanced from './MATrackerEnhanced'
import IndustryPlayers from './IndustryPlayers'

function MASection() {
  const location = useLocation()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sub-navigation */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 20px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          gap: '32px'
        }}>
          <Link
            to="/ma"
            style={{
              padding: '16px 0',
              fontSize: '0.95em',
              fontWeight: '600',
              color: location.pathname === '/ma' ? '#3b82f6' : '#6b7280',
              textDecoration: 'none',
              borderBottom: location.pathname === '/ma' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            Overview
          </Link>
          <Link
            to="/ma/players"
            style={{
              padding: '16px 0',
              fontSize: '0.95em',
              fontWeight: '600',
              color: location.pathname === '/ma/players' ? '#3b82f6' : '#6b7280',
              textDecoration: 'none',
              borderBottom: location.pathname === '/ma/players' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            Industry Players
          </Link>
        </div>
      </div>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<MATrackerEnhanced />} />
        <Route path="/players" element={<IndustryPlayers />} />
        <Route path="/company/:companyName" element={
          <div style={{ padding: '40px', textAlign: 'center', maxWidth: '1400px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#111827' }}>Company Profile</h2>
            <p style={{ color: '#6b7280' }}>Company profile page coming soon</p>
          </div>
        } />
      </Routes>
    </div>
  )
}

export default MASection
