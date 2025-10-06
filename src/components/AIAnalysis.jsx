import { X, Brain, AlertTriangle, CheckCircle, FileText, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { analyzeArticleWithAI } from '../services/anthropicService'

function AIAnalysis({ article, onClose }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const analyzeArticle = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await analyzeArticleWithAI(article)
        setAnalysis(result)
        setLoading(false)
      } catch (err) {
        console.error('Error analyzing article:', err)
        setError(err.message || 'Failed to analyze article. Please make sure the backend server is running.')
        setLoading(false)
      }
    }

    analyzeArticle()
  }, [article])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Brain size={24} />
            <h2>AI Analysis</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <h3 className="article-title-modal">{article.title}</h3>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Analyzing article with Claude AI...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <AlertTriangle size={48} />
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div className="analysis-section">
                <div className="section-header">
                  <FileText size={20} />
                  <h4>Key Insights</h4>
                </div>
                <ul className="insights-list">
                  {analysis.keyInsights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>

              <div className="analysis-section">
                <div className="section-header">
                  <CheckCircle size={20} />
                  <h4>Recommended Action Items</h4>
                </div>
                <ul className="action-list">
                  {analysis.actionItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="analysis-section">
                <div className="section-header">
                  <AlertTriangle size={20} />
                  <h4>Risk Assessment</h4>
                </div>
                <div className="risks-container">
                  {analysis.risks.map((risk, index) => (
                    <div key={index} className={`risk-item risk-${risk.level}`}>
                      <span className="risk-badge">{risk.level} risk</span>
                      <span>{risk.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analysis-section">
                <div className="section-header">
                  <Clock size={20} />
                  <h4>Timeline & Financial Impact</h4>
                </div>
                <div className="impact-details">
                  <p><strong>Timeline:</strong> {analysis.timelineImpact}</p>
                  <p><strong>Financial Impact:</strong> {analysis.financialImpact}</p>
                </div>
              </div>

              <div className="analysis-section">
                <div className="section-header">
                  <Brain size={20} />
                  <h4>Why This Matters</h4>
                </div>
                <p className="relevance-text">{analysis.relevanceReasoning}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AIAnalysis
