# Database Migrations for Dependency-Based Roadmap

## Overview

This directory contains SQL migration scripts to add a dependency-based roadmap structure to the project management system.

## Migration Files

### 001_create_clusters_table.sql
Creates the Clusters table and related structures:
- **clusters** table with 11 initial records (Clusters 0-10 + Ongoing)
- **cluster_dependencies** table for cluster-level dependencies
- Auto-calculation functions for cluster progress
- Triggers for automatic updates

### 002_update_tasks_table.sql
Updates the Tasks table with cluster and dependency fields:
- Adds `cluster_id` and `cluster_order` columns
- Creates **task_dependencies** table for task-level dependencies
- Adds helper views for querying tasks with cluster and dependency info
- Creates `can_task_start()` function to check if a task is ready to begin
- Adds triggers for automatic updates

## How to Run Migrations

### Option 1: Using psql (PostgreSQL command line)

```bash
# Set your database connection string
export DATABASE_URL="postgresql://user:password@host:port/database"

# Run migrations in order
psql $DATABASE_URL -f 001_create_clusters_table.sql
psql $DATABASE_URL -f 002_update_tasks_table.sql
```

### Option 2: Using Node.js script

```bash
node run-migrations.js
```

### Option 3: Using your existing database connection

```bash
# If you have a database config file
psql -h localhost -U your_username -d snf_news_aggregator -f 001_create_clusters_table.sql
psql -h localhost -U your_username -d snf_news_aggregator -f 002_update_tasks_table.sql
```

## Schema Details

### Clusters Table

| Field | Type | Description |
|-------|------|-------------|
| cluster_id | SERIAL | Auto-incrementing unique identifier |
| cluster_name | VARCHAR(255) | Name of the cluster |
| cluster_order | INTEGER | Execution sequence (0-10 or 999 for Ongoing) |
| description | TEXT | Why this cluster exists |
| status | VARCHAR(50) | Not Started, In Progress, Blocked, or Complete |
| completion_criteria | TEXT | Checklist of requirements |
| progress | DECIMAL(5,2) | Auto-calculated % (0-100) |
| start_date | DATE | When work began |
| completion_date | DATE | When cluster was finished |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

### Task Dependencies Table

| Field | Type | Description |
|-------|------|-------------|
| task_id | INTEGER | The task that is blocked |
| blocking_task_id | INTEGER | The task that must complete first |
| created_at | TIMESTAMP | When dependency was created |

## Helper Views

### tasks_with_cluster_info
Shows all tasks with their cluster information:
```sql
SELECT * FROM tasks_with_cluster_info;
```

### tasks_with_dependency_status
Shows tasks with dependency checking:
```sql
SELECT * FROM tasks_with_dependency_status WHERE can_start = true;
```

## Helper Functions

### can_task_start(task_id)
Returns TRUE if a task can start based on:
- Cluster is "In Progress" or "Complete"
- All blocking tasks are complete

```sql
SELECT can_task_start(123);
```

### calculate_cluster_progress(cluster_id)
Returns the progress percentage for a cluster based on linked tasks:
```sql
SELECT calculate_cluster_progress(1);
```

## Usage Examples

### Assign a task to a cluster
```sql
UPDATE tasks SET cluster_id = 1 WHERE id = 123;
-- cluster_order will be auto-populated to 1
```

### Add a task dependency
```sql
-- Task 123 depends on Task 456
INSERT INTO task_dependencies (task_id, blocking_task_id) VALUES (123, 456);
```

### Check if a task can start
```sql
SELECT can_start FROM tasks_with_dependency_status WHERE id = 123;
```

### Get all tasks in a cluster with their status
```sql
SELECT 
    id, 
    name, 
    status, 
    can_start,
    blocking_tasks_count
FROM tasks_with_dependency_status 
WHERE cluster_id = 1
ORDER BY cluster_order, id;
```

### Get cluster progress
```sql
SELECT 
    cluster_name, 
    status, 
    progress, 
    start_date, 
    completion_date
FROM clusters
ORDER BY cluster_order;
```

## Rollback (if needed)

To rollback these migrations:

```sql
-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_task_cluster_order ON tasks;
DROP TRIGGER IF EXISTS trigger_update_cluster_progress ON tasks;
DROP TRIGGER IF EXISTS trigger_clusters_updated_at ON clusters;

-- Drop views
DROP VIEW IF EXISTS tasks_with_dependency_status;
DROP VIEW IF EXISTS tasks_with_cluster_info;

-- Drop functions
DROP FUNCTION IF EXISTS update_task_cluster_order();
DROP FUNCTION IF EXISTS can_task_start(INTEGER);
DROP FUNCTION IF EXISTS calculate_cluster_progress(INTEGER);
DROP FUNCTION IF EXISTS update_cluster_progress();
DROP FUNCTION IF EXISTS update_clusters_updated_at();

-- Drop tables
DROP TABLE IF EXISTS task_dependencies;
DROP TABLE IF EXISTS cluster_dependencies;
DROP TABLE IF EXISTS clusters;

-- Remove columns from tasks
ALTER TABLE tasks DROP COLUMN IF EXISTS cluster_order;
ALTER TABLE tasks DROP COLUMN IF EXISTS cluster_id;
```

## Notes

- The `cluster_order` field in tasks is automatically populated via trigger when `cluster_id` is set
- Cluster progress is automatically calculated when task status changes
- Task dependencies use a many-to-many relationship (a task can have multiple blocking tasks)
- The "Ongoing" cluster has order 999 to ensure it's always last
- All foreign keys have ON DELETE CASCADE to maintain referential integrity

## Next Steps

After running these migrations:
1. Assign existing tasks to clusters
2. Define cluster dependencies
3. Define task dependencies within clusters
4. Update the UI to display cluster-based roadmap
5. Implement cluster progress visualization

