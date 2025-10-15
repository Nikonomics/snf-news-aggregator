const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://snf-news-aggregator.onrender.com'

export async function fetchArticles(page = 1, limit = 50, filters = {}) {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })

    // Add optional filters
    if (filters.category && filters.category !== 'All') {
      params.append('category', filters.category)
    }
    if (filters.impact && filters.impact !== 'all') {
      params.append('impact', filters.impact)
    }
    if (filters.source && filters.source !== 'All Sources') {
      params.append('source', filters.source)
    }
    if (filters.search) {
      params.append('search', filters.search)
    }
    if (filters.scope && filters.scope !== 'all') {
      params.append('scope', filters.scope)
    }
    if (filters.states && filters.states.length > 0) {
      // Send states as comma-separated values
      params.append('states', filters.states.join(','))
    }

    const response = await fetch(`${API_BASE_URL}/api/articles?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.success && data.articles) {
      return {
        articles: data.articles,
        pagination: data.pagination || {
          page: 1,
          limit: 50,
          totalPages: 1,
          totalCount: data.articles.length,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    } else {
      throw new Error('Invalid response format')
    }
  } catch (error) {
    console.error('Error fetching articles from API:', error)
    throw error
  }
}

export async function refreshArticles() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/articles/refresh`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error refreshing articles:', error)
    throw error
  }
}

export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error checking API health:', error)
    throw error
  }
}

export async function fetchArticleStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/articles/stats`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.stats
  } catch (error) {
    console.error('Error fetching article stats:', error)
    throw error
  }
}

export async function fetchRegulatoryBills(filters = {}) {
  try {
    const params = new URLSearchParams({
      page: '1',
      limit: '1000',
      sortBy: 'ai_relevance_score',
      sortOrder: 'DESC'
    })

    if (filters.source && filters.source !== 'all') {
      params.append('source', filters.source)
    }
    if (filters.priority && filters.priority !== 'all') {
      params.append('priority', filters.priority)
    }
    if (filters.hasCommentPeriod && filters.hasCommentPeriod !== 'all') {
      params.append('hasCommentPeriod', filters.hasCommentPeriod === 'yes' ? 'true' : 'false')
    }

    const response = await fetch(`${API_BASE_URL}/api/bills?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // Filter by impact type client-side if needed
    let bills = data.bills || []
    if (filters.impactType && filters.impactType !== 'all') {
      bills = bills.filter(bill => bill.impact_type === filters.impactType)
    }

    return {
      success: true,
      bills,
      count: bills.length
    }
  } catch (error) {
    console.error('Error fetching regulatory bills:', error)
    throw error
  }
}

// Medicaid Policy Chatbot API functions
export async function getMedicaidStates() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/medicaid/states`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching Medicaid states:', error)
    throw error
  }
}

export async function askMedicaidQuestion(state, question, conversationHistory = [], deepAnalysis = false) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/medicaid/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state,
        question,
        conversationHistory,
        deepAnalysis
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error asking Medicaid question:', error)
    throw error
  }
}

export async function getRevenueLevers(state) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/medicaid/revenue-levers/${encodeURIComponent(state)}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching revenue levers:', error)
    throw error
  }
}
