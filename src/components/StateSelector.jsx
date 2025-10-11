import { MapPin } from 'lucide-react'
import RealGeographicUSMap from './RealGeographicUSMap'
import './StateSelector.css'

function StateSelector() {
  return (
    <div className="state-selector-page">
      <div className="state-selector-container">
        <div className="state-selector-header">
          <MapPin size={48} />
          <h1>Select Your State</h1>
          <p>Click on your state to view personalized insights, sentiment analysis, and state-specific articles</p>
        </div>

        <div className="map-container">
          <RealGeographicUSMap />
        </div>

        <div className="map-instructions">
          <p>💡 Hover over states to see their names • Click to view the intelligence dashboard</p>
        </div>
      </div>
    </div>
  )
}

export default StateSelector
