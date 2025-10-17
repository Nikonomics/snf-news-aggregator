#!/usr/bin/env node

/**
 * Reset Database Migrations
 * Drops all tables and views created by the roadmap migrations
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function resetMigrations() {
  console.log('🔄 Resetting database migrations...\n');
  
  try {
    // Drop triggers first
    console.log('Dropping triggers...');
    await pool.query('DROP TRIGGER IF EXISTS trigger_update_task_cluster_order ON tasks');
    await pool.query('DROP TRIGGER IF EXISTS trigger_update_cluster_progress ON tasks');
    await pool.query('DROP TRIGGER IF EXISTS trigger_clusters_updated_at ON clusters');
    console.log('✅ Triggers dropped\n');
    
    // Drop views
    console.log('Dropping views...');
    await pool.query('DROP VIEW IF EXISTS tasks_with_dependency_status');
    await pool.query('DROP VIEW IF EXISTS tasks_with_cluster_info');
    console.log('✅ Views dropped\n');
    
    // Drop functions
    console.log('Dropping functions...');
    await pool.query('DROP FUNCTION IF EXISTS update_task_cluster_order()');
    await pool.query('DROP FUNCTION IF EXISTS can_task_start(INTEGER)');
    await pool.query('DROP FUNCTION IF EXISTS calculate_cluster_progress(INTEGER)');
    await pool.query('DROP FUNCTION IF EXISTS update_cluster_progress()');
    await pool.query('DROP FUNCTION IF EXISTS update_clusters_updated_at()');
    console.log('✅ Functions dropped\n');
    
    // Drop tables
    console.log('Dropping tables...');
    await pool.query('DROP TABLE IF EXISTS task_dependencies CASCADE');
    await pool.query('DROP TABLE IF EXISTS cluster_dependencies CASCADE');
    await pool.query('DROP TABLE IF EXISTS clusters CASCADE');
    console.log('✅ Tables dropped\n');
    
    // Remove columns from tasks (if they exist)
    console.log('Removing columns from tasks...');
    try {
      await pool.query('ALTER TABLE tasks DROP COLUMN IF EXISTS cluster_order');
      await pool.query('ALTER TABLE tasks DROP COLUMN IF EXISTS cluster_id');
      console.log('✅ Columns removed\n');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️  Tasks table does not exist, skipping column removal\n');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Database reset complete!\n');
    console.log('You can now run migrations again with: node run-migrations.js\n');
    
  } catch (error) {
    console.error('❌ Error resetting migrations:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetMigrations();

