/**
 * Simple in-memory cache with TTL (Time To Live)
 *
 * Cache Strategy:
 * - National/Regional averages: 24 hours (same for all states, expensive to compute)
 * - State analysis data: 6 hours (per-state data)
 * - Manual invalidation on data refresh
 */

class Cache {
  constructor() {
    this.cache = new Map()
  }

  /**
   * Set a cache entry with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMs - Time to live in milliseconds
   */
  set(key, value, ttlMs) {
    const expiresAt = Date.now() + ttlMs
    this.cache.set(key, {
      value,
      expiresAt
    })
  }

  /**
   * Get a cache entry if not expired
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/missing
   */
  get(key) {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  /**
   * Delete a specific cache entry
   * @param {string} key - Cache key to delete
   */
  delete(key) {
    this.cache.delete(key)
  }

  /**
   * Clear all cache entries matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'state:*' or 'national:*')
   */
  clearPattern(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'))
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let activeEntries = 0
    let expiredEntries = 0
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredEntries++
      } else {
        activeEntries++
      }
    }

    return {
      total: this.cache.size,
      active: activeEntries,
      expired: expiredEntries
    }
  }
}

// Create singleton cache instance
const cache = new Cache()

// Cache TTL constants (in milliseconds)
// Strategy: Long TTL (30 days) + manual invalidation on data refresh
export const CACHE_TTL = {
  NATIONAL_AVERAGES: 30 * 24 * 60 * 60 * 1000,  // 30 days - invalidated on CMS data refresh
  REGIONAL_AVERAGES: 30 * 24 * 60 * 60 * 1000,  // 30 days - invalidated on CMS data refresh
  STATE_ANALYSIS: 30 * 24 * 60 * 60 * 1000,     // 30 days - invalidated on CMS data refresh
  FACILITY_LIST: 30 * 24 * 60 * 60 * 1000,      // 30 days - invalidated on CMS data refresh
  STATE_RANKINGS: 30 * 24 * 60 * 60 * 1000      // 30 days - invalidated on CMS data refresh
}

// Cache key generators
export const CACHE_KEYS = {
  nationalAverages: () => 'national:averages',
  regionalAverages: (region) => `regional:${region}`,
  stateAnalysis: (stateCode) => `state:${stateCode.toUpperCase()}:analysis`,
  stateFacilities: (stateCode) => `state:${stateCode.toUpperCase()}:facilities`,
  stateRankings: () => 'rankings:all'
}

export default cache
