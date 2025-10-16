/**
 * API Key Manager with Rotation and Fallback
 * Handles multiple Anthropic API keys with automatic failover
 */

class APIKeyManager {
  constructor() {
    this.keys = [
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_API_KEY_BACKUP_1,
      process.env.ANTHROPIC_API_KEY_BACKUP_2
    ].filter(key => key && key !== 'your_backup_key_1_here' && key !== 'your_backup_key_2_here')
    
    this.currentKeyIndex = 0
    this.failedKeys = new Set()
    this.requestCounts = new Map()
    this.lastReset = Date.now()
    
    // Reset counters every hour
    setInterval(() => {
      this.requestCounts.clear()
      this.lastReset = Date.now()
    }, 60 * 60 * 1000)
  }

  getCurrentKey() {
    return this.keys[this.currentKeyIndex]
  }

  getNextAvailableKey() {
    // Try current key first
    if (!this.failedKeys.has(this.currentKeyIndex)) {
      return this.keys[this.currentKeyIndex]
    }

    // Find next available key
    for (let i = 0; i < this.keys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i + 1) % this.keys.length
      if (!this.failedKeys.has(keyIndex)) {
        this.currentKeyIndex = keyIndex
        return this.keys[keyIndex]
      }
    }

    // All keys failed - reset and try again
    this.failedKeys.clear()
    this.currentKeyIndex = 0
    return this.keys[0]
  }

  markKeyFailed(keyIndex) {
    this.failedKeys.add(keyIndex)
    console.warn(`🚨 API key ${keyIndex} marked as failed`)
  }

  markKeySuccess(keyIndex) {
    this.failedKeys.delete(keyIndex)
    // Reset to primary key if it's working again
    if (keyIndex === 0) {
      this.currentKeyIndex = 0
    }
  }

  incrementRequestCount(keyIndex) {
    const count = this.requestCounts.get(keyIndex) || 0
    this.requestCounts.set(keyIndex, count + 1)
  }

  getRequestCount(keyIndex) {
    return this.requestCounts.get(keyIndex) || 0
  }

  getStats() {
    return {
      totalKeys: this.keys.length,
      currentKeyIndex: this.currentKeyIndex,
      failedKeys: Array.from(this.failedKeys),
      requestCounts: Object.fromEntries(this.requestCounts),
      lastReset: this.lastReset
    }
  }
}

export default new APIKeyManager()
