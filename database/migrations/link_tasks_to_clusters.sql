-- Link Tasks to Clusters
-- Assigns all tasks to their appropriate cluster based on category_id
-- Generated: 2025-01-16
-- Note: cluster_id values are 1-12 (auto-incrementing), not 0-11

-- Cluster 0 (ID: 1): Foundation (Infrastructure, DevOps, Data Architecture)
UPDATE tasks SET cluster_id = 1 WHERE category_id IN ('1.1', '6.1', '6.2', '6.3', '8.1', '8.2', '8.3');

-- Cluster 1 (ID: 2): Data Layer (ETL Pipelines, Data Sources)
UPDATE tasks SET cluster_id = 2 WHERE category_id IN ('1.2', '1.3');

-- Cluster 2 (ID: 3): AI Intelligence (AI Analysis, Scoring, Chatbots)
UPDATE tasks SET cluster_id = 3 WHERE category_id IN ('5.1', '5.2');

-- Cluster 3 (ID: 4): View Interfaces (Dashboards, Browsing, Read-Only Views)
UPDATE tasks SET cluster_id = 4 WHERE category_id IN ('2.1', '2.2', '7.1');

-- Cluster 4 (ID: 5): Interactive Features (Search, Filtering, Alerts)
UPDATE tasks SET cluster_id = 5 WHERE category_id IN ('2.3', '5.3');

-- Cluster 5 (ID: 6): Advocacy Tools (Representative Contact, Campaigns)
UPDATE tasks SET cluster_id = 6 WHERE category_id IN ('3.1', '3.2', '3.3');

-- Cluster 6 (ID: 7): Training & Resources (Tools, Templates, LMS)
UPDATE tasks SET cluster_id = 7 WHERE category_id IN ('7.2', '7.3');

-- Cluster 7 (ID: 8): Deal Tracking (Benchmarking, Market Reports)
UPDATE tasks SET cluster_id = 8 WHERE category_id IN ('4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8.1', '4.8.2', '4.8.3', '4.8.4', '4.8.5', '4.8.6', '4.8.7', '4.8.8', '4.8.9', '4.8.10', '4.8.11', '4.8.12');

-- Cluster 8 (ID: 9): Testing & QA (Code Coverage, E2E Tests, Security)
UPDATE tasks SET cluster_id = 9 WHERE category_id IN ('9.1', '9.2');

-- Cluster 9 (ID: 10): Launch Preparation (Beta Users, Documentation, Marketing)
UPDATE tasks SET cluster_id = 10 WHERE category_id IN ('10.1', '10.2');

-- Cluster 10 (ID: 11): Post-Launch Improvements (Feedback, A/B Testing, Expansion)
UPDATE tasks SET cluster_id = 11 WHERE category_id IN ('13.1', '13.2', '13.3');

-- Ongoing (ID: 12): Team & Process (Parallel work throughout project)
UPDATE tasks SET cluster_id = 12 WHERE category_id IN ('13.1', '13.2', '13.3');

-- Verify task distribution across clusters
SELECT 
  c.cluster_name,
  c.cluster_order,
  COUNT(t.id) as task_count
FROM clusters c
LEFT JOIN tasks t ON c.cluster_id = t.cluster_id
GROUP BY c.cluster_name, c.cluster_order
ORDER BY c.cluster_order;

-- Show sample tasks from each cluster
SELECT 
  c.cluster_name,
  t.name as task_name,
  t.category_id
FROM tasks t
JOIN clusters c ON t.cluster_id = c.cluster_id
ORDER BY c.cluster_order, t.category_id
LIMIT 20;

