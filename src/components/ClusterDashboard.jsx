import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Clock, AlertCircle, Target, TrendingUp, Grid3X3, Users } from 'lucide-react';
import './ClusterDashboard.css';

const ClusterDashboard = ({ onViewChange }) => {
  const [clusters, setClusters] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expandedClusters, setExpandedClusters] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load clusters
      const clustersResponse = await fetch('http://localhost:3001/api/clusters');
      const clustersData = await clustersResponse.json();
      setClusters(clustersData);

      // Load tasks
      const tasksResponse = await fetch('http://localhost:3001/api/tasks');
      const tasksData = await tasksResponse.json();
      setTasks(tasksData);

      // Auto-expand first cluster
      if (clustersData.length > 0) {
        setExpandedClusters({ [clustersData[0].cluster_id]: true });
      }
    } catch (error) {
      console.error('Error loading cluster data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCluster = (clusterId) => {
    setExpandedClusters(prev => ({
      ...prev,
      [clusterId]: !prev[clusterId]
    }));
  };

  const getTasksForCluster = (clusterId) => {
    return tasks.filter(task => task.cluster_id === clusterId);
  };

  const getClusterStats = (clusterId) => {
    const clusterTasks = getTasksForCluster(clusterId);
    const total = clusterTasks.length;
    const completed = clusterTasks.filter(t => t.status === 'Complete').length;
    const inProgress = clusterTasks.filter(t => t.status === 'In Progress').length;
    const pending = clusterTasks.filter(t => t.status === 'Not Started').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, inProgress, pending, progress };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Complete':
        return <CheckCircle className="status-icon completed" size={16} />;
      case 'In Progress':
        return <Clock className="status-icon in-progress" size={16} />;
      case 'Not Started':
        return <Circle className="status-icon pending" size={16} />;
      default:
        return <Circle className="status-icon" size={16} />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Complete':
        return <span className="status-badge completed">Complete</span>;
      case 'In Progress':
        return <span className="status-badge in-progress">In Progress</span>;
      case 'Not Started':
        return <span className="status-badge pending">Not Started</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="cluster-dashboard">
        <div className="dashboard-header">
          <h1>Loading Cluster Dashboard...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="cluster-dashboard">
      <div className="dashboard-header">
        <div className="header-top">
          <div className="header-title">
            <Target size={24} />
            <h1>Development Roadmap - Cluster View</h1>
          </div>
          <div className="view-toggle">
            <button 
              className="toggle-btn"
              onClick={() => onViewChange('grid')}
            >
              <Grid3X3 size={16} />
              Task Grid View
            </button>
            <button 
              className="toggle-btn"
              onClick={() => onViewChange('team')}
            >
              <Users size={16} />
              Team Dashboard
            </button>
            <button 
              className="toggle-btn active"
            >
              <Target size={16} />
              Cluster View
            </button>
          </div>
        </div>
        <p className="header-subtitle">
          Tasks organized by development clusters with dependency relationships
        </p>
      </div>

      <div className="clusters-container">
        {clusters.map(cluster => {
          const stats = getClusterStats(cluster.cluster_id);
          const clusterTasks = getTasksForCluster(cluster.cluster_id);
          const isExpanded = expandedClusters[cluster.cluster_id];

          return (
            <div key={cluster.cluster_id} className="cluster-card">
              <div 
                className="cluster-header"
                onClick={() => toggleCluster(cluster.cluster_id)}
              >
                <div className="cluster-title-section">
                  {isExpanded ? (
                    <ChevronDown className="expand-icon" size={20} />
                  ) : (
                    <ChevronRight className="expand-icon" size={20} />
                  )}
                  <div className="cluster-info">
                    <h2 className="cluster-name">
                      {cluster.cluster_name}
                    </h2>
                    <span className="cluster-order">Order: {cluster.cluster_order}</span>
                  </div>
                </div>

                <div className="cluster-stats">
                  <div className="stat-item">
                    <Target size={16} />
                    <span>{stats.total} tasks</span>
                  </div>
                  <div className="stat-item completed">
                    <CheckCircle size={16} />
                    <span>{stats.completed} done</span>
                  </div>
                  <div className="stat-item">
                    <TrendingUp size={16} />
                    <span>{stats.progress}%</span>
                  </div>
                </div>

                <div className="progress-bar-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${stats.progress}%` }}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="cluster-content">
                  <div className="cluster-description">
                    <p><strong>Description:</strong> {cluster.description}</p>
                    <p><strong>Completion Criteria:</strong> {cluster.completion_criteria}</p>
                  </div>

                  <div className="tasks-section">
                    <h3>Tasks ({clusterTasks.length})</h3>
                    
                    {clusterTasks.length === 0 ? (
                      <div className="no-tasks">No tasks assigned to this cluster</div>
                    ) : (
                      <div className="tasks-list">
                        {clusterTasks.map(task => (
                          <div key={task.id} className="task-row">
                            <div className="task-checkbox">
                              {getStatusIcon(task.status)}
                            </div>
                            <div className="task-info">
                              <div className="task-name">{task.name}</div>
                              {task.description && (
                                <div className="task-description">{task.description}</div>
                              )}
                            </div>
                            <div className="task-meta">
                              {getStatusBadge(task.status)}
                              {task.priority && (
                                <span className={`priority-badge ${task.priority?.toLowerCase()}`}>
                                  {task.priority}
                                </span>
                              )}
                              {task.category_id && (
                                <span className="category-badge">{task.category_id}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="dashboard-footer">
        <div className="footer-stats">
          <div className="footer-stat">
            <span className="stat-label">Total Clusters:</span>
            <span className="stat-value">{clusters.length}</span>
          </div>
          <div className="footer-stat">
            <span className="stat-label">Total Tasks:</span>
            <span className="stat-value">{tasks.length}</span>
          </div>
          <div className="footer-stat">
            <span className="stat-label">Completed Tasks:</span>
            <span className="stat-value">
              {tasks.filter(t => t.status === 'Complete').length}
            </span>
          </div>
          <div className="footer-stat">
            <span className="stat-label">Overall Progress:</span>
            <span className="stat-value">
              {tasks.length > 0 
                ? Math.round((tasks.filter(t => t.status === 'Complete').length / tasks.length) * 100)
                : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterDashboard;

