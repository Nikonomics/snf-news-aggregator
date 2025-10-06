import { Calendar, Tag, TrendingUp, AlertCircle, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

function ArticleCard({ article, onAnalyze, onViewDetails }) {
  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  return (
    <div className="article-card" onClick={() => onViewDetails(article)}>
      <div className="article-header">
        <h3 className="article-title">{article.title}</h3>
        <span
          className="impact-badge"
          style={{ backgroundColor: getImpactColor(article.impact) }}
        >
          {article.impact} impact
        </span>
      </div>

      <div className="article-meta">
        <div className="meta-item">
          <Calendar size={12} />
          <span>{format(new Date(article.date), 'MMM d')}</span>
        </div>
        <div className="meta-item">
          <Tag size={12} />
          <span>{article.source}</span>
        </div>
      </div>

      <p className="article-summary">{article.summary}</p>

      <div className="article-tags">
        {article.tags.slice(0, 3).map((tag, index) => (
          <span key={index} className="tag">{tag}</span>
        ))}
      </div>

      <div className="article-actions">
        <button
          className="btn-secondary"
          onClick={(e) => {
            e.stopPropagation()
            onAnalyze(article)
          }}
        >
          <AlertCircle size={14} />
          AI
        </button>
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
