import 'dotenv/config';
import fetch from 'node-fetch';

// Fetch the 6 documents and show what they actually contain
async function analyzeBills() {
  const documents = [
    {
      title: "Medicare Program; FY 2026 Inpatient Psychiatric Facilities Prospective Payment System",
      docNumber: "2025-14680"
    },
    {
      title: "Medicare Program; Inpatient Rehabilitation Facility Prospective Payment System",
      docNumber: "2025-14681"
    },
    {
      title: "Medicare Program; Hospital Inpatient Prospective Payment Systems for Acute Care",
      docNumber: "2025-14678"
    },
    {
      title: "Medicare and Medicaid Programs: Hospital Outpatient Prospective Payment",
      docNumber: "2025-14682"
    },
    {
      title: "Medicare and Medicaid Programs; CY 2026 Payment Policies Under the Physician Fee Schedule",
      docNumber: "2025-14683"
    }
  ];

  console.log('\n' + '='.repeat(80));
  console.log('ANALYZING FILTERED-OUT BILLS FOR SNF RELEVANCE');
  console.log('='.repeat(80) + '\n');

  for (const doc of documents) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Document: ${doc.title}`);
    console.log('='.repeat(80));

    try {
      const url = `https://www.federalregister.gov/api/v1/documents/${doc.docNumber}.json`;
      const response = await fetch(url);
      const data = await response.json();

      console.log(`\nPublication Date: ${data.publication_date}`);
      console.log(`Type: ${data.type}`);
      console.log(`\nAbstract/Summary:`);
      console.log(data.abstract || data.executive_summary || 'Not available');

      // Search for SNF-related content in the abstract
      const searchText = (data.abstract || '').toLowerCase();
      const snfIndicators = [
        'skilled nursing',
        'snf',
        'nursing facility',
        'nursing home',
        'post-acute',
        'long-term care',
        'ltc'
      ];

      const mentions = snfIndicators.filter(term => searchText.includes(term));

      if (mentions.length > 0) {
        console.log(`\n⚠️  SNF-RELATED MENTIONS FOUND: ${mentions.join(', ')}`);
      } else {
        console.log(`\n✓ No direct SNF mentions in abstract`);
      }

      // Check for cross-setting impacts
      const crossSettingTerms = [
        'post-discharge',
        'transfer',
        'discharge',
        'readmission',
        'quality measure',
        'star rating',
        'value-based',
        'bundled payment'
      ];

      const crossSettingMentions = crossSettingTerms.filter(term => searchText.includes(term));

      if (crossSettingMentions.length > 0) {
        console.log(`\n💡 CROSS-SETTING IMPACTS: ${crossSettingMentions.join(', ')}`);
      }

    } catch (error) {
      console.log(`Error fetching document: ${error.message}`);
    }

    console.log('\n');
  }
}

analyzeBills();
