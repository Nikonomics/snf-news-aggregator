import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://nicolas:nicolas123@localhost:5432/snf_news_aggregator'
})

async function testScoring() {
  try {
    console.log('Testing new urgency scoring logic...\n')

    // Get recent articles with highest urgency scores
    const result = await pool.query(`
      SELECT
        id,
        title,
        category,
        TO_CHAR(published_date, 'YYYY-MM-DD') as published_date,
        CAST(COALESCE(analysis->>'urgencyScore', '50') AS INTEGER) as urgency_score,
        analysis->>'keyInsights' as key_insights,
        analysis->>'articleType' as article_type
      FROM articles
      WHERE published_date >= CURRENT_DATE - INTERVAL '30 days'
        AND CAST(COALESCE(analysis->>'urgencyScore', '0') AS INTEGER) > 0
      ORDER BY CAST(COALESCE(analysis->>'urgencyScore', '0') AS INTEGER) DESC
      LIMIT 10
    `)

    console.log(`Found ${result.rows.length} recent articles with urgency scores\n`)
    console.log('='.repeat(100))

    result.rows.forEach((article, index) => {
      console.log(`\n${index + 1}. [Score: ${article.urgency_score}] ${article.title}`)
      console.log(`   Category: ${article.category}`)
      console.log(`   Type: ${article.article_type || 'N/A'}`)
      console.log(`   Published: ${article.published_date}`)
      console.log(`   Key Insights: ${article.key_insights?.substring(0, 150)}...`)
    })

    // Check distribution
    console.log('\n' + '='.repeat(100))
    console.log('\nScore Distribution:')

    const distribution = await pool.query(`
      SELECT
        CASE
          WHEN CAST(COALESCE(analysis->>'urgencyScore', '0') AS INTEGER) >= 90 THEN '90-100 (Critical)'
          WHEN CAST(COALESCE(analysis->>'urgencyScore', '0') AS INTEGER) >= 75 THEN '75-89 (Significant)'
          WHEN CAST(COALESCE(analysis->>'urgencyScore', '0') AS INTEGER) >= 60 THEN '60-74 (Important)'
          WHEN CAST(COALESCE(analysis->>'urgencyScore', '0') AS INTEGER) >= 40 THEN '40-59 (Strategic)'
          WHEN CAST(COALESCE(analysis->>'urgencyScore', '0') AS INTEGER) >= 20 THEN '20-39 (Informational)'
          ELSE '0-19 (Low Priority)'
        END as score_range,
        COUNT(*) as count,
        ROUND(AVG(CAST(COALESCE(analysis->>'urgencyScore', '0') AS INTEGER)), 1) as avg_score
      FROM articles
      WHERE published_date >= CURRENT_DATE - INTERVAL '30 days'
        AND analysis IS NOT NULL
      GROUP BY score_range
      ORDER BY avg_score DESC
    `)

    distribution.rows.forEach(row => {
      console.log(`  ${row.score_range}: ${row.count} articles (avg: ${row.avg_score})`)
    })

    // Check category breakdown
    console.log('\n' + '='.repeat(100))
    console.log('\nAverage Score by Category:')

    const categoryScores = await pool.query(`
      SELECT
        category,
        COUNT(*) as count,
        ROUND(AVG(CAST(COALESCE(analysis->>'urgencyScore', '0') AS INTEGER)), 1) as avg_score
      FROM articles
      WHERE published_date >= CURRENT_DATE - INTERVAL '30 days'
        AND analysis IS NOT NULL
        AND CAST(COALESCE(analysis->>'urgencyScore', '0') AS INTEGER) > 0
      GROUP BY category
      ORDER BY avg_score DESC
    `)

    categoryScores.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.avg_score} (${row.count} articles)`)
    })

    await pool.end()

  } catch (error) {
    console.error('Error testing scoring:', error)
    await pool.end()
    process.exit(1)
  }
}

testScoring()
