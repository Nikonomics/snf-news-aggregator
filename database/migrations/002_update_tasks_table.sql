-- Migration: Update Tasks Table with Cluster and Dependency Fields
-- Description: Add cluster relationships and task-level dependencies to existing tasks table
-- Created: 2025-01-16

-- Check if tasks table exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tasks') THEN
        CREATE TABLE tasks (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            priority VARCHAR(20) DEFAULT 'medium',
            assignee VARCHAR(100),
            category_id VARCHAR(100),
            subcategory_id VARCHAR(100),
            cluster_id INTEGER,
            cluster_order INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Add foreign key constraint for cluster_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_cluster_id_fkey'
    ) THEN
        ALTER TABLE tasks
        ADD CONSTRAINT tasks_cluster_id_fkey 
        FOREIGN KEY (cluster_id) REFERENCES clusters(cluster_id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_tasks_cluster_id ON tasks(cluster_id);
CREATE INDEX IF NOT EXISTS idx_tasks_cluster_order ON tasks(cluster_order);

-- Create task dependencies table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    blocking_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, blocking_task_id),
    CHECK (task_id != blocking_task_id) -- Prevent self-dependency
);

-- Create indexes for task dependencies
CREATE INDEX idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_blocking ON task_dependencies(blocking_task_id);

-- Create view to get tasks with their cluster order
CREATE OR REPLACE VIEW tasks_with_cluster_info AS
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
    t.created_at,
    t.updated_at,
    c.cluster_order,
    c.cluster_name,
    c.status as cluster_status
FROM tasks t
LEFT JOIN clusters c ON t.cluster_id = c.cluster_id;

-- Create function to check if a task can start
CREATE OR REPLACE FUNCTION can_task_start(p_task_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_cluster_status VARCHAR(50);
    v_blocking_tasks_count INTEGER;
    v_completed_blocking_tasks INTEGER;
BEGIN
    -- Get cluster status
    SELECT c.status INTO v_cluster_status
    FROM tasks t
    JOIN clusters c ON t.cluster_id = c.cluster_id
    WHERE t.id = p_task_id;
    
    -- Check if cluster is active
    IF v_cluster_status NOT IN ('In Progress', 'Complete') THEN
        RETURN FALSE;
    END IF;
    
    -- Count blocking tasks
    SELECT COUNT(*) INTO v_blocking_tasks_count
    FROM task_dependencies
    WHERE task_id = p_task_id;
    
    -- If no blocking tasks, can start
    IF v_blocking_tasks_count = 0 THEN
        RETURN TRUE;
    END IF;
    
    -- Count completed blocking tasks
    SELECT COUNT(*) INTO v_completed_blocking_tasks
    FROM task_dependencies td
    JOIN tasks t ON td.blocking_task_id = t.id
    WHERE td.task_id = p_task_id
    AND t.status = 'completed';
    
    -- Can start if all blocking tasks are complete
    RETURN v_completed_blocking_tasks = v_blocking_tasks_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for tasks with can_start status
CREATE OR REPLACE VIEW tasks_with_dependency_status AS
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
    t.created_at,
    t.updated_at,
    c.cluster_order,
    c.cluster_name,
    c.status as cluster_status,
    can_task_start(t.id) as can_start,
    (
        SELECT COUNT(*)
        FROM task_dependencies
        WHERE task_id = t.id
    ) as blocking_tasks_count,
    (
        SELECT COUNT(*)
        FROM task_dependencies td
        JOIN tasks bt ON td.blocking_task_id = bt.id
        WHERE td.task_id = t.id
        AND bt.status = 'completed'
    ) as completed_blocking_tasks_count,
    (
        SELECT COUNT(*)
        FROM task_dependencies
        WHERE blocking_task_id = t.id
    ) as blocked_by_count
FROM tasks t
LEFT JOIN clusters c ON t.cluster_id = c.cluster_id;

-- Create trigger to auto-update cluster_order when cluster_id changes
CREATE OR REPLACE FUNCTION update_task_cluster_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Update cluster_order based on linked cluster
    IF NEW.cluster_id IS NOT NULL THEN
        SELECT cluster_order INTO NEW.cluster_order
        FROM clusters
        WHERE cluster_id = NEW.cluster_id;
    ELSE
        NEW.cluster_order := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cluster_order auto-update
CREATE TRIGGER trigger_update_task_cluster_order
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_cluster_order();

-- Create trigger to auto-update cluster progress when task status changes
CREATE TRIGGER trigger_update_cluster_progress
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_cluster_progress();

-- Add comments for documentation
COMMENT ON COLUMN tasks.cluster_id IS 'Which cluster this task belongs to';
COMMENT ON COLUMN tasks.cluster_order IS 'Execution sequence from linked cluster (auto-populated)';
COMMENT ON TABLE task_dependencies IS 'Defines blocking relationships between tasks';
COMMENT ON COLUMN task_dependencies.task_id IS 'The task that is blocked';
COMMENT ON COLUMN task_dependencies.blocking_task_id IS 'The task that must complete first';

