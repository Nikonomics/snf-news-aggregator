import pool from '../database/db.js'

async function checkTable() {
  try {
    // Get table columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cms_facility_deficiencies'
      ORDER BY ordinal_position
    `)

    console.log('\n📋 Table Columns:')
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`)
    })

    // Get constraints
    const constraints = await pool.query(`
      SELECT
        con.conname as constraint_name,
        con.contype as constraint_type,
        array_agg(att.attname) as columns
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
      WHERE rel.relname = 'cms_facility_deficiencies'
      GROUP BY con.conname, con.contype
    `)

    console.log('\n🔑 Constraints:')
    constraints.rows.forEach(con => {
      const type = {
        'p': 'PRIMARY KEY',
        'u': 'UNIQUE',
        'f': 'FOREIGN KEY',
        'c': 'CHECK'
      }[con.constraint_type] || con.constraint_type
      console.log(`   ${type}: ${con.columns.join(', ')}`)
    })

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkTable()
