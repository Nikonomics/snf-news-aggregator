import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Clock, AlertCircle, CheckSquare, Square, Grid3X3, Users } from 'lucide-react';
import './ProjectTracker.css';
import { projectData, sourceDetails, dataSources, developmentTasks } from '../data/ProjectData.js';
import TeamDashboard from './TeamDashboard.jsx';

const ProjectTracker = () => {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubcategories, setExpandedSubcategories] = useState({});
  const [taskCompletion, setTaskCompletion] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState(null);
  const [userName, setUserName] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [projectStats, setProjectStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0
  });

  // Initialize task completion from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('projectTrackerCompletion');
    if (saved) {
      setTaskCompletion(JSON.parse(saved));
    }
  }, []);

  // Save task completion to localStorage
  useEffect(() => {
    localStorage.setItem('projectTrackerCompletion', JSON.stringify(taskCompletion));
  }, [taskCompletion]);

  // Calculate project statistics
  useEffect(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    projectData.forEach(category => {
      category.subcategories.forEach(subcategory => {
        subcategory.tasks.forEach(task => {
          total++;
          const taskId = `${category.id}-${subcategory.id}-${task.id}`;
          const isCompleted = taskCompletion[taskId];
          
          if (isCompleted) {
            completed++;
          } else if (task.status === 'in-progress') {
            inProgress++;
          } else {
            pending++;
          }
        });
      });
    });

    setProjectStats({ totalTasks: total, completedTasks: completed, inProgressTasks: inProgress, pendingTasks: pending });
  }, [taskCompletion]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const toggleSubcategory = (categoryId, subcategoryId) => {
    const subcategoryKey = `${categoryId}-${subcategoryId}`;
    setExpandedSubcategories(prev => ({
      ...prev,
      [subcategoryKey]: !prev[subcategoryKey]
    }));
  };

  // Handler functions for assignedTo and dueDate
  const handleAssignedToChange = (categoryId, subcategoryId, taskId, newAssignedTo) => {
    const taskKey = `${categoryId}-${subcategoryId}-${taskId}`;
    const currentCompletion = taskCompletion[taskKey] || {};
    
    setTaskCompletion(prev => ({
      ...prev,
      [taskKey]: {
        ...currentCompletion,
        assignedTo: newAssignedTo,
        lastUpdated: new Date().toISOString()
      }
    }));
  };

  const getAssignedTo = (categoryId, subcategoryId, taskId) => {
    const taskKey = `${categoryId}-${subcategoryId}-${taskId}`;
    return taskCompletion[taskKey]?.assignedTo || 'Unassigned';
  };

  const handleDueDateChange = (categoryId, subcategoryId, taskId, newDueDate) => {
    const taskKey = `${categoryId}-${subcategoryId}-${taskId}`;
    const currentCompletion = taskCompletion[taskKey] || {};
    
    setTaskCompletion(prev => ({
      ...prev,
      [taskKey]: {
        ...currentCompletion,
        dueDate: newDueDate || null,
        lastUpdated: new Date().toISOString()
      }
    }));
  };

  const getDueDate = (categoryId, subcategoryId, taskId) => {
    const taskKey = `${categoryId}-${subcategoryId}-${taskId}`;
    return taskCompletion[taskKey]?.dueDate || null;
  };

  const getDueDateUrgency = (categoryId, subcategoryId, taskId, taskStatus) => {
    const dueDate = getDueDate(categoryId, subcategoryId, taskId);
    if (!dueDate) return 'no-date';
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (taskStatus === 'completed') return 'completed';
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'due-soon';
    return 'due-later';
  };

  const handleCheckboxClick = (categoryId, subcategoryId, taskId, e) => {
    e.stopPropagation(); // Prevent row click
    const taskKey = `${categoryId}-${subcategoryId}-${taskId}`;
    const isCompleted = taskCompletion[taskKey];
    
    if (!isCompleted) {
      // Show completion dialog
      setPendingTaskId(taskKey);
      setShowCompletionDialog(true);
    } else {
      // Allow unchecking without dialog
      setTaskCompletion(prev => ({
        ...prev,
        [taskKey]: false
      }));
    }
  };

  const confirmTaskCompletion = () => {
    if (!userName.trim()) {
      alert('Please enter your name to complete this task.');
      return;
    }
    
    const completionData = {
      completed: true,
      completedBy: userName.trim(),
      completedAt: new Date().toISOString(),
      taskId: pendingTaskId
    };
    
    setTaskCompletion(prev => ({
      ...prev,
      [pendingTaskId]: completionData
    }));
    
    setShowCompletionDialog(false);
    setPendingTaskId(null);
    setUserName('');
  };

  const cancelTaskCompletion = () => {
    setShowCompletionDialog(false);
    setPendingTaskId(null);
    setUserName('');
  };

  const toggleTaskDetails = (categoryId, subcategoryId, taskId) => {
    const taskKey = `${categoryId}-${subcategoryId}-${taskId}`;
    setExpandedTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };

  const getTaskStatus = (task, categoryId, subcategoryId, taskId) => {
    const taskKey = `${categoryId}-${subcategoryId}-${taskId}`;
    const completionData = taskCompletion[taskKey];
    
    if (completionData && completionData.completed) return 'completed';
    return task.status;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="status-icon completed" />;
      case 'in-progress': return <Clock className="status-icon in-progress" />;
      case 'pending': return <Circle className="status-icon pending" />;
      case 'blocked': return <AlertCircle className="status-icon blocked" />;
      default: return <Circle className="status-icon pending" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in-progress': return '#3b82f6';
      case 'pending': return '#6b7280';
      case 'blocked': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  // Project data structure
  const projectData = [
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
              deliverables: ['Schema documentation', 'Migration scripts', 'Index optimization']
            },
            { 
              id: 'articles-table', 
              name: 'Articles Table Implementation', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Dev Team',
              description: 'Implement articles table with full-text search capabilities',
              dataSources: ['RSS Feeds', 'AI Analysis Results', 'Content Hashing'],
              implementation: 'Create articles table with columns for title, content, source, analysis results, and metadata',
              dependencies: ['Database schema', 'RSS feed integration'],
              deliverables: ['Articles table', 'Search indexes', 'Content deduplication logic']
            },
            { 
              id: 'facilities-table', 
              name: 'Facilities Table Integration', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Dev Team',
              description: 'Integrate CMS facility data into database',
              dataSources: ['CMS Provider of Services', 'CMS Care Compare', 'State Licensing Data'],
              implementation: 'Import and normalize facility data from multiple CMS sources',
              dependencies: ['CMS data collectors', 'Data normalization scripts'],
              deliverables: ['Facilities table', 'Data validation', 'Geographic mapping']
            },
            { 
              id: 'deficiencies-table', 
              name: 'Deficiencies Table Setup', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Dev Team',
              description: 'Set up deficiencies tracking system',
              dataSources: ['CMS Health Deficiencies', 'State Survey Results', 'Enforcement Actions'],
              implementation: 'Create deficiencies table with F-tag tracking and severity classification',
              dependencies: ['CMS deficiencies collector', 'State data integration'],
              deliverables: ['Deficiencies table', 'F-tag classification', 'Trend analysis queries']
            },
            { 
              id: 'db-optimization', 
              name: 'Database Query Optimization', 
              status: 'in-progress', 
              priority: 'medium', 
              assignee: 'Dev Team',
              description: 'Optimize database performance for large datasets',
              dataSources: ['Query performance metrics', 'Database monitoring tools'],
              implementation: 'Add indexes, optimize queries, implement caching strategies',
              dependencies: ['Performance testing', 'Query analysis'],
              deliverables: ['Optimized queries', 'Performance benchmarks', 'Caching implementation']
            },
            { 
              id: 'data-archiving', 
              name: 'Historical Data Management', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'Dev Team',
              description: 'Implement data archiving and retention policies',
              dataSources: ['Historical data', 'Storage optimization tools'],
              implementation: 'Create archiving system for old data while maintaining accessibility',
              dependencies: ['Data retention policies', 'Storage capacity planning'],
              deliverables: ['Archiving system', 'Retention policies', 'Data migration tools']
            },
            { 
              id: 'backup-strategy', 
              name: 'Automated Backup System', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Dev Team',
              description: 'Implement automated backup and disaster recovery',
              dataSources: ['Database snapshots', 'Backup storage systems'],
              implementation: 'Set up automated backups with point-in-time recovery',
              dependencies: ['Backup storage', 'Recovery testing'],
              deliverables: ['Backup automation', 'Recovery procedures', 'Monitoring alerts']
            }
          ]
        },
        {
          id: 'data-collection',
          name: 'Data Collection Systems',
          tasks: [
            { 
              id: 'cms-facilities', 
              name: 'CMS Facilities Collector', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Collect and process CMS facility data including provider information, services, and quality ratings',
              dataSources: ['CMS Provider of Services', 'CMS Care Compare', 'CMS Quality Reporting'],
              implementation: 'Automated data collection from CMS APIs with daily updates and data validation',
              dependencies: ['CMS API access', 'Data validation scripts', 'Database schema'],
              deliverables: ['Facilities database', 'Data validation reports', 'Update monitoring'],
              updateFrequency: 'Daily'
            },
            { 
              id: 'cms-deficiencies', 
              name: 'CMS Deficiencies Collector', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Collect CMS health deficiency data including F-tags, severity levels, and enforcement actions',
              dataSources: ['CMS Health Deficiencies Database', 'State Survey Results', 'Enforcement Actions'],
              implementation: 'Automated collection of deficiency data with F-tag classification and trend analysis',
              dependencies: ['CMS deficiencies API', 'F-tag classification system', 'Data normalization'],
              deliverables: ['Deficiencies database', 'F-tag analysis', 'Trend reports'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'cms-care-compare', 
              name: 'CMS Care Compare Collector', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Collect CMS Care Compare quality ratings and star ratings for facilities',
              dataSources: ['CMS Care Compare API', 'Quality Measures Database', 'Star Ratings'],
              implementation: 'Automated collection of quality ratings and star ratings with trend analysis',
              dependencies: ['CMS Care Compare API', 'Quality measure mapping', 'Rating algorithms'],
              deliverables: ['Quality ratings database', 'Star rating analysis', 'Quality trends'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'census-demographics', 
              name: 'Census Demographics Collector', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Collect demographic data including population by age, income, and geographic distribution',
              dataSources: ['US Census Bureau', 'American Community Survey', 'Population Estimates'],
              implementation: 'Automated collection of demographic data by state and county with age-specific breakdowns',
              dependencies: ['Census API access', 'Geographic mapping', 'Data aggregation'],
              deliverables: ['Demographics database', 'Geographic analysis', 'Population projections'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'bls-wages', 
              name: 'BLS Wages Collector', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Collect Bureau of Labor Statistics wage data for healthcare workers by occupation and state',
              dataSources: ['BLS Occupational Employment and Wage Statistics', 'BLS Local Area Unemployment Statistics'],
              implementation: 'Automated collection of wage data by healthcare occupation and geographic area',
              dependencies: ['BLS API integration', 'Occupation classification', 'Geographic mapping'],
              deliverables: ['Wage database', 'Occupation analysis', 'Geographic wage comparisons'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'congress-collector', 
              name: 'Congress.gov Collector', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Collect and monitor federal legislation related to healthcare, Medicare, and Medicaid',
              dataSources: ['Congress.gov API', 'House and Senate bill databases', 'Committee reports'],
              implementation: 'Automated monitoring of healthcare-related legislation with keyword filtering',
              dependencies: ['Congress.gov API access', 'Keyword filtering system', 'Bill classification'],
              deliverables: ['Legislation database', 'Bill tracking', 'Committee analysis'],
              updateFrequency: 'Daily'
            },
            { 
              id: 'federal-register', 
              name: 'Federal Register Collector', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Collect federal regulations and rulemakings affecting healthcare facilities',
              dataSources: ['Federal Register API', 'Regulatory agencies', 'Rulemaking documents'],
              implementation: 'Automated collection of healthcare-related federal regulations and rulemakings',
              dependencies: ['Federal Register API', 'Regulation classification', 'Agency mapping'],
              deliverables: ['Regulations database', 'Rulemaking tracking', 'Agency analysis'],
              updateFrequency: 'Daily'
            },
            { 
              id: 'medicare-cost-reports', 
              name: 'Medicare Cost Reports Collector', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Collect Medicare cost reports and financial data for facilities',
              dataSources: ['CMS Medicare Cost Reports', 'Provider Cost Reports', 'Financial Data'],
              implementation: 'Automated collection of Medicare cost reports with financial analysis',
              dependencies: ['CMS cost report access', 'Financial data parsing', 'Cost analysis algorithms'],
              deliverables: ['Cost reports database', 'Financial analysis', 'Cost trend reports'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'state-medicaid-rates', 
              name: 'State Medicaid Rates Collector', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Collect state Medicaid policies and reimbursement rates',
              dataSources: ['State Medicaid agencies', 'Medicaid policy documents', 'Reimbursement schedules'],
              implementation: 'Automated collection of state Medicaid policies and reimbursement data',
              dependencies: ['State Medicaid APIs', 'Policy classification', 'Rate standardization'],
              deliverables: ['Medicaid policies database', 'Reimbursement analysis', 'State comparisons'],
              updateFrequency: 'Monthly'
            }
          ]
        },
        {
          id: 'data-processing',
          name: 'Data Processing & Analysis',
          tasks: [
            { 
              id: 'ai-analysis', 
              name: 'AI Article Analysis (Claude Sonnet 4)', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'AI Team',
              description: 'AI-powered analysis of collected articles for relevance, impact, and categorization',
              dataSources: ['RSS Feed Articles', 'Claude AI API', 'OpenAI GPT-4o API'],
              implementation: 'Automated AI analysis of articles using Claude Sonnet 4 for content analysis and categorization',
              dependencies: ['Claude AI API access', 'Article content processing', 'Analysis prompt engineering'],
              deliverables: ['AI analysis results', 'Content categorization', 'Impact scoring'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'deduplication', 
              name: 'Article Deduplication System', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Dev Team',
              description: 'Identify and handle duplicate articles from multiple RSS feeds',
              dataSources: ['Article content', 'Content hashing', 'Similarity algorithms'],
              implementation: 'Automated deduplication using content hashing and similarity detection',
              dependencies: ['Content hashing system', 'Similarity algorithms', 'Duplicate detection rules'],
              deliverables: ['Deduplication system', 'Duplicate reports', 'Content similarity analysis'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'content-hashing', 
              name: 'Content Hashing Implementation', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Dev Team',
              description: 'Implement content hashing for efficient duplicate detection',
              dataSources: ['Article text content', 'Hashing algorithms', 'Content normalization'],
              implementation: 'Content hashing system using SHA-256 and content normalization',
              dependencies: ['Hashing libraries', 'Content normalization', 'Hash storage system'],
              deliverables: ['Content hashing system', 'Hash database', 'Normalization rules'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'geographic-scope', 
              name: 'Geographic Scope Detection', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'AI Team',
              description: 'AI-powered detection of geographic scope and state-specific relevance',
              dataSources: ['Article content', 'Geographic databases', 'State name recognition'],
              implementation: 'AI-powered geographic scope detection using NLP and state recognition',
              dependencies: ['Geographic databases', 'State recognition models', 'NLP processing'],
              deliverables: ['Geographic scope detection', 'State relevance scoring', 'Geographic analysis'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'ma-analysis', 
              name: 'M&A Deal Analysis', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'AI Team',
              description: 'AI analysis of merger and acquisition activity in the SNF industry',
              dataSources: ['Article content', 'M&A databases', 'Company information'],
              implementation: 'AI-powered M&A analysis using natural language processing and entity recognition',
              dependencies: ['M&A databases', 'Entity recognition', 'Financial data sources'],
              deliverables: ['M&A analysis results', 'Deal tracking', 'Market activity reports'],
              updateFrequency: 'Daily'
            },
            { 
              id: 'trend-analysis', 
              name: 'Trend Analysis System', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'AI Team',
              description: 'AI-powered trend analysis and pattern recognition in healthcare news',
              dataSources: ['Historical article data', 'Trend algorithms', 'Pattern recognition models'],
              implementation: 'Automated trend analysis using machine learning and pattern recognition',
              dependencies: ['Historical data', 'Trend algorithms', 'Pattern recognition models'],
              deliverables: ['Trend analysis reports', 'Pattern recognition', 'Trend predictions'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'vector-search', 
              name: 'Vector Search Implementation', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'AI Team',
              description: 'Implement vector search for semantic article similarity and recommendations',
              dataSources: ['Article embeddings', 'Vector databases', 'Similarity algorithms'],
              implementation: 'Vector search system using embeddings and semantic similarity',
              dependencies: ['Embedding models', 'Vector databases', 'Similarity algorithms'],
              deliverables: ['Vector search system', 'Semantic similarity', 'Recommendation engine'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'real-time-processing', 
              name: 'Real-time Data Updates', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Dev Team',
              description: 'Implement real-time data processing and updates for live data feeds',
              dataSources: ['Live data feeds', 'Real-time APIs', 'Streaming data'],
              implementation: 'Real-time data processing system with live updates and notifications',
              dependencies: ['Streaming infrastructure', 'Real-time APIs', 'Notification systems'],
              deliverables: ['Real-time processing system', 'Live updates', 'Notification system'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'batch-optimization', 
              name: 'Batch Processing Optimization', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'Dev Team',
              description: 'Optimize batch processing for large-scale data operations',
              dataSources: ['Batch processing logs', 'Performance metrics', 'Optimization algorithms'],
              implementation: 'Optimized batch processing system with parallel processing and resource management',
              dependencies: ['Performance monitoring', 'Parallel processing', 'Resource management'],
              deliverables: ['Optimized batch system', 'Performance improvements', 'Resource optimization'],
              updateFrequency: 'Continuous'
            }
          ]
        }
      ]
    },
    {
      id: 'frontend-development',
      name: 'Frontend Development',
      icon: '🎨',
      color: '#8b5cf6',
      subcategories: [
        {
          id: 'core-ui',
          name: 'Core UI Components',
          tasks: [
            { 
              id: 'article-display', 
              name: 'Article Display System', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Frontend Team',
              description: 'Core article display components for showing news articles with metadata, formatting, and interactive features',
              dataSources: ['Article database', 'RSS feeds', 'AI analysis results', 'User preferences'],
              implementation: 'React components for article cards, detail views, and list layouts with responsive design',
              dependencies: ['Article data structure', 'React components', 'CSS styling'],
              deliverables: ['ArticleCard component', 'ArticleList component', 'ArticleDetail component'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'filtering-search', 
              name: 'Filtering & Search System', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Frontend Team',
              description: 'Advanced filtering and search functionality for articles by category, impact, source, date, and geographic scope',
              dataSources: ['Article metadata', 'User search queries', 'Filter criteria', 'Geographic data'],
              implementation: 'React state management for filters, search algorithms, and real-time filtering',
              dependencies: ['Search algorithms', 'Filter components', 'State management'],
              deliverables: ['FilterPanel component', 'Search functionality', 'Filter state management'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'navigation', 
              name: 'React Router Navigation', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Frontend Team',
              description: 'Single-page application navigation system using React Router for seamless page transitions',
              dataSources: ['Route definitions', 'Navigation state', 'User interactions'],
              implementation: 'React Router setup with protected routes, navigation guards, and URL state management',
              dependencies: ['React Router', 'Route components', 'Navigation state'],
              deliverables: ['Router configuration', 'Navigation components', 'Route protection'],
              updateFrequency: 'Static'
            },
            { 
              id: 'responsive-design', 
              name: 'Mobile Responsive Design', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Frontend Team',
              description: 'Responsive design system ensuring optimal user experience across all device sizes',
              dataSources: ['Device specifications', 'Screen size data', 'User agent information'],
              implementation: 'CSS Grid, Flexbox, and media queries for responsive layouts and mobile-first design',
              dependencies: ['CSS framework', 'Responsive breakpoints', 'Mobile testing'],
              deliverables: ['Responsive layouts', 'Mobile components', 'Cross-device testing'],
              updateFrequency: 'Static'
            },
            { 
              id: 'loading-states', 
              name: 'Loading States & Skeletons', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Frontend Team',
              description: 'Loading indicators and skeleton screens to improve perceived performance during data fetching',
              dataSources: ['Loading state data', 'Component state', 'API response times'],
              implementation: 'Skeleton components and loading indicators with smooth transitions',
              dependencies: ['Loading state management', 'Skeleton components', 'Animation library'],
              deliverables: ['Skeleton components', 'Loading indicators', 'Loading state management'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'accessibility', 
              name: 'WCAG Accessibility Features', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Frontend Team',
              description: 'Web Content Accessibility Guidelines compliance for inclusive user experience',
              dataSources: ['WCAG guidelines', 'Accessibility testing tools', 'User feedback'],
              implementation: 'ARIA labels, keyboard navigation, screen reader support, and color contrast compliance',
              dependencies: ['Accessibility testing', 'ARIA implementation', 'User testing'],
              deliverables: ['Accessibility audit', 'ARIA implementation', 'Accessibility testing'],
              updateFrequency: 'Static'
            },
            { 
              id: 'performance-opt', 
              name: 'Code Splitting & Lazy Loading', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Frontend Team',
              description: 'Performance optimization through code splitting and lazy loading of components',
              dataSources: ['Bundle analysis', 'Performance metrics', 'User interaction data'],
              implementation: 'React.lazy, dynamic imports, and route-based code splitting for optimal performance',
              dependencies: ['Bundle analyzer', 'Performance monitoring', 'Code splitting strategy'],
              deliverables: ['Code splitting implementation', 'Performance optimization', 'Bundle analysis'],
              updateFrequency: 'Static'
            },
            { 
              id: 'error-handling', 
              name: 'User-friendly Error Messages', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'Frontend Team',
              description: 'Comprehensive error handling with user-friendly error messages and recovery options',
              dataSources: ['Error logs', 'User feedback', 'System error data'],
              implementation: 'Error boundaries, error logging, and user-friendly error messages with recovery actions',
              dependencies: ['Error logging system', 'Error boundary components', 'User feedback system'],
              deliverables: ['Error boundary components', 'Error handling system', 'User feedback system'],
              updateFrequency: 'Real-time'
            }
          ]
        },
        {
          id: 'data-visualization',
          name: 'Data Visualization',
          tasks: [
            { 
              id: 'geographic-maps', 
              name: 'Geographic Maps (US States)', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Frontend Team',
              description: 'Interactive geographic maps showing US states with SNF data visualization and state-specific metrics',
              dataSources: ['US Census data', 'State boundaries', 'SNF facility data', 'Geographic coordinates'],
              implementation: 'Google Maps API integration with custom markers, state overlays, and interactive data visualization',
              dependencies: ['Google Maps API', 'Geographic data', 'State boundary files'],
              deliverables: ['Interactive state maps', 'Geographic data visualization', 'State-specific metrics'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'facility-mapping', 
              name: 'Facility Location Mapping', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Frontend Team',
              description: 'Detailed facility mapping with location data, facility information, and interactive markers',
              dataSources: ['CMS facility data', 'Geographic coordinates', 'Facility information', 'Quality ratings'],
              implementation: 'Google Maps integration with facility markers, popup information, and search functionality',
              dependencies: ['CMS data', 'Google Maps API', 'Facility database'],
              deliverables: ['Facility map component', 'Facility search', 'Location-based filtering'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'state-comparison', 
              name: 'State Comparison Tools', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Frontend Team',
              description: 'Interactive tools for comparing SNF metrics and policies across different states',
              dataSources: ['State-level metrics', 'Policy data', 'Comparative analysis', 'Benchmarking data'],
              implementation: 'Comparative visualization components with side-by-side state analysis and metrics comparison',
              dependencies: ['State data', 'Comparison algorithms', 'Visualization components'],
              deliverables: ['State comparison tool', 'Comparative metrics', 'Benchmarking features'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'metrics-dashboards', 
              name: 'KPI Visualization Dashboards', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Frontend Team',
              description: 'Comprehensive dashboards displaying key performance indicators and metrics for SNF industry',
              dataSources: ['KPI calculations', 'Performance metrics', 'Industry benchmarks', 'Trend data'],
              implementation: 'Dashboard components with charts, graphs, and real-time metric displays',
              dependencies: ['Chart libraries', 'Metric calculations', 'Dashboard framework'],
              deliverables: ['KPI dashboards', 'Metric visualizations', 'Performance tracking'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'interactive-charts', 
              name: 'Interactive Data Charts', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Frontend Team',
              description: 'Interactive charts and graphs for data exploration and analysis with drill-down capabilities',
              dataSources: ['Chart data', 'User interactions', 'Filter criteria', 'Time series data'],
              implementation: 'Chart.js or D3.js integration with interactive features, tooltips, and data filtering',
              dependencies: ['Chart libraries', 'Data processing', 'Interactive components'],
              deliverables: ['Interactive charts', 'Data exploration tools', 'Chart customization'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'advanced-analytics', 
              name: 'Predictive Modeling Visualization', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Frontend Team',
              description: 'Advanced visualization for predictive models and forecasting in SNF industry trends',
              dataSources: ['Predictive models', 'Historical data', 'Trend analysis', 'Forecasting algorithms'],
              implementation: 'Advanced visualization components for predictive analytics and trend forecasting',
              dependencies: ['ML models', 'Analytics algorithms', 'Visualization libraries'],
              deliverables: ['Predictive visualizations', 'Forecasting tools', 'Analytics dashboards'],
              updateFrequency: 'Daily'
            },
            { 
              id: 'custom-visualizations', 
              name: 'Industry-specific Charts', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'Frontend Team',
              description: 'Specialized charts and visualizations tailored to SNF industry needs and regulatory requirements',
              dataSources: ['Industry data', 'Regulatory requirements', 'Specialized metrics', 'Custom calculations'],
              implementation: 'Custom visualization components for industry-specific data representation',
              dependencies: ['Industry knowledge', 'Custom components', 'Specialized data'],
              deliverables: ['Industry charts', 'Custom visualizations', 'Specialized dashboards'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'export-functionality', 
              name: 'PDF/Excel Export Features', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'Frontend Team',
              description: 'Export functionality for charts, dashboards, and reports in PDF and Excel formats',
              dataSources: ['Chart data', 'Report templates', 'Export preferences', 'User data'],
              implementation: 'Export libraries for PDF generation and Excel file creation with customizable templates',
              dependencies: ['Export libraries', 'Report templates', 'File generation'],
              deliverables: ['Export functionality', 'Report templates', 'File generation system'],
              updateFrequency: 'On-demand'
            }
          ]
        },
        {
          id: 'specialized-features',
          name: 'Specialized Features',
          tasks: [
            { 
              id: 'ai-chatbots', 
              name: 'AI Chatbots (Medicaid & Idaho ALF)', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'AI Team',
              description: 'Implement AI-powered chatbots for Medicaid and Idaho ALF regulatory assistance',
              dataSources: ['Claude AI API', 'Medicaid policy documents', 'Idaho ALF regulations', 'User queries'],
              implementation: 'Create interactive chatbots using Claude AI for regulatory guidance and policy assistance',
              dependencies: ['Claude AI API access', 'Policy document processing', 'Chatbot interface'],
              deliverables: ['Medicaid chatbot', 'Idaho ALF chatbot', 'Chatbot documentation'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'ma-tracking', 
              name: 'M&A Deal Monitoring', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Frontend Team',
              description: 'Monitor and track merger and acquisition activity in the SNF industry',
              dataSources: ['M&A databases', 'News articles', 'Company filings', 'Industry reports'],
              implementation: 'Create M&A tracking system with deal monitoring and analysis capabilities',
              dependencies: ['M&A data sources', 'Deal classification', 'Tracking algorithms'],
              deliverables: ['M&A tracking system', 'Deal monitoring', 'Market analysis'],
              updateFrequency: 'Daily'
            },
            { 
              id: 'conference-directory', 
              name: 'Conference Event Listings', 
              status: 'completed', 
              priority: 'low', 
              assignee: 'Frontend Team',
              description: 'Maintain directory of healthcare and SNF industry conferences and events',
              dataSources: ['Conference websites', 'Event databases', 'Industry calendars', 'Registration systems'],
              implementation: 'Create comprehensive conference directory with event listings and registration links',
              dependencies: ['Event data sources', 'Calendar integration', 'Registration systems'],
              deliverables: ['Conference directory', 'Event listings', 'Calendar integration'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'regulatory-alerts', 
              name: 'Compliance Notifications', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Frontend Team',
              description: 'Provide regulatory compliance alerts and notifications for SNF facilities',
              dataSources: ['Regulatory updates', 'Compliance databases', 'Alert systems', 'User preferences'],
              implementation: 'Create alert system for regulatory changes and compliance requirements',
              dependencies: ['Regulatory data sources', 'Alert system', 'User notification preferences'],
              deliverables: ['Alert system', 'Compliance notifications', 'User preferences'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'weekly-insights', 
              name: 'AI-generated Weekly Summaries', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'AI Team',
              description: 'Generate AI-powered weekly insights and summaries of industry trends',
              dataSources: ['News articles', 'Industry data', 'AI analysis', 'Trend algorithms'],
              implementation: 'Create AI-powered weekly summary generation with trend analysis',
              dependencies: ['AI analysis system', 'Trend algorithms', 'Summary generation'],
              deliverables: ['Weekly insights', 'Trend analysis', 'Summary reports'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'user-preferences', 
              name: 'Customizable Dashboards', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'Frontend Team',
              description: 'Allow users to customize their dashboard layout and preferences',
              dataSources: ['User preferences', 'Dashboard components', 'Layout configurations', 'User data'],
              implementation: 'Create customizable dashboard system with user preference management',
              dependencies: ['User preference system', 'Dashboard components', 'Layout engine'],
              deliverables: ['Customizable dashboards', 'User preferences', 'Layout system'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'notification-system', 
              name: 'Alert Management System', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Frontend Team',
              description: 'Implement comprehensive alert and notification management system',
              dataSources: ['Alert data', 'User preferences', 'Notification channels', 'Alert rules'],
              implementation: 'Create alert management system with multiple notification channels',
              dependencies: ['Alert system', 'Notification channels', 'User preferences'],
              deliverables: ['Alert system', 'Notification management', 'User preferences'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'collaboration-tools', 
              name: 'Team Collaboration Features', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'Frontend Team',
              description: 'Add team collaboration features for shared project management',
              dataSources: ['User accounts', 'Team data', 'Collaboration tools', 'Project data'],
              implementation: 'Create collaboration features for team-based project management',
              dependencies: ['User management', 'Team system', 'Collaboration tools'],
              deliverables: ['Collaboration features', 'Team management', 'Project sharing'],
              updateFrequency: 'As needed'
            }
          ]
        }
      ]
    },
    {
      id: 'backend-services',
      name: 'Backend Services',
      icon: '⚙️',
      color: '#f59e0b',
      subcategories: [
        {
          id: 'api-development',
          name: 'API Development',
          tasks: [
            { 
              id: 'rest-endpoints', 
              name: 'REST API Endpoints', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Backend Team',
              description: 'Implement RESTful API endpoints for data access and manipulation',
              dataSources: ['Express.js', 'API routes', 'HTTP methods', 'Request/response handling'],
              implementation: 'Create RESTful API endpoints with proper HTTP methods and response handling',
              dependencies: ['Express.js framework', 'API design', 'Route configuration'],
              deliverables: ['REST API endpoints', 'API documentation', 'Response handling'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'authentication', 
              name: 'User Authentication System', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Backend Team',
              description: 'Implement user authentication and authorization system',
              dataSources: ['JWT tokens', 'User credentials', 'Authentication middleware', 'Session management'],
              implementation: 'Create authentication system with JWT tokens and user session management',
              dependencies: ['Authentication library', 'User database', 'Security configuration'],
              deliverables: ['Authentication system', 'User management', 'Security documentation'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'rate-limiting', 
              name: 'API Rate Limiting', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Backend Team',
              description: 'Implement API rate limiting to prevent abuse and ensure fair usage',
              dataSources: ['Rate limiting middleware', 'Request tracking', 'IP addresses', 'Usage statistics'],
              implementation: 'Set up rate limiting middleware with configurable limits and tracking',
              dependencies: ['Rate limiting library', 'Request tracking', 'Configuration management'],
              deliverables: ['Rate limiting system', 'Usage tracking', 'Configuration documentation'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'cors-config', 
              name: 'CORS Configuration', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Backend Team',
              description: 'Configure Cross-Origin Resource Sharing for frontend-backend communication',
              dataSources: ['CORS middleware', 'Origin configuration', 'HTTP headers', 'Security policies'],
              implementation: 'Set up CORS configuration for secure cross-origin requests',
              dependencies: ['CORS middleware', 'Origin configuration', 'Security policies'],
              deliverables: ['CORS configuration', 'Security setup', 'Cross-origin documentation'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'graphql-api', 
              name: 'GraphQL API Implementation', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'Backend Team',
              description: 'Implement GraphQL API for flexible data querying',
              dataSources: ['GraphQL schema', 'Resolvers', 'Query language', 'Data sources'],
              implementation: 'Create GraphQL API with schema definition and resolver functions',
              dependencies: ['GraphQL library', 'Schema definition', 'Resolver functions'],
              deliverables: ['GraphQL API', 'Schema documentation', 'Query examples'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'websocket-support', 
              name: 'WebSocket Real-time Updates', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Backend Team',
              description: 'Implement WebSocket support for real-time data updates',
              dataSources: ['WebSocket library', 'Real-time data', 'Connection management', 'Event handling'],
              implementation: 'Set up WebSocket server for real-time communication and data updates',
              dependencies: ['WebSocket library', 'Real-time data sources', 'Connection management'],
              deliverables: ['WebSocket server', 'Real-time updates', 'Connection documentation'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'api-documentation', 
              name: 'Swagger/OpenAPI Documentation', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'Backend Team',
              description: 'Generate comprehensive API documentation using Swagger/OpenAPI',
              dataSources: ['API endpoints', 'Request/response schemas', 'OpenAPI specification', 'Documentation tools'],
              implementation: 'Create comprehensive API documentation with Swagger/OpenAPI specification',
              dependencies: ['OpenAPI specification', 'Documentation tools', 'API schema'],
              deliverables: ['API documentation', 'Swagger UI', 'OpenAPI spec'],
              updateFrequency: 'As needed'
            }
          ]
        },
        {
          id: 'data-processing-services',
          name: 'Data Processing Services',
          tasks: [
            { 
              id: 'rss-processing', 
              name: 'RSS Feed Processing', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Backend Team',
              description: 'Process and parse RSS feeds from multiple news sources',
              dataSources: ['RSS feeds', 'News articles', 'Feed parsers', 'Content extraction'],
              implementation: 'Implement RSS feed processing with content extraction and normalization',
              dependencies: ['RSS parser library', 'Feed sources', 'Content processing'],
              deliverables: ['RSS processor', 'Feed monitoring', 'Content extraction'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'pdf-processing', 
              name: 'PDF Document Analysis', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Backend Team',
              description: 'Extract and analyze content from PDF documents',
              dataSources: ['PDF documents', 'Text extraction', 'Document analysis', 'Content parsing'],
              implementation: 'Create PDF processing system with text extraction and content analysis',
              dependencies: ['PDF processing library', 'Text extraction', 'Content analysis'],
              deliverables: ['PDF processor', 'Text extraction', 'Document analysis'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'excel-processing', 
              name: 'Excel Data Import/Export', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Backend Team',
              description: 'Handle Excel file import and export for data management',
              dataSources: ['Excel files', 'Data sheets', 'Import/export tools', 'Data validation'],
              implementation: 'Create Excel processing system for data import and export operations',
              dependencies: ['Excel processing library', 'Data validation', 'Import/export tools'],
              deliverables: ['Excel processor', 'Data import/export', 'Validation system'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'image-processing', 
              name: 'Media Handling', 
              status: 'completed', 
              priority: 'low', 
              assignee: 'Backend Team',
              description: 'Process and handle media files including images and documents',
              dataSources: ['Media files', 'Image processing', 'File storage', 'Content optimization'],
              implementation: 'Create media processing system with image optimization and file handling',
              dependencies: ['Media processing library', 'File storage', 'Image optimization'],
              deliverables: ['Media processor', 'File handling', 'Image optimization'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'content-analysis', 
              name: 'AI-powered Content Analysis', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'AI Team',
              description: 'Analyze content using AI for relevance, sentiment, and categorization',
              dataSources: ['Content text', 'AI models', 'Analysis algorithms', 'Classification data'],
              implementation: 'Implement AI-powered content analysis with sentiment and categorization',
              dependencies: ['AI models', 'Content processing', 'Analysis algorithms'],
              deliverables: ['Content analyzer', 'AI analysis', 'Classification system'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'nlp-processing', 
              name: 'Natural Language Processing', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'AI Team',
              description: 'Implement advanced NLP for text analysis and understanding',
              dataSources: ['Text content', 'NLP models', 'Language processing', 'Text analysis'],
              implementation: 'Create NLP processing system with advanced text analysis capabilities',
              dependencies: ['NLP library', 'Language models', 'Text processing'],
              deliverables: ['NLP processor', 'Text analysis', 'Language understanding'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'ml-models', 
              name: 'Machine Learning Models', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'AI Team',
              description: 'Develop and deploy machine learning models for predictive analytics',
              dataSources: ['Training data', 'ML algorithms', 'Model training', 'Prediction data'],
              implementation: 'Create machine learning models for predictive analytics and insights',
              dependencies: ['ML framework', 'Training data', 'Model deployment'],
              deliverables: ['ML models', 'Prediction system', 'Analytics engine'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'data-pipeline', 
              name: 'ETL Automation Pipeline', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Backend Team',
              description: 'Implement automated ETL pipeline for data processing and transformation',
              dataSources: ['Data sources', 'ETL tools', 'Processing scripts', 'Data validation'],
              implementation: 'Create automated ETL pipeline with data extraction, transformation, and loading',
              dependencies: ['ETL framework', 'Data sources', 'Processing scripts'],
              deliverables: ['ETL pipeline', 'Data processing', 'Automation system'],
              updateFrequency: 'As needed'
            }
          ]
        },
        {
          id: 'background-services',
          name: 'Background Services',
          tasks: [
            { 
              id: 'scheduled-jobs', 
              name: 'Automated Data Collection Jobs', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Backend Team',
              description: 'Automated background jobs for collecting data from various sources including RSS feeds, APIs, and web scraping',
              dataSources: ['RSS feeds', 'API endpoints', 'Web scraping targets', 'Scheduled job data'],
              implementation: 'Node.js cron jobs and scheduled tasks for automated data collection and processing',
              dependencies: ['Cron scheduler', 'Data collection scripts', 'Job monitoring'],
              deliverables: ['Scheduled job system', 'Data collection automation', 'Job monitoring'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'worker-processes', 
              name: 'Background Task Processing', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Backend Team',
              description: 'Background worker processes for handling heavy computational tasks and data processing',
              dataSources: ['Task queue data', 'Processing results', 'Worker status', 'Performance metrics'],
              implementation: 'Worker process management for AI analysis, data processing, and computational tasks',
              dependencies: ['Worker process framework', 'Task queue system', 'Process monitoring'],
              deliverables: ['Worker process system', 'Task processing', 'Performance monitoring'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'cache-management', 
              name: 'Performance Cache System', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Backend Team',
              description: 'Intelligent caching system for improving application performance and reducing database load',
              dataSources: ['Cache hit/miss data', 'Performance metrics', 'Cache usage statistics', 'Data access patterns'],
              implementation: 'Redis-based caching system with intelligent cache invalidation and performance optimization',
              dependencies: ['Redis cache', 'Cache strategies', 'Performance monitoring'],
              deliverables: ['Cache system', 'Performance optimization', 'Cache management'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'queue-system', 
              name: 'Task Queue Management', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Backend Team',
              description: 'Robust task queue system for managing background jobs and ensuring reliable task processing',
              dataSources: ['Queue metrics', 'Task status data', 'Processing times', 'Queue performance'],
              implementation: 'Queue management system with job prioritization, retry logic, and failure handling',
              dependencies: ['Queue framework', 'Job processing', 'Queue monitoring'],
              deliverables: ['Queue system', 'Job management', 'Queue monitoring'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'microservices', 
              name: 'Microservices Architecture', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'Backend Team',
              description: 'Microservices architecture for scalable and maintainable backend services',
              dataSources: ['Service metrics', 'API performance', 'Service dependencies', 'Load distribution'],
              implementation: 'Microservices architecture with service discovery, API gateway, and inter-service communication',
              dependencies: ['Service framework', 'API gateway', 'Service discovery'],
              deliverables: ['Microservices architecture', 'Service management', 'API gateway'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'event-streaming', 
              name: 'Real-time Event Streaming', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Backend Team',
              description: 'Real-time event streaming for live data updates and real-time notifications',
              dataSources: ['Event data', 'Stream metrics', 'Real-time updates', 'Event processing'],
              implementation: 'WebSocket and event streaming for real-time data updates and live notifications',
              dependencies: ['Event streaming framework', 'WebSocket implementation', 'Event processing'],
              deliverables: ['Event streaming system', 'Real-time updates', 'Live notifications'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'load-balancing', 
              name: 'Traffic Load Balancing', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'Backend Team',
              description: 'Load balancing system for distributing traffic and ensuring high availability',
              dataSources: ['Traffic metrics', 'Load distribution', 'Performance data', 'Availability metrics'],
              implementation: 'Load balancing configuration with health checks and traffic distribution',
              dependencies: ['Load balancer', 'Health monitoring', 'Traffic management'],
              deliverables: ['Load balancing system', 'Traffic distribution', 'High availability'],
              updateFrequency: 'As needed'
            }
          ]
        }
      ]
    },
    {
      id: 'data-sources',
      name: 'Data Sources & Integration',
      icon: '📊',
      color: '#10b981',
      subcategories: [
        {
          id: 'federal-sources',
          name: 'Federal Data Sources',
          tasks: [
            { 
              id: 'congress-gov', 
              name: 'Congress.gov API Integration', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Integration with Congress.gov API for real-time tracking of federal legislation affecting SNFs',
              dataSources: ['Congress.gov API', 'Bill data', 'Committee information', 'Voting records'],
              implementation: 'API integration for automated collection of legislative data and bill tracking',
              dependencies: ['Congress.gov API access', 'Data processing scripts', 'Database storage'],
              deliverables: ['API integration', 'Legislative data collection', 'Bill tracking system'],
              updateFrequency: 'Real-time'
            },
            { 
              id: 'house-ways-means', 
              name: 'House Ways & Means Committee', 
              status: 'pending', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Data collection from House Ways & Means Committee for Medicare/Medicaid policy oversight',
              dataSources: ['Committee website', 'Hearing transcripts', 'Markup documents', 'Policy proposals'],
              implementation: 'Web scraping and document processing for committee activities and policy updates',
              dependencies: ['Web scraping tools', 'Document processing', 'Committee website access'],
              deliverables: ['Committee data collection', 'Policy tracking', 'Hearing transcripts'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'senate-finance', 
              name: 'Senate Finance Committee', 
              status: 'pending', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Data collection from Senate Finance Committee for healthcare policy and Medicare oversight',
              dataSources: ['Committee website', 'Senate hearings', 'Policy reports', 'Legislative proposals'],
              implementation: 'Automated data collection from Senate Finance Committee activities and policy updates',
              dependencies: ['Web scraping tools', 'Document processing', 'Committee website access'],
              deliverables: ['Senate data collection', 'Policy tracking', 'Hearing transcripts'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'energy-commerce', 
              name: 'House Energy & Commerce', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Data collection from House Energy & Commerce Committee for healthcare policy and nursing home regulations',
              dataSources: ['Committee website', 'Healthcare policy documents', 'Regulatory updates', 'Committee hearings'],
              implementation: 'Web scraping and document processing for healthcare policy and regulatory updates',
              dependencies: ['Web scraping tools', 'Document processing', 'Committee website access'],
              deliverables: ['Healthcare policy data', 'Regulatory tracking', 'Committee activities'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'federal-budget', 
              name: 'Federal Budget Documents', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Collection and analysis of federal budget documents affecting SNF funding and Medicare/Medicaid',
              dataSources: ['Federal budget documents', 'CBO reports', 'Medicare Trustees Report', 'Budget proposals'],
              implementation: 'Document collection and analysis for budget impacts on SNF funding and policy',
              dependencies: ['Document processing', 'Budget analysis tools', 'Federal document access'],
              deliverables: ['Budget analysis', 'Funding impact tracking', 'Policy implications'],
              updateFrequency: 'Annual'
            }
          ]
        },
        {
          id: 'regulatory-sources',
          name: 'Regulatory Data Sources',
          tasks: [
            { 
              id: 'cms-snf-pps', 
              name: 'CMS.gov SNF PPS', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Integration with CMS Skilled Nursing Facility Prospective Payment System for payment updates and policy changes',
              dataSources: ['CMS.gov SNF PPS', 'Payment rules', 'Rate updates', 'Market basket data'],
              implementation: 'Automated data collection from CMS SNF PPS website for payment policy updates',
              dependencies: ['CMS website access', 'Data processing scripts', 'Payment rule parsing'],
              deliverables: ['Payment rule tracking', 'Rate update monitoring', 'Policy change alerts'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'qso-memos', 
              name: 'CMS QSO Memos', 
              status: 'pending', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Collection of CMS Quality, Safety & Oversight memos for surveyor guidance and enforcement priorities',
              dataSources: ['CMS QSO memos', 'Surveyor guidance', 'Enforcement priorities', 'Policy updates'],
              implementation: 'Automated collection and processing of QSO memos for regulatory updates',
              dependencies: ['CMS memo access', 'Document processing', 'Regulatory analysis'],
              deliverables: ['QSO memo tracking', 'Surveyor guidance updates', 'Enforcement monitoring'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'state-operations', 
              name: 'State Operations Manual', 
              status: 'pending', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Integration with CMS State Operations Manual for survey procedures and regulatory guidance',
              dataSources: ['State Operations Manual', 'Survey procedures', 'Regulatory guidance', 'Compliance requirements'],
              implementation: 'Document processing and analysis of State Operations Manual updates',
              dependencies: ['Manual access', 'Document processing', 'Regulatory analysis'],
              deliverables: ['Manual updates tracking', 'Survey procedure monitoring', 'Compliance guidance'],
              updateFrequency: 'Quarterly'
            },
            { 
              id: 'federal-register-snf', 
              name: 'Federal Register SNF Rules', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Automated collection of Federal Register publications for SNF payment rules and regulatory changes',
              dataSources: ['Federal Register', 'SNF payment rules', 'Regulatory changes', 'Policy updates'],
              implementation: 'API integration with Federal Register for automated collection of SNF-related regulations',
              dependencies: ['Federal Register API', 'Document processing', 'Regulatory analysis'],
              deliverables: ['Regulatory tracking', 'Rule change monitoring', 'Policy update alerts'],
              updateFrequency: 'Daily'
            },
            { 
              id: 'regulations-gov', 
              name: 'Regulations.gov Integration', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Integration with Regulations.gov for tracking proposed and final rules affecting SNFs',
              dataSources: ['Regulations.gov API', 'Proposed rules', 'Final rules', 'Comment periods'],
              implementation: 'API integration for tracking regulatory rulemaking process and public comments',
              dependencies: ['Regulations.gov API', 'Rule tracking', 'Comment analysis'],
              deliverables: ['Rulemaking tracking', 'Comment monitoring', 'Regulatory timeline'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'mac-websites', 
              name: 'Medicare Administrative Contractors', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Data collection from Medicare Administrative Contractor websites for local coverage decisions and policies',
              dataSources: ['MAC websites', 'Local coverage decisions', 'Regional policies', 'Coverage updates'],
              implementation: 'Web scraping and data collection from MAC websites for regional policy updates',
              dependencies: ['MAC website access', 'Web scraping tools', 'Regional data processing'],
              deliverables: ['MAC data collection', 'Regional policy tracking', 'Coverage decision monitoring'],
              updateFrequency: 'Monthly'
            }
          ]
        },
        {
          id: 'state-sources',
          name: 'State Data Sources',
          tasks: [
            { 
              id: 'state-medicaid', 
              name: 'State Medicaid Agency Websites', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Automated data collection from state Medicaid agency websites for reimbursement rates and policy updates',
              dataSources: ['State Medicaid websites', 'Reimbursement rates', 'Provider bulletins', 'Policy memos'],
              implementation: 'Web scraping and data collection from all 50 state Medicaid agency websites',
              dependencies: ['State website access', 'Web scraping tools', 'Rate processing algorithms'],
              deliverables: ['State rate tracking', 'Policy update monitoring', 'Reimbursement analysis'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'state-legislatures', 
              name: 'State Legislature Websites', 
              status: 'pending', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Data collection from state legislature websites for nursing home legislation and policy changes',
              dataSources: ['State legislature websites', 'Bill tracking', 'Committee hearings', 'Legislative updates'],
              implementation: 'Automated collection of state-level nursing home legislation and policy changes',
              dependencies: ['State legislature access', 'Bill tracking systems', 'Legislative data processing'],
              deliverables: ['State bill tracking', 'Legislative monitoring', 'Policy change alerts'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'state-committees', 
              name: 'State Health & Welfare Committees', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Data collection from state health and welfare committees for nursing home oversight and policy',
              dataSources: ['Committee websites', 'Hearing transcripts', 'Committee reports', 'Policy proposals'],
              implementation: 'Web scraping and document processing for state committee activities',
              dependencies: ['Committee website access', 'Document processing', 'Committee data analysis'],
              deliverables: ['Committee tracking', 'Hearing transcripts', 'Policy monitoring'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'state-budgets', 
              name: 'State Budget Documents', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Collection and analysis of state budget documents affecting nursing home funding and Medicaid',
              dataSources: ['State budget documents', 'Medicaid funding', 'Nursing home appropriations', 'Budget proposals'],
              implementation: 'Document collection and analysis for state budget impacts on nursing home funding',
              dependencies: ['Budget document access', 'Document processing', 'Budget analysis tools'],
              deliverables: ['Budget analysis', 'Funding impact tracking', 'State funding monitoring'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'state-surveys', 
              name: 'State Survey Agencies', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Data collection from state survey agencies for nursing home inspection and compliance data',
              dataSources: ['State survey agencies', 'Inspection reports', 'Compliance data', 'Quality ratings'],
              implementation: 'Automated collection of state survey agency data for nursing home compliance monitoring',
              dependencies: ['Survey agency access', 'Data processing', 'Compliance analysis'],
              deliverables: ['Survey data collection', 'Compliance monitoring', 'Quality tracking'],
              updateFrequency: 'Monthly'
            }
          ]
        }
      ]
    },
    {
      id: 'metrics-system',
      name: 'Comprehensive Metrics System',
      icon: '📈',
      color: '#ef4444',
      subcategories: [
        {
          id: 'workforce-metrics',
          name: 'Workforce Metrics (8 metrics)',
          tasks: [
            { 
              id: 'rn-wages', 
              name: 'Average RN Hourly Wage', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate average hourly wage for Registered Nurses by state',
              formula: 'SUM(RN_Wages * RN_Employment) / SUM(RN_Employment)',
              dataSources: ['BLS OEWS (Occupational Employment and Wage Statistics)', 'Healthcare Industry Classification'],
              implementation: 'Extract RN wage data from BLS OEWS by state and healthcare industry',
              dependencies: ['BLS API integration', 'Industry classification mapping'],
              deliverables: ['RN wage database', 'State-level calculations', 'Trend analysis'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'lpn-wages', 
              name: 'Average LPN Hourly Wage', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate average hourly wage for Licensed Practical Nurses by state',
              formula: 'SUM(LPN_Wages * LPN_Employment) / SUM(LPN_Employment)',
              dataSources: ['BLS OEWS (Occupational Employment and Wage Statistics)', 'Healthcare Industry Classification'],
              implementation: 'Extract LPN wage data from BLS OEWS by state and healthcare industry',
              dependencies: ['BLS API integration', 'Industry classification mapping'],
              deliverables: ['LPN wage database', 'State-level calculations', 'Trend analysis'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'cna-wages', 
              name: 'Average CNA Hourly Wage', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate average hourly wage for Certified Nursing Assistants by state',
              formula: 'SUM(CNA_Wages * CNA_Employment) / SUM(CNA_Employment)',
              dataSources: ['BLS OEWS (Occupational Employment and Wage Statistics)', 'Healthcare Industry Classification'],
              implementation: 'Extract CNA wage data from BLS OEWS by state and healthcare industry',
              dependencies: ['BLS API integration', 'Industry classification mapping'],
              deliverables: ['CNA wage database', 'State-level calculations', 'Trend analysis'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'admin-wages', 
              name: 'Average Administrator Hourly Wage', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate average hourly wage for Healthcare Administrators by state',
              formula: 'SUM(Admin_Wages * Admin_Employment) / SUM(Admin_Employment)',
              dataSources: ['BLS OEWS (Occupational Employment and Wage Statistics)', 'Healthcare Industry Classification'],
              implementation: 'Extract healthcare administrator wage data from BLS OEWS by state',
              dependencies: ['BLS API integration', 'Industry classification mapping'],
              deliverables: ['Administrator wage database', 'State-level calculations', 'Trend analysis'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'pt-wages', 
              name: 'Average PT/PTA/OT/SLP Wages', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate average hourly wages for therapy staff by state',
              formula: 'SUM(Therapy_Wages * Therapy_Employment) / SUM(Therapy_Employment)',
              dataSources: ['BLS OEWS (Occupational Employment and Wage Statistics)', 'Healthcare Industry Classification'],
              implementation: 'Extract PT, PTA, OT, SLP wage data from BLS OEWS by state',
              dependencies: ['BLS API integration', 'Therapy profession classification'],
              deliverables: ['Therapy wage database', 'State-level calculations', 'Trend analysis'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'healthcare-unemployment', 
              name: 'Healthcare Worker Unemployment Rate', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Track unemployment rate for healthcare workers by state',
              formula: 'Unemployed_Healthcare_Workers / Total_Healthcare_Labor_Force * 100',
              dataSources: ['BLS LAUS (Local Area Unemployment Statistics)', 'Healthcare Industry Classification'],
              implementation: 'Extract healthcare unemployment data from BLS LAUS by state',
              dependencies: ['BLS LAUS API integration', 'Healthcare industry mapping'],
              deliverables: ['Healthcare unemployment database', 'State-level calculations', 'Monthly updates'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'rn-turnover', 
              name: 'Average RN Turnover Rate', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Calculate RN turnover rate by state and facility type',
              formula: 'RN_Separations / Average_RN_Employment * 100',
              dataSources: ['Industry surveys', 'BLS Job Openings and Labor Turnover Survey', 'Healthcare workforce studies'],
              implementation: 'Collect RN turnover data from industry surveys and BLS JOLTS',
              dependencies: ['Industry survey access', 'BLS JOLTS integration'],
              deliverables: ['RN turnover database', 'State-level calculations', 'Industry benchmarks'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'cna-turnover', 
              name: 'Average CNA Turnover Rate', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Calculate CNA turnover rate by state and facility type',
              formula: 'CNA_Separations / Average_CNA_Employment * 100',
              dataSources: ['Industry surveys', 'BLS Job Openings and Labor Turnover Survey', 'Healthcare workforce studies'],
              implementation: 'Collect CNA turnover data from industry surveys and BLS JOLTS',
              dependencies: ['Industry survey access', 'BLS JOLTS integration'],
              deliverables: ['CNA turnover database', 'State-level calculations', 'Industry benchmarks'],
              updateFrequency: 'Annual'
            }
          ]
        },
        {
          id: 'demographics-metrics',
          name: 'Demographics Metrics (8 metrics)',
          tasks: [
            { 
              id: 'population-65', 
              name: 'Population Age 65+', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate population aged 65 and older by state and county',
              formula: 'SUM(Population_Age_65_Plus)',
              dataSources: ['US Census Bureau', 'American Community Survey', 'Population Estimates'],
              implementation: 'Extract population data for age 65+ from Census data by geographic area',
              dependencies: ['Census API integration', 'Age group classification', 'Geographic mapping'],
              deliverables: ['Population 65+ database', 'Geographic analysis', 'Age distribution reports'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'population-85', 
              name: 'Population Age 85+', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate population aged 85 and older by state and county',
              formula: 'SUM(Population_Age_85_Plus)',
              dataSources: ['US Census Bureau', 'American Community Survey', 'Population Estimates'],
              implementation: 'Extract population data for age 85+ from Census data by geographic area',
              dependencies: ['Census API integration', 'Age group classification', 'Geographic mapping'],
              deliverables: ['Population 85+ database', 'Geographic analysis', 'Age distribution reports'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'percent-65', 
              name: '% of Population Age 65+', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate percentage of population aged 65 and older by state and county',
              formula: 'Population_Age_65_Plus / Total_Population * 100',
              dataSources: ['US Census Bureau', 'American Community Survey', 'Population Estimates'],
              implementation: 'Calculate percentage of population 65+ from Census data by geographic area',
              dependencies: ['Census API integration', 'Age group classification', 'Geographic mapping'],
              deliverables: ['Population percentage database', 'Geographic analysis', 'Age distribution reports'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'growth-65', 
              name: '65+ Population 5-Year Growth Rate', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate 5-year growth rate for population aged 65 and older',
              formula: '(Population_65_Plus_Current - Population_65_Plus_5_Years_Ago) / Population_65_Plus_5_Years_Ago * 100',
              dataSources: ['US Census Bureau', 'American Community Survey', 'Population Estimates'],
              implementation: 'Calculate 5-year growth rate for population 65+ from Census data',
              dependencies: ['Census API integration', 'Historical data', 'Growth rate calculations'],
              deliverables: ['Growth rate database', 'Growth analysis', 'Trend reports'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'growth-85', 
              name: '85+ Population 5-Year Growth Rate', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate 5-year growth rate for population aged 85 and older',
              formula: '(Population_85_Plus_Current - Population_85_Plus_5_Years_Ago) / Population_85_Plus_5_Years_Ago * 100',
              dataSources: ['US Census Bureau', 'American Community Survey', 'Population Estimates'],
              implementation: 'Calculate 5-year growth rate for population 85+ from Census data',
              dependencies: ['Census API integration', 'Historical data', 'Growth rate calculations'],
              deliverables: ['Growth rate database', 'Growth analysis', 'Trend reports'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'senior-poverty', 
              name: 'Senior Poverty Rate', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Calculate poverty rate for population aged 65 and older',
              formula: 'Senior_Poverty_Population / Senior_Total_Population * 100',
              dataSources: ['US Census Bureau', 'American Community Survey', 'Poverty Statistics'],
              implementation: 'Extract senior poverty data from Census ACS by geographic area',
              dependencies: ['Census ACS API', 'Age-specific poverty data', 'Geographic aggregation'],
              deliverables: ['Senior poverty database', 'Poverty analysis', 'Trend reports'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'senior-income', 
              name: 'Median Senior Income', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Calculate median income for population aged 65 and older',
              formula: 'MEDIAN(Senior_Household_Income)',
              dataSources: ['US Census Bureau', 'American Community Survey', 'Income Statistics'],
              implementation: 'Extract median senior income data from Census ACS by geographic area',
              dependencies: ['Census ACS API', 'Age-specific income data', 'Geographic aggregation'],
              deliverables: ['Senior income database', 'Income analysis', 'Trend reports'],
              updateFrequency: 'Annual'
            },
            { 
              id: 'senior-migration', 
              name: 'Senior Net Migration', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Calculate net migration for population aged 65 and older',
              formula: 'Senior_In_Migration - Senior_Out_Migration',
              dataSources: ['US Census Bureau', 'American Community Survey', 'Migration Statistics'],
              implementation: 'Extract senior migration data from Census ACS by geographic area',
              dependencies: ['Census ACS API', 'Migration data', 'Geographic aggregation'],
              deliverables: ['Senior migration database', 'Migration analysis', 'Trend reports'],
              updateFrequency: 'Annual'
            }
          ]
        },
        {
          id: 'quality-metrics',
          name: 'Quality Metrics (20 metrics)',
          tasks: [
            { 
              id: 'star-ratings', 
              name: 'Average Overall Star Rating', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate average overall star rating for facilities by state and region',
              formula: 'AVERAGE(Overall_Star_Rating)',
              dataSources: ['CMS Care Compare', 'Star Ratings Database', 'Quality Measures'],
              implementation: 'Extract and calculate average star ratings from CMS Care Compare data',
              dependencies: ['CMS Care Compare API', 'Star rating algorithms', 'Geographic aggregation'],
              deliverables: ['Star rating database', 'Rating analysis', 'Quality trend reports'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'quality-ratings', 
              name: 'Average Quality/Staffing/Inspection Ratings', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate average quality, staffing, and inspection ratings for facilities',
              formula: 'AVERAGE(Quality_Rating), AVERAGE(Staffing_Rating), AVERAGE(Inspection_Rating)',
              dataSources: ['CMS Care Compare', 'Quality Measures Database', 'Staffing Data'],
              implementation: 'Extract and calculate average quality, staffing, and inspection ratings',
              dependencies: ['CMS Care Compare API', 'Quality measure mapping', 'Rating calculations'],
              deliverables: ['Quality ratings database', 'Rating analysis', 'Quality trend reports'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'facility-stars', 
              name: '% Facilities with 1-5 Stars', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate percentage distribution of facilities by star rating (1-5 stars)',
              formula: 'COUNT(Facilities_by_Star_Rating) / Total_Facilities * 100',
              dataSources: ['CMS Care Compare', 'Star Ratings Database', 'Facility Data'],
              implementation: 'Calculate percentage distribution of facilities by star rating',
              dependencies: ['CMS Care Compare API', 'Star rating classification', 'Geographic aggregation'],
              deliverables: ['Star distribution database', 'Distribution analysis', 'Quality reports'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'deficiencies', 
              name: 'Average Deficiencies per Facility', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Calculate average number of deficiencies per facility by state and region',
              formula: 'AVERAGE(Total_Deficiencies_per_Facility)',
              dataSources: ['CMS Health Deficiencies', 'Survey Results', 'Enforcement Data'],
              implementation: 'Extract and calculate average deficiencies from CMS deficiency data',
              dependencies: ['CMS deficiencies API', 'Deficiency classification', 'Geographic aggregation'],
              deliverables: ['Deficiency database', 'Deficiency analysis', 'Quality trend reports'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'f-tags', 
              name: 'Most Common F-Tags', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'Data Team',
              description: 'Identify and rank the most common F-tag deficiencies by state and region',
              formula: 'COUNT(F_Tag_Occurrences) ORDER BY COUNT DESC',
              dataSources: ['CMS Health Deficiencies', 'F-Tag Database', 'Survey Results'],
              implementation: 'Extract and rank F-tag deficiencies from CMS deficiency data',
              dependencies: ['CMS deficiencies API', 'F-tag classification', 'Ranking algorithms'],
              deliverables: ['F-tag database', 'F-tag analysis', 'Deficiency trend reports'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'deficiency-types', 
              name: '% Deficiencies - Immediate Jeopardy/Widespread', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Calculate percentage of deficiencies classified as Immediate Jeopardy or Widespread',
              formula: 'COUNT(Immediate_Jeopardy_Deficiencies + Widespread_Deficiencies) / Total_Deficiencies * 100',
              dataSources: ['CMS Health Deficiencies', 'Deficiency Classification System', 'Survey Results'],
              implementation: 'Extract and classify deficiencies by severity level from CMS deficiency data',
              dependencies: ['CMS deficiencies API', 'Deficiency severity classification', 'Geographic aggregation'],
              deliverables: ['Deficiency severity database', 'Severity analysis', 'Quality trend reports'],
              updateFrequency: 'Weekly'
            },
            { 
              id: 'facility-penalties', 
              name: '% Facilities Penalized', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Calculate percentage of facilities that have received penalties',
              formula: 'COUNT(Facilities_with_Penalties) / Total_Facilities * 100',
              dataSources: ['CMS Enforcement Actions', 'Civil Monetary Penalties', 'Facility Data'],
              implementation: 'Extract penalty data from CMS enforcement actions and calculate facility penalty rates',
              dependencies: ['CMS enforcement API', 'Penalty classification', 'Facility mapping'],
              deliverables: ['Penalty database', 'Penalty rate analysis', 'Enforcement trend reports'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'cmp-amounts', 
              name: 'Average CMP Amount', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Calculate average Civil Monetary Penalty amount by state and region',
              formula: 'AVERAGE(Civil_Monetary_Penalty_Amount)',
              dataSources: ['CMS Civil Monetary Penalties', 'Enforcement Actions', 'Penalty Data'],
              implementation: 'Extract and calculate average CMP amounts from CMS enforcement data',
              dependencies: ['CMS enforcement API', 'Penalty amount parsing', 'Geographic aggregation'],
              deliverables: ['CMP amount database', 'Penalty analysis', 'Enforcement trend reports'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'total-penalties', 
              name: 'Total Penalties Assessed', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Calculate total amount of penalties assessed by state and region',
              formula: 'SUM(Total_Penalty_Amount)',
              dataSources: ['CMS Civil Monetary Penalties', 'Enforcement Actions', 'Penalty Data'],
              implementation: 'Extract and sum total penalty amounts from CMS enforcement data',
              dependencies: ['CMS enforcement API', 'Penalty amount parsing', 'Geographic aggregation'],
              deliverables: ['Total penalty database', 'Penalty analysis', 'Enforcement trend reports'],
              updateFrequency: 'Monthly'
            },
            { 
              id: 'sff-facilities', 
              name: 'Count of Special Focus Facilities', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'Data Team',
              description: 'Count facilities in the Special Focus Facility program by state and region',
              formula: 'COUNT(Special_Focus_Facilities)',
              dataSources: ['CMS Special Focus Facility Program', 'Quality Measures', 'Facility Data'],
              implementation: 'Extract and count SFF facilities from CMS Special Focus Facility program data',
              dependencies: ['CMS SFF API', 'SFF classification', 'Geographic aggregation'],
              deliverables: ['SFF database', 'SFF analysis', 'Quality trend reports'],
              updateFrequency: 'Monthly'
            }
          ]
        }
      ]
    },
    {
      id: 'deployment-infrastructure',
      name: 'Deployment & Infrastructure',
      icon: '🚀',
      color: '#06b6d4',
      subcategories: [
        {
          id: 'development-env',
          name: 'Development Environment',
          tasks: [
            { 
              id: 'local-dev', 
              name: 'Local Development Setup', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'DevOps Team',
              description: 'Set up local development environment with all necessary tools and dependencies',
              dataSources: ['Node.js', 'npm/yarn', 'Git', 'VS Code', 'Development Tools'],
              implementation: 'Configure local development environment with Node.js, package managers, and development tools',
              dependencies: ['System requirements', 'Development tools', 'Configuration files'],
              deliverables: ['Local dev environment', 'Development documentation', 'Setup scripts'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'database-setup', 
              name: 'PostgreSQL Configuration', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'DevOps Team',
              description: 'Configure PostgreSQL database for local and production environments',
              dataSources: ['PostgreSQL', 'Database schemas', 'Connection strings', 'Environment variables'],
              implementation: 'Set up PostgreSQL database with proper configuration, schemas, and connection management',
              dependencies: ['PostgreSQL installation', 'Database schemas', 'Connection configuration'],
              deliverables: ['Database configuration', 'Connection setup', 'Schema documentation'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'api-dev', 
              name: 'Express Server Setup', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'DevOps Team',
              description: 'Set up Express.js server with API endpoints and middleware',
              dataSources: ['Express.js', 'Node.js', 'API endpoints', 'Middleware libraries'],
              implementation: 'Configure Express server with routes, middleware, and API endpoints',
              dependencies: ['Express.js framework', 'API design', 'Middleware configuration'],
              deliverables: ['Express server', 'API endpoints', 'Server documentation'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'env-config', 
              name: 'Environment Configuration', 
              status: 'completed', 
              priority: 'medium', 
              assignee: 'DevOps Team',
              description: 'Configure environment variables and settings for different environments',
              dataSources: ['Environment variables', 'Configuration files', 'Secrets management'],
              implementation: 'Set up environment-specific configuration with proper variable management',
              dependencies: ['Environment setup', 'Configuration management', 'Secrets handling'],
              deliverables: ['Environment config', 'Configuration documentation', 'Secrets management'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'docker-setup', 
              name: 'Docker Containerization', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'DevOps Team',
              description: 'Containerize application using Docker for consistent deployment',
              dataSources: ['Docker', 'Docker Compose', 'Container images', 'Dockerfiles'],
              implementation: 'Create Docker containers for application and database with proper orchestration',
              dependencies: ['Docker installation', 'Container configuration', 'Orchestration setup'],
              deliverables: ['Docker containers', 'Docker Compose setup', 'Container documentation'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'ci-cd', 
              name: 'CI/CD Pipeline', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'DevOps Team',
              description: 'Set up continuous integration and deployment pipeline',
              dataSources: ['GitHub Actions', 'CI/CD tools', 'Deployment scripts', 'Testing frameworks'],
              implementation: 'Configure automated testing, building, and deployment pipeline',
              dependencies: ['CI/CD platform', 'Testing setup', 'Deployment configuration'],
              deliverables: ['CI/CD pipeline', 'Automated testing', 'Deployment automation'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'testing-framework', 
              name: 'Unit/Integration Testing', 
              status: 'pending', 
              priority: 'high', 
              assignee: 'QA Team',
              description: 'Implement comprehensive testing framework for unit and integration tests',
              dataSources: ['Jest', 'Testing libraries', 'Test data', 'Mock services'],
              implementation: 'Set up testing framework with unit tests, integration tests, and test automation',
              dependencies: ['Testing framework', 'Test data setup', 'Mock services'],
              deliverables: ['Testing framework', 'Test suites', 'Testing documentation'],
              updateFrequency: 'As needed'
            }
          ]
        },
        {
          id: 'production-deployment',
          name: 'Production Deployment',
          tasks: [
            { 
              id: 'render-config', 
              name: 'Render.com Configuration', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'DevOps Team',
              description: 'Configure application deployment on Render.com platform',
              dataSources: ['Render.com', 'Deployment configuration', 'Build settings', 'Environment setup'],
              implementation: 'Set up Render.com deployment with proper build configuration and environment settings',
              dependencies: ['Render.com account', 'Deployment configuration', 'Build process'],
              deliverables: ['Render deployment', 'Deployment documentation', 'Configuration files'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'db-hosting', 
              name: 'PostgreSQL Production Hosting', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'DevOps Team',
              description: 'Set up PostgreSQL database hosting for production environment',
              dataSources: ['PostgreSQL hosting', 'Database configuration', 'Connection strings', 'Backup systems'],
              implementation: 'Configure production PostgreSQL database with proper hosting and backup systems',
              dependencies: ['Database hosting service', 'Database configuration', 'Backup setup'],
              deliverables: ['Production database', 'Database documentation', 'Backup procedures'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'env-vars', 
              name: 'Production Environment Variables', 
              status: 'completed', 
              priority: 'high', 
              assignee: 'DevOps Team',
              description: 'Configure production environment variables and secrets',
              dataSources: ['Environment variables', 'Secrets management', 'Configuration files', 'API keys'],
              implementation: 'Set up production environment variables with proper secrets management',
              dependencies: ['Secrets management', 'Environment configuration', 'Security setup'],
              deliverables: ['Environment configuration', 'Secrets management', 'Security documentation'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'load-balancing', 
              name: 'Traffic Load Balancing', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'DevOps Team',
              description: 'Implement load balancing for high traffic and availability',
              dataSources: ['Load balancer', 'Traffic management', 'Health checks', 'Scaling configuration'],
              implementation: 'Set up load balancing with health checks and automatic scaling',
              dependencies: ['Load balancer service', 'Health check setup', 'Scaling configuration'],
              deliverables: ['Load balancer setup', 'Scaling documentation', 'Performance monitoring'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'cdn-integration', 
              name: 'CDN Integration', 
              status: 'pending', 
              priority: 'low', 
              assignee: 'DevOps Team',
              description: 'Integrate Content Delivery Network for improved performance',
              dataSources: ['CDN service', 'Static assets', 'Caching configuration', 'Performance optimization'],
              implementation: 'Set up CDN for static assets and content delivery optimization',
              dependencies: ['CDN service', 'Asset optimization', 'Caching configuration'],
              deliverables: ['CDN setup', 'Performance optimization', 'Caching documentation'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'ssl-certificates', 
              name: 'SSL Certificate Setup', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'DevOps Team',
              description: 'Configure SSL certificates for secure HTTPS connections',
              dataSources: ['SSL certificates', 'Certificate authority', 'Security configuration', 'HTTPS setup'],
              implementation: 'Set up SSL certificates with automatic renewal and security configuration',
              dependencies: ['Certificate authority', 'SSL configuration', 'Security setup'],
              deliverables: ['SSL certificates', 'Security configuration', 'HTTPS documentation'],
              updateFrequency: 'As needed'
            },
            { 
              id: 'monitoring', 
              name: 'Performance Monitoring', 
              status: 'pending', 
              priority: 'medium', 
              assignee: 'DevOps Team',
              description: 'Implement comprehensive performance monitoring and alerting',
              dataSources: ['Monitoring tools', 'Performance metrics', 'Alerting systems', 'Logging'],
              implementation: 'Set up monitoring with performance metrics, alerting, and logging systems',
              dependencies: ['Monitoring platform', 'Metrics collection', 'Alerting configuration'],
              deliverables: ['Monitoring setup', 'Performance dashboards', 'Alerting documentation'],
              updateFrequency: 'As needed'
            }
          ]
        }
      ]
    }
  ];

  // Detailed source information mapping
  const sourceDetails = {
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
    },
    'Article Analysis': {
      level: 'Internal',
      category: 'Processing',
      function: 'AI content analysis',
      crawlFor: 'Article content, relevance scoring, categorization, sentiment analysis',
      frequency: 'Real-time',
      format: 'JSON',
      method: 'AI processing',
      priority: 'High',
      url: 'Internal processing',
      description: 'AI-powered analysis of collected articles for relevance, impact, and categorization.'
    },
    'Congress.gov API': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Bill tracking and legislative text',
      crawlFor: 'Bills, amendments, committee actions, voting records, hearings, law texts affecting SNF payment/staffing/quality',
      frequency: 'Real-time',
      format: 'JSON, XML, HTML',
      method: 'API polling',
      priority: 'High',
      url: 'congress.gov',
      description: 'Real-time tracking of federal legislation affecting skilled nursing facilities and post-acute care.'
    },
    'House Ways & Means': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Medicare/Medicaid oversight',
      crawlFor: 'SNF payment bills, committee markups, hearing transcripts, Medicare/Medicaid amendments',
      frequency: 'Real-time',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'High',
      url: 'congress.gov/committee/house-ways-and-means',
      description: 'Primary House committee with jurisdiction over Medicare/Medicaid policy and SNF payment legislation.'
    },
    'Senate Finance': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Medicare/Medicaid oversight',
      crawlFor: 'Senate healthcare legislation, hearing transcripts, committee reports, policy proposals',
      frequency: 'Real-time',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'High',
      url: 'congress.gov/committee/senate-finance',
      description: 'Primary Senate committee with jurisdiction over Medicare/Medicaid policy, companion to House Ways & Means.'
    },
    'CMS.gov - SNF PPS': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Payment policy',
      crawlFor: 'SNF payment rules (proposed & final), rate updates, market basket, wage index, PDPM changes',
      frequency: 'Weekly',
      format: 'HTML, PDF, RSS',
      method: 'RSS + Web scraping',
      priority: 'High',
      url: 'cms.gov/medicare/payment/prospective-payment-systems/skilled-nursing-facility-snf',
      description: 'CMS Skilled Nursing Facility Prospective Payment System updates, rate changes, and policy modifications.'
    },
    'Federal Register - SNF Rules': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Rulemaking',
      crawlFor: 'Proposed rules (~April 11), final rules (~July 31), comment periods, implementation dates, payment updates',
      frequency: 'Daily/Annual cycle',
      format: 'XML, PDF, HTML',
      method: 'API + RSS',
      priority: 'High',
      url: 'federalregister.gov',
      description: 'Federal Register publications for SNF payment rules, regulatory changes, and policy updates.'
    },
    'CMS.gov - QSO Memos': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Survey guidance',
      crawlFor: 'Quality/Safety/Oversight memos, surveyor guidance changes, implementation timelines, enforcement priorities',
      frequency: 'Monthly',
      format: 'PDF',
      method: 'PDF monitoring',
      priority: 'High',
      url: 'cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/policy-memos',
      description: 'CMS Quality, Safety & Oversight memos providing surveyor guidance and enforcement priorities.'
    },
    'State Medicaid Agency Websites': {
      level: 'State',
      category: 'Regulatory',
      function: 'Reimbursement policy',
      crawlFor: 'Official reimbursement rates, provider bulletins, fee schedules, State Plan Amendments (SPAs), emergency rate changes, policy memos',
      frequency: 'Weekly',
      format: 'PDF, HTML, Excel',
      method: 'Web scraping + Email monitoring',
      priority: 'High',
      url: 'Varies by state',
      description: 'State-specific Medicaid agency websites providing reimbursement rates and policy updates for nursing facilities.'
    },
    'CMS Recovery Audit Program (RAC)': {
      level: 'Federal',
      category: 'Enforcement',
      function: 'Payment integrity',
      crawlFor: 'RAC audit targets, quarterly findings, common denials, appeal statistics, provider guidance, focus areas (RUG errors, therapy necessity, 3-day stay, MDS)',
      frequency: 'Quarterly',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'cms.gov/data-research/monitoring-programs/medicare-fee-service-compliance-programs/recovery-audit-program',
      description: 'CMS Recovery Audit Contractor program monitoring payment integrity and identifying overpayments.'
    },
    'AI Processing': {
      level: 'Internal',
      category: 'Processing',
      function: 'AI content analysis',
      crawlFor: 'Article content, relevance scoring, categorization, sentiment analysis',
      frequency: 'Real-time',
      format: 'JSON',
      method: 'AI processing',
      priority: 'High',
      url: 'Internal processing',
      description: 'AI-powered analysis of collected articles for relevance, impact, and categorization.'
    },
    'Energy & Commerce': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Healthcare policy',
      crawlFor: 'Quality and safety legislation, enforcement policy changes, nursing home regulations',
      frequency: 'Real-time',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'congress.gov/committee/house-energy-and-commerce',
      description: 'House Energy and Commerce Committee handling healthcare policy and nursing home regulations.'
    },
    'Federal Budget Docs': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Appropriations & funding',
      crawlFor: 'CMS payment rules, Medicare Trustees Report, CBO reports, budget proposals',
      frequency: 'Annual (Feb-Sept)',
      format: 'PDF, HTML',
      method: 'Manual review',
      priority: 'Medium',
      url: 'Multiple sources',
      description: 'Federal budget documents including CMS payment rules and Medicare Trustees reports.'
    },
    'Top 10 States': {
      level: 'State',
      category: 'Legislative',
      function: 'Bill tracking',
      crawlFor: 'State bills, amendments, proposed laws affecting nursing facilities/Medicaid rates, committee hearings/reports, transcripts, status updates',
      frequency: 'Real-time (during session)',
      format: 'HTML, PDF',
      method: 'Web scraping + LegiScan API',
      priority: 'High (during session)',
      url: 'Varies by state',
      description: 'Priority monitoring of the top 10 states by SNF bed count for legislative activity.'
    },
    'LegiScan API': {
      level: 'State',
      category: 'Legislative',
      function: 'Multi-state bill tracking',
      crawlFor: 'State bills, amendments, proposed laws affecting nursing facilities/Medicaid rates, committee hearings/reports, transcripts, status updates',
      frequency: 'Real-time (during session)',
      format: 'HTML, PDF',
      method: 'Web scraping + LegiScan API',
      priority: 'High (during session)',
      url: 'legiscan.com',
      description: 'LegiScan API for multi-state legislative tracking across all 50 states.'
    },
    'State Committees': {
      level: 'State',
      category: 'Legislative',
      function: 'Healthcare oversight',
      crawlFor: 'Committee hearings, bill markups, testimony, legislative proposals, reform initiatives',
      frequency: 'Real-time (during session)',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'High (during session)',
      url: 'State legislature committee pages',
      description: 'State legislature health and welfare committees handling healthcare oversight.'
    },
    'Budget Documents': {
      level: 'State',
      category: 'Legislative',
      function: 'Fiscal policy',
      crawlFor: 'Medicaid appropriations, budget bills, fiscal impact statements, SNF rate updates, emergency funding',
      frequency: 'Annual (budget season)',
      format: 'PDF',
      method: 'PDF monitoring',
      priority: 'High (budget season)',
      url: 'State legislature fiscal offices',
      description: 'State budget documents and appropriations affecting Medicaid and SNF rates.'
    },
    'CMS.gov Main': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Payment policy',
      crawlFor: 'SNF payment rules (proposed & final), rate updates, market basket, wage index, PDPM changes',
      frequency: 'Weekly',
      format: 'HTML, PDF, RSS',
      method: 'RSS + Web scraping',
      priority: 'High',
      url: 'cms.gov/medicare/payment/prospective-payment-systems/skilled-nursing-facility-snf',
      description: 'CMS main website for SNF payment system updates and policy changes.'
    },
    'Federal Register': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Rulemaking',
      crawlFor: 'Proposed rules (~April 11), final rules (~July 31), comment periods, implementation dates, payment updates',
      frequency: 'Daily/Annual cycle',
      format: 'XML, PDF, HTML',
      method: 'API + RSS',
      priority: 'High',
      url: 'federalregister.gov',
      description: 'Federal Register publications for SNF payment rules, regulatory changes, and policy updates.'
    },
    'QSO Memos': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Survey guidance',
      crawlFor: 'Quality/Safety/Oversight memos, surveyor guidance changes, implementation timelines, enforcement priorities',
      frequency: 'Monthly',
      format: 'PDF',
      method: 'PDF monitoring',
      priority: 'High',
      url: 'cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/policy-memos',
      description: 'CMS Quality, Safety & Oversight memos providing surveyor guidance and enforcement priorities.'
    },
    'State Operations Manual': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Survey standards',
      crawlFor: 'F-tag interpretive guidelines, surveyor guidance, compliance requirements, regulatory interpretations',
      frequency: 'Quarterly',
      format: 'PDF',
      method: 'PDF monitoring',
      priority: 'High',
      url: 'cms.gov/files/document/appendix-pp-state-operations-manual.pdf',
      description: 'CMS State Operations Manual providing surveyor guidance and compliance requirements.'
    },
    'Regulations.gov': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Public comment tracking',
      crawlFor: 'Regulatory dockets, public comments, comment deadlines, agency responses, final decisions',
      frequency: 'Real-time',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'regulations.gov',
      description: 'Regulations.gov for tracking public comments and regulatory dockets.'
    },
    'MAC Websites': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Regional guidance',
      crawlFor: 'SNF billing bulletins, coding updates, appeals guidance, regional audit notices, claims processing changes',
      frequency: 'Monthly-Quarterly',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'Varies by region (e.g., med.noridianmedicare.com)',
      description: 'Medicare Administrative Contractor websites providing regional billing guidance.'
    },
    'State Medicaid Agencies': {
      level: 'State',
      category: 'Regulatory',
      function: 'Reimbursement policy',
      crawlFor: 'Official reimbursement rates, provider bulletins, fee schedules, State Plan Amendments (SPAs), emergency rate changes, policy memos',
      frequency: 'Weekly',
      format: 'PDF, HTML, Excel',
      method: 'Web scraping + Email monitoring',
      priority: 'High',
      url: 'Varies by state',
      description: 'State-specific Medicaid agency websites providing reimbursement rates and policy updates.'
    },
    'State Health Departments': {
      level: 'State',
      category: 'Regulatory',
      function: 'Facility inspection',
      crawlFor: 'Survey/enforcement priorities, deficiency reports, sanctions, enforcement actions, inspection guidance, corrective action requirements',
      frequency: 'Monthly',
      format: 'PDF, HTML',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'State health department long-term care divisions',
      description: 'State health department long-term care divisions handling facility inspections.'
    },
    'Provider Bulletins': {
      level: 'State',
      category: 'Regulatory',
      function: 'Policy updates',
      crawlFor: 'Email bulletins, RSS feeds, urgent announcements, rate changes, compliance updates, operational policies',
      frequency: 'As published',
      format: 'Email, RSS, HTML',
      method: 'Email subscriptions + RSS',
      priority: 'High',
      url: 'State Medicaid agency news pages',
      description: 'State provider bulletins and alerts for policy updates and rate changes.'
    },
    'State Plan Amendments': {
      level: 'State',
      category: 'Regulatory',
      function: 'Policy changes',
      crawlFor: 'State Plan Amendments, rate changes, policy modifications, federal approval process',
      frequency: 'As submitted',
      format: 'PDF',
      method: 'PDF monitoring',
      priority: 'Medium',
      url: 'medicaid.gov/medicaid/spa/downloads/',
      description: 'State Plan Amendments for policy changes and rate modifications.'
    },
    'RAC Program': {
      level: 'Federal',
      category: 'Enforcement',
      function: 'Payment integrity',
      crawlFor: 'RAC audit targets, quarterly findings, common denials, appeal statistics, provider guidance, focus areas (RUG errors, therapy necessity, 3-day stay, MDS)',
      frequency: 'Quarterly',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'cms.gov/data-research/monitoring-programs/medicare-fee-service-compliance-programs/recovery-audit-program',
      description: 'CMS Recovery Audit Contractor program monitoring payment integrity and identifying overpayments.'
    },
    'OIG Reports': {
      level: 'Federal',
      category: 'Enforcement',
      function: 'Fraud & compliance',
      crawlFor: 'Work Plan, audit reports, fraud alerts, special investigations, compliance guidance, SNF-specific findings',
      frequency: 'Quarterly (Work Plan: Annual)',
      format: 'PDF, HTML',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'oig.hhs.gov',
      description: 'Office of Inspector General reports on fraud, compliance, and audit findings.'
    },
    'Care Compare Data': {
      level: 'Federal',
      category: 'Oversight',
      function: 'Quality transparency',
      crawlFor: 'Star ratings, health inspections, staffing levels, quality measures, facility comparisons',
      frequency: 'Monthly',
      format: 'CSV, JSON, HTML',
      method: 'API',
      priority: 'Low',
      url: 'medicare.gov/care-compare/',
      description: 'CMS Nursing Home Compare data for quality ratings and facility comparisons.'
    },
    'State Survey Results': {
      level: 'State',
      category: 'Enforcement',
      function: 'Facility inspection',
      crawlFor: 'Survey/enforcement priorities, deficiency reports, sanctions, enforcement actions, inspection guidance, corrective action requirements',
      frequency: 'Monthly',
      format: 'PDF, HTML',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'State health department long-term care divisions',
      description: 'State survey results and enforcement actions for nursing facilities.'
    },
    'CMS Facilities': {
      level: 'Federal',
      category: 'Oversight',
      function: 'Facility data',
      crawlFor: 'Provider characteristics, facility data, certification status, ownership information',
      frequency: 'Monthly',
      format: 'CSV, JSON',
      method: 'API',
      priority: 'High',
      url: 'data.cms.gov/provider-data/search?theme=Nursing+homes',
      description: 'CMS Nursing Home Compare facility data including characteristics and certification status.'
    },
    'CMS Deficiencies': {
      level: 'Federal',
      category: 'Oversight',
      function: 'Quality data',
      crawlFor: 'Deficiency citations, scope and severity, correction plans, enforcement actions',
      frequency: 'Monthly',
      format: 'CSV, JSON',
      method: 'API',
      priority: 'High',
      url: 'data.cms.gov/provider-data/search?theme=Nursing+homes',
      description: 'CMS deficiency data including citations and enforcement actions.'
    },
    'CMS Care Compare': {
      level: 'Federal',
      category: 'Oversight',
      function: 'Quality metrics',
      crawlFor: 'Star ratings, health inspections, staffing levels, quality measures, facility comparisons',
      frequency: 'Monthly',
      format: 'CSV, JSON, HTML',
      method: 'API',
      priority: 'High',
      url: 'medicare.gov/care-compare/',
      description: 'CMS Care Compare quality metrics and star ratings for nursing facilities.'
    },
    'BLS Wages': {
      level: 'Federal',
      category: 'Financial',
      function: 'Wage data',
      crawlFor: 'RN, LPN, CNA wage data by state, occupational employment statistics',
      frequency: 'Annual',
      format: 'JSON',
      method: 'API',
      priority: 'Medium',
      url: 'api.bls.gov/publicAPI/v2/timeseries/data/',
      description: 'Bureau of Labor Statistics wage data for healthcare workers by state.'
    },
    'Census Demographics': {
      level: 'Federal',
      category: 'Demographics',
      function: 'Population data',
      crawlFor: 'Population by age group, demographic characteristics, state and county data',
      frequency: 'Annual',
      format: 'JSON',
      method: 'API',
      priority: 'Medium',
      url: 'api.census.gov/data',
      description: 'Census demographic data including population by age group for states and counties.'
    },
    'County Demographics': {
      level: 'Federal',
      category: 'Demographics',
      function: 'County population data',
      crawlFor: 'Population by age group, demographic characteristics, county-level data',
      frequency: 'Annual',
      format: 'JSON',
      method: 'API',
      priority: 'Medium',
      url: 'api.census.gov/data',
      description: 'Census county-level demographic data including population by age group.'
    }
  };

  const dataSources = [
    {
      category: 'News & Analysis',
      icon: '📰',
      sources: [
        { name: 'RSS Feeds', count: 9, status: 'active', lastUpdate: '2025-10-16' },
        { name: 'Article Analysis', count: 1461, status: 'active', lastUpdate: '2025-10-16' },
        { name: 'AI Processing', count: 'Active', status: 'limited', lastUpdate: '2025-10-16' }
      ]
    },
    {
      category: 'Federal Legislative',
      icon: '🏛️',
      sources: [
        { name: 'Congress.gov API', count: 'Real-time', status: 'active', lastUpdate: '2025-10-16' },
        { name: 'House Ways & Means', count: 'Committee', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Senate Finance', count: 'Committee', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Energy & Commerce', count: 'Committee', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Federal Budget Docs', count: 'Annual', status: 'pending', lastUpdate: 'TBD' }
      ]
    },
    {
      category: 'State Legislative',
      icon: '🏛️',
      sources: [
        { name: 'Top 10 States', count: 'Priority', status: 'pending', lastUpdate: 'TBD' },
        { name: 'LegiScan API', count: 'Multi-state', status: 'pending', lastUpdate: 'TBD' },
        { name: 'State Committees', count: '50 states', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Budget Documents', count: 'Annual', status: 'pending', lastUpdate: 'TBD' }
      ]
    },
    {
      category: 'Federal Regulatory',
      icon: '📋',
      sources: [
        { name: 'CMS.gov Main', count: 'Weekly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Federal Register', count: 'Daily', status: 'pending', lastUpdate: 'TBD' },
        { name: 'QSO Memos', count: 'Monthly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'State Operations Manual', count: 'Quarterly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Regulations.gov', count: 'Real-time', status: 'pending', lastUpdate: 'TBD' },
        { name: 'MAC Websites', count: 'Monthly', status: 'pending', lastUpdate: 'TBD' }
      ]
    },
    {
      category: 'State Regulatory',
      icon: '📋',
      sources: [
        { name: 'State Medicaid Agencies', count: '50 states', status: 'pending', lastUpdate: 'TBD' },
        { name: 'State Health Departments', count: '50 states', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Provider Bulletins', count: 'Real-time', status: 'pending', lastUpdate: 'TBD' },
        { name: 'State Plan Amendments', count: 'As needed', status: 'pending', lastUpdate: 'TBD' }
      ]
    },
    {
      category: 'Enforcement & Oversight',
      icon: '🔍',
      sources: [
        { name: 'RAC Program', count: 'Quarterly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'OIG Reports', count: 'Quarterly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Care Compare Data', count: 'Monthly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'State Survey Results', count: 'Monthly', status: 'pending', lastUpdate: 'TBD' }
      ]
    },
    {
      category: 'Market & Operations',
      icon: '🏢',
      sources: [
        { name: 'CMS Facilities', count: 15000, status: 'active', lastUpdate: '2025-10-15' },
        { name: 'CMS Deficiencies', count: 500000, status: 'active', lastUpdate: '2025-10-15' },
        { name: 'CMS Care Compare', count: 15000, status: 'active', lastUpdate: '2025-10-15' }
      ]
    },
    {
      category: 'Financial & Reimbursement',
      icon: '💰',
      sources: [
        { name: 'BLS Wages', count: 200, status: 'active', lastUpdate: '2025-10-13' },
        { name: 'Census Demographics', count: 3000, status: 'active', lastUpdate: '2025-10-14' },
        { name: 'County Demographics', count: 3000, status: 'active', lastUpdate: '2025-10-14' }
      ]
    }
  ];

  const developmentTasks = [
    { id: 1, title: 'Create API endpoints for CMS data', status: 'pending', priority: 'high', category: 'Backend' },
    { id: 2, title: 'Create API endpoints for Census data', status: 'pending', priority: 'high', category: 'Backend' },
    { id: 3, title: 'Create API endpoints for BLS data', status: 'pending', priority: 'high', category: 'Backend' },
    { id: 4, title: 'Build CMS facilities dashboard', status: 'pending', priority: 'high', category: 'Frontend' },
    { id: 5, title: 'Build demographics dashboard', status: 'pending', priority: 'high', category: 'Frontend' },
    { id: 6, title: 'Build wage analysis dashboard', status: 'pending', priority: 'high', category: 'Frontend' },
    { id: 7, title: 'Implement Federal Register monitoring', status: 'pending', priority: 'high', category: 'Data' },
    { id: 8, title: 'Implement Congress.gov API integration', status: 'pending', priority: 'high', category: 'Data' },
    { id: 9, title: 'Implement QSO Memos monitoring', status: 'pending', priority: 'high', category: 'Data' },
    { id: 10, title: 'Implement State Medicaid monitoring', status: 'pending', priority: 'high', category: 'Data' },
    { id: 11, title: 'Implement RAC Program monitoring', status: 'pending', priority: 'medium', category: 'Data' },
    { id: 12, title: 'Implement OIG Reports monitoring', status: 'pending', priority: 'medium', category: 'Data' },
    { id: 13, title: 'Implement MAC Websites monitoring', status: 'pending', priority: 'medium', category: 'Data' },
    { id: 14, title: 'Implement State Operations Manual monitoring', status: 'pending', priority: 'medium', category: 'Data' },
    { id: 15, title: 'Create regulatory intelligence dashboard', status: 'pending', priority: 'medium', category: 'Frontend' },
    { id: 16, title: 'Create enforcement tracking dashboard', status: 'pending', priority: 'medium', category: 'Frontend' },
    { id: 17, title: 'Add user management features', status: 'pending', priority: 'low', category: 'Frontend' }
  ];

  const getIssueIcon = (type) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '📝';
    }
  };

  // Early return for team dashboard view
  if (viewMode === 'team') {
    return <TeamDashboard taskCompletion={taskCompletion} />;
  }

  return (
    <div className="excel-tracker">
      <div className="tracker-header">
        <h1>📊 SNF News Aggregator - Project Tracker</h1>
        <div className="header-controls">
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 size={16} />
              Task Grid View
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'team' ? 'active' : ''}`}
              onClick={() => setViewMode('team')}
            >
              <Users size={16} />
              Team Dashboard
            </button>
          </div>
          <div className="project-stats">
            <span>Total: {projectStats.totalTasks}</span>
            <span>Completed: {projectStats.completedTasks}</span>
            <span>In Progress: {projectStats.inProgressTasks}</span>
            <span>Pending: {projectStats.pendingTasks}</span>
            <span>Complete: {Math.round((projectStats.completedTasks / projectStats.totalTasks) * 100) || 0}%</span>
          </div>
        </div>
      </div>

      <div className="spreadsheet-container">
        <div className="spreadsheet-header">
          <div className="col-category">Category</div>
          <div className="col-subcategory">Subcategory</div>
          <div className="col-task">Task</div>
          <div className="col-assigned-to">Assigned To</div>
          <div className="col-due-date">Due Date</div>
          <div className="col-status">Status</div>
          <div className="col-priority">Priority</div>
          <div className="col-assignee">Assignee</div>
          <div className="col-progress">Progress</div>
          <div className="col-actions">Actions</div>
      </div>

        <div className="spreadsheet-body">
          {projectData.map((category) => (
            <React.Fragment key={category.id}>
              {/* Category Row */}
              <div 
                className="spreadsheet-row category-row"
                onClick={() => toggleCategory(category.id)}
                style={{ borderLeftColor: category.color }}
              >
                <div className="col-category">
                  <div className="category-info">
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.name}</span>
                    {expandedCategories[category.id] ? (
                      <ChevronDown className="expand-icon" />
                    ) : (
                      <ChevronRight className="expand-icon" />
                    )}
              </div>
              </div>
                <div className="col-subcategory">
                  {(() => {
                    let totalTasks = 0;
                    let completedTasks = 0;
                    category.subcategories.forEach(subcategory => {
                      subcategory.tasks.forEach(task => {
                        totalTasks++;
                        const taskId = `${category.id}-${subcategory.id}-${task.id}`;
                        if (taskCompletion[taskId]) completedTasks++;
                      });
                    });
                    return `${completedTasks}/${totalTasks} tasks`;
                  })()}
              </div>
                <div className="col-task">-</div>
                <div className="col-assigned-to">-</div>
                <div className="col-due-date">-</div>
                <div className="col-status">-</div>
                <div className="col-priority">-</div>
                <div className="col-assignee">-</div>
                <div className="col-progress">
                  {(() => {
                    let totalTasks = 0;
                    let completedTasks = 0;
                    category.subcategories.forEach(subcategory => {
                      subcategory.tasks.forEach(task => {
                        totalTasks++;
                        const taskId = `${category.id}-${subcategory.id}-${task.id}`;
                        if (taskCompletion[taskId]) completedTasks++;
                      });
                    });
                    return Math.round((completedTasks / totalTasks) * 100) || 0;
                  })()}%
              </div>
                <div className="col-actions">-</div>
            </div>

              {/* Subcategory and Task Rows */}
              {expandedCategories[category.id] && category.subcategories.map((subcategory) => (
                <React.Fragment key={subcategory.id}>
                      {/* Subcategory Row */}
                      <div 
                        className="spreadsheet-row subcategory-row"
                        onClick={() => toggleSubcategory(category.id, subcategory.id)}
                      >
                        <div className="col-category">↳</div>
                        <div className="col-subcategory">
                          <div className="subcategory-info">
                            {expandedSubcategories[`${category.id}-${subcategory.id}`] ? (
                              <ChevronDown className="expand-icon" />
                            ) : (
                              <ChevronRight className="expand-icon" />
                            )}
                            <span className="subcategory-name">{subcategory.name}</span>
                            {(() => {
                              let totalTasks = 0;
                              let completedTasks = 0;
                              subcategory.tasks.forEach(task => {
                                totalTasks++;
                                const taskId = `${category.id}-${subcategory.id}-${task.id}`;
                                const completionData = taskCompletion[taskId];
                                if (completionData && completionData.completed) completedTasks++;
                              });
                              return `(${completedTasks}/${totalTasks})`;
                            })()}
                  </div>
                </div>
                    <div className="col-task">-</div>
                    <div className="col-assigned-to">-</div>
                    <div className="col-due-date">-</div>
                    <div className="col-status">-</div>
                    <div className="col-priority">-</div>
                    <div className="col-assignee">-</div>
                    <div className="col-progress">
                      {(() => {
                        let totalTasks = 0;
                        let completedTasks = 0;
                        subcategory.tasks.forEach(task => {
                          totalTasks++;
                          const taskId = `${category.id}-${subcategory.id}-${task.id}`;
                          if (taskCompletion[taskId]) completedTasks++;
                        });
                        return Math.round((completedTasks / totalTasks) * 100) || 0;
                      })()}%
                  </div>
                    <div className="col-actions">-</div>
                </div>

                      {/* Task Rows - Only show when subcategory is expanded */}
                      {expandedSubcategories[`${category.id}-${subcategory.id}`] && subcategory.tasks.map((task) => {
                        const taskId = `${category.id}-${subcategory.id}-${task.id}`;
                        const completionData = taskCompletion[taskId];
                        const isCompleted = completionData && completionData.completed;
                        const isExpanded = expandedTasks[taskId];
                        const currentStatus = getTaskStatus(task, category.id, subcategory.id, task.id);
                        
                        return (
                          <React.Fragment key={task.id}>
                            <div 
                              className={`spreadsheet-row task-row ${isCompleted ? 'completed' : ''}`}
                              onClick={() => toggleTaskDetails(category.id, subcategory.id, task.id)}
                            >
                          <div className="col-category">↳↳</div>
                          <div className="col-subcategory">-</div>
                          <div className="col-task">
                            <div className="task-info">
                              <div 
                                className="checkbox-container"
                                onClick={(e) => handleCheckboxClick(category.id, subcategory.id, task.id, e)}
                              >
                                {isCompleted ? (
                                  <CheckSquare className="checkbox-icon completed" />
                                ) : (
                                  <Square className="checkbox-icon" />
                                )}
                  </div>
                              <span className="task-name">{task.name}</span>
                              {isCompleted && completionData && (
                                <div className="completion-info">
                                  <small className="completion-details">
                                    ✓ Completed by {completionData.completedBy} on {new Date(completionData.completedAt).toLocaleDateString()}
                                  </small>
                </div>
                              )}
                  </div>
                </div>
                          <div className="col-assigned-to">
                            <select
                              value={getAssignedTo(category.id, subcategory.id, task.id)}
                              onChange={(e) => handleAssignedToChange(category.id, subcategory.id, task.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="assigned-to-select"
                            >
                              <option value="Unassigned">Unassigned</option>
                              <option value="Nikhil">Nikhil</option>
                              <option value="Manish">Manish</option>
                              <option value="Rahul">Rahul</option>
                              <option value="Manoj">Manoj</option>
                              <option value="Vijendra">Vijendra</option>
                              <option value="Mayank">Mayank</option>
                              <option value="Ashish">Ashish</option>
                              <option value="Bhupender">Bhupender</option>
                              <option value="Bhuwan">Bhuwan</option>
                              <option value="Anuj">Anuj</option>
                              <option value="Shubham">Shubham</option>
                              <option value="Chirag">Chirag</option>
                            </select>
                          </div>
                          <div className={`col-due-date due-date-${getDueDateUrgency(category.id, subcategory.id, task.id, currentStatus)}`}>
                            <input
                              type="date"
                              value={getDueDate(category.id, subcategory.id, task.id) || ''}
                              onChange={(e) => handleDueDateChange(category.id, subcategory.id, task.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="due-date-input"
                            />
                          </div>
                          <div className="col-status">
                            <div className="status-cell">
                              {getStatusIcon(currentStatus)}
                              <span className="status-text">{currentStatus}</span>
                  </div>
                </div>
                          <div className="col-priority">
                            <span 
                              className="priority-badge"
                              style={{ backgroundColor: getPriorityColor(task.priority) + '20', color: getPriorityColor(task.priority) }}
                            >
                              {task.priority}
                            </span>
              </div>
                          <div className="col-assignee">{task.assignee}</div>
                          <div className="col-progress">
                  <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ 
                                  width: isCompleted ? '100%' : (currentStatus === 'in-progress' ? '50%' : '0%'),
                                  backgroundColor: isCompleted ? '#10b981' : (currentStatus === 'in-progress' ? '#3b82f6' : '#e5e7eb')
                                }}
                              />
            </div>
          </div>
                          <div className="col-actions">
                            <button 
                              className="details-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskDetails(category.id, subcategory.id, task.id);
                              }}
                            >
                              {isExpanded ? <ChevronDown className="expand-icon" /> : <ChevronRight className="expand-icon" />}
                            </button>
                      </div>
                          </div>

                        {/* Task Details Row */}
                        {isExpanded && (
                          <div className="spreadsheet-row details-row">
                            <div className="col-category">↳↳↳</div>
                            <div className="col-subcategory">-</div>
                            <div className="col-task details-content" colSpan="6">
                              <div className="task-details">
                          <div className="detail-grid">
                            <div className="detail-item">
                                    <strong>📋 Description:</strong>
                                    <p>{task.description}</p>
                            </div>
                                  
                                  {task.formula && (
                            <div className="detail-item">
                                      <strong>🧮 Formula:</strong>
                                      <code className="formula-code">{task.formula}</code>
                            </div>
                                  )}

                            <div className="detail-item">
                                    <strong>📊 Data Sources:</strong>
                                    <div className="tag-list">
                                      {task.dataSources?.map((source, index) => (
                                        <span key={index} className="data-source-tag">{source}</span>
                                      ))}
                            </div>
                            </div>

                            <div className="detail-item">
                                    <strong>⚙️ Implementation:</strong>
                                    <p>{task.implementation}</p>
                            </div>

                                  {task.dependencies && (
                            <div className="detail-item">
                                      <strong>🔗 Dependencies:</strong>
                                      <div className="tag-list">
                                        {task.dependencies.map((dep, index) => (
                                          <span key={index} className="dependency-tag">{dep}</span>
                                        ))}
                            </div>
          </div>
        )}

                                  {task.deliverables && (
                            <div className="detail-item">
                                      <strong>📦 Deliverables:</strong>
                                      <div className="tag-list">
                                        {task.deliverables.map((deliverable, index) => (
                                          <span key={index} className="deliverable-tag">{deliverable}</span>
                                        ))}
                            </div>
          </div>
        )}

                                  {task.updateFrequency && (
                            <div className="detail-item">
                                      <strong>⏰ Update Frequency:</strong>
                                      <span className="frequency-tag">{task.updateFrequency}</span>
                            </div>
                                  )}
                          </div>
                          </div>
                        </div>
                    </div>
        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </React.Fragment>
                  ))}
                </div>
              </div>

          {/* Task Completion Dialog */}
          {showCompletionDialog && (
            <div className="completion-dialog-overlay">
              <div className="completion-dialog">
                <h3>Complete Task</h3>
                <p>Please enter your name to confirm task completion:</p>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="user-name-input"
                  autoFocus
                />
                <div className="dialog-buttons">
                <button 
                    onClick={cancelTaskCompletion}
                    className="cancel-btn"
                >
                    Cancel
                </button>
                  <button 
                    onClick={confirmTaskCompletion}
                    className="confirm-btn"
                  >
                    Complete Task
                  </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ProjectTracker;
