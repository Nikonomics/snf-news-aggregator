import express from 'express';
import pool from '../database/db.js';

const router = express.Router();

// Get all clusters with their details
router.get('/api/clusters', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cluster_id,
        cluster_name,
        cluster_order,
        description,
        completion_criteria,
        status,
        progress,
        start_date,
        completion_date
      FROM clusters
      ORDER BY cluster_order
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clusters:', error);
    res.status(500).json({ error: 'Failed to fetch clusters' });
  }
});

// Get all tasks with cluster information
router.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id,
        t.name,
        t.description,
        t.status,
        t.priority,
        t.assignee,
        t.category_id,
        t.subcategory_id,
        t.cluster_id,
        t.cluster_order,
        t.created_at,
        t.updated_at,
        c.cluster_name,
        c.cluster_order as cluster_order_num
      FROM tasks t
      LEFT JOIN clusters c ON t.cluster_id = c.cluster_id
      ORDER BY c.cluster_order, t.category_id, t.name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get tasks for a specific cluster
router.get('/api/clusters/:clusterId/tasks', async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        t.id,
        t.name,
        t.description,
        t.status,
        t.priority,
        t.assignee,
        t.category_id,
        t.subcategory_id,
        t.created_at,
        t.updated_at
      FROM tasks t
      WHERE t.cluster_id = $1
      ORDER BY t.category_id, t.name
    `, [clusterId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cluster tasks:', error);
    res.status(500).json({ error: 'Failed to fetch cluster tasks' });
  }
});

// Get cluster statistics
router.get('/api/clusters/:clusterId/stats', async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'Complete') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'Not Started') as pending_tasks,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'Complete')::numeric / NULLIF(COUNT(*), 0)) * 100, 
          2
        ) as progress_percentage
      FROM tasks
      WHERE cluster_id = $1
    `, [clusterId]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching cluster stats:', error);
    res.status(500).json({ error: 'Failed to fetch cluster stats' });
  }
});

export default router;

