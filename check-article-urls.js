// Check a sample of article URLs to see what we're working with
fetch('https://snf-news-aggregator.onrender.com/api/articles?limit=10')
  .then(r => r.json())
  .then(data => {
    console.log('=== Sample Article URLs ===');
    data.articles.slice(0, 10).forEach((article, i) => {
      console.log(`\n${i + 1}. ${article.title.substring(0, 60)}...`);
      console.log(`   URL: ${article.url}`);
      console.log(`   Source: ${article.source}`);
      console.log(`   Has image: ${article.image_url ? 'Yes' : 'No'}`);
    });
  })
  .catch(err => console.error('Error:', err));
