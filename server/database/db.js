import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } :
       (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000, // Increased to 60 seconds
  keepAlive: true, // Enable TCP keepalive
  keepAliveInitialDelayMillis: 10000, // Start keepalive after 10 seconds
})

// Test database connection
pool.on('connect', () => {
  console.log('✓ Database connected')
})

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err)
  process.exit(-1)
})

// Initialize database schema
export async function initializeDatabase() {
  try {
    console.log('Initializing database schema...')

    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    await pool.query(schema)
    console.log('✓ Database schema initialized')

    return true
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    return false
  }
}

// Test connection and get version
export async function testConnection() {
  try {
    const result = await pool.query('SELECT version()')
    console.log('✓ PostgreSQL version:', result.rows[0].version.split(' ')[1])
    return true
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message)
    return false
  }
}

// Graceful shutdown
export async function closePool() {
  await pool.end()
  console.log('✓ Database connection pool closed')
}

// Query function
export const query = (text, params) => pool.query(text, params)

export { pool }
export default { query, pool, initializeDatabase, testConnection, closePool }
