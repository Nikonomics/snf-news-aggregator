import { useState, useEffect } from 'react'
import { Zap, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import HeroArticleCard from './HeroArticleCard'
import CompactArticleCard from './CompactArticleCard'

function PriorityFeed() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savedArticles, setSavedArticles] = useState(() => {
    const saved = localStorage.getItem('savedArticles')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    fetchPriorityArticles()
  }, [])

  const fetchPriorityArticles = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:3001/api/articles/priority?limit=20')
      const data = await response.json()

      if (data.success) {
        setArticles(data.articles)
        setError(null)
      } else {
        setError('Failed to load priority articles')
      }
    } catch (err) {
      console.error('Error fetching priority articles:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
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

  const getUrgencyLabel = (score) => {
    if (score >= 80) return { label: 'Critical', color: '#dc2626' }
    if (score >= 60) return { label: 'High', color: '#ea580c' }
    if (score >= 40) return { label: 'Moderate', color: '#f59e0b' }
    return { label: 'Standard', color: '#6b7280' }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2em', color: '#6b7280' }}>Loading priority articles...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2em', color: '#ef4444', marginBottom: '16px' }}>{error}</div>
        <button
          onClick={fetchPriorityArticles}
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

  // Separate articles by urgency level
  const criticalArticles = articles.filter(a => (a.analysis?.urgencyScore || 0) >= 80)
  const highUrgency = articles.filter(a => {
    const score = a.analysis?.urgencyScore || 0
    return score >= 60 && score < 80
  })
  const moderateUrgency = articles.filter(a => {
    const score = a.analysis?.urgencyScore || 0
    return score >= 40 && score < 60
  })
  const standardUrgency = articles.filter(a => {
    const score = a.analysis?.urgencyScore || 0
    return score >= 20 && score < 40
  })

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2em', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Zap size={32} style={{ color: '#f59e0b' }} />
          Priority Feed
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.1em', marginBottom: '16px' }}>
          Time-sensitive, high-impact articles that require immediate attention
        </p>

        {/* Stats Bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 16px', backgroundColor: '#fef2f2', borderLeft: '3px solid #dc2626', borderRadius: '6px' }}>
            <span style={{ fontWeight: '600', color: '#dc2626' }}>{criticalArticles.length}</span>
            <span style={{ color: '#6b7280', marginLeft: '6px', fontSize: '0.9em' }}>Critical</span>
          </div>
          <div style={{ padding: '8px 16px', backgroundColor: '#fff7ed', borderLeft: '3px solid #ea580c', borderRadius: '6px' }}>
            <span style={{ fontWeight: '600', color: '#ea580c' }}>{highUrgency.length}</span>
            <span style={{ color: '#6b7280', marginLeft: '6px', fontSize: '0.9em' }}>High</span>
          </div>
          <div style={{ padding: '8px 16px', backgroundColor: '#fffbeb', borderLeft: '3px solid #f59e0b', borderRadius: '6px' }}>
            <span style={{ fontWeight: '600', color: '#f59e0b' }}>{moderateUrgency.length}</span>
            <span style={{ color: '#6b7280', marginLeft: '6px', fontSize: '0.9em' }}>Moderate</span>
          </div>
          <div style={{ padding: '8px 16px', backgroundColor: '#f9fafb', borderLeft: '3px solid #6b7280', borderRadius: '6px' }}>
            <span style={{ fontWeight: '600', color: '#6b7280' }}>{standardUrgency.length}</span>
            <span style={{ color: '#6b7280', marginLeft: '6px', fontSize: '0.9em' }}>Standard</span>
          </div>
        </div>
      </div>

      {articles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
          <Zap size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2em', color: '#374151', marginBottom: '8px' }}>No Priority Articles</h3>
          <p style={{ color: '#6b7280' }}>All caught up! No urgent items at this time.</p>
        </div>
      )}

      {/* Critical Articles */}
      {criticalArticles.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px 20px', backgroundColor: '#fef2f2', borderLeft: '4px solid #dc2626', borderRadius: '8px' }}>
            <AlertCircle size={24} style={{ color: '#dc2626' }} />
            <div>
              <h2 style={{ fontSize: '1.3em', fontWeight: '700', color: '#dc2626', margin: 0 }}>Critical Priority</h2>
              <p style={{ fontSize: '0.9em', color: '#6b7280', margin: '4px 0 0 0' }}>Requires immediate attention and action</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {criticalArticles.map((article, index) => (
              <div key={article.id} style={{ position: 'relative' }}>
                {index === 0 ? (
                  <HeroArticleCard
                    article={article}
                    isSaved={savedArticles?.includes(article.url)}
                    onToggleSave={toggleSaveArticle}
                  />
                ) : (
                  <CompactArticleCard
                    article={article}
                    isSaved={savedArticles?.includes(article.url)}
                    onToggleSave={toggleSaveArticle}
                  />
                )}
                {/* Urgency Badge Overlay */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '6px 12px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                }}>
                  <Zap size={14} />
                  {article.analysis?.urgencyScore || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High Urgency */}
      {highUrgency.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px 20px', backgroundColor: '#fff7ed', borderLeft: '4px solid #ea580c', borderRadius: '8px' }}>
            <TrendingUp size={24} style={{ color: '#ea580c' }} />
            <div>
              <h2 style={{ fontSize: '1.3em', fontWeight: '700', color: '#ea580c', margin: 0 }}>High Priority</h2>
              <p style={{ fontSize: '0.9em', color: '#6b7280', margin: '4px 0 0 0' }}>Important updates requiring timely action</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
            {highUrgency.map(article => (
              <div key={article.id} style={{ position: 'relative' }}>
                <CompactArticleCard
                  article={article}
                  isSaved={savedArticles?.includes(article.url)}
                  onToggleSave={toggleSaveArticle}
                />
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '6px 12px',
                  backgroundColor: '#ea580c',
                  color: 'white',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Zap size={14} />
                  {article.analysis?.urgencyScore || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderate Urgency */}
      {moderateUrgency.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px 20px', backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', borderRadius: '8px' }}>
            <Clock size={24} style={{ color: '#f59e0b' }} />
            <div>
              <h2 style={{ fontSize: '1.3em', fontWeight: '700', color: '#f59e0b', margin: 0 }}>Moderate Priority</h2>
              <p style={{ fontSize: '0.9em', color: '#6b7280', margin: '4px 0 0 0' }}>Review within the next few days</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {moderateUrgency.map(article => (
              <div key={article.id} style={{ position: 'relative' }}>
                <CompactArticleCard
                  article={article}
                  isSaved={savedArticles?.includes(article.url)}
                  onToggleSave={toggleSaveArticle}
                />
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '6px 12px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {article.analysis?.urgencyScore || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standard Priority */}
      {standardUrgency.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px 20px', backgroundColor: '#f9fafb', borderLeft: '4px solid #6b7280', borderRadius: '8px' }}>
            <div>
              <h2 style={{ fontSize: '1.3em', fontWeight: '700', color: '#6b7280', margin: 0 }}>Standard Priority</h2>
              <p style={{ fontSize: '0.9em', color: '#6b7280', margin: '4px 0 0 0' }}>Review when convenient</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {standardUrgency.map(article => (
              <div key={article.id} style={{ position: 'relative' }}>
                <CompactArticleCard
                  article={article}
                  isSaved={savedArticles?.includes(article.url)}
                  onToggleSave={toggleSaveArticle}
                />
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '6px 12px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85em'
                }}>
                  {article.analysis?.urgencyScore || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#eff6ff', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
        <h3 style={{ fontSize: '1.1em', fontWeight: '600', color: '#1e40af', margin: '0 0 12px 0' }}>
          About Priority Feed
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: '1.6' }}>
          <li>Automatically filters out opinion pieces and purely local news</li>
          <li>Only shows articles with urgency score ≥ 20</li>
          <li>Sorted by urgency, impact level, and recency</li>
          <li>Refreshes automatically as new articles are analyzed</li>
        </ul>
      </div>
    </div>
  )
}

export default PriorityFeed
