#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs SQL migrations in order for the dependency-based roadmap structure
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection from environment or defaults
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/snf_news_aggregator',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const migrations = [
  '001_create_clusters_table.sql',
  '002_update_tasks_table.sql'
];

async function runMigration(filename) {
  const filePath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n📄 Running migration: ${filename}`);
  
  try {
    await pool.query(sql);
    console.log(`✅ Successfully applied: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Error applying ${filename}:`, error.message);
    return false;
  }
}

async function checkDatabase() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log(`   Connected at: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function checkExistingTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('clusters', 'task_dependencies')
    `);
    
    if (result.rows.length > 0) {
      console.log('\n⚠️  Warning: Some tables already exist:');
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('\n   This migration will skip existing objects (using IF NOT EXISTS)');
      console.log('   If you want to re-run, drop existing tables first.\n');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking existing tables:', error.message);
    return false;
  }
}

async function runAllMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  // Check database connection
  const dbConnected = await checkDatabase();
  if (!dbConnected) {
    process.exit(1);
  }
  
  // Check for existing tables
  await checkExistingTables();
  
  // Run migrations in order
  let successCount = 0;
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (success) {
      successCount++;
    } else {
      console.error(`\n❌ Migration failed. Stopping.`);
      process.exit(1);
    }
  }
  
  console.log(`\n✅ All migrations completed successfully! (${successCount}/${migrations.length})`);
  console.log('\n📊 Summary:');
  console.log('   - Clusters table created with 11 initial records');
  console.log('   - Tasks table updated with cluster and dependency fields');
  console.log('   - Helper views and functions created');
  console.log('   - Auto-calculation triggers enabled\n');
  
  await pool.end();
}

// Run migrations
runAllMigrations().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

