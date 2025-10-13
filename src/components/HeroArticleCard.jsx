import { Calendar, Tag, ExternalLink, Bookmark, MapPin, Star, Sparkles, ChevronRight, Clock } from 'lucide-react'
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

  // Craft a compelling hook (what the operator will get from this)
  const getCompellingHook = () => {
    if (!article.analysis) return null

    const analysis = article.analysis

    // Priority 1: If there's financial impact, lead with that
    if (analysis.financialImpact) {
      const impact = analysis.financialImpact
      // Extract key numbers or percentages if present
      const numberMatch = impact.match(/(\$[\d,]+|\d+%|[\d,]+ percent)/i)
      if (numberMatch) {
        return `💰 ${impact.substring(0, 120)}${impact.length > 120 ? '...' : ''}`
      }
      return `💰 ${impact.substring(0, 120)}${impact.length > 120 ? '...' : ''}`
    }

    // Priority 2: If there are immediate actions, highlight urgency
    if (analysis.actionItems?.immediate?.length > 0) {
      const action = analysis.actionItems.immediate[0]
      return `⚡ Action needed: ${action}`
    }

    // Priority 3: Most impactful insight
    if (analysis.keyInsights?.length > 0) {
      const usefulInsights = analysis.keyInsights.filter(insight => {
        const lower = insight.toLowerCase()
        return !lower.includes('limited') &&
               !lower.includes('truncated') &&
               !lower.includes('unavailable')
      })

      if (usefulInsights.length > 0) {
        const insight = usefulInsights[0]
        // Add context based on content
        if (insight.toLowerCase().includes('penalty') || insight.toLowerCase().includes('fine')) {
          return `⚠️ ${insight}`
        }
        if (insight.toLowerCase().includes('opportunity') || insight.toLowerCase().includes('benefit')) {
          return `✅ ${insight}`
        }
        if (insight.toLowerCase().includes('change') || insight.toLowerCase().includes('new rule')) {
          return `📋 ${insight}`
        }
        return `💡 ${insight}`
      }
    }

    // Priority 4: Compliance implications
    if (analysis.complianceImplications) {
      return `📋 ${analysis.complianceImplications.substring(0, 120)}${analysis.complianceImplications.length > 120 ? '...' : ''}`
    }

    return null
  }

  const compellingHook = getCompellingHook()

  // Get urgency time context (is there a deadline/timeline?)
  const getUrgencyContext = () => {
    const analysis = article.analysis
    if (!analysis) return null

    // Check for time-sensitive indicators in the analysis
    const timeIndicators = []

    // Check if there are immediate action items
    if (analysis.actionItems?.immediate?.length > 0) {
      return 'Immediate action required'
    }

    // Check for deadline/timeline mentions in key insights
    if (analysis.keyInsights) {
      const hasDeadline = analysis.keyInsights.some(insight => {
        const lower = insight.toLowerCase()
        return lower.includes('deadline') ||
               lower.includes('by ') ||
               lower.includes('effective') ||
               lower.includes('comment period') ||
               lower.includes('days')
      })
      if (hasDeadline) return 'Time-sensitive deadline'
    }

    // Calculate days since publication
    const daysOld = Math.floor((new Date() - new Date(article.date || article.published_date)) / (1000 * 60 * 60 * 24))
    if (daysOld <= 2) return 'Breaking news'
    if (daysOld <= 7) return 'Recent update'

    return null
  }

  const urgencyContext = getUrgencyContext()

  // Get top 3 implications/why-it-matters insights (skip factual summary, focus on implications)
  const getKeyBullets = () => {
    if (!article.analysis?.keyInsights) return []

    // Filter for implication-focused insights (not factual descriptions)
    const implicationInsights = article.analysis.keyInsights.filter(insight => {
      const lower = insight.toLowerCase()
      return (
        !lower.includes('limited') &&
        !lower.includes('truncated') &&
        !lower.includes('unavailable') &&
        // Look for insights that explain implications/importance
        (lower.includes('signal') ||
         lower.includes('established') ||
         lower.includes('precedent') ||
         lower.includes('liability') ||
         lower.includes('require') ||
         lower.includes('risk') ||
         lower.includes('impact') ||
         lower.includes('critical') ||
         lower.includes('must') ||
         insight.length > 50) // Longer insights tend to be more detailed implications
      )
    })

    return implicationInsights.slice(0, 3)
  }

  const keyBullets = getKeyBullets()

  // Short summary (100 chars)
  // Get short summary - what actually happened in plain language
  const getShortSummary = () => {
    // Look for contextual/factual insights that explain what happened
    const insights = article.analysis?.keyInsights || []

    // Find an insight that describes facts/events (avoid abstract implications)
    const factualInsight = insights.find(insight => {
      const lower = insight.toLowerCase()
      // Look for insights that contain concrete details (who, what, where, when)
      return (
        insight.length > 30 &&
        !lower.includes('signal') &&
        !lower.includes('established') &&
        !lower.includes('precedent') &&
        !lower.includes('liability') &&
        !lower.includes('require') &&
        !lower.includes('implications') &&
        !lower.includes('limited') &&
        !lower.includes('truncated') &&
        !lower.includes('this means')
      )
    })

    if (factualInsight) {
      const cleaned = factualInsight.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim()
      return cleaned.length > 120 ? cleaned.substring(0, 117) + '...' : cleaned
    }

    // Fallback to summary field (but skip if it's just the title)
    const summary = article.summary || article.description || ''
    const cleaned = summary.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim()

    // Don't show summary if it's identical or too similar to title
    const cleanedTitle = cleanTitle(article.title).toLowerCase()
    if (cleaned.toLowerCase().includes(cleanedTitle) && cleaned.length < cleanedTitle.length + 50) {
      return '' // Skip summary if it's just repeating the title
    }

    return cleaned.length > 120 ? cleaned.substring(0, 117) + '...' : cleaned
  }

  return (
    <>
      {/* Compact Hero Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        maxWidth: '800px',
        position: 'relative'
      }} onClick={() => setShowFullAnalysis(true)}>

        {/* Header: Source, Date, Urgency Score, Bookmark */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85em', color: '#6b7280' }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>{article.source}</span>
            <span>•</span>
            <span>{format(new Date(article.date || article.published_date), 'MMM d, yyyy')}</span>
            <span>•</span>
            <span style={{
              padding: '2px 6px',
              backgroundColor: (article.adjusted_urgency_score || article.analysis?.urgencyScore || 0) >= 80 ? '#dc2626' : (article.adjusted_urgency_score || article.analysis?.urgencyScore || 0) >= 60 ? '#ea580c' : (article.adjusted_urgency_score || article.analysis?.urgencyScore || 0) >= 40 ? '#f59e0b' : '#6b7280',
              color: 'white',
              borderRadius: '3px',
              fontWeight: '700',
              fontSize: '0.9em'
            }}>
              {Math.round(article.adjusted_urgency_score || article.analysis?.urgencyScore || 0)}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleSave(article.url)
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isSaved ? '#3b82f6' : '#9ca3af',
              padding: '4px'
            }}
            title={isSaved ? 'Remove from saved' : 'Save article'}
          >
            <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '1.1em',
          fontWeight: '700',
          color: '#111827',
          lineHeight: '1.4'
        }}>
          {cleanTitle(article.title)}
        </h3>

        {/* Short Summary */}
        {getShortSummary() && (
          <p style={{
            margin: '0 0 12px 0',
            fontSize: '0.9em',
            color: '#4b5563',
            lineHeight: '1.5'
          }}>
            {getShortSummary()}
          </p>
        )}

        {/* Why you should care - 2-3 bullet points */}
        {keyBullets.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '0.8em', fontWeight: '600', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>
              Why This Matters:
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9em', color: '#374151', lineHeight: '1.6' }}>
              {keyBullets.map((bullet, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{bullet}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer: Category badge */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            padding: '4px 8px',
            backgroundColor: '#eff6ff',
            color: '#1e40af',
            borderRadius: '4px',
            fontSize: '0.75em',
            fontWeight: '600'
          }}>
            {article.category || 'General'}
          </span>
          {article.scope && (
            <span style={{
              padding: '4px 8px',
              backgroundColor: '#f3f4f6',
              color: '#4b5563',
              borderRadius: '4px',
              fontSize: '0.75em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <MapPin size={10} />
              {article.scope}
            </span>
          )}
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
