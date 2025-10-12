import * as db from '../db.js'

export async function up() {
  const query = `
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id SERIAL PRIMARY KEY,
      week_start_date DATE NOT NULL,
      week_end_date DATE NOT NULL,
      title VARCHAR(255) NOT NULL,
      report_data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(week_start_date, week_end_date)
    );

    CREATE INDEX idx_weekly_reports_dates ON weekly_reports(week_start_date DESC, week_end_date DESC);
    CREATE INDEX idx_weekly_reports_created ON weekly_reports(created_at DESC);
  `

  await db.query(query)
  console.log('✅ Created weekly_reports table')
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS weekly_reports CASCADE')
  console.log('✅ Dropped weekly_reports table')
}
