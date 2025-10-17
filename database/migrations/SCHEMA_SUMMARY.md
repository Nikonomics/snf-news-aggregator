# Database Schema Summary: Dependency-Based Roadmap

## 📊 Overview

This schema adds a dependency-based roadmap structure to your project management system with:
- **11 Clusters** (Clusters 0-10 + Ongoing) representing major milestones
- **Cluster-level dependencies** (which clusters must complete first)
- **Task-level dependencies** (which tasks must complete before others can start)
- **Auto-calculated progress** for each cluster
- **Smart dependency checking** to determine if tasks can start

---

## 🗂️ New Tables

### 1. `clusters` Table

**Purpose**: Represents major milestones or phases in your roadmap

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `cluster_id` | SERIAL | Auto-incrementing ID | 1, 2, 3... |
| `cluster_name` | VARCHAR(255) | Name of cluster | "Cluster 1", "Ongoing" |
| `cluster_order` | INTEGER | Execution sequence | 0-10, 999 (Ongoing) |
| `description` | TEXT | Why cluster exists | "Core infrastructure setup" |
| `status` | VARCHAR(50) | Current state | "Not Started", "In Progress", "Blocked", "Complete" |
| `completion_criteria` | TEXT | Requirements checklist | "All APIs deployed, tests passing" |
| `progress` | DECIMAL(5,2) | Auto-calculated % | 0.00 - 100.00 |
| `start_date` | DATE | When work began | 2025-01-16 |
| `completion_date` | DATE | When finished | 2025-02-15 |
| `created_at` | TIMESTAMP | Record created | 2025-01-16 10:00:00 |
| `updated_at` | TIMESTAMP | Last updated | 2025-01-16 15:30:00 |

**Initial Data**: 11 records (Clusters 0-10 + Ongoing)

---

### 2. `cluster_dependencies` Table

**Purpose**: Defines which clusters must complete before others can start

| Column | Type | Description |
|--------|------|-------------|
| `cluster_id` | INTEGER | The dependent cluster |
| `depends_on_cluster_id` | INTEGER | The prerequisite cluster |

**Example**: Cluster 2 depends on Cluster 1
```sql
INSERT INTO cluster_dependencies VALUES (2, 1);
```

---

### 3. `task_dependencies` Table

**Purpose**: Defines which tasks must complete before others can start

| Column | Type | Description |
|--------|------|-------------|
| `task_id` | INTEGER | The task that is blocked |
| `blocking_task_id` | INTEGER | The task that must complete first |
| `created_at` | TIMESTAMP | When dependency was created |

**Example**: Task 123 depends on Task 456
```sql
INSERT INTO task_dependencies VALUES (123, 456);
```

---

## 🔄 Updated Tables

### `tasks` Table (New Columns)

| Column | Type | Description | Auto-populated |
|--------|------|-------------|----------------|
| `cluster_id` | INTEGER | Which cluster this task belongs to | No |
| `cluster_order` | INTEGER | Execution sequence from cluster | **Yes** (via trigger) |

**Note**: `cluster_order` is automatically populated when you set `cluster_id`

---

## 📈 Helper Views

### `tasks_with_cluster_info`
Shows all tasks with their cluster information

```sql
SELECT * FROM tasks_with_cluster_info;
```

| Column | Description |
|--------|-------------|
| All task columns | Standard task fields |
| `cluster_order` | From linked cluster |
| `cluster_name` | From linked cluster |
| `cluster_status` | From linked cluster |

---

### `tasks_with_dependency_status`
Shows tasks with dependency checking

```sql
SELECT * FROM tasks_with_dependency_status WHERE can_start = true;
```

| Column | Description |
|--------|-------------|
| All task columns | Standard task fields |
| `cluster_order` | From linked cluster |
| `cluster_name` | From linked cluster |
| `cluster_status` | From linked cluster |
| `can_start` | **TRUE if task can start** |
| `blocking_tasks_count` | How many tasks block this one |
| `completed_blocking_tasks_count` | How many blockers are done |
| `blocked_by_count` | How many tasks wait on this one |

---

## ⚙️ Helper Functions

### `can_task_start(task_id)`
Returns TRUE if a task can start based on:
- Cluster is "In Progress" or "Complete"
- All blocking tasks are complete

```sql
SELECT can_task_start(123);
-- Returns: true or false
```

---

### `calculate_cluster_progress(cluster_id)`
Returns the progress percentage for a cluster

```sql
SELECT calculate_cluster_progress(1);
-- Returns: 45.50 (45.5% complete)
```

**Formula**: `(Completed Tasks / Total Tasks) * 100`

---

## 🔧 Auto-Update Triggers

