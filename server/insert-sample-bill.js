import 'dotenv/config';
import { insertBill } from './database/bills.js';

// Insert the analyzed bill from our testing
async function insertSampleBill() {
  const bill = {
    bill_number: 'FR-2025-14681',
    title: 'Medicare Program; Hospital Inpatient Prospective Payment Systems for Acute Care Hospitals (IPPS) and the Long-Term Care Hospital Prospective Payment System and Policy Changes and Fiscal Year (FY) 2026 Rates',
    summary: 'This rule updates hospital and LTCH payment rates for 2026, creating competitive dynamics that will affect SNF patient flow and case mix.',
    url: 'https://www.federalregister.gov/documents/2025/08/04/2025-14681',
    full_text_url: 'https://www.federalregister.gov/documents/2025/08/04/2025-14681',
    pdf_url: 'https://www.federalregister.gov/documents/2025/08/04/2025-14681/medicare-program.pdf',
    source: 'federal_register',
    jurisdiction: 'federal',
    state: null,
    agencies: ['Centers for Medicare & Medicaid Services'],
    document_type: 'Rule',

    // Dates
    publication_date: '2025-08-04',
    comment_deadline: null,
    effective_date: '2025-10-01',

    // AI Analysis fields - ecosystem scoring
    ai_relevance_score: 57,
    direct_relevance_score: 15,
    ecosystem_relevance_score: 85,
    impact_type: 'Competitive Dynamics',
    priority: 'medium',
    categories: ['Competitive Intelligence', 'Market Strategy', 'Finance', 'Reimbursement'],

    // Ecosystem impact details
    ecosystem_impact: {
      competitorEffect: 'LTCH rate advantages may steer medically complex patients away from SNFs to LTCHs',
      patientFlowEffect: 'Hospital IPPS changes affect discharge planning and post-acute referrals',
      payerSignal: 'Electronic prior authorization requirements demonstrate CMS push toward real-time utilization management',
      timingSignal: 'Technology interoperability requirements typically roll out to hospitals first, then extend to SNFs within 18-24 months'
    },
    strategic_actions: [
      'Analyze local LTCH rate changes versus SNF rates to identify vulnerable patient segments',
      'Engage hospital discharge planners to understand how IPPS changes affect their post-acute referral decisions',
      'Begin technology infrastructure planning for electronic prescribing and prior authorization capabilities',
      'Benchmark clinical outcomes against LTCHs for medically complex patients to defend referral relationships'
    ],

    // Financial impact
    financial_impact_description: 'Competitive threat',
    financial_impact_pbpy: null,

    // Flags
    has_comment_period: false,
    action_required: true,

    // Additional metadata
    affected_operators: 'High Medicare, rehab-focused SNFs in competitive markets with nearby IRFs/LTCHs will see volume pressure on complex medical patients',
    key_impact: 'This rule significantly updates IPPS rates for acute care hospitals and LTCH payment systems, creating competitive pressure on SNFs through differential payment updates and patient flow changes. Hospital payment changes affect discharge planning incentives, while LTCH rate updates directly compete with SNFs for medically complex patients requiring extended care.',

    // Status tracking
    status: 'published',
    last_updated: new Date().toISOString()
  };

  try {
    console.log('Inserting sample bill...\n');
    const billId = await insertBill(bill);
    console.log(`✓ Bill inserted successfully with ID: ${billId}`);
    console.log(`  Bill Number: ${bill.bill_number}`);
    console.log(`  Title: ${bill.title}`);
    console.log(`  Priority: ${bill.priority}`);
    console.log(`  Overall Relevance: ${bill.ai_relevance_score}/100`);
    console.log(`  Direct SNF Relevance: ${bill.direct_relevance_score}/100`);
    console.log(`  Ecosystem Relevance: ${bill.ecosystem_relevance_score}/100`);
    console.log(`  Impact Type: ${bill.impact_type}\n`);
    process.exit(0);
  } catch (error) {
    console.error('Error inserting bill:', error);
    process.exit(1);
  }
}

insertSampleBill();
