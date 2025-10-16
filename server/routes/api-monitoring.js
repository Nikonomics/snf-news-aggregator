/**
 * API Monitoring and Health Check Routes
 */

import express from 'express'
import apiKeyManager from '../services/apiKeyManager.js'
import aiService from '../services/aiService.js'

const router = express.Router()

// Get AI service statistics
router.get('/ai/stats', (req, res) => {
  try {
    const aiStats = aiService.getStats()
    const keyStats = apiKeyManager.getStats()
    res.json({
      success: true,
      ai: aiStats,
      keys: keyStats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get API key usage statistics (legacy endpoint)
router.get('/api-keys/stats', (req, res) => {
  try {
    const stats = apiKeyManager.getStats()
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Health check for API keys
router.get('/api-keys/health', async (req, res) => {
  try {
    const stats = apiKeyManager.getStats()
    const availableKeys = stats.totalKeys - stats.failedKeys.length
    
    res.json({
      success: true,
      health: {
        totalKeys: stats.totalKeys,
        availableKeys,
        failedKeys: stats.failedKeys,
        currentKeyIndex: stats.currentKeyIndex,
        status: availableKeys > 0 ? 'healthy' : 'critical'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Reset failed keys (admin endpoint)
router.post('/api-keys/reset', (req, res) => {
  try {
    // Reset failed keys - they might be working again
    apiKeyManager.failedKeys.clear()
    apiKeyManager.currentKeyIndex = 0
    
    res.json({
      success: true,
      message: 'API keys reset successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
