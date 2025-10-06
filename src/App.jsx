import { useState, useMemo, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Newspaper, Settings, RefreshCw, Calendar } from 'lucide-react'
import './App.css'
import SearchBar from './components/SearchBar'
import FilterPanel from './components/FilterPanel'
import ArticleList from './components/ArticleList'
import AIAnalysis from './components/AIAnalysis'
import ArticleDetail from './components/ArticleDetail'
import TrendingTags from './components/TrendingTags'
import ConferenceDirectory from './components/ConferenceDirectory'
import { fetchArticles } from './services/apiService'

function App() {
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    category: 'All',
    impact: 'all',
    source: 'All Sources',
    dateRange: 'all'
  })
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [selectedArticleForDetail, setSelectedArticleForDetail] = useState(null)
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'reset') {
      setFilters({
        category: 'All',
        impact: 'all',
        source: 'All Sources',
        dateRange: 'all'
      })
      setSearchTerm('')
    } else {
      setFilters(prev => ({ ...prev, [filterType]: value }))
    }
  }

  const handleTagClick = (tag) => {
    setSearchTerm(tag)
  }

  const loadArticles = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchArticles()
      setArticles(data)
      setLoading(false)
    } catch (err) {
      setError('Failed to load articles. Please make sure the backend server is running.')
      setLoading(false)
      console.error('Error loading articles:', err)
    }
  }

  useEffect(() => {
    loadArticles()
  }, [])

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      // Search filter
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = !searchTerm ||
        article.title.toLowerCase().includes(searchLower) ||
        article.summary.toLowerCase().includes(searchLower) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchLower))

      // Category filter
      const matchesCategory = filters.category === 'All' ||
        article.category === filters.category

      // Impact filter
      const matchesImpact = filters.impact === 'all' ||
        article.impact === filters.impact

      // Source filter
      const matchesSource = filters.source === 'All Sources' ||
        article.source === filters.source

      // Date filter
      const matchesDate = (() => {
        if (filters.dateRange === 'all') return true
        const articleDate = new Date(article.date)
        const now = new Date()
        const daysDiff = Math.floor((now - articleDate) / (1000 * 60 * 60 * 24))

        switch (filters.dateRange) {
          case 'today': return daysDiff === 0
          case 'week': return daysDiff <= 7
          case 'month': return daysDiff <= 30
          case 'quarter': return daysDiff <= 90
          default: return true
        }
      })()

      return matchesSearch && matchesCategory && matchesImpact &&
             matchesSource && matchesDate
    }).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [searchTerm, filters, articles])

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <Newspaper size={32} />
            <h1>SNF News Aggregator</h1>
          </div>

          {/* Navigation */}
          <nav className="main-nav">
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              News Feed
            </Link>
            <span className="nav-separator">|</span>
            <Link
              to="/conferences"
              className={`nav-link ${location.pathname === '/conferences' ? 'active' : ''}`}
            >
              Conferences
            </Link>
          </nav>

          {location.pathname === '/' && (
            <button
              className="settings-btn"
              onClick={loadArticles}
              title="Refresh Articles"
              disabled={loading}
            >
              <RefreshCw size={20} className={loading ? 'spinning' : ''} />
            </button>
          )}
          <p className="header-subtitle">
            Stay informed with the latest skilled nursing facility industry news and conferences
          </p>
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
              />
              <TrendingTags
                articles={articles}
                onTagClick={handleTagClick}
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
                  <SearchBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onClear={() => setSearchTerm('')}
                  />

                  <ArticleList
                    articles={filteredArticles}
                    onAnalyze={setSelectedArticle}
                    onViewDetails={setSelectedArticleForDetail}
                  />
                </>
              )}
            </div>
          </main>
        } />

        {/* Conference Directory Route */}
        <Route path="/conferences" element={<ConferenceDirectory />} />
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
