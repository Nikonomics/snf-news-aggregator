const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function fetchArticles() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/articles`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.success && data.articles) {
      return data.articles
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
