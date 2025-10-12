import 'dotenv/config'
import { insertBill, getBills, getBillStats } from './bills.js'

async function testBillOperations() {
  try {
    console.log('🧪 Testing bill database operations...\n')

    // Create a test bill
    const testBill = {
      bill_number: 'TEST-001',
      title: 'Test SNF Staffing Requirements Act',
      summary: 'This is a test bill to verify the legislation tracking system is working correctly.',
      source: 'congress',
      jurisdiction: 'federal',
      status: 'introduced',
      url: 'https://example.com/bill/test-001',
      ai_relevance_score: 85,
      ai_impact_type: 'direct',
      ai_summary: 'Test bill for system verification',
      priority: 'medium',
      topics: ['Staffing', 'Compliance'],
      snf_keywords_matched: ['SNF', 'staffing'],
      introduced_date: new Date('2025-01-15'),
      last_action_date: new Date()
    }

    console.log('1️⃣  Inserting test bill...')
    const billId = await insertBill(testBill)
    console.log(`✅ Bill inserted with ID: ${billId}\n`)

    console.log('2️⃣  Fetching bills...')
    const result = await getBills({ limit: 10 })
    console.log(`✅ Found ${result.bills.length} bills`)
    console.log(`   Total count: ${result.pagination.totalCount}\n`)

    console.log('3️⃣  Getting bill stats...')
    const stats = await getBillStats()
    console.log(`✅ Stats:`)
    console.log(`   Total bills: ${stats.total}`)
    console.log(`   By source:`, stats.bySource)
    console.log(`   By priority:`, stats.byPriority)
    console.log(`   Urgent bills: ${stats.urgent}\n`)

    console.log('✅ All tests passed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testBillOperations()
