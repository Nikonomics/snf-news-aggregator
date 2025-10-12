import { Calendar, Tag, ExternalLink, Bookmark, MapPin, Star, Sparkles, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'

// Utility function to clean article titles
const cleanTitle = (title) => {
  if (!title) return ''
  // Decode HTML entities
  const txt = document.createElement('textarea')
  txt.innerHTML = title
  let cleaned = txt.value
  // Remove &nbsp; and other entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  // Trim whitespace
  cleaned = cleaned.trim()
  return cleaned
}

function HeroArticleCard({ article, onAnalyze, onViewDetails, isSaved, onToggleSave }) {
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  // Get first useful insight for preview
  const getInsightPreview = () => {
    if (!article.analysis?.keyInsights) return null

    const usefulInsights = article.analysis.keyInsights.filter(insight => {
      const lowerInsight = insight.toLowerCase()
      return !lowerInsight.includes('limited') &&
             !lowerInsight.includes('truncated') &&
             !lowerInsight.includes('unavailable') &&
             !lowerInsight.includes('preventing detailed analysis')
    })

    if (usefulInsights.length === 0) return null

    // For hero card, show first 2 insights (more than compact card)
    return usefulInsights.slice(0, 2)
  }

  const insightPreviews = getInsightPreview()

  // Get preview snippet from article content or summary
  const getPreviewSnippet = () => {
    const content = article.content || article.summary || article.description || ''
    if (content.length > 200) {
      return content.substring(0, 197) + '...'
    }
    return content
  }

  const previewSnippet = getPreviewSnippet()

  return (
    <>
      {/* Hero Article Card */}
      <div className="hero-card" onClick={() => setShowFullAnalysis(true)}>
        {/* Large thumbnail */}
        <div className="hero-thumbnail">
          <div className="hero-thumbnail-placeholder">
            <Tag size={48} />
          </div>
        </div>

        <div className="hero-content">
          {/* Source badge */}
          <div className="hero-source-row">
            <div className="hero-source-badge">
              <div className="hero-source-icon">{article.source.charAt(0).toUpperCase()}</div>
              <span className="hero-source-name">{article.source}</span>
            </div>
            <div className="hero-meta-right">
              <span className="hero-time">{format(new Date(article.date || article.published_date), 'MMM d, yyyy')}</span>
              <button
                className={`hero-bookmark-btn ${isSaved ? 'saved' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSave(article.url)
                }}
                title={isSaved ? 'Remove from saved' : 'Save article'}
              >
                <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* Headline */}
          <h2 className="hero-headline">{cleanTitle(article.title)}</h2>

          {/* Preview snippet */}
          {previewSnippet && (
            <p className="hero-snippet">{previewSnippet}</p>
          )}

          {/* Metadata row */}
          <div className="hero-metadata">
            <span className="hero-badge hero-badge-category">{article.category || 'General'}</span>
            {article.scope && (
              <span className="hero-badge hero-badge-scope">
                <MapPin size={12} />
                {article.scope}
              </span>
            )}
            {article.relevance_score && (
              <span className="hero-badge hero-badge-relevance">
                <Star size={12} />
                {article.relevance_score}
              </span>
            )}
            <span
              className="hero-badge hero-badge-impact"
              style={{ backgroundColor: getImpactColor(article.impact) }}
            >
              {article.impact.toUpperCase()}
            </span>
          </div>

          {/* Read more indicator */}
          <div className="hero-read-more">
            <span>View full analysis</span>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>

      {/* Full Analysis Modal (same as regular card) */}
      {showFullAnalysis && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowFullAnalysis(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '24px',
              position: 'relative',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowFullAnalysis(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px 8px'
              }}
            >
              ×
            </button>

            {/* Article Header */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5em', flex: 1, color: '#111827' }}>
                  {cleanTitle(article.title)}
                </h2>
                <span
                  className="impact-badge"
                  style={{
                    backgroundColor: getImpactColor(article.impact),
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '0.85em',
                    fontWeight: '600',
                    color: 'white'
                  }}
                >
                  {article.impact} impact
                </span>
              </div>

              {/* Metadata */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.9em', color: '#6b7280' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} />
                  <span>{format(new Date(article.date || article.published_date), 'MMM d, yyyy')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={14} />
                  <span>{article.category || 'General'}</span>
                </div>
                {article.scope && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} />
                    <span>{article.scope}{article.states && article.states.length > 0 ? `: ${article.states.join(', ')}` : ''}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={14} />
                  <span>{article.source}</span>
                </div>
              </div>
            </div>

            {/* Full Analysis Content */}
            {article.analysis && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Key Insights */}
                {article.analysis.keyInsights && article.analysis.keyInsights.length > 0 && (
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1em', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={20} style={{ color: '#a855f7' }} />
                      Key Insights
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '24px', color: '#374151', lineHeight: '1.6' }}>
                      {article.analysis.keyInsights.map((insight, i) => (
                        <li key={i} style={{ marginTop: '8px' }}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Financial Impact */}
                {article.analysis.financialImpact && (
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1em', color: '#111827' }}>
                      Financial Impact
                    </h3>
                    <p style={{ margin: 0, color: '#374151', lineHeight: '1.6' }}>
                      {article.analysis.financialImpact}
                    </p>
                  </div>
                )}

                {/* Action Items */}
                {article.analysis.actionItems && (
                  article.analysis.actionItems.immediate?.length > 0 ||
                  article.analysis.actionItems.shortTerm?.length > 0 ||
                  article.analysis.actionItems.longTerm?.length > 0
                ) && (
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1em', color: '#111827' }}>
                      Action Items
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {article.analysis.actionItems.immediate?.length > 0 && (
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95em', color: '#1e40af' }}>
                            Immediate Actions (Next 7 Days)
                          </h4>
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: '1.6' }}>
                            {article.analysis.actionItems.immediate.map((action, i) => (
                              <li key={i} style={{ marginTop: '4px' }}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {article.analysis.actionItems.shortTerm?.length > 0 && (
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95em', color: '#1e40af' }}>
                            30-Day Actions
                          </h4>
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: '1.6' }}>
                            {article.analysis.actionItems.shortTerm.map((action, i) => (
                              <li key={i} style={{ marginTop: '4px' }}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {article.analysis.actionItems.longTerm?.length > 0 && (
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95em', color: '#1e40af' }}>
                            Long-Term Actions (60+ Days)
                          </h4>
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: '1.6' }}>
                            {article.analysis.actionItems.longTerm.map((action, i) => (
                              <li key={i} style={{ marginTop: '4px' }}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Link to Original */}
                <div style={{ paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '0.95em'
                    }}
                  >
                    Read Full Article
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default HeroArticleCard
