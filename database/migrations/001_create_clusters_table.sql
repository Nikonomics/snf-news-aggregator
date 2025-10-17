-- Migration: Create Clusters Table
-- Description: New table for dependency-based roadmap structure with 11 clusters (0-10 + Ongoing)
-- Created: 2025-01-16

-- Create Clusters table
CREATE TABLE IF NOT EXISTS clusters (
    cluster_id SERIAL PRIMARY KEY,
    cluster_name VARCHAR(255) NOT NULL,
    cluster_order INTEGER NOT NULL CHECK (cluster_order >= 0 AND cluster_order <= 10 OR cluster_order = 999), -- 999 = Ongoing
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Blocked', 'Complete')),
    completion_criteria TEXT,
    progress DECIMAL(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    start_date DATE,
    completion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cluster_order)
);

-- Create self-referencing dependency relationship
CREATE TABLE IF NOT EXISTS cluster_dependencies (
    cluster_id INTEGER NOT NULL REFERENCES clusters(cluster_id) ON DELETE CASCADE,
    depends_on_cluster_id INTEGER NOT NULL REFERENCES clusters(cluster_id) ON DELETE CASCADE,
    PRIMARY KEY (cluster_id, depends_on_cluster_id),
    CHECK (cluster_id != depends_on_cluster_id) -- Prevent self-dependency
);

-- Create indexes for performance
CREATE INDEX idx_clusters_order ON clusters(cluster_order);
CREATE INDEX idx_clusters_status ON clusters(status);
CREATE INDEX idx_cluster_dependencies_cluster ON cluster_dependencies(cluster_id);
CREATE INDEX idx_cluster_dependencies_depends_on ON cluster_dependencies(depends_on_cluster_id);

-- Insert initial cluster data (Clusters 0-10 + Ongoing)
INSERT INTO clusters (cluster_name, cluster_order, description, status) VALUES
('Cluster 0', 0, 'Foundation and initial setup cluster', 'Not Started'),
('Cluster 1', 1, 'Core infrastructure and data layer', 'Not Started'),
('Cluster 2', 2, 'User interface and experience', 'Not Started'),
('Cluster 3', 3, 'Authentication and authorization', 'Not Started'),
('Cluster 4', 4, 'Data integration and APIs', 'Not Started'),
('Cluster 5', 5, 'Advanced features and functionality', 'Not Started'),
('Cluster 6', 6, 'Performance optimization', 'Not Started'),
('Cluster 7', 7, 'Security and compliance', 'Not Started'),
('Cluster 8', 8, 'Testing and quality assurance', 'Not Started'),
('Cluster 9', 9, 'Documentation and training', 'Not Started'),
('Cluster 10', 10, 'Deployment and launch', 'Not Started'),
('Ongoing', 999, 'Continuous improvements and maintenance', 'In Progress');

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clusters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_clusters_updated_at
    BEFORE UPDATE ON clusters
    FOR EACH ROW
    EXECUTE FUNCTION update_clusters_updated_at();

-- Create function to calculate cluster progress
CREATE OR REPLACE FUNCTION calculate_cluster_progress(p_cluster_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
    progress_pct DECIMAL;
BEGIN
    -- Count total tasks in cluster
    SELECT COUNT(*) INTO total_tasks
    FROM tasks
    WHERE cluster_id = p_cluster_id;
    
    -- Count completed tasks in cluster
    SELECT COUNT(*) INTO completed_tasks
    FROM tasks
    WHERE cluster_id = p_cluster_id
    AND status = 'completed';
    
    -- Calculate progress percentage
    IF total_tasks > 0 THEN
        progress_pct := (completed_tasks::DECIMAL / total_tasks::DECIMAL) * 100;
    ELSE
        progress_pct := 0;
    END IF;
    
    RETURN progress_pct;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update progress when task status changes
CREATE OR REPLACE FUNCTION update_cluster_progress()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE clusters
    SET progress = calculate_cluster_progress(NEW.cluster_id)
    WHERE cluster_id = NEW.cluster_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger will be created after the tasks table migration
-- CREATE TRIGGER trigger_update_cluster_progress
--     AFTER INSERT OR UPDATE ON tasks
--     FOR EACH ROW
--     EXECUTE FUNCTION update_cluster_progress();

-- Add comments for documentation
COMMENT ON TABLE clusters IS 'Roadmap clusters representing major milestones or phases';
COMMENT ON TABLE cluster_dependencies IS 'Defines which clusters must complete before others can start';
COMMENT ON COLUMN clusters.cluster_order IS 'Execution sequence (0-10) or 999 for Ongoing';
COMMENT ON COLUMN clusters.progress IS 'Auto-calculated percentage based on linked task completion';

