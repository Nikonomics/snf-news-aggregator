import ArticleCard from './ArticleCard'
import { FileX } from 'lucide-react'

function ArticleList({ articles, onAnalyze, onViewDetails }) {
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
      <div className="articles-grid">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            onAnalyze={onAnalyze}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  )
}

export default ArticleList
