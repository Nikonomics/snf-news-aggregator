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

    const response = await fetch(`${API_BASE_URL}/api/articles?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.success && data.articles) {
      return {
        articles: data.articles,
        pagination: {
          page: data.page,
          limit: data.limit,
          totalPages: data.totalPages,
          totalCount: data.count,
          hasNextPage: data.hasNextPage,
          hasPrevPage: data.hasPrevPage
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
