import { fetchFederalRegisterDocuments } from './services/federalRegisterCollector.js';

async function test() {
  try {
    // Fetch without filtering
    const response = await fetch('https://www.federalregister.gov/api/v1/documents.json?agencies[]=centers-for-medicare-medicaid-services&publication_date[gte]=2025-09-13&per_page=20&order=newest');
    const data = await response.json();

    console.log(`\nTotal CMS documents: ${data.count}`);
    console.log(`\nFirst 20 CMS documents from last 30 days:\n`);

    data.results.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.title}`);
      console.log(`   Type: ${doc.type}`);
      console.log(`   Date: ${doc.publication_date}`);
      console.log(`   Abstract: ${(doc.abstract || 'N/A').substring(0, 150)}...`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

test();
