-- Create Cluster Dependencies
-- Establishes the execution order for clusters (each cluster depends on the previous one)
-- Generated: 2025-01-16

-- Insert cluster dependencies (linear chain: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10)
INSERT INTO cluster_dependencies (cluster_id, depends_on_cluster_id) VALUES
-- Cluster 1 depends on Cluster 0
((SELECT cluster_id FROM clusters WHERE cluster_order = 1), (SELECT cluster_id FROM clusters WHERE cluster_order = 0)),

-- Cluster 2 depends on Cluster 1
((SELECT cluster_id FROM clusters WHERE cluster_order = 2), (SELECT cluster_id FROM clusters WHERE cluster_order = 1)),

-- Cluster 3 depends on Cluster 2
((SELECT cluster_id FROM clusters WHERE cluster_order = 3), (SELECT cluster_id FROM clusters WHERE cluster_order = 2)),

-- Cluster 4 depends on Cluster 3
((SELECT cluster_id FROM clusters WHERE cluster_order = 4), (SELECT cluster_id FROM clusters WHERE cluster_order = 3)),

-- Cluster 5 depends on Cluster 4
((SELECT cluster_id FROM clusters WHERE cluster_order = 5), (SELECT cluster_id FROM clusters WHERE cluster_order = 4)),

-- Cluster 6 depends on Cluster 5
((SELECT cluster_id FROM clusters WHERE cluster_order = 6), (SELECT cluster_id FROM clusters WHERE cluster_order = 5)),

-- Cluster 7 depends on Cluster 6
((SELECT cluster_id FROM clusters WHERE cluster_order = 7), (SELECT cluster_id FROM clusters WHERE cluster_order = 6)),

-- Cluster 8 depends on Cluster 7
((SELECT cluster_id FROM clusters WHERE cluster_order = 8), (SELECT cluster_id FROM clusters WHERE cluster_order = 7)),

-- Cluster 9 depends on Cluster 8
((SELECT cluster_id FROM clusters WHERE cluster_order = 9), (SELECT cluster_id FROM clusters WHERE cluster_order = 8)),

-- Cluster 10 depends on Cluster 9
((SELECT cluster_id FROM clusters WHERE cluster_order = 10), (SELECT cluster_id FROM clusters WHERE cluster_order = 9));

-- Note: Cluster 0 and Ongoing (order 999) have no dependencies

-- Verify dependencies were created
SELECT 
    c1.cluster_name as depends_on,
    c1.cluster_order as depends_on_order,
    c2.cluster_name as cluster,
    c2.cluster_order as cluster_order,
    c2.status
FROM cluster_dependencies cd
JOIN clusters c1 ON cd.depends_on_cluster_id = c1.cluster_id
JOIN clusters c2 ON cd.cluster_id = c2.cluster_id
ORDER BY c2.cluster_order;

-- Show clusters with no dependencies (can start immediately)
SELECT 
    cluster_name,
    cluster_order,
    status
FROM clusters
WHERE cluster_id NOT IN (SELECT cluster_id FROM cluster_dependencies)
ORDER BY cluster_order;

