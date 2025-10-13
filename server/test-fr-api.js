// Test different search query formats for Federal Register API

async function testQuery(description, queryParams) {
  const baseUrl = 'https://www.federalregister.gov/api/v1/documents.json';
  const url = `${baseUrl}?${new URLSearchParams(queryParams).toString()}`;

  console.log(`\n${description}`);
  console.log(`URL: ${url}\n`);

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(`✓ Found ${data.count || 0} total documents`);
    console.log(`✓ Returned ${data.results?.length || 0} in this page\n`);

    if (data.results && data.results.length > 0) {
      console.log('First 3 results:');
      data.results.slice(0, 3).forEach((doc, idx) => {
        console.log(`  ${idx + 1}. ${doc.title.substring(0, 80)}...`);
      });
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
  }
}

async function main() {
  // Test 1: Simple term
  await testQuery(
    'Test 1: Simple "skilled nursing" search',
    {
      'conditions[agencies][]': 'centers-for-medicare-medicaid-services',
      'conditions[term]': 'skilled nursing',
      'conditions[publication_date][gte]': '2025-07-15',
      'per_page': 20
    }
  );

  // Test 2: OR without quotes
  await testQuery(
    'Test 2: Simple OR search',
    {
      'conditions[agencies][]': 'centers-for-medicare-medicaid-services',
      'conditions[term]': 'skilled nursing OR nursing home',
      'conditions[publication_date][gte]': '2025-07-15',
      'per_page': 20
    }
  );

  // Test 3: Just agency and date (no term filter)
  await testQuery(
    'Test 3: All CMS documents (no term filter)',
    {
      'conditions[agencies][]': 'centers-for-medicare-medicaid-services',
      'conditions[publication_date][gte]': '2025-07-15',
      'per_page': 20
    }
  );
}

main();