### 1. `trigger_update_task_cluster_order`
**When**: Before INSERT or UPDATE on `tasks`
**What**: Auto-populates `cluster_order` from linked cluster

```sql
UPDATE tasks SET cluster_id = 1 WHERE id = 123;
-- cluster_order automatically set to 1
```

---

### 2. `trigger_update_cluster_progress`
**When**: After INSERT or UPDATE on `tasks`
**What**: Auto-calculates cluster progress

```sql
UPDATE tasks SET status = 'completed' WHERE id = 123;
-- Cluster progress automatically recalculated
```

---

### 3. `trigger_clusters_updated_at`
**When**: Before UPDATE on `clusters`
**What**: Auto-updates `updated_at` timestamp

---

## 🎯 Key Features

### ✅ Auto-Calculated Fields
- **cluster_order**: Populated from linked cluster
- **progress**: Calculated from task completion
- **can_start**: Determined by cluster status and blocking tasks

### ✅ Dependency Management
- **Cluster-level**: Clusters can depend on other clusters
- **Task-level**: Tasks can depend on other tasks
- **Circular prevention**: Triggers prevent self-dependencies

### ✅ Smart Status Checking
- Tasks can only start if:
  - Their cluster is "In Progress" or "Complete"
  - All blocking tasks are complete

### ✅ Progress Tracking
- Cluster progress automatically updates when tasks complete
- View progress percentage for any cluster
- Track completion timeline

---

## 📋 Initial Cluster Data

| cluster_id | cluster_name | cluster_order | status |
|------------|--------------|---------------|--------|
| 1 | Cluster 0 | 0 | Not Started |
| 2 | Cluster 1 | 1 | Not Started |
| 3 | Cluster 2 | 2 | Not Started |
| 4 | Cluster 3 | 3 | Not Started |
| 5 | Cluster 4 | 4 | Not Started |
| 6 | Cluster 5 | 5 | Not Started |
| 7 | Cluster 6 | 6 | Not Started |
| 8 | Cluster 7 | 7 | Not Started |
| 9 | Cluster 8 | 8 | Not Started |
| 10 | Cluster 9 | 9 | Not Started |
| 11 | Cluster 10 | 10 | Not Started |
| 12 | Ongoing | 999 | In Progress |

---

## 🔗 Relationships

```
clusters (1) ────< (N) tasks
    │
    │ (self-referential)
    │
cluster_dependencies

tasks (1) ────< (N) task_dependencies (N) >──── (1) tasks
```

---

## 📊 Example Workflow

### 1. Define Cluster Dependencies
```sql
-- Cluster 2 depends on Cluster 1
INSERT INTO cluster_dependencies VALUES (2, 1);
```

### 2. Assign Tasks to Clusters
```sql
-- Assign tasks to Cluster 1
UPDATE tasks SET cluster_id = 1 WHERE category = 'Foundation';
```

### 3. Define Task Dependencies
```sql
-- Task 123 depends on Task 456
INSERT INTO task_dependencies VALUES (123, 456);
```

### 4. Start a Cluster
```sql
-- Mark Cluster 1 as In Progress
UPDATE clusters 
SET status = 'In Progress', start_date = CURRENT_DATE
WHERE cluster_id = 1;
```

### 5. Check What Can Start
```sql
-- See which tasks are ready
SELECT name, can_start 
FROM tasks_with_dependency_status 
WHERE cluster_id = 1;
```

### 6. Complete Tasks
```sql
-- Complete a task
UPDATE tasks SET status = 'completed' WHERE id = 456;

-- Cluster progress auto-updates!
SELECT progress FROM clusters WHERE cluster_id = 1;
```

### 7. Complete a Cluster
```sql
-- Mark cluster complete
UPDATE clusters 
SET status = 'Complete', completion_date = CURRENT_DATE
WHERE cluster_id = 1;

-- Cluster 2 tasks can now start!
```

---

## 🚀 Next Steps

1. ✅ **Schema created** - All tables, views, and functions ready
2. ⬜ **Run migrations** - Execute the SQL files
3. ⬜ **Assign tasks** - Link existing tasks to clusters
4. ⬜ **Define dependencies** - Set up cluster and task relationships
5. ⬜ **Update UI** - Build cluster-based roadmap view
6. ⬜ **Visualize progress** - Add progress bars and charts

---

## 📚 Documentation Files

- **README.md**: Detailed migration instructions
- **QUICK_START.md**: Common operations and examples
- **SCHEMA_SUMMARY.md**: This file - schema overview
- **run-migrations.js**: Automated migration runner

---

## 🔍 Query Examples

See `QUICK_START.md` for comprehensive query examples including:
- Assigning tasks to clusters
- Adding dependencies
- Checking what can start
- Tracking progress
- Reporting and analytics

