# Quick Start Guide: Dependency-Based Roadmap

## 🚀 Running the Migrations

### Step 1: Run the migrations

```bash
cd /Users/nikolashulewsky/snf-news-aggregator/database/migrations
node run-migrations.js
```

Or using psql directly:

```bash
psql $DATABASE_URL -f 001_create_clusters_table.sql
psql $DATABASE_URL -f 002_update_tasks_table.sql
```

### Step 2: Verify the setup

```sql
-- Check clusters were created
SELECT cluster_name, cluster_order, status FROM clusters ORDER BY cluster_order;

-- Check tasks table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('cluster_id', 'cluster_order');
```

## 📋 Common Operations

### Assign a task to a cluster

```sql
-- Assign task 123 to Cluster 1
UPDATE tasks SET cluster_id = 1 WHERE id = 123;
-- cluster_order will be automatically set to 1
```

### Add task dependencies

```sql
-- Task 456 must complete before Task 123 can start
INSERT INTO task_dependencies (task_id, blocking_task_id) 
VALUES (123, 456);

-- Task 123 depends on multiple tasks
INSERT INTO task_dependencies (task_id, blocking_task_id) 
VALUES (123, 456), (123, 789);
```

### Check which tasks can start

```sql
-- Get all tasks that are ready to start
SELECT 
    id, 
    name, 
    cluster_name, 
    can_start,
    blocking_tasks_count
FROM tasks_with_dependency_status 
WHERE can_start = true
ORDER BY cluster_order, id;
```

### Get cluster progress

```sql
-- View all clusters and their progress
SELECT 
    cluster_name,
    cluster_order,
    status,
    ROUND(progress, 1) as progress_percent,
    start_date,
    completion_date
FROM clusters
ORDER BY cluster_order;
```

### Get tasks in a specific cluster

```sql
-- Get all tasks in Cluster 1
SELECT 
    id,
    name,
    status,
    can_start,
    blocking_tasks_count
FROM tasks_with_dependency_status
WHERE cluster_id = 1
ORDER BY id;
```

## 🔄 Workflow Example

### 1. Set up cluster dependencies

```sql
-- Cluster 2 depends on Cluster 1
INSERT INTO cluster_dependencies (cluster_id, depends_on_cluster_id)
VALUES (2, 1);

-- Cluster 3 depends on Cluster 2
INSERT INTO cluster_dependencies (cluster_id, depends_on_cluster_id)
VALUES (3, 2);
```

### 2. Assign tasks to clusters

```sql
-- Assign foundation tasks to Cluster 0
UPDATE tasks 
SET cluster_id = 0 
WHERE category_id = 'foundation';

-- Assign core features to Cluster 1
UPDATE tasks 
SET cluster_id = 1 
WHERE category_id = 'core-features';
```

### 3. Define task dependencies

```sql
-- Database setup must complete before API development
INSERT INTO task_dependencies (task_id, blocking_task_id)
SELECT 
    t1.id as task_id,
    t2.id as blocking_task_id
FROM tasks t1
CROSS JOIN tasks t2
WHERE t1.name LIKE '%API%'
AND t2.name LIKE '%Database%';
```

### 4. Start work on Cluster 0

```sql
-- Mark Cluster 0 as In Progress
UPDATE clusters 
SET status = 'In Progress', start_date = CURRENT_DATE
WHERE cluster_id = 0;

-- Check which tasks can start
SELECT name, can_start 
FROM tasks_with_dependency_status 
WHERE cluster_id = 0;
```

### 5. Complete tasks and track progress

```sql
-- Complete a task
UPDATE tasks 
SET status = 'completed' 
WHERE id = 123;

-- Cluster progress will auto-update!
SELECT cluster_name, progress 
FROM clusters 
WHERE cluster_id = 0;
```

### 6. Complete a cluster

```sql
-- Mark cluster as complete
UPDATE clusters 
SET status = 'Complete', completion_date = CURRENT_DATE
WHERE cluster_id = 0;

-- Tasks in Cluster 1 can now start!
SELECT name, can_start 
FROM tasks_with_dependency_status 
WHERE cluster_id = 1;
```

## 🎯 Key Features

### Auto-Calculated Fields

- **cluster_order** in tasks: Automatically populated from linked cluster
- **progress** in clusters: Automatically calculated from task completion
- **can_start** in views: Automatically determined by cluster status and blocking tasks

### Helper Views

- **tasks_with_cluster_info**: Tasks with cluster details
- **tasks_with_dependency_status**: Tasks with dependency checking

### Helper Functions

- **can_task_start(task_id)**: Returns TRUE if task can start
- **calculate_cluster_progress(cluster_id)**: Returns progress percentage

## 🔍 Troubleshooting

### Check for circular dependencies

```sql
-- Find potential circular task dependencies
SELECT td1.task_id, td1.blocking_task_id
FROM task_dependencies td1
JOIN task_dependencies td2 
    ON td1.task_id = td2.blocking_task_id 
    AND td1.blocking_task_id = td2.task_id;
```

### Find tasks that can't start

```sql
-- Tasks that are blocked
SELECT 
    name,
    cluster_name,
    blocking_tasks_count,
    completed_blocking_tasks_count
FROM tasks_with_dependency_status
WHERE can_start = false
AND status != 'completed'
ORDER BY cluster_order;
```

### Check cluster dependencies

```sql
-- View cluster dependency chain
SELECT 
    c1.cluster_name as depends_on,
    c2.cluster_name as cluster,
    c2.status
FROM cluster_dependencies cd
JOIN clusters c1 ON cd.depends_on_cluster_id = c1.cluster_id
JOIN clusters c2 ON cd.cluster_id = c2.cluster_id
ORDER BY c1.cluster_order, c2.cluster_order;
```

## 📊 Reporting Queries

### Cluster completion timeline

```sql
SELECT 
    cluster_name,
    cluster_order,
    start_date,
    completion_date,
    completion_date - start_date as days_to_complete,
    ROUND(progress, 1) as progress_percent
FROM clusters
WHERE status = 'Complete'
ORDER BY completion_date;
```

### Task dependency graph

```sql
-- Tasks and what they're blocked by
SELECT 
    t1.name as task,
    t2.name as blocked_by,
    t2.status as blocker_status
FROM task_dependencies td
JOIN tasks t1 ON td.task_id = t1.id
JOIN tasks t2 ON td.blocking_task_id = t2.id
ORDER BY t1.cluster_order, t1.id;
```

### Team workload by cluster

```sql
-- Tasks assigned to each team member by cluster
SELECT 
    c.cluster_name,
    t.assigned_to,
    COUNT(*) as task_count,
    COUNT(*) FILTER (WHERE t.status = 'completed') as completed_count
FROM tasks t
JOIN clusters c ON t.cluster_id = c.cluster_id
GROUP BY c.cluster_name, t.assigned_to
ORDER BY c.cluster_order, t.assigned_to;
```

## ✅ Next Steps

1. ✅ Run migrations
2. ⬜ Assign existing tasks to clusters
3. ⬜ Define cluster dependencies
4. ⬜ Define task dependencies
5. ⬜ Update UI to display cluster roadmap
6. ⬜ Implement progress visualization

