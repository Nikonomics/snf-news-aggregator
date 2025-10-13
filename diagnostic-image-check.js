// Diagnostic script - copy and paste this into browser console on Render app
// Visit: https://snf-news-aggregator.onrender.com

fetch('https://snf-news-aggregator.onrender.com/api/articles?limit=1000')
  .then(r => r.json())
  .then(data => {
    const articles = data.articles || [];
    const withPlaceholders = articles.filter(a =>
      a.image_url && a.image_url.includes('ui-avatars.com')
    );
    const withNull = articles.filter(a => !a.image_url);
    const withReal = articles.filter(a =>
      a.image_url && !a.image_url.includes('ui-avatars.com')
    );

    console.log('=== Image Status Report ===');
    console.log('Total articles: ' + articles.length);
    console.log('With placeholder images: ' + withPlaceholders.length);
    console.log('With NULL images: ' + withNull.length);
    console.log('With real images: ' + withReal.length);
    console.log('\nNeed backfill: ' + (withPlaceholders.length + withNull.length));

    if (withPlaceholders.length > 0) {
      console.log('\nSample placeholder URL:', withPlaceholders[0].image_url);
    }
  })
  .catch(err => console.error('Error:', err));
