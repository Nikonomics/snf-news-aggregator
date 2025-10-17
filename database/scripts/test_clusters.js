#!/usr/bin/env node

/**
 * Test script to verify cluster and task data
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'snf_news_aggregator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function testData() {
  try {
    console.log('Testing database connection and data...\n');
    
    // Test 1: Check clusters
    console.log('1. Checking clusters table...');
    const clustersResult = await pool.query('SELECT COUNT(*) as count FROM clusters');
    console.log(`   ✅ Clusters table has ${clustersResult.rows[0].count} clusters\n`);
    
    // Test 2: Check tasks
    console.log('2. Checking tasks table...');
    const tasksResult = await pool.query('SELECT COUNT(*) as count FROM tasks');
    console.log(`   ✅ Tasks table has ${tasksResult.rows[0].count} tasks\n`);
    
    // Test 3: Check tasks with cluster_id
    console.log('3. Checking tasks with cluster_id...');
    const tasksWithCluster = await pool.query(`
      SELECT 
        cluster_id,
        COUNT(*) as count
      FROM tasks
      WHERE cluster_id IS NOT NULL
      GROUP BY cluster_id
      ORDER BY cluster_id
    `);
    console.log(`   ✅ Tasks with cluster_id: ${tasksWithCluster.rows.length} clusters`);
    tasksWithCluster.rows.forEach(row => {
      console.log(`      Cluster ${row.cluster_id}: ${row.count} tasks`);
    });
    console.log();
    
    // Test 4: Check tasks without cluster_id
    console.log('4. Checking tasks without cluster_id...');
    const tasksWithoutCluster = await pool.query(`
      SELECT COUNT(*) as count FROM tasks WHERE cluster_id IS NULL
    `);
    console.log(`   ${tasksWithoutCluster.rows[0].count} tasks without cluster_id\n`);
    
    // Test 5: Check task status values
    console.log('5. Checking task status values...');
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
      ORDER BY status
    `);
    statusResult.rows.forEach(row => {
      console.log(`   Status "${row.status}": ${row.count} tasks`);
    });
    console.log();
    
    // Test 6: Check clusters with task counts
    console.log('6. Checking clusters with task counts...');
    const clustersWithTasks = await pool.query(`
      SELECT 
        c.cluster_id,
        c.cluster_name,
        c.cluster_order,
        COUNT(t.id) as task_count
      FROM clusters c
      LEFT JOIN tasks t ON c.cluster_id = t.cluster_id
      GROUP BY c.cluster_id, c.cluster_name, c.cluster_order
      ORDER BY c.cluster_order
    `);
    clustersWithTasks.rows.forEach(row => {
      console.log(`   ${row.cluster_name} (ID: ${row.cluster_id}, Order: ${row.cluster_order}): ${row.task_count} tasks`);
    });
    console.log();
    
    // Test 7: Sample tasks with cluster info
    console.log('7. Sample tasks with cluster info...');
    const sampleTasks = await pool.query(`
      SELECT 
        t.id,
        t.name,
        t.status,
        t.cluster_id,
        c.cluster_name
      FROM tasks t
      LEFT JOIN clusters c ON t.cluster_id = c.cluster_id
      ORDER BY t.cluster_id
      LIMIT 10
    `);
    sampleTasks.rows.forEach(row => {
      console.log(`   Task: "${row.name.substring(0, 40)}..." | Status: ${row.status} | Cluster: ${row.cluster_name || 'NULL'}`);
    });
    
    console.log('\n✅ All tests completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testData();

