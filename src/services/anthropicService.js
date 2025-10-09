const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://snf-news-aggregator.onrender.com'

export async function analyzeArticleWithAI(article) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze-article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ article })
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to analyze article')
    }

    return data.analysis
  } catch (error) {
    console.error('Error calling analysis API:', error)
    throw error
  }
}
