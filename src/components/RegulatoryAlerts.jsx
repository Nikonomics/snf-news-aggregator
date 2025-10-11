import { AlertTriangle, TrendingDown, TrendingUp, Calendar, DollarSign, Rocket } from 'lucide-react'
import './RegulatoryAlerts.css'

function RegulatoryAlerts({ alerts }) {
  const getImpactIcon = (financialImpact) => {
    if (!financialImpact) return null
    return financialImpact > 0 ? (
      <TrendingUp className="impact-positive" size={16} />
    ) : (
      <TrendingDown className="impact-negative" size={16} />
    )
  }

  const getAlertClass = (relevanceScore) => {
    if (relevanceScore >= 90) return 'alert-critical'
    if (relevanceScore >= 75) return 'alert-high'
    return 'alert-medium'
  }

  const handleLaunchCampaign = (alert) => {
    // In production, this would redirect to SNF Advocate platform
    // For now, simulate the campaign launch
    console.log('Launching campaign for:', alert.title)
    window.alert(`Launching new campaign on SNF Advocate:\n\n"${alert.title}"\n\nThis will:\n• Create campaign page on SNF Advocate\n• Draft advocacy letters to legislators\n• Identify key stakeholders and decision-makers\n• Enable grassroots outreach coordination\n• Track campaign progress and engagement\n• Monitor regulatory outcomes\n\nYou will be redirected to SNF Advocate to complete setup.`)
  }

  const handleViewCampaign = (alert) => {
    // In production, this would redirect to the existing campaign on SNF Advocate
    console.log('Viewing campaign for:', alert.title)
    window.alert(`Opening existing campaign on SNF Advocate:\n\n"${alert.title}"\n\nCampaign Status:\n• 47 letters sent to legislators\n• 12 facilities participating\n• 3 stakeholder meetings scheduled\n• Comment deadline: ${alert.commentDeadline ? new Date(alert.commentDeadline).toLocaleDateString() : 'TBD'}\n\nYou will be redirected to SNF Advocate to view details.`)
  }

  // Simulate which alerts already have active campaigns
  // In production, this would check against SNF Advocate API
  const hasActiveCampaign = (alertId) => {
    // For demo: alerts with ID starting with 'fed' have active campaigns
    return alertId.startsWith('fed')
  }

  return (
    <div className="regulatory-alerts">
      <div className="alerts-header">
        <h3>
          <AlertTriangle size={20} />
          Regulatory Alerts & Pending Actions
        </h3>
        <span className="alerts-count">{alerts.length} active alerts</span>
      </div>

      <div className="alerts-grid">
        {alerts.map((alert) => (
          <div key={alert.id} className={`alert-card ${getAlertClass(alert.relevanceScore)}`}>
            <div className="alert-header">
              <div className="alert-title-row">
                <span className="jurisdiction-badge">{alert.jurisdiction}</span>
                <span className="alert-type">{alert.type.replace('_', ' ')}</span>
              </div>
              <div className="relevance-score">{alert.relevanceScore}</div>
            </div>

            <h4 className="alert-title">{alert.title}</h4>
            <p className="alert-description">{alert.description}</p>

            <div className="alert-details">
              {alert.effectiveDate && (
                <div className="alert-detail">
                  <Calendar size={14} />
                  <span>Effective: {new Date(alert.effectiveDate).toLocaleDateString()}</span>
                </div>
              )}

              {alert.commentDeadline && (
                <div className="alert-detail alert-deadline">
                  <Calendar size={14} />
                  <span>Comment by: {new Date(alert.commentDeadline).toLocaleDateString()}</span>
                </div>
              )}

              {alert.financialImpact && (
                <div className="alert-detail">
                  {getImpactIcon(alert.financialImpact)}
                  <DollarSign size={14} />
                  <span>
                    {alert.financialImpact > 0 ? '+' : ''}
                    ${Math.abs(alert.financialImpact).toLocaleString()} PBPY
                  </span>
                </div>
              )}

              <div className="alert-category">
                <span className="category-badge">{alert.impactCategory}</span>
                <span className="status-badge">{alert.status}</span>
              </div>
            </div>

            {alert.requiresAction && alert.actionItems && (
              <div className="action-items">
                <strong>Action Required:</strong>
                <p>{alert.actionItems}</p>
              </div>
            )}

            {hasActiveCampaign(alert.id) ? (
              <button
                className="launch-campaign-btn active-campaign"
                onClick={() => handleViewCampaign(alert)}
              >
                <Rocket size={12} />
                See Current Campaign
              </button>
            ) : (
              <button
                className="launch-campaign-btn"
                onClick={() => handleLaunchCampaign(alert)}
              >
                <Rocket size={12} />
                Launch Campaign
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default RegulatoryAlerts
