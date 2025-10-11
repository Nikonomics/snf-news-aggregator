import { TrendingUp, TrendingDown, Minus, DollarSign, Users, HeartPulse, ShieldCheck } from 'lucide-react'
import './MetricsCardGrid.css'

const iconMap = {
  'dollar-sign': DollarSign,
  'users': Users,
  'heart-pulse': HeartPulse,
  'trending-up': TrendingUp,
  'shield-check': ShieldCheck
}

function MetricsCardGrid({ metrics }) {
  const getIcon = (iconName) => {
    const Icon = iconMap[iconName] || Users
    return <Icon size={24} />
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp size={16} className="trend-up" />
      case 'down': return <TrendingDown size={16} className="trend-down" />
      default: return <Minus size={16} className="trend-stable" />
    }
  }

  return (
    <div className="metrics-card-grid">
      {metrics.map((metric) => (
        <div key={metric.id} className="metric-card">
          <div className="metric-icon">
            {getIcon(metric.icon)}
          </div>
          <div className="metric-content">
            <div className="metric-label">{metric.label}</div>
            <div className="metric-value">{metric.value}</div>
            <div className="metric-comparison">
              {getTrendIcon(metric.trend)}
              <span>{metric.comparison}</span>
            </div>
            <div className="metric-category">{metric.category}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MetricsCardGrid
