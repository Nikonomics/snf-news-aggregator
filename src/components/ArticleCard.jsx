import { Calendar, Tag, TrendingUp, AlertCircle, ExternalLink, Bookmark, MapPin, Star, Sparkles, ChevronDown, ChevronUp, DollarSign, Clock, ListChecks } from 'lucide-react'
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

  // Check if summary is useful (not just title repeated with HTML entities)
  const isUsefulSummary = (summary, title) => {
    if (!summary) return false

    // Remove HTML entities and extra whitespace
    const cleanSummary = summary.replace(/&nbsp;|&amp;|&quot;|&lt;|&gt;/g, ' ').replace(/\s+/g, ' ').trim()
    const cleanTitle = title.replace(/\s+/g, ' ').trim()

    // If summary is just the title (or starts with title), it's not useful
    if (cleanSummary === cleanTitle || cleanSummary.startsWith(cleanTitle)) return false

    // If summary is too short (less than 50 chars), probably not useful
    if (cleanSummary.length < 50) return false

    return true
  }

  // Truncate summary to 150 characters
  const truncateSummary = (text) => {
    if (!text) return ''
    if (text.length <= 150) return text
    return text.substring(0, 147) + '...'
  }

  return (
    <>
      <div className="article-card" onClick={() => setShowFullAnalysis(true)}>
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

      {/* Article preview - only show if summary is useful */}
      {isUsefulSummary(article.summary, article.title) && (
        <p className="article-summary" style={{
          fontSize: '0.9em',
          color: '#4b5563',
          marginTop: '8px',
          lineHeight: '1.4'
        }}>
          {truncateSummary(article.summary)}
        </p>
      )}

      {/* Metadata badges */}
      <div className="article-meta" style={{ marginTop: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <div className="meta-item">
          <Calendar size={12} />
          <span>{format(new Date(article.date || article.published_date), 'MMM d')}</span>
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

      {/* AI Analysis - Enhanced Display */}
      {article.analysis && article.analysis.keyInsights && article.analysis.keyInsights.length > 0 && (() => {
        // Filter out insights that mention limited/unavailable content
        const usefulInsights = article.analysis.keyInsights.filter(insight => {
          const lowerInsight = insight.toLowerCase()
          return !lowerInsight.includes('limited') &&
                 !lowerInsight.includes('truncated') &&
                 !lowerInsight.includes('unavailable') &&
                 !lowerInsight.includes('preventing detailed analysis')
        })

        if (usefulInsights.length === 0) return null

        return (
          <div style={{
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Key Insight */}
            <div style={{
              padding: '10px 12px',
              backgroundColor: '#faf5ff',
              borderLeft: '3px solid #a855f7',
              borderRadius: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Sparkles size={16} style={{ color: '#a855f7', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '0.875em',
                    lineHeight: '1.4',
                    color: '#581c87',
                    margin: 0
                  }}>
                    {usefulInsights[0]}
                  </p>
                </div>
              </div>
            </div>

          {/* Critical Info Grid - Only show if data exists */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '8px'
          }}>
            {/* Financial Impact */}
            {article.analysis.financialImpact && !article.analysis.financialImpact.toLowerCase().includes('no direct financial') && (
              <div style={{
                padding: '8px 10px',
                backgroundColor: '#fef3c7',
                borderLeft: '3px solid #f59e0b',
                borderRadius: '4px',
                fontSize: '0.8em'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <DollarSign size={14} style={{ color: '#d97706' }} />
                  <strong style={{ color: '#78350f' }}>Financial Impact</strong>
                </div>
                <p style={{ margin: 0, color: '#78350f', lineHeight: '1.3' }}>
                  {article.analysis.financialImpact.length > 80
                    ? article.analysis.financialImpact.substring(0, 77) + '...'
                    : article.analysis.financialImpact}
                </p>
              </div>
            )}

            {/* Compliance Deadline */}
            {article.analysis.complianceTimeline && (
              article.analysis.complianceTimeline.effectiveDate !== 'N/A' ||
              article.analysis.complianceTimeline.commentDeadline !== 'N/A'
            ) && (
              <div style={{
                padding: '8px 10px',
                backgroundColor: '#fee2e2',
                borderLeft: '3px solid #ef4444',
                borderRadius: '4px',
                fontSize: '0.8em'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Clock size={14} style={{ color: '#dc2626' }} />
                  <strong style={{ color: '#7f1d1d' }}>Key Dates</strong>
                </div>
                <div style={{ color: '#7f1d1d', lineHeight: '1.3' }}>
                  {article.analysis.complianceTimeline.commentDeadline !== 'N/A' && (
                    <div>Comment: {article.analysis.complianceTimeline.commentDeadline}</div>
                  )}
                  {article.analysis.complianceTimeline.effectiveDate !== 'N/A' && (
                    <div>Effective: {article.analysis.complianceTimeline.effectiveDate}</div>
                  )}
                </div>
              </div>
            )}

            {/* Immediate Actions */}
            {article.analysis.actionItems && article.analysis.actionItems.immediate && article.analysis.actionItems.immediate.length > 0 && (
              <div style={{
                padding: '8px 10px',
                backgroundColor: '#dbeafe',
                borderLeft: '3px solid #3b82f6',
                borderRadius: '4px',
                fontSize: '0.8em'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <ListChecks size={14} style={{ color: '#1e40af' }} />
                  <strong style={{ color: '#1e3a8a' }}>Immediate Actions</strong>
                </div>
                <ul style={{
                  margin: 0,
                  paddingLeft: '16px',
                  color: '#1e3a8a',
                  lineHeight: '1.3'
                }}>
                  {article.analysis.actionItems.immediate.slice(0, 2).map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          </div>
        )
      })()}

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

      {/* Modal Overlay */}
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
                  {article.title}
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
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1em', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <DollarSign size={20} style={{ color: '#f59e0b' }} />
                      Financial Impact
                    </h3>
                    <p style={{ margin: 0, color: '#374151', lineHeight: '1.6' }}>
                      {article.analysis.financialImpact}
                    </p>
                  </div>
                )}

                {/* Compliance Timeline */}
                {article.analysis.complianceTimeline && (
                  article.analysis.complianceTimeline.effectiveDate !== 'N/A' ||
                  article.analysis.complianceTimeline.commentDeadline !== 'N/A' ||
                  article.analysis.complianceTimeline.criticalDates?.length > 0
                ) && (
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1em', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={20} style={{ color: '#ef4444' }} />
                      Compliance Timeline
                    </h3>
                    <div style={{ color: '#374151', lineHeight: '1.6' }}>
                      {article.analysis.complianceTimeline.commentDeadline !== 'N/A' && (
                        <div><strong>Comment Deadline:</strong> {article.analysis.complianceTimeline.commentDeadline}</div>
                      )}
                      {article.analysis.complianceTimeline.effectiveDate !== 'N/A' && (
                        <div><strong>Effective Date:</strong> {article.analysis.complianceTimeline.effectiveDate}</div>
                      )}
                      {article.analysis.complianceTimeline.prepTime !== 'N/A' && (
                        <div><strong>Preparation Time Needed:</strong> {article.analysis.complianceTimeline.prepTime}</div>
                      )}
                      {article.analysis.complianceTimeline.criticalDates && article.analysis.complianceTimeline.criticalDates.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <strong>Critical Dates:</strong>
                          <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                            {article.analysis.complianceTimeline.criticalDates.map((date, i) => (
                              <li key={i}>{date}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {article.analysis.actionItems && (
                  article.analysis.actionItems.immediate?.length > 0 ||
                  article.analysis.actionItems.shortTerm?.length > 0 ||
                  article.analysis.actionItems.longTerm?.length > 0
                ) && (
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1em', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ListChecks size={20} style={{ color: '#3b82f6' }} />
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

                {/* Who Needs to Know */}
                {article.analysis.whoNeedsToKnow && article.analysis.whoNeedsToKnow.length > 0 && (
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1em', color: '#111827' }}>
                      Who Needs to Know
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                      {article.analysis.whoNeedsToKnow.map((person, i) => (
                        <div key={i} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                          <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                            {person.role}
                          </div>
                          <div style={{ fontSize: '0.9em', color: '#6b7280', lineHeight: '1.4' }}>
                            {person.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Assessment */}
                {article.analysis.risks && article.analysis.risks.length > 0 && (
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1em', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={20} style={{ color: '#ef4444' }} />
                      Risk Assessment
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {article.analysis.risks.map((risk, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '12px',
                            borderLeft: `4px solid ${risk.level === 'high' ? '#ef4444' : risk.level === 'medium' ? '#f59e0b' : '#10b981'}`,
                            backgroundColor: risk.level === 'high' ? '#fef2f2' : risk.level === 'medium' ? '#fffbeb' : '#f0fdf4',
                            borderRadius: '4px'
                          }}
                        >
                          <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px', textTransform: 'capitalize' }}>
                            {risk.level} Risk: {risk.description}
                          </div>
                          <div style={{ fontSize: '0.9em', color: '#6b7280' }}>
                            <strong>Mitigation:</strong> {risk.mitigation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Why This Matters */}
                {article.analysis.relevanceReasoning && (
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1em', color: '#111827' }}>
                      Why This Matters
                    </h3>
                    <p style={{ margin: 0, color: '#374151', lineHeight: '1.6' }}>
                      {article.analysis.relevanceReasoning}
                    </p>
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

export default ArticleCard
