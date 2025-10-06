import { X, Calendar, Tag, TrendingUp, ExternalLink, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

function ArticleDetail({ article, onClose, onAnalyze }) {
  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content article-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h2>Article Details</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="article-detail-header">
            <h1 className="article-detail-title">{article.title}</h1>
            <span
              className="impact-badge"
              style={{ backgroundColor: getImpactColor(article.impact) }}
            >
              {article.impact} impact
            </span>
          </div>

          <div className="article-detail-meta">
            <div className="meta-item">
              <Calendar size={18} />
              <span>{format(new Date(article.date), 'MMMM d, yyyy')}</span>
            </div>
            <div className="meta-item">
              <Tag size={18} />
              <span>{article.source}</span>
            </div>
            <div className="meta-item">
              <span className="category-badge">{article.category}</span>
            </div>
          </div>

          {article.relevanceScore && (
            <div className="relevance-score-detail">
              <TrendingUp size={20} />
              <span>Relevance Score: {article.relevanceScore}%</span>
            </div>
          )}

          <div className="article-detail-summary">
            <h3>Summary</h3>
            <p>{article.summary}</p>
          </div>

          <div className="article-detail-tags">
            <h3>Related Topics</h3>
            <div className="tags-list">
              {article.tags.map((tag, index) => (
                <span key={index} className="tag-detail">{tag}</span>
              ))}
            </div>
          </div>

          <div className="article-detail-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                onClose()
                onAnalyze(article)
              }}
            >
              <AlertCircle size={20} />
              Get AI Analysis
            </button>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-link"
            >
              Read Full Article
              <ExternalLink size={20} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArticleDetail
