import { useState, useEffect } from 'react'
import { FileText, ExternalLink, AlertCircle, TrendingUp, Users, DollarSign, Calendar, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { fetchRegulatoryBills } from '../services/apiService'
import './RegulatoryFeed.css'

export default function RegulatoryFeed() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedBill, setExpandedBill] = useState(null)
  const [filters, setFilters] = useState({
    source: 'all',
    priority: 'all',
    impactType: 'all',
    hasCommentPeriod: 'all'
  })

  useEffect(() => {
    loadBills()
  }, [filters])

  const loadBills = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchRegulatoryBills(filters)
      setBills(data.bills || [])
      setLoading(false)
    } catch (err) {
      setError('Failed to load regulatory bills. Please try again.')
      setLoading(false)
      console.error('Error loading bills:', err)
    }
  }

  const getPriorityBadgeStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' }
      case 'high':
        return { color: '#ea580c', bg: '#ffedd5', border: '#fdba74' }
      case 'medium':
        return { color: '#d97706', bg: '#fef3c7', border: '#fcd34d' }
      case 'watch-list':
        return { color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' }
      default:
        return { color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' }
    }
  }

  const getImpactTypeIcon = (impactType) => {
    switch (impactType) {
      case 'Competitive Dynamics':
        return <TrendingUp size={16} />
      case 'Patient Flow':
        return <Users size={16} />
      case 'Payer Behavior':
        return <DollarSign size={16} />
      default:
        return <FileText size={16} />
    }
  }

  const toggleBillExpanded = (billNumber) => {
    setExpandedBill(expandedBill === billNumber ? null : billNumber)
  }

  const filteredBills = bills.filter(bill => {
    if (filters.source !== 'all' && bill.source !== filters.source) return false
    if (filters.priority !== 'all' && bill.priority !== filters.priority) return false
    if (filters.impactType !== 'all' && bill.impact_type !== filters.impactType) return false
    if (filters.hasCommentPeriod !== 'all') {
      const hasComment = bill.has_comment_period || bill.comment_deadline
      if (filters.hasCommentPeriod === 'yes' && !hasComment) return false
      if (filters.hasCommentPeriod === 'no' && hasComment) return false
    }
    return true
  })

  const sortedBills = [...filteredBills].sort((a, b) => {
    // Sort by priority first
    const priorityOrder = { critical: 0, high: 1, medium: 2, 'watch-list': 3, low: 4 }
    const priorityDiff = (priorityOrder[a.priority?.toLowerCase()] || 5) - (priorityOrder[b.priority?.toLowerCase()] || 5)
    if (priorityDiff !== 0) return priorityDiff

    // Then by overall relevance score
    const scoreA = a.ai_relevance_score || 0
    const scoreB = b.ai_relevance_score || 0
    if (scoreB !== scoreA) return scoreB - scoreA

    // Finally by publication date
    return new Date(b.publication_date) - new Date(a.publication_date)
  })

  return (
    <main className="regulatory-feed">
      <div className="regulatory-header">
        <div>
          <h1>Regulatory Intelligence Feed</h1>
          <p className="regulatory-subtitle">
            Federal Register documents with ecosystem impact analysis - surfacing strategic intelligence beyond direct SNF regulations
          </p>
        </div>

        <button onClick={loadBills} className="refresh-btn" disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Source</label>
          <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
            <option value="all">All Sources</option>
            <option value="federal_register">Federal Register</option>
            <option value="cms">CMS</option>
            <option value="congress">Congress</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Priority</label>
          <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="watch-list">Watch List</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Impact Type</label>
          <select value={filters.impactType} onChange={(e) => setFilters({ ...filters, impactType: e.target.value })}>
            <option value="all">All Types</option>
            <option value="Direct Regulation">Direct Regulation</option>
            <option value="Competitive Dynamics">Competitive Dynamics</option>
            <option value="Patient Flow">Patient Flow</option>
            <option value="Payer Behavior">Payer Behavior</option>
            <option value="Workforce/Operations">Workforce/Operations</option>
            <option value="Payment Philosophy">Payment Philosophy</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Comment Period</label>
          <select value={filters.hasCommentPeriod} onChange={(e) => setFilters({ ...filters, hasCommentPeriod: e.target.value })}>
            <option value="all">All</option>
            <option value="yes">Open Comment Period</option>
            <option value="no">No Comment Period</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-summary">
        <div className="stat-card">
          <span className="stat-label">Total Bills</span>
          <span className="stat-value">{sortedBills.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Critical Priority</span>
          <span className="stat-value">{sortedBills.filter(b => b.priority === 'critical').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Open Comment Periods</span>
          <span className="stat-value">{sortedBills.filter(b => b.has_comment_period || b.comment_deadline).length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ecosystem Impacts</span>
          <span className="stat-value">{sortedBills.filter(b => b.impact_type !== 'Direct Regulation').length}</span>
        </div>
      </div>

      {/* Bills List */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading regulatory bills...</p>
        </div>
      ) : error ? (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={loadBills} className="retry-btn">Retry</button>
        </div>
      ) : sortedBills.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} style={{ opacity: 0.3 }} />
          <p>No bills found matching your filters</p>
        </div>
      ) : (
        <div className="bills-list">
          {sortedBills.map((bill) => {
            const isExpanded = expandedBill === bill.bill_number
            const priorityStyle = getPriorityBadgeStyle(bill.priority)
            const hasEcosystemImpact = bill.ecosystem_relevance_score > 40

            return (
              <div key={bill.bill_number} className={`bill-card ${isExpanded ? 'expanded' : ''}`}>
                {/* Header */}
                <div className="bill-header" onClick={() => toggleBillExpanded(bill.bill_number)}>
                  <div className="bill-title-section">
                    <div className="bill-meta-row">
                      <span
                        className="priority-badge"
                        style={{
                          color: priorityStyle.color,
                          backgroundColor: priorityStyle.bg,
                          borderColor: priorityStyle.border
                        }}
                      >
                        {bill.priority?.toUpperCase() || 'UNKNOWN'}
                      </span>

                      <span className="impact-type">
                        {getImpactTypeIcon(bill.impact_type)}
                        {bill.impact_type || 'Unknown'}
                      </span>

                      {(bill.has_comment_period || bill.comment_deadline) && (
                        <span className="comment-badge">
                          <Calendar size={14} />
                          Comment Period
                        </span>
                      )}

                      {hasEcosystemImpact && (
                        <span className="ecosystem-badge" title="High ecosystem impact">
                          🌐 Ecosystem Impact
                        </span>
                      )}
                    </div>

                    <h3 className="bill-title">{bill.title}</h3>

                    <div className="bill-meta">
                      <span>{bill.source?.replace('_', ' ').toUpperCase()}</span>
                      <span>•</span>
                      <span>{bill.bill_number}</span>
                      <span>•</span>
                      <span>{new Date(bill.publication_date).toLocaleDateString()}</span>
                      {bill.agencies && bill.agencies.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{bill.agencies[0]}</span>
                        </>
                      )}
                    </div>

                    {/* Relevance Scores */}
                    <div className="relevance-scores">
                      <div className="score-item">
                        <span className="score-label">Overall:</span>
                        <span className="score-value">{bill.ai_relevance_score || 'N/A'}/100</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Direct SNF:</span>
                        <span className="score-value">{bill.direct_relevance_score || 'N/A'}/100</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Ecosystem:</span>
                        <span className="score-value">{bill.ecosystem_relevance_score || 'N/A'}/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="expand-icon">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="bill-details">
                    {/* Summary */}
                    <div className="detail-section">
                      <h4>Summary</h4>
                      <p>{bill.summary || 'No summary available'}</p>
                    </div>

                    {/* Key Impact */}
                    {bill.key_impact && (
                      <div className="detail-section">
                        <h4>Key Impact</h4>
                        <p>{bill.key_impact}</p>
                      </div>
                    )}

                    {/* Ecosystem Impact Details */}
                    {bill.ecosystem_impact && hasEcosystemImpact && (
                      <div className="detail-section ecosystem-section">
                        <h4>🌐 Ecosystem Impact Analysis</h4>
                        <div className="ecosystem-details">
                          {bill.ecosystem_impact.competitorEffect && (
                            <div className="ecosystem-item">
                              <strong>Competitive Effect:</strong>
                              <p>{bill.ecosystem_impact.competitorEffect}</p>
                            </div>
                          )}
                          {bill.ecosystem_impact.patientFlowEffect && (
                            <div className="ecosystem-item">
                              <strong>Patient Flow Effect:</strong>
                              <p>{bill.ecosystem_impact.patientFlowEffect}</p>
                            </div>
                          )}
                          {bill.ecosystem_impact.payerSignal && (
                            <div className="ecosystem-item">
                              <strong>Payer Signal:</strong>
                              <p>{bill.ecosystem_impact.payerSignal}</p>
                            </div>
                          )}
                          {bill.ecosystem_impact.timingSignal && (
                            <div className="ecosystem-item">
                              <strong>Timing Signal:</strong>
                              <p>{bill.ecosystem_impact.timingSignal}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Affected Operators */}
                    {bill.affected_operators && (
                      <div className="detail-section">
                        <h4>Affected Operators</h4>
                        <p>{bill.affected_operators}</p>
                      </div>
                    )}

                    {/* Strategic Actions */}
                    {bill.strategic_actions && bill.strategic_actions.length > 0 && (
                      <div className="detail-section">
                        <h4>Strategic Actions</h4>
                        <ul className="strategic-actions-list">
                          {bill.strategic_actions.map((action, idx) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Financial Impact */}
                    {bill.financial_impact_description && (
                      <div className="detail-section">
                        <h4>Financial Impact</h4>
                        <p className="financial-impact">{bill.financial_impact_description}</p>
                      </div>
                    )}

                    {/* Categories */}
                    {bill.categories && bill.categories.length > 0 && (
                      <div className="detail-section">
                        <h4>Categories</h4>
                        <div className="categories-list">
                          {bill.categories.map((cat, idx) => (
                            <span key={idx} className="category-tag">{cat}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Important Dates */}
                    <div className="detail-section">
                      <h4>Important Dates</h4>
                      <div className="dates-grid">
                        <div>
                          <strong>Published:</strong> {new Date(bill.publication_date).toLocaleDateString()}
                        </div>
                        {bill.comment_deadline && (
                          <div>
                            <strong>Comment Deadline:</strong> {new Date(bill.comment_deadline).toLocaleDateString()}
                          </div>
                        )}
                        {bill.effective_date && (
                          <div>
                            <strong>Effective Date:</strong> {new Date(bill.effective_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Links */}
                    <div className="bill-actions">
                      {bill.full_text_url && (
                        <a href={bill.full_text_url} target="_blank" rel="noopener noreferrer" className="action-btn">
                          <ExternalLink size={16} />
                          View Full Text
                        </a>
                      )}
                      {bill.pdf_url && (
                        <a href={bill.pdf_url} target="_blank" rel="noopener noreferrer" className="action-btn">
                          <FileText size={16} />
                          Download PDF
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
