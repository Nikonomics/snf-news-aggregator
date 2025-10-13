// Count articles by source
fetch('https://snf-news-aggregator.onrender.com/api/articles?limit=1000')
  .then(r => r.json())
  .then(data => {
    const sourceCounts = {}
    data.articles.forEach(article => {
      const source = article.source || 'Unknown'
      sourceCounts[source] = (sourceCounts[source] || 0) + 1
    })

    console.log('=== Articles by Source ===')
    Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        const pct = ((count / data.articles.length) * 100).toFixed(1)
        console.log(`${source}: ${count} (${pct}%)`)
      })
    console.log(`\nTotal: ${data.articles.length}`)
  })
