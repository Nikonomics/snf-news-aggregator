import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Clock, AlertCircle, Target, TrendingUp, Grid3X3, Users, ArrowUpDown, Search, Filter, Download, Plus, Eye, EyeOff } from 'lucide-react';
import './ClusterDashboard.css';
import apiConfig from '../config/api.js';

const ClusterDashboard = ({ onViewChange, taskCompletion, onTaskCompletionChange, onClusterSelect, selectedClusterId, selectedTaskId }) => {
  const [clusters, setClusters] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expandedClusters, setExpandedClusters] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'cluster_order', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [showClusterDetails, setShowClusterDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-expand and scroll to selected cluster
  useEffect(() => {
    if (selectedClusterId) {
      setExpandedClusters(prev => ({ ...prev, [selectedClusterId]: true }));
      // Scroll to the selected cluster after a short delay
      setTimeout(() => {
        const element = document.querySelector(`[data-cluster-id="${selectedClusterId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [selectedClusterId]);

  const loadData = async () => {
    try {
      // Load clusters
      const clustersResponse = await fetch(apiConfig.endpoints.clusters);
      const clustersData = await clustersResponse.json();
      setClusters(clustersData);

      // Load tasks
      const tasksResponse = await fetch(apiConfig.endpoints.tasks);
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

  // Sort clusters
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedClusters = [...clusters].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter clusters by search query
  const filteredClusters = sortedClusters.filter(cluster => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cluster.cluster_name.toLowerCase().includes(query) ||
      cluster.description?.toLowerCase().includes(query) ||
      cluster.status?.toLowerCase().includes(query)
    );
  });

  // View cluster details
  const viewClusterDetails = (cluster) => {
    setSelectedCluster(cluster);
    setShowClusterDetails(true);
  };

  const handleTaskToggle = (task) => {
    // Create a task key similar to ProjectTracker
    const taskKey = `${task.category_id}-${task.subcategory_id || 'unknown'}-${task.id}`;
    
    // Toggle completion status
    const newStatus = task.status === 'Complete' ? 'Not Started' : 'Complete';
    
    // Update task in local state
    setTasks(prevTasks => 
      prevTasks.map(t => 
        t.id === task.id ? { ...t, status: newStatus } : t
      )
    );
    
    // Notify parent component if callback exists
    if (onTaskCompletionChange) {
      onTaskCompletionChange(taskKey, newStatus === 'Complete');
    }
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
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-top">
          <div className="header-title">
            <Target size={24} />
            <h1>Development Roadmap - Cluster Database</h1>
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
              Cluster Database
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search clusters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="toolbar-btn">
            <Filter size={16} />
            Filter
          </button>
        </div>
        <div className="toolbar-right">
          <button className="toolbar-btn">
            <Download size={16} />
            Export
          </button>
          <button className="toolbar-btn primary">
            <Plus size={16} />
            Add Cluster
          </button>
        </div>
      </div>

      {/* Database Table */}
      <div className="database-table-container">
        <table className="database-table">
          <thead>
            <tr>
              <th className="col-order" onClick={() => handleSort('cluster_order')}>
                <div className="th-content">
                  <span>Order</span>
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="col-name" onClick={() => handleSort('cluster_name')}>
                <div className="th-content">
                  <span>Cluster Name</span>
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="col-status" onClick={() => handleSort('status')}>
                <div className="th-content">
                  <span>Status</span>
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="col-tasks">
                <div className="th-content">
                  <span>Tasks</span>
                </div>
              </th>
              <th className="col-completed">
                <div className="th-content">
                  <span>Completed</span>
                </div>
              </th>
              <th className="col-progress">
                <div className="th-content">
                  <span>Progress</span>
                </div>
              </th>
              <th className="col-actions">
                <div className="th-content">
                  <span>Actions</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredClusters.map(cluster => {
              const stats = getClusterStats(cluster.cluster_id);
              const isExpanded = expandedClusters[cluster.cluster_id];
              
              return (
                <React.Fragment key={cluster.cluster_id}>
                  <tr 
                    className={`cluster-row ${selectedClusterId === cluster.cluster_id ? 'selected-cluster' : ''}`}
                    onClick={() => toggleCluster(cluster.cluster_id)}
                    data-cluster-id={cluster.cluster_id}
                  >
                    <td className="col-order">
                      <div className="cell-content">
                        <span className="order-badge">#{cluster.cluster_order}</span>
                      </div>
                    </td>
                    <td className="col-name">
                      <div className="cell-content">
                        <div className="cluster-name-cell">
                          {isExpanded ? (
                            <ChevronDown size={16} className="expand-icon" />
                          ) : (
                            <ChevronRight size={16} className="expand-icon" />
                          )}
                          <span className="cluster-name-text">{cluster.cluster_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="col-status">
                      <div className="cell-content">
                        {getStatusBadge(cluster.status)}
                      </div>
                    </td>
                    <td className="col-tasks">
                      <div className="cell-content">
                        <span className="stat-value">{stats.total}</span>
                      </div>
                    </td>
                    <td className="col-completed">
                      <div className="cell-content">
                        <span className="stat-value completed">{stats.completed}</span>
                      </div>
                    </td>
                    <td className="col-progress">
                      <div className="cell-content">
                        <div className="progress-cell">
                          <div className="progress-bar-mini">
                            <div 
                              className="progress-bar-fill" 
                              style={{ width: `${stats.progress}%` }}
                            />
                          </div>
                          <span className="progress-text">{stats.progress}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="col-actions">
                      <div className="cell-content">
                        <button 
                          className="icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewClusterDetails(cluster);
                          }}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          className="icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onClusterSelect) {
                              onClusterSelect(cluster.cluster_id);
                            }
                          }}
                          title="View in Grid"
                        >
                          <Grid3X3 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Tasks */}
                  {isExpanded && (
                    <tr className="expanded-row">
                      <td colSpan="7">
                        <div className="expanded-content">
                          <div className="cluster-info-section">
                            <div className="info-row">
                              <span className="info-label">Description:</span>
                              <span className="info-value">{cluster.description}</span>
                            </div>
                            {cluster.completion_criteria && (
                              <div className="info-row">
                                <span className="info-label">Completion Criteria:</span>
                                <span className="info-value">{cluster.completion_criteria}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="tasks-table-section">
                            <h4>Tasks ({stats.total})</h4>
                            {stats.total === 0 ? (
                              <div className="no-tasks">No tasks assigned to this cluster</div>
                            ) : (
                              <div className="tasks-table">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Status</th>
                                      <th>Task Name</th>
                                      <th>Description</th>
                                      <th>Category</th>
                                      <th>Priority</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {getTasksForCluster(cluster.cluster_id).map(task => (
                                      <tr 
                                        key={task.id}
                                        className="task-row-clickable"
                                        onClick={() => {
                                          // Switch to grid view and highlight this task
                                          onViewChange('grid');
                                          // You could also scroll to the task in grid view
                                        }}
                                      >
                                        <td>
                                          <div 
                                            className="task-checkbox"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleTaskToggle(task);
                                            }}
                                          >
                                            {getStatusIcon(task.status)}
                                          </div>
                                        </td>
                                        <td className="task-name-cell">{task.name}</td>
                                        <td className="task-desc-cell">{task.description}</td>
                                        <td><span className="category-badge-small">{task.category_id}</span></td>
                                        <td><span className={`priority-badge-small ${task.priority?.toLowerCase()}`}>{task.priority}</span></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
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

      {/* Cluster Details Modal */}
      {showClusterDetails && selectedCluster && (
        <div className="modal-overlay" onClick={() => setShowClusterDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCluster.cluster_name}</h2>
              <button className="close-btn" onClick={() => setShowClusterDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <h3>Description</h3>
                <p>{selectedCluster.description}</p>
              </div>
              <div className="modal-section">
                <h3>Completion Criteria</h3>
                <p>{selectedCluster.completion_criteria}</p>
              </div>
              <div className="modal-section">
                <h3>Statistics</h3>
                <div className="modal-stats">
                  {(() => {
                    const stats = getClusterStats(selectedCluster.cluster_id);
                    return (
                      <>
                        <div className="modal-stat">
                          <span className="modal-stat-label">Total Tasks:</span>
                          <span className="modal-stat-value">{stats.total}</span>
                        </div>
                        <div className="modal-stat">
                          <span className="modal-stat-label">Completed:</span>
                          <span className="modal-stat-value completed">{stats.completed}</span>
                        </div>
                        <div className="modal-stat">
                          <span className="modal-stat-label">Progress:</span>
                          <span className="modal-stat-value">{stats.progress}%</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClusterDashboard;

