import HeroArticleCard from './HeroArticleCard'
import CompactArticleCard from './CompactArticleCard'
import { FileX, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'

function ArticleList({ articles, onAnalyze, onViewDetails, savedArticles, onToggleSave }) {
  // Group articles by category
  const articlesByCategory = useMemo(() => {
    const grouped = {}

    articles.forEach(article => {
      const category = article.category || 'General'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(article)
    })

    // Sort each category by relevance score (descending) to determine hero article
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => {
        const scoreA = a.relevance_score || a.analysis?.relevanceScore || 0
        const scoreB = b.relevance_score || b.analysis?.relevanceScore || 0
        return scoreB - scoreA
      })
    })

    return grouped
  }, [articles])

  if (articles.length === 0) {
    return (
      <div className="empty-state">
        <FileX size={64} />
        <h3>No articles found</h3>
        <p>Try adjusting your filters or search terms</p>
      </div>
    )
  }

  return (
    <div className="article-list">
      <div className="article-count">
        {articles.length} {articles.length === 1 ? 'article' : 'articles'} found
      </div>

      {/* Sectioned Layout */}
      <div className="category-sections">
        {Object.entries(articlesByCategory).map(([category, categoryArticles]) => {
          // First article is hero (highest relevance), rest are compact
          const heroArticle = categoryArticles[0]
          const supplementalArticles = categoryArticles.slice(1, 5) // Show up to 4 supplemental articles

          return (
            <section key={category} className="category-section">
              {/* Category Header */}
              <div className="category-header">
                <h2 className="category-title">{category}</h2>
                <div className="category-count">
                  {categoryArticles.length} {categoryArticles.length === 1 ? 'article' : 'articles'}
                </div>
                <ChevronRight size={20} className="category-arrow" />
              </div>

              {/* Articles Grid: Hero + Supplemental */}
              <div className="category-grid">
                {/* Hero Article (left side, larger) */}
                <div className="category-hero">
                  <HeroArticleCard
                    article={heroArticle}
                    onAnalyze={onAnalyze}
                    onViewDetails={onViewDetails}
                    isSaved={savedArticles?.includes(heroArticle.url)}
                    onToggleSave={onToggleSave}
                  />
                </div>

                {/* Supplemental Articles (right side, stacked) */}
                {supplementalArticles.length > 0 && (
                  <div className="category-supplemental">
                    {supplementalArticles.map((article) => (
                      <CompactArticleCard
                        key={article.id}
                        article={article}
                        onAnalyze={onAnalyze}
                        onViewDetails={onViewDetails}
                        isSaved={savedArticles?.includes(article.url)}
                        onToggleSave={onToggleSave}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default ArticleList
