// Check for duplicates in the frontend API
async function checkFrontendDuplicates() {
  const API_URL = 'https://snf-news-aggregator.onrender.com/api/articles';

  console.log('Fetching articles from production API...');
  console.log(API_URL);
  console.log('');

  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    const articles = data.articles || [];

    console.log(`Total articles from API: ${articles.length}`);
    console.log('');

    // Group by exact title
    const byTitle = new Map();
    articles.forEach((article, idx) => {
      const key = article.title.toLowerCase().trim();
      if (!byTitle.has(key)) {
        byTitle.set(key, []);
      }
      byTitle.get(key).push({
        index: idx,
        title: article.title,
        source: article.source,
        url: article.url,
        date: article.publishedDate || article.date,
        category: article.category
      });
    });

    // Find exact duplicates
    const duplicates = Array.from(byTitle.entries())
      .filter(([_, arts]) => arts.length > 1)
      .sort((a, b) => b[1].length - a[1].length); // Sort by count descending

    console.log('=== EXACT TITLE DUPLICATES ===');
    console.log(`Duplicate groups: ${duplicates.length}`);
    console.log(`Total duplicate articles: ${duplicates.reduce((sum, [_, arts]) => sum + arts.length - 1, 0)}`);
    console.log('');

    if (duplicates.length > 0) {
      console.log('--- All Duplicate Groups ---\n');
      duplicates.forEach(([title, arts], groupIdx) => {
        console.log(`Group ${groupIdx + 1}: "${arts[0].title}"`);
        console.log(`  Count: ${arts.length}`);
        console.log(`  Category: ${arts[0].category || 'N/A'}`);
        arts.forEach(a => {
          console.log(`    [${a.index}] ${a.source} - ${a.date}`);
        });
        console.log('');
      });
    }

    // Check for similar titles (substring matches)
    console.log('=== SIMILAR TITLES (potential duplicates) ===');
    const titles = articles.map((a, idx) => ({
      idx,
      title: a.title.toLowerCase(),
      original: a.title,
      source: a.source,
      category: a.category
    }));

    const similar = [];
    for (let i = 0; i < titles.length; i++) {
      for (let j = i + 1; j < titles.length; j++) {
        const t1 = titles[i].title;
        const t2 = titles[j].title;

        // Skip if exact match (already counted)
        if (t1 === t2) continue;

        // Check if one is substring of other
        if (t1.includes(t2) || t2.includes(t1)) {
          similar.push({
            idx1: titles[i].idx,
            idx2: titles[j].idx,
            title1: titles[i].original,
            title2: titles[j].original,
            source1: titles[i].source,
            source2: titles[j].source,
            category1: titles[i].category,
            category2: titles[j].category
          });
        }
      }
    }

    console.log(`Found ${similar.length} similar title pairs:`);
    console.log('');
    similar.slice(0, 30).forEach((pair, idx) => {
      console.log(`${idx + 1}.`);
      console.log(`  [${pair.idx1}] ${pair.title1}`);
      console.log(`       Source: ${pair.source1}, Category: ${pair.category1 || 'N/A'}`);
      console.log(`  [${pair.idx2}] ${pair.title2}`);
      console.log(`       Source: ${pair.source2}, Category: ${pair.category2 || 'N/A'}`);
      console.log('');
    });

    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Total articles: ${articles.length}`);
    console.log(`Unique titles: ${byTitle.size}`);
    console.log(`Exact duplicates to remove: ${duplicates.reduce((sum, [_, arts]) => sum + arts.length - 1, 0)}`);
    console.log(`Similar title pairs: ${similar.length}`);

  } catch (error) {
    console.error('Error fetching articles:', error.message);
  }
}

checkFrontendDuplicates();
