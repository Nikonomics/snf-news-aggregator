export async function analyzeArticleWithAI(article) {
  try {
    const response = await fetch('http://localhost:3001/api/analyze-article', {
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
