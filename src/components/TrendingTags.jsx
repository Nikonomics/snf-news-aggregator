import { TrendingUp } from 'lucide-react'

function TrendingTags({ articles, onTagClick }) {
  // Count tag occurrences
  const tagCounts = {}
  articles.forEach(article => {
    article.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })

  // Sort by count and get top 10
  const trendingTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }))

  return (
    <div className="trending-tags">
      <div className="trending-header">
        <TrendingUp size={20} />
        <h3>Trending Tags</h3>
      </div>
      <div className="tags-container">
        {trendingTags.map(({ tag, count }) => (
          <button
            key={tag}
            className="trending-tag"
            onClick={() => onTagClick(tag)}
          >
            <span className="tag-name">{tag}</span>
            <span className="tag-count">{count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TrendingTags
