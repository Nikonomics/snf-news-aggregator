-- Link Tasks to Clusters
-- Assigns all tasks to their appropriate cluster based on category_id
-- Generated: 2025-01-16

-- Cluster 0: Foundation (Infrastructure, DevOps, Data Architecture)
UPDATE tasks SET cluster_id = 0 WHERE category_id IN ('1.1', '8.2', '8.3', '8.1', '7.1', '7.2');

-- Cluster 1: Data Layer (ETL Pipelines, Data Sources)
UPDATE tasks SET cluster_id = 1 WHERE category_id IN ('1.2', '1.3', '1.4', '1.5', '1.6', '1.9', '2.1', '2.2', '5.1');

-- Cluster 2: AI Intelligence (AI Analysis, Scoring, Chatbots)
UPDATE tasks SET cluster_id = 2 WHERE category_id IN ('2.4', '5.2', '6.1');

-- Cluster 3: View Interfaces (Dashboards, Browsing, Read-Only Views)
UPDATE tasks SET cluster_id = 3 WHERE category_id IN ('1.10', '9.1', '9.2', '9.3', '9.5');

-- Cluster 4: Interactive Features (Search, Filtering, Alerts)
UPDATE tasks SET cluster_id = 4 WHERE category_id IN ('5.3', '5.4', '2.5');

-- Cluster 5: Advocacy Tools (Representative Contact, Campaigns)
UPDATE tasks SET cluster_id = 5 WHERE category_id IN ('3.1', '3.2', '3.3', '3.4', '3.5', '9.4');

-- Cluster 6: Training & Resources (Tools, Templates, LMS)
UPDATE tasks SET cluster_id = 6 WHERE category_id IN ('6.2', '6.3', '6.4', '9.6');

-- Cluster 7: Deal Tracking (Benchmarking, Market Reports)
UPDATE tasks SET cluster_id = 7 WHERE category_id IN ('4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '9.7');

-- Cluster 8: Testing & QA (Code Coverage, E2E Tests, Security)
UPDATE tasks SET cluster_id = 8 WHERE category_id IN ('10.1', '10.2', '10.3', '10.4');

-- Cluster 9: Launch Preparation (Beta Users, Documentation, Marketing)
UPDATE tasks SET cluster_id = 9 WHERE category_id IN ('11.1', '11.2', '11.3', '11.4', '11.5');

-- Cluster 10: Post-Launch Improvements (Feedback, A/B Testing, Expansion)
UPDATE tasks SET cluster_id = 10 WHERE category_id IN ('12.1', '12.2', '12.3', '12.4', '12.5');

-- Ongoing: Team & Process (Parallel work throughout project)
UPDATE tasks SET cluster_id = 11 WHERE category_id IN ('13.1', '13.2', '13.3');

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

