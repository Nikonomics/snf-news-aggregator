import { useState, useMemo, useEffect, useRef } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Newspaper, Settings, RefreshCw, Calendar, Bookmark, User, LogIn, UserCircle } from 'lucide-react'
import './App.css'
import FilterPanel from './components/FilterPanel'
import ArticleList from './components/ArticleList'
import AIAnalysis from './components/AIAnalysis'
import ArticleDetail from './components/ArticleDetail'
import TrendingTags from './components/TrendingTags'
import ConferenceDirectory from './components/ConferenceDirectory'
import StateDashboard from './components/StateDashboard'
import StateSelector from './components/StateSelector'
import StateComparisonMap from './components/StateComparisonMap'
import Pagination from './components/Pagination'
import WeeklyInsights from './components/WeeklyInsights'
import MATrackerEnhanced from './components/MATrackerEnhanced'
import PriorityFeed from './components/PriorityFeed'
import RegulatoryFeed from './components/RegulatoryFeed'
import { fetchArticles, fetchArticleStats } from './services/apiService'

function App() {
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [savedArticles, setSavedArticles] = useState(() => {
    const saved = localStorage.getItem('savedArticles')
    return saved ? JSON.parse(saved) : []
  })
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const [filters, setFilters] = useState({
    category: 'All',
    impact: 'all',
    source: 'All Sources',
    dateRange: 'all',
    scope: 'all',
    states: []
  })
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [selectedArticleForDetail, setSelectedArticleForDetail] = useState(null)
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStats, setFilterStats] = useState(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false
  })

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'reset') {
      setFilters({
        category: 'All',
        impact: 'all',
        source: 'All Sources',
        dateRange: 'all',
        scope: 'all',
        states: []
      })
      setSearchTerm('')
    } else {
      setFilters(prev => ({ ...prev, [filterType]: value }))
    }
  }

  const handleTagClick = (tag) => {
    setSearchTerm(tag)
  }

  const loadArticles = async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      // Pass all filters to backend
      const data = await fetchArticles(page, 50, {
        category: filters.category,
        impact: filters.impact,
        source: filters.source,
        search: searchTerm,
        scope: filters.scope,
        states: filters.states
      })
      setArticles(data.articles)
      setPagination(data.pagination)
      setLoading(false)
    } catch (err) {
      setError('Failed to load articles. Please make sure the backend server is running.')
      setLoading(false)
      console.error('Error loading articles:', err)
    }
  }

  const handlePageChange = (newPage) => {
    loadArticles(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    loadArticles()
    // Load filter stats
    fetchArticleStats().then(stats => {
      setFilterStats(stats)
    }).catch(err => {
      console.error('Error loading filter stats:', err)
    })
  }, [])

  // Re-fetch when filters or search changes
  useEffect(() => {
    loadArticles(1)
  }, [filters.category, filters.impact, filters.source, filters.scope, filters.states, searchTerm])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  // Client-side filtering for date only (backend handles everything else)
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      // Date filter (client-side only)
      if (filters.dateRange === 'all') return true
      const articleDate = new Date(article.date || article.published_date)
      const now = new Date()
      const daysDiff = Math.floor((now - articleDate) / (1000 * 60 * 60 * 24))

      switch (filters.dateRange) {
        case 'today': return daysDiff === 0
        case 'week': return daysDiff <= 7
        case 'month': return daysDiff <= 30
        case 'quarter': return daysDiff <= 90
        default: return true
      }
    })
  }, [filters.dateRange, articles])

  const sortedArticles = useMemo(() => {
    const sorted = [...filteredArticles]

    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.date) - new Date(a.date))

      case 'impact':
        const impactOrder = { high: 0, medium: 1, low: 2 }
        return sorted.sort((a, b) => {
          const impactDiff = impactOrder[a.impact] - impactOrder[b.impact]
          if (impactDiff !== 0) return impactDiff
          // Secondary sort by date if impact is the same
          return new Date(b.date) - new Date(a.date)
        })

      case 'relevant':
        return sorted.sort((a, b) => {
          const scoreA = (a.relevance_score || a.analysis?.relevanceScore || 0)
          const scoreB = (b.relevance_score || b.analysis?.relevanceScore || 0)
          if (scoreB !== scoreA) return scoreB - scoreA
          // Secondary sort by date if relevance is the same
          return new Date(b.date) - new Date(a.date)
        })

      default:
        return sorted
    }
  }, [filteredArticles, sortBy])

  // Calculate article counts per state (including both State and Local scope)
  const stateCounts = useMemo(() => {
    const counts = {}
    articles.forEach(article => {
      const scope = article.scope || article.analysis?.scope
      const states = article.states || article.analysis?.states || []

      // Include articles with State or Local scope
      if (scope === 'State' || scope === 'Local') {
        states.forEach(state => {
          if (state && state !== 'N/A') {
            counts[state] = (counts[state] || 0) + 1
          }
        })
      }
    })
    return counts
  }, [articles])

  const toggleSaveArticle = (articleUrl) => {
    setSavedArticles(prev => {
      const newSaved = prev.includes(articleUrl)
        ? prev.filter(url => url !== articleUrl)
        : [...prev, articleUrl]
      localStorage.setItem('savedArticles', JSON.stringify(newSaved))
      return newSaved
    })
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-wrapper">
          {/* Top Bar */}
          <div className="header-top-bar">
            <div className="header-logo">
              <Newspaper size={28} />
              <h1>SNF News Aggregator</h1>
            </div>

            <div className="header-search">
              <input
                type="text"
                placeholder="Search articles, topics, states..."
                className="search-input"
              />
            </div>

            <div className="header-actions">
              {location.pathname === '/' && (
                <button
                  className="refresh-btn"
                  onClick={loadArticles}
                  title="Refresh Articles"
                  disabled={loading}
                >
                  <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                </button>
              )}

              {/* User Menu */}
              <div className="user-menu-container" ref={userMenuRef}>
                <button
                  className="user-menu-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="User menu"
                >
                  <User size={20} />
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown">
                    <Link to="/login" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <LogIn size={16} />
                      <span>Login</span>
                    </Link>
                    <Link to="/saved" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <Bookmark size={16} />
                      <span>Saved</span>
                    </Link>
                    <Link to="/account" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <UserCircle size={16} />
                      <span>Account</span>
                    </Link>
                    <Link to="/settings" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <Settings size={16} />
                      <span>Settings</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="header-nav">
            <Link
              to="/"
              className={`nav-tab ${location.pathname === '/' ? 'active' : ''}`}
            >
              News Feed
            </Link>
            <Link
              to="/priority"
              className={`nav-tab ${location.pathname === '/priority' ? 'active' : ''}`}
            >
              Priority Feed
            </Link>
            <Link
              to="/state-comparison"
              className={`nav-tab ${location.pathname === '/state-comparison' || location.pathname.startsWith('/state/') ? 'active' : ''}`}
            >
              State Analysis
            </Link>
            <Link
              to="/regulatory"
              className={`nav-tab ${location.pathname === '/regulatory' ? 'active' : ''}`}
            >
              Regulatory Feed
            </Link>
            <Link
              to="/ma-tracker"
              className={`nav-tab ${location.pathname === '/ma-tracker' ? 'active' : ''}`}
            >
              M&A Tracker
            </Link>
            <Link
              to="/conferences"
              className={`nav-tab ${location.pathname === '/conferences' ? 'active' : ''}`}
            >
              Conferences
            </Link>
            <Link
              to="/insights"
              className={`nav-tab ${location.pathname === '/insights' || location.pathname.startsWith('/insights/') ? 'active' : ''}`}
            >
              Weekly Insights
            </Link>
            <Link
              to="/tools"
              className={`nav-tab ${location.pathname === '/tools' ? 'active' : ''}`}
            >
              Tools
            </Link>
            <Link
              to="/advocate"
              className={`nav-tab ${location.pathname === '/advocate' ? 'active' : ''}`}
            >
              Advocate
            </Link>
          </nav>

          {/* Tagline */}
          <div className="header-tagline">
            Stay informed with the latest skilled nursing facility industry news and conferences
          </div>
        </div>
      </header>

      <Routes>
        {/* News Feed Route */}
        <Route path="/" element={
          <main className="app-main">
            <aside className="sidebar">
              <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                sortBy={sortBy}
                onSortChange={setSortBy}
                stateCounts={stateCounts}
                filterStats={filterStats}
              />
            </aside>

            <div className="content">
              {error && (
                <div className="error-banner">
                  <p>{error}</p>
                  <button onClick={loadArticles} className="retry-btn">
                    Retry
                  </button>
                </div>
              )}

              {loading ? (
                <div className="loading-container">
                  <div className="spinner-large"></div>
                  <p>Loading articles from RSS feeds...</p>
                </div>
              ) : (
                <>
                  <TrendingTags
                    articles={articles}
                    onTagClick={handleTagClick}
                  />

                  <ArticleList
                    articles={sortedArticles}
                    onAnalyze={setSelectedArticle}
                    onViewDetails={setSelectedArticleForDetail}
                    savedArticles={savedArticles}
                    onToggleSave={toggleSaveArticle}
                  />

                  <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                  />
                </>
              )}
            </div>
          </main>
        } />

        {/* Saved Articles Route */}
        <Route path="/saved" element={
          <main className="app-main">
            <div className="content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ padding: '20px' }}>
                <h2 style={{ marginBottom: '20px' }}>
                  <Bookmark size={24} style={{ marginRight: '8px', display: 'inline', verticalAlign: 'middle' }} />
                  My Saved Articles ({savedArticles.length})
                </h2>
                {savedArticles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                    <Bookmark size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p>No saved articles yet</p>
                    <p style={{ fontSize: '0.9em' }}>Click the bookmark icon on any article to save it here</p>
                  </div>
                ) : (
                  <ArticleList
                    articles={articles.filter(a => savedArticles.includes(a.url))}
                    onAnalyze={setSelectedArticle}
                    onViewDetails={setSelectedArticleForDetail}
                    savedArticles={savedArticles}
                    onToggleSave={toggleSaveArticle}
                  />
                )}
              </div>
            </div>
          </main>
        } />

        {/* Priority Feed Route */}
        <Route path="/priority" element={<PriorityFeed />} />

        {/* State Comparison Map Route */}
        <Route path="/state-comparison" element={<StateComparisonMap />} />

        {/* State Dashboard Route (with articles/sentiment analysis) */}
        <Route path="/state/:stateCode" element={<StateDashboard />} />

        {/* Regulatory Feed Route */}
        <Route path="/regulatory" element={<RegulatoryFeed />} />

        {/* M&A Tracker Route */}
        <Route path="/ma-tracker" element={<MATrackerEnhanced />} />

        {/* Conference Directory Route */}
        <Route path="/conferences" element={<ConferenceDirectory />} />

        {/* Weekly Insights Routes */}
        <Route path="/insights" element={<WeeklyInsights />} />
        <Route path="/insights/:reportId" element={<WeeklyInsights />} />

        {/* Tools Route (Placeholder) */}
        <Route path="/tools" element={
          <main className="app-main">
            <div className="content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Tools</h2>
                <p style={{ color: '#6b7280' }}>Coming soon - SNF industry tools and calculators</p>
              </div>
            </div>
          </main>
        } />

        {/* Advocate Route (Placeholder) */}
        <Route path="/advocate" element={
          <main className="app-main">
            <div className="content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Advocate</h2>
                <p style={{ color: '#6b7280' }}>Coming soon - Advocacy resources and tools</p>
              </div>
            </div>
          </main>
        } />

        {/* Login Route (Placeholder) */}
        <Route path="/login" element={
          <main className="app-main">
            <div className="content" style={{ maxWidth: '400px', margin: '0 auto' }}>
              <div style={{ padding: '40px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '16px', textAlign: 'center' }}>Login</h2>
                <p style={{ color: '#6b7280', textAlign: 'center' }}>Authentication coming soon</p>
              </div>
            </div>
          </main>
        } />

        {/* Account Route (Placeholder) */}
        <Route path="/account" element={
          <main className="app-main">
            <div className="content" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ padding: '40px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>My Account</h2>
                <p style={{ color: '#6b7280' }}>Account management coming soon</p>
              </div>
            </div>
          </main>
        } />

        {/* Settings Route (Placeholder) */}
        <Route path="/settings" element={
          <main className="app-main">
            <div className="content" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ padding: '40px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Settings</h2>
                <p style={{ color: '#6b7280' }}>Settings and preferences coming soon</p>
              </div>
            </div>
          </main>
        } />
      </Routes>

      {selectedArticleForDetail && (
        <ArticleDetail
          article={selectedArticleForDetail}
          onClose={() => setSelectedArticleForDetail(null)}
          onAnalyze={setSelectedArticle}
        />
      )}

      {selectedArticle && (
        <AIAnalysis
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  )
}

export default App
