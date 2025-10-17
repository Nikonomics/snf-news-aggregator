// Project Data Layer
// Extracted from ProjectTracker.jsx for better organization

// Helper function to create a task with all required fields
export const createTask = (baseTask) => {
  return {
    ...baseTask,
    assignedTo: "Unassigned",
    dueDate: null,
    estimatedHours: null,
    actualHours: 0,
    dependencies: [],
    createdDate: "2025-01-16",
    lastUpdated: "2025-01-16",
    tags: []
  };
};

// Main project data structure with hierarchical tasks
export const projectData = [
  {
    id: 'data-infrastructure',
    name: 'Data Infrastructure',
    icon: '🗄️',
    color: '#3b82f6',
    subcategories: [
      {
        id: 'database-management',
        name: 'Database Management',
        tasks: [
          { 
            id: 'db-schema', 
            name: 'Database Schema Design', 
            status: 'completed', 
            priority: 'high', 
            assignee: 'Dev Team',
            description: 'Design comprehensive database schema for SNF data aggregation',
            dataSources: ['PostgreSQL', 'Database Design Tools'],
            implementation: 'Create tables for articles, facilities, deficiencies, metrics, and user data',
            dependencies: ['Database hosting setup', 'Data modeling requirements'],
            deliverables: ['Schema documentation', 'Migration scripts', 'Index optimization'],
            assignedTo: "Unassigned",
            dueDate: null,
            estimatedHours: null,
            actualHours: 0,
            createdDate: "2025-01-16",
            lastUpdated: "2025-01-16",
            tags: []
          }
          // ... rest of tasks will be added
        ]
      }
      // ... rest of subcategories will be added
    ]
  }
  // ... rest of categories will be added
];

// Detailed source information mapping
export const sourceDetails = {
  'RSS Feeds': {
    level: 'Federal',
    category: 'News',
    function: 'News aggregation',
    crawlFor: 'SNF-related news articles, industry updates, policy announcements',
    frequency: 'Real-time',
    format: 'RSS/XML',
    method: 'RSS polling',
    priority: 'High',
    url: 'Multiple RSS feeds',
    description: 'Automated news collection from 9 RSS feeds covering skilled nursing facilities, long-term care, and healthcare policy.'
  }
  // ... rest of source details will be added
};

// Data sources catalog
export const dataSources = [
  {
    category: 'News & Analysis',
    icon: '📰',
    sources: [
      { name: 'RSS Feeds', count: 9, status: 'active', lastUpdate: '2025-10-16' }
      // ... rest of sources will be added
    ]
  }
  // ... rest of categories will be added
];

// Development tasks list
export const developmentTasks = [
  { id: 1, title: 'Create API endpoints for CMS data', status: 'pending', priority: 'high', category: 'Backend' },
  { id: 2, title: 'Create API endpoints for Census data', status: 'pending', priority: 'high', category: 'Backend' }
  // ... rest of tasks will be added
];