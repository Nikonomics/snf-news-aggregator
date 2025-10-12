import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, TrendingUp, AlertCircle, ExternalLink, Edit2, Save, X, ChevronDown, ChevronUp } from 'lucide-react'
import './WeeklyInsights.css'

function WeeklyInsights() {
  const { reportId } = useParams()
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [expandedStories, setExpandedStories] = useState(new Set())
  const [editForm, setEditForm] = useState({
    introduction: '',
    editor_note: '',
    author_name: 'Nicolas Hulewsky',
    author_title: 'Healthcare Policy Analyst'
  })

  // Load reports list or single report
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (reportId) {
          // Load specific report by ID
          const response = await fetch(`/api/weekly-reports/${reportId}`)
          if (!response.ok) throw new Error('Failed to load report')
          const data = await response.json()
          setSelectedReport(data.report)
        } else {
          // Load all reports for archive view
          const response = await fetch('/api/weekly-reports?limit=20')
          if (!response.ok) throw new Error('Failed to load reports')
          const data = await response.json()
          setReports(data.reports)

          // Auto-load latest report with full details
          if (data.reports.length > 0) {
            const latestResponse = await fetch(`/api/weekly-reports/${data.reports[0].id}`)
            if (latestResponse.ok) {
              const latestData = await latestResponse.json()
              setSelectedReport(latestData.report)
            } else {
              setSelectedReport(data.reports[0])
            }
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Error loading weekly reports:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    loadData()
  }, [reportId])

  // Update edit form when selected report changes
  useEffect(() => {
    if (selectedReport) {
      setEditForm({
        introduction: selectedReport.introduction || '',
        editor_note: selectedReport.editor_note || '',
        author_name: selectedReport.author_name || 'Nicolas Hulewsky',
        author_title: selectedReport.author_title || 'Healthcare Policy Analyst'
      })
      // Reset expanded stories when switching reports
      setExpandedStories(new Set())
    }
  }, [selectedReport])

  const toggleStoryExpansion = (index) => {
    const newExpanded = new Set(expandedStories)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedStories(newExpanded)
  }

  const handleEditClick = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    // Reset form to current values
    if (selectedReport) {
      setEditForm({
        introduction: selectedReport.introduction || '',
        editor_note: selectedReport.editor_note || '',
        author_name: selectedReport.author_name || 'Nicolas Hulewsky',
        author_title: selectedReport.author_title || 'Healthcare Policy Analyst'
      })
    }
  }

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/weekly-reports/${selectedReport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) throw new Error('Failed to update report')

      const data = await response.json()

      // Update selected report with new data
      setSelectedReport({ ...selectedReport, ...editForm })

      // Update in reports list if present
      setReports(reports.map(r =>
        r.id === selectedReport.id
          ? { ...r, ...editForm }
          : r
      ))

      setIsEditing(false)
    } catch (err) {
      console.error('Error saving edits:', err)
      alert('Failed to save changes. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="weekly-insights">
        <div className="insights-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading weekly insights...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="weekly-insights">
        <div className="insights-container">
          <div className="error-state">
            <AlertCircle size={48} />
            <h3>Error Loading Reports</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="weekly-insights">
      <div className="insights-header">
        <div className="insights-header-content">
          <h1>Weekly Insights</h1>
          <p>AI-curated analysis of the week's top healthcare stories</p>
        </div>
      </div>

      <div className="insights-container">
        <div className="insights-layout">
          {/* Sidebar: Report Archive */}
          <aside className="insights-sidebar">
            <h3>Past Reports</h3>
            <div className="report-list">
              {reports.map(report => (
                <Link
                  key={report.id}
                  to={`/insights/${report.id}`}
                  className={`report-list-item ${selectedReport?.id === report.id ? 'active' : ''}`}
                  onClick={() => setSelectedReport(report)}
                >
                  <Calendar size={16} />
                  <span>{report.title}</span>
                </Link>
              ))}
            </div>
          </aside>

          {/* Main Content: Selected Report */}
          <main className="insights-main">
            {selectedReport ? (
              <article className="report-article">
                <header className="report-header">
                  <div className="header-top">
                    <div>
                      <h2>{selectedReport.title}</h2>
                      <div className="report-meta">
                        <Calendar size={18} />
                        <time dateTime={selectedReport.created_at}>
                          {new Date(selectedReport.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </time>
                      </div>
                    </div>
                    <div className="edit-controls">
                      {!isEditing ? (
                        <button onClick={handleEditClick} className="edit-btn">
                          <Edit2 size={16} />
                          <span>Edit Newsletter</span>
                        </button>
                      ) : (
                        <>
                          <button onClick={handleSaveEdit} className="save-btn">
                            <Save size={16} />
                            <span>Save</span>
                          </button>
                          <button onClick={handleCancelEdit} className="cancel-btn">
                            <X size={16} />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </header>

                {/* Editor's Introduction */}
                {isEditing ? (
                  <div className="edit-section">
                    <label htmlFor="introduction">Personal Introduction (optional)</label>
                    <textarea
                      id="introduction"
                      value={editForm.introduction}
                      onChange={(e) => setEditForm({ ...editForm, introduction: e.target.value })}
                      placeholder="Add your personal introduction to this week's newsletter..."
                      rows={4}
                    />
                  </div>
                ) : selectedReport.introduction ? (
                  <div className="introduction-section">
                    <p>{selectedReport.introduction}</p>
                  </div>
                ) : null}

                <div className="report-content">
                  {selectedReport.report_data?.stories?.map((story, index) => {
                    const isExpanded = expandedStories.has(index)
                    return (
                      <section key={index} className="story-section">
                        <div className="story-header">
                          <div className="story-number">#{index + 1}</div>
                          <h3>{story.headline}</h3>
                        </div>

                        {story.trend && (
                          <div className={`story-badge trend-${story.trend}`}>
                            <TrendingUp size={14} />
                            <span>{story.trend}</span>
                          </div>
                        )}

                        <p className="story-summary">{story.summary}</p>

                        <button
                          className="expand-story-btn"
                          onClick={() => toggleStoryExpansion(index)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={16} />
                              <span>Show Less</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} />
                              <span>Read More</span>
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <>
                            <div className="story-details">
                        <div className="detail-box">
                          <h4>Why It Matters</h4>
                          <p>{story.whyItMatters}</p>
                        </div>

                        {story.estimatedImpact && (
                          <div className="detail-box">
                            <h4>Estimated Impact</h4>
                            <p>{story.estimatedImpact}</p>
                          </div>
                        )}

                        {story.actionItems && story.actionItems.length > 0 && (
                          <div className="detail-box">
                            <h4>Action Items</h4>
                            <ul className="action-list">
                              {story.actionItems.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {story.topics && story.topics.length > 0 && (
                        <div className="story-topics">
                          {story.topics.map((topic, idx) => (
                            <span key={idx} className="topic-tag">{topic}</span>
                          ))}
                        </div>
                      )}

                      {story.affectedStates && story.affectedStates.length > 0 && (
                        <div className="story-states">
                          <strong>Affected States:</strong> {story.affectedStates.join(', ')}
                        </div>
                      )}

                      <div className="story-metadata">
                        <span className="article-count">{story.articleCount} articles</span>
                        {story.score && (
                          <span className="story-score" title="Story importance score">
                            Score: {story.score.toFixed(1)}
                          </span>
                        )}
                      </div>

                      {story.articles && story.articles.length > 0 && (
                        <details className="source-articles">
                          <summary>View {story.articles.length} Source Articles</summary>
                          <ul className="article-list">
                            {story.articles.map((article, idx) => (
                              <li key={idx}>
                                <a href={article.url} target="_blank" rel="noopener noreferrer">
                                  {article.title}
                                  <ExternalLink size={14} />
                                </a>
                                <div className="article-meta">
                                  <span>{article.source}</span>
                                  <span>{new Date(article.published_date).toLocaleDateString()}</span>
                                  <span className={`impact-badge impact-${article.impact}`}>
                                    {article.impact}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                          </>
                        )}
                    </section>
                    )
                  })}
                </div>

                {/* Editor's Note */}
                {isEditing ? (
                  <div className="edit-section">
                    <label htmlFor="editor_note">Closing Commentary (optional)</label>
                    <textarea
                      id="editor_note"
                      value={editForm.editor_note}
                      onChange={(e) => setEditForm({ ...editForm, editor_note: e.target.value })}
                      placeholder="Add your closing thoughts or commentary..."
                      rows={4}
                    />
                  </div>
                ) : selectedReport.editor_note ? (
                  <div className="editor-note-section">
                    <h4>Editor's Note</h4>
                    <p>{selectedReport.editor_note}</p>
                  </div>
                ) : null}

                {/* Author Signature */}
                {isEditing ? (
                  <div className="edit-section author-edit">
                    <div className="author-fields">
                      <div>
                        <label htmlFor="author_name">Your Name</label>
                        <input
                          id="author_name"
                          type="text"
                          value={editForm.author_name}
                          onChange={(e) => setEditForm({ ...editForm, author_name: e.target.value })}
                          placeholder="Nicolas Hulewsky"
                        />
                      </div>
                      <div>
                        <label htmlFor="author_title">Your Title</label>
                        <input
                          id="author_title"
                          type="text"
                          value={editForm.author_title}
                          onChange={(e) => setEditForm({ ...editForm, author_title: e.target.value })}
                          placeholder="Healthcare Policy Analyst"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="author-signature">
                    <p className="author-name">{selectedReport.author_name || 'Nicolas Hulewsky'}</p>
                    <p className="author-title">{selectedReport.author_title || 'Healthcare Policy Analyst'}</p>
                  </div>
                )}

                <footer className="report-footer">
                  <p>Generated by AI-powered trend analysis</p>
                </footer>
              </article>
            ) : (
              <div className="empty-state">
                <Calendar size={64} />
                <h3>No Reports Available</h3>
                <p>Weekly insights will appear here every Sunday</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default WeeklyInsights
