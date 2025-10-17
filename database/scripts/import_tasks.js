import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Parse PROJECT_TRACKER.md to extract tasks
function parseProjectTracker() {
  const filePath = path.join(__dirname, '../../PROJECT_TRACKER.md');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const tasks = [];
  let currentCategory = null;
  let currentSubcategory = null;
  let taskId = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match category/subcategory heading: ### **X.Y Category Name**
    const categoryMatch = line.match(/^### \*\*(\d+\.\d+(?:\.\d+)?)\s+(.+?)\*\*/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1];
      currentSubcategory = categoryMatch[2];
      continue;
    }
    
    // Match task line: - [x] or - [ ] **Task Name** - Description
    const taskMatch = line.match(/^- \[([ x])\]\s+\*\*(.+?)\*\*(?:\s*-\s*(.+))?/);
    if (taskMatch && currentCategory) {
      const status = taskMatch[1].trim() === 'x' ? 'Complete' : 'Not Started';
      const taskName = taskMatch[2].trim();
      const description = taskMatch[3] ? taskMatch[3].trim() : taskName;
      
      tasks.push({
        id: taskId++,
        name: taskName,
        description: description,
        status: status,
        category_id: currentCategory,
        subcategory_id: currentSubcategory,
        priority: 'Medium',
        assignee: null
      });
    }
  }
  
  return tasks;
}

// Insert tasks into database
async function insertTasks(tasks) {
  console.log(`\n📝 Inserting ${tasks.length} tasks into database...\n`);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const task of tasks) {
      await client.query(
        `INSERT INTO tasks (name, description, status, priority, assignee, category_id, subcategory_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [task.name, task.description, task.status, task.priority, task.assignee, task.category_id, task.subcategory_id]
      );
    }
    
    await client.query('COMMIT');
    console.log('✅ All tasks inserted successfully!\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error inserting tasks:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Link tasks to clusters
async function linkTasksToClusters() {
  console.log('🔗 Linking tasks to clusters...\n');
  
  const sqlPath = path.join(__dirname, '../migrations/link_tasks_to_clusters.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Split SQL into individual statements (removing the SELECT queries at the end)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT') && !s.startsWith('Note:'))
    .filter(s => s.length > 0);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const statement of statements) {
      await client.query(statement);
    }
    
    await client.query('COMMIT');
    console.log('✅ Tasks linked to clusters successfully!\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error linking tasks:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Get summary statistics
async function getSummary() {
  const client = await pool.connect();
  try {
    // Total tasks
    const totalResult = await client.query('SELECT COUNT(*) as total FROM tasks');
    const total = totalResult.rows[0].total;
    
    // Tasks per cluster
    const clusterResult = await client.query(`
      SELECT 
        c.cluster_name,
        c.cluster_order,
        COUNT(t.id) as task_count
      FROM clusters c
      LEFT JOIN tasks t ON c.cluster_id = t.cluster_id
      GROUP BY c.cluster_name, c.cluster_order
      ORDER BY c.cluster_order
    `);
    
    // Tasks by status
    const statusResult = await client.query(`
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
      ORDER BY status
    `);
    
    // Tasks without cluster assignment
    const unassignedResult = await client.query(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE cluster_id IS NULL
    `);
    
    return {
      total,
      clusters: clusterResult.rows,
      statuses: statusResult.rows,
      unassigned: unassignedResult.rows[0].count
    };
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting task import process...\n');
    
    // Step 1: Parse PROJECT_TRACKER.md
    console.log('📖 Parsing PROJECT_TRACKER.md...');
    const tasks = parseProjectTracker();
    console.log(`✅ Found ${tasks.length} tasks\n`);
    
    // Step 2: Insert tasks
    await insertTasks(tasks);
    
    // Step 3: Link tasks to clusters
    await linkTasksToClusters();
    
    // Step 4: Get summary
    console.log('📊 Generating summary...\n');
    const summary = await getSummary();
    
    // Display summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 IMPORT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n✅ Total Tasks Imported: ${summary.total}`);
    
    console.log('\n📦 Tasks by Cluster:');
    console.log('───────────────────────────────────────────────────────────');
    console.log('Cluster | Order | Tasks');
    console.log('───────────────────────────────────────────────────────────');
    summary.clusters.forEach(c => {
      console.log(`${c.cluster_name.padEnd(20)} | ${String(c.cluster_order).padStart(5)} | ${c.task_count}`);
    });
    console.log('───────────────────────────────────────────────────────────');
    
    console.log('\n📊 Tasks by Status:');
    console.log('───────────────────────────────────────────────────────────');
    summary.statuses.forEach(s => {
      console.log(`${s.status.padEnd(20)} | ${s.count}`);
    });
    console.log('───────────────────────────────────────────────────────────');
    
    if (summary.unassigned > 0) {
      console.log(`\n⚠️  Warning: ${summary.unassigned} tasks could not be mapped to a cluster`);
    } else {
      console.log('\n✅ All tasks successfully mapped to clusters!');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
