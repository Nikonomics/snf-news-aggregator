import Parser from 'rss-parser';

const parser = new Parser();

const RSS_FEEDS = [
  'https://www.skillednursingnews.com/feed/',
  'https://news.google.com/rss/search?q=skilled+nursing+facility&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=nursing+home&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=long-term+care&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=SNF+Medicare&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=nursing+home+regulation&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=SNF+staffing&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=nursing+home+quality&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=post-acute+care&hl=en-US&gl=US&ceid=US:en'
];

async function checkDuplicates() {
  console.log('Fetching articles from', RSS_FEEDS.length, 'RSS feeds...\n');

  const allArticles = [];
  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      feed.items.forEach(item => {
        allArticles.push({
          title: item.title,
          url: item.link,
          source: feed.title || 'Unknown',
          pubDate: item.pubDate
        });
      });
      console.log(`✓ Fetched ${feed.items.length} from ${feed.title || feedUrl}`);
    } catch (err) {
      console.log(`✗ Error fetching ${feedUrl}: ${err.message}`);
    }
  }

  console.log(`\nTotal articles fetched: ${allArticles.length}`);

  // Find duplicates by URL
  const urlGroups = {};
  allArticles.forEach((article, index) => {
    const url = article.url.toLowerCase().trim();
    if (!urlGroups[url]) {
      urlGroups[url] = [];
    }
    urlGroups[url].push({ index, title: article.title, source: article.source });
  });

  const urlDuplicates = Object.entries(urlGroups).filter(([url, articles]) => articles.length > 1);
  console.log(`\nDuplicate URLs: ${urlDuplicates.length}`);
  console.log(`Total duplicate articles by URL: ${urlDuplicates.reduce((sum, [_, arts]) => sum + arts.length - 1, 0)}`);

  // Find duplicates by title (similar titles with slight variations)
  const titleGroups = {};
  allArticles.forEach((article, index) => {
    const title = article.title.toLowerCase().trim();
    if (!titleGroups[title]) {
      titleGroups[title] = [];
    }
    titleGroups[title].push({ index, url: article.url, source: article.source });
  });

  const titleDuplicates = Object.entries(titleGroups).filter(([title, articles]) => articles.length > 1);
  console.log(`\nDuplicate Titles (exact match): ${titleDuplicates.length}`);
  console.log(`Total duplicate articles by title: ${titleDuplicates.reduce((sum, [_, arts]) => sum + arts.length - 1, 0)}`);

  if (titleDuplicates.length > 0) {
    console.log(`\n--- Sample Duplicate Titles (First 20) ---\n`);
    titleDuplicates.slice(0, 20).forEach(([title, articles]) => {
      console.log(`Title: ${title.substring(0, 100)}${title.length > 100 ? '...' : ''}`);
      console.log(`  Appears ${articles.length} times:`);
      articles.forEach(a => console.log(`    - Source: ${a.source}`));
      console.log('');
    });
  }

  // Check for similar titles (might be duplicates with slight variations)
  console.log('\n--- Checking for Similar Titles ---');
  const titles = allArticles.map(a => a.title);
  const similarGroups = [];

  for (let i = 0; i < titles.length; i++) {
    for (let j = i + 1; j < titles.length; j++) {
      const title1 = titles[i].toLowerCase();
      const title2 = titles[j].toLowerCase();

      // Check if one title is a substring of another (likely duplicate)
      if (title1.includes(title2) || title2.includes(title1)) {
        similarGroups.push({
          title1: titles[i],
          title2: titles[j],
          source1: allArticles[i].source,
          source2: allArticles[j].source
        });
      }
    }
  }

  console.log(`Found ${similarGroups.length} pairs of similar titles (substring matches)`);
  if (similarGroups.length > 0) {
    console.log('\nFirst 10 similar pairs:');
    similarGroups.slice(0, 10).forEach((pair, idx) => {
      console.log(`\n${idx + 1}.`);
      console.log(`  A: ${pair.title1} (${pair.source1})`);
      console.log(`  B: ${pair.title2} (${pair.source2})`);
    });
  }

  // Summary
  const uniqueUrls = new Set(allArticles.map(a => a.url.toLowerCase().trim()));
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total fetched: ${allArticles.length}`);
  console.log(`Unique by URL: ${uniqueUrls.size}`);
  console.log(`Exact duplicate URLs: ${allArticles.length - uniqueUrls.size}`);
  console.log(`Exact duplicate titles: ${titleDuplicates.length > 0 ? titleDuplicates.reduce((sum, [_, arts]) => sum + arts.length - 1, 0) : 0}`);
  console.log(`Similar title pairs: ${similarGroups.length}`);
}

checkDuplicates().catch(console.error);
