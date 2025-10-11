import { Calendar, Tag, TrendingUp, AlertCircle, ExternalLink, Bookmark, MapPin, Star, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'

function ArticleCard({ article, onAnalyze, onViewDetails, isSaved, onToggleSave }) {
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)
  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  // Truncate summary to 150 characters
  const truncateSummary = (text) => {
    if (!text) return ''
    if (text.length <= 150) return text
    return text.substring(0, 147) + '...'
  }

  return (
    <div className="article-card" onClick={() => onViewDetails(article)}>
      <div className="article-header">
        <div style={{ flex: 1 }}>
          <h3 className="article-title">{article.title}</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <button
            className={`bookmark-btn ${isSaved ? 'saved' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSave(article.url)
            }}
            title={isSaved ? 'Remove from saved' : 'Save article'}
          >
            <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          <span
            className="impact-badge"
            style={{ backgroundColor: getImpactColor(article.impact) }}
          >
            {article.impact} impact
          </span>
        </div>
      </div>

      {/* Article preview */}
      <p className="article-summary" style={{
        fontSize: '0.9em',
        color: '#4b5563',
        marginTop: '8px',
        lineHeight: '1.4'
      }}>
        {truncateSummary(article.summary)}
      </p>

      {/* Metadata badges */}
      <div className="article-meta" style={{ marginTop: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <div className="meta-item">
          <Calendar size={12} />
          <span>{format(new Date(article.date), 'MMM d')}</span>
        </div>
        <div className="meta-item">
          <Tag size={12} />
          <span>{article.category || 'General'}</span>
        </div>
        {article.scope && (
          <div className="meta-item">
            <MapPin size={12} />
            <span>{article.scope}{article.states && article.states.length > 0 ? `: ${article.states.join(', ')}` : ''}</span>
          </div>
        )}
        {article.relevance_score && (
          <div className="meta-item">
            <Star size={12} />
            <span>Relevance: {article.relevance_score}</span>
          </div>
        )}
        <div className="meta-item">
          <Tag size={12} />
          <span>{article.source}</span>
        </div>
      </div>

      {/* AI Analysis - Always Visible */}
      {article.analysis && article.analysis.keyInsights && article.analysis.keyInsights.length > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#faf5ff',
          borderLeft: '3px solid #a855f7',
          borderRadius: '4px'
        }}>
          {/* Top insight always visible */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <Sparkles size={16} style={{ color: '#a855f7', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '0.875em',
                lineHeight: '1.4',
                color: '#581c87',
                margin: 0
              }}>
                <strong>Key Insight:</strong> {article.analysis.keyInsights[0]}
              </p>

              {/* Show more button if there are additional insights */}
              {article.analysis.keyInsights.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFullAnalysis(!showFullAnalysis)
                  }}
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8em',
                    color: '#a855f7',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: '600'
                  }}
                >
                  {showFullAnalysis ? (
                    <>Show Less <ChevronUp size={14} /></>
                  ) : (
                    <>Show {article.analysis.keyInsights.length - 1} More Insight{article.analysis.keyInsights.length > 2 ? 's' : ''} <ChevronDown size={14} /></>
                  )}
                </button>
              )}

              {/* Full analysis when expanded */}
              {showFullAnalysis && article.analysis.keyInsights.length > 1 && (
                <div style={{ marginTop: '12px' }}>
                  <ul style={{
                    listStyle: 'disc',
                    marginLeft: '20px',
                    fontSize: '0.875em',
                    color: '#581c87'
                  }}>
                    {article.analysis.keyInsights.slice(1).map((insight, i) => (
                      <li key={i} style={{ marginTop: '6px' }}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="article-tags">
        {(article.analysis?.tags || []).slice(0, 3).map((tag, index) => (
          <span key={index} className="tag">{tag}</span>
        ))}
      </div>

      <div className="article-actions">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-link"
          onClick={(e) => e.stopPropagation()}
        >
          Read
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
}

export default ArticleCard
