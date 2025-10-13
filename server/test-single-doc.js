import 'dotenv/config';
import fetch from 'node-fetch';
import { analyzeDocumentRelevance } from './services/federalRegisterCollector.js';

// Test a specific document by fetching from Federal Register API
async function testDocument() {
  const docNumber = "2025-14681"; // IRF PPS

  console.log('\n' + '='.repeat(80));
  console.log(`FETCHING AND ANALYZING: ${docNumber}`);
  console.log('='.repeat(80) + '\n');

  try {
    const url = `https://www.federalregister.gov/api/v1/documents/${docNumber}.json`;
    console.log(`Fetching: ${url}\n`);

    const response = await fetch(url);
    const data = await response.json();

    console.log(`Title: ${data.title}`);
    console.log(`Type: ${data.type}`);
    console.log(`Publication Date: ${data.publication_date}`);
    console.log(`Agencies: ${data.agencies?.map(a => a.name).join(', ')}`);

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
        console.log(`Competitor: ${analysis.ecosystemImpact.competitorEffect}`);
      }
      if (analysis.ecosystemImpact.patientFlowEffect) {
        console.log(`Patient Flow: ${analysis.ecosystemImpact.patientFlowEffect}`);
      }
      if (analysis.ecosystemImpact.payerSignal) {
        console.log(`Payer: ${analysis.ecosystemImpact.payerSignal}`);
      }
      if (analysis.ecosystemImpact.timingSignal) {
        console.log(`Timing: ${analysis.ecosystemImpact.timingSignal}`);
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

    console.log('\n✓ DECISION: This bill would be ' + (analysis.overallRelevance >= 50 ? 'INCLUDED' : 'FILTERED OUT'));
    console.log(`  (Threshold: 50, Score: ${analysis.overallRelevance})\n`);

  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

testDocument();
