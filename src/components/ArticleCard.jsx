import { Calendar, Tag, TrendingUp, AlertCircle, ExternalLink, Bookmark, MapPin, Star } from 'lucide-react'
import { format } from 'date-fns'

function ArticleCard({ article, onAnalyze, onViewDetails, isSaved, onToggleSave }) {
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

      {/* AI Analysis - Pre-loaded */}
      {article.analysis && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <details className="cursor-pointer">
            <summary className="text-sm font-semibold text-purple-600 hover:text-purple-700">
              View AI Analysis
            </summary>
            <div className="mt-2 space-y-2 text-sm">
              {article.analysis.keyInsights && (
                <div>
                  <strong>Key Insights:</strong>
                  <ul className="list-disc ml-4 mt-1">
                    {article.analysis.keyInsights.map((insight, i) => (
                      <li key={i}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
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
