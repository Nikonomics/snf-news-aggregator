import 'dotenv/config';
import fetch from 'node-fetch';
import { analyzeDocumentRelevance } from './services/federalRegisterCollector.js';

// Test the ecosystem analysis on previously filtered documents
async function testEcosystemAnalysis() {
  const testDocs = [
    {
      title: "Medicare Program; Inpatient Rehabilitation Facility Prospective Payment System",
      docNumber: "2025-14681"
    },
    {
      title: "Medicare and Medicaid Programs; CY 2026 Payment Policies Under the Physician Fee Schedule",
      docNumber: "2025-14683"
    }
  ];

  console.log('\n' + '='.repeat(80));
  console.log('TESTING ECOSYSTEM ANALYSIS ON PREVIOUSLY FILTERED BILLS');
  console.log('='.repeat(80) + '\n');

  for (const doc of testDocs) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${doc.title}`);
    console.log('='.repeat(80));

    try {
      // Fetch full document details
      const url = `https://www.federalregister.gov/api/v1/documents/${doc.docNumber}.json`;
      const response = await fetch(url);
      const data = await response.json();

      console.log(`\nPublication Date: ${data.publication_date}`);
      console.log(`Type: ${data.type}`);

      // Run AI analysis with ecosystem framework
      console.log('\n🤖 Running ecosystem analysis...\n');
      const analysis = await analyzeDocumentRelevance(data);

      console.log('ANALYSIS RESULTS:');
      console.log('─'.repeat(80));
      console.log(`Direct SNF Relevance: ${analysis.directSNFRelevance}/100`);
      console.log(`Ecosystem Relevance: ${analysis.ecosystemRelevance}/100`);
      console.log(`Overall Relevance: ${analysis.overallRelevance}/100`);
      console.log(`Impact Type: ${analysis.impactType}`);
      console.log(`Priority: ${analysis.priority}`);

      if (analysis.ecosystemImpact) {
        console.log('\nECOSYSTEM IMPACT DETAILS:');
        console.log('─'.repeat(80));
        if (analysis.ecosystemImpact.competitorEffect) {
          console.log(`Competitor Effect: ${analysis.ecosystemImpact.competitorEffect}`);
        }
        if (analysis.ecosystemImpact.patientFlowEffect) {
          console.log(`Patient Flow Effect: ${analysis.ecosystemImpact.patientFlowEffect}`);
        }
        if (analysis.ecosystemImpact.payerSignal) {
          console.log(`Payer Signal: ${analysis.ecosystemImpact.payerSignal}`);
        }
        if (analysis.ecosystemImpact.timingSignal) {
          console.log(`Timing Signal: ${analysis.ecosystemImpact.timingSignal}`);
        }
      }

      console.log('\nKEY IMPACT:');
      console.log('─'.repeat(80));
      console.log(analysis.keyImpact);

      if (analysis.strategicActions && analysis.strategicActions.length > 0) {
        console.log('\nSTRATEGIC ACTIONS:');
        console.log('─'.repeat(80));
        analysis.strategicActions.forEach((action, idx) => {
          console.log(`${idx + 1}. ${action}`);
        });
      }

      console.log('\nSUMMARY:');
      console.log('─'.repeat(80));
      console.log(analysis.summary);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error.response) {
        console.error(`Response: ${JSON.stringify(error.response, null, 2)}`);
      }
    }
  }
}

testEcosystemAnalysis();
