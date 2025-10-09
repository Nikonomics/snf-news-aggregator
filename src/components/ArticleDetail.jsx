import { X, Calendar, Tag, TrendingUp, ExternalLink, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

function ArticleDetail({ article, onClose, onAnalyze }) {
  console.log('ArticleDetail - article.analysis:', article.analysis);

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

          {/* Pre-loaded AI Analysis */}
          {article.analysis && (
            <div className="mt-6 pt-6 border-t-2 border-purple-100 bg-gradient-to-b from-purple-50 to-white rounded-lg p-6">
              <h3 className="text-2xl font-bold text-purple-700 mb-6 pb-3 border-b-2 border-purple-300">
                ✨ AI Analysis
              </h3>

              <div className="space-y-4">
                {/* Key Insights */}
                {article.analysis.keyInsights && (
                  <div className="analysis-section">
                    <h4 className="text-lg font-bold text-purple-700 mb-3 mt-4 pb-2 border-b border-purple-200">Key Insights</h4>
                    <ul className="list-disc ml-5 space-y-2 bg-purple-50 p-4 rounded">
                      {article.analysis.keyInsights.map((insight, i) => (
                        <li key={i} className="text-gray-700">{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Compliance Timeline */}
                {article.analysis.complianceTimeline && (
                  <div className="analysis-section">
                    <h4 className="text-lg font-bold text-purple-700 mb-3 mt-4 pb-2 border-b border-purple-200">Compliance Timeline</h4>
                    <div className="ml-4 text-gray-700 space-y-1">
                      {article.analysis.complianceTimeline.commentDeadline && (
                        <p><strong>Comment Deadline:</strong> {article.analysis.complianceTimeline.commentDeadline}</p>
                      )}
                      {article.analysis.complianceTimeline.effectiveDate && (
                        <p><strong>Effective Date:</strong> {article.analysis.complianceTimeline.effectiveDate}</p>
                      )}
                      {article.analysis.complianceTimeline.prepTime && (
                        <p><strong>Prep Time Needed:</strong> {article.analysis.complianceTimeline.prepTime}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Who Needs to Know */}
                {article.analysis.whoNeedsToKnow && article.analysis.whoNeedsToKnow.length > 0 && (
                  <div className="analysis-section">
                    <h4 className="text-lg font-bold text-purple-700 mb-3 mt-4 pb-2 border-b border-purple-200">Who Needs to Know</h4>
                    {article.analysis.whoNeedsToKnow.map((person, i) => (
                      <div key={i} className="mb-2 ml-4">
                        <p className="font-medium text-gray-800">{person.role}</p>
                        <p className="text-gray-700 text-sm">{person.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Financial Impact */}
                {article.analysis.financialImpact && (
                  <div className="analysis-section">
                    <h4 className="text-lg font-bold text-purple-700 mb-3 mt-4 pb-2 border-b border-purple-200">Financial Impact</h4>
                    <p className="text-gray-700">{article.analysis.financialImpact}</p>
                  </div>
                )}

                {/* Action Items */}
                {article.analysis.actionItems && (
                  <div className="analysis-section">
                    <h4 className="text-lg font-bold text-purple-700 mb-3 mt-4 pb-2 border-b border-purple-200">Action Items</h4>
                    <p className="text-sm text-gray-600 italic mb-2">
                      Use these prioritized actions to plan your facility's response timeline.
                    </p>
                    {article.analysis.actionItems.immediate && article.analysis.actionItems.immediate.length > 0 && (
                      <div className="mb-6">
                        <strong className="text-sm text-red-600">Immediate (7 days):</strong>
                        <ul className="list-disc ml-5 space-y-2 bg-blue-50 p-3 rounded text-sm">
                          {article.analysis.actionItems.immediate.map((item, i) => (
                            <li key={i} className="text-gray-700">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {article.analysis.actionItems.shortTerm && article.analysis.actionItems.shortTerm.length > 0 && (
                      <div className="mb-6">
                        <strong className="text-sm text-orange-600">Short-term (30 days):</strong>
                        <ul className="list-disc ml-5 space-y-2 bg-blue-50 p-3 rounded text-sm">
                          {article.analysis.actionItems.shortTerm.map((item, i) => (
                            <li key={i} className="text-gray-700">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {article.analysis.actionItems.longTerm && article.analysis.actionItems.longTerm.length > 0 && (
                      <div>
                        <strong className="text-sm text-blue-600">Long-term (60+ days):</strong>
                        <ul className="list-disc ml-5 space-y-2 bg-blue-50 p-3 rounded text-sm">
                          {article.analysis.actionItems.longTerm.map((item, i) => (
                            <li key={i} className="text-gray-700">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Risks */}
                {article.analysis.risks && article.analysis.risks.length > 0 && (
                  <div className="analysis-section">
                    <h4 className="text-lg font-bold text-purple-700 mb-3 mt-4 pb-2 border-b border-purple-200">Risk Assessment</h4>
                    {article.analysis.risks.map((risk, i) => (
                      <div key={i} className="mb-6">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                          risk.level === 'high' ? 'bg-red-100 text-red-800' :
                          risk.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {risk.level.toUpperCase()}
                        </span>
                        <p className="text-gray-700 mt-1"><strong>Risk:</strong> {risk.description}</p>
                        {risk.mitigation && (
                          <p className="text-gray-700 mt-1"><strong>Mitigation:</strong> {risk.mitigation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Why This Matters */}
                {article.analysis.relevanceReasoning && (
                  <div className="analysis-section">
                    <h4 className="text-lg font-bold text-purple-700 mb-3 mt-4 pb-2 border-b border-purple-200">Why This Matters</h4>
                    <p className="text-gray-700">{article.analysis.relevanceReasoning}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="article-detail-actions">
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
