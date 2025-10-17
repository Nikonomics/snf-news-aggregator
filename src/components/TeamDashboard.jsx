import React from 'react';
import { User, Clock, CheckCircle, Circle, AlertCircle, Grid3X3, Target } from 'lucide-react';
import { projectData } from '../data/ProjectData.js';
import './TeamDashboard.css';

const TeamDashboard = ({ taskCompletion, onViewChange }) => {
  // Team members list
  const teamMembers = [
    'Nikhil', 'Manish', 'Rahul', 'Manoj', 'Vijendra', 'Mayank', 
    'Ashish', 'Bhupender', 'Bhuwan', 'Anuj', 'Shubham', 'Chirag'
  ];

  // Function to get all tasks from projectData
  const getAllTasks = () => {
    const tasks = [];
    projectData.forEach(category => {
      category.subcategories.forEach(subcategory => {
        subcategory.tasks.forEach(task => {
          tasks.push({
            ...task,
            categoryId: category.id,
            subcategoryId: subcategory.id,
            categoryName: category.name,
            subcategoryName: subcategory.name
          });
        });
      });
    });
    return tasks;
  };

  // Function to get tasks assigned to a specific team member
  const getTasksForMember = (memberName) => {
    const allTasks = getAllTasks();
    return allTasks.filter(task => {
      const taskKey = `${task.categoryId}-${task.subcategoryId}-${task.id}`;
      const completionData = taskCompletion[taskKey];
      const assignedTo = completionData?.assignedTo || 'Unassigned';
      return assignedTo === memberName;
    });
  };

  // Function to get task status
  const getTaskStatus = (task) => {
    const taskKey = `${task.categoryId}-${task.subcategoryId}-${task.id}`;
    const completionData = taskCompletion[taskKey];
    
    if (completionData && completionData.completed) return 'completed';
    return task.status;
  };

  // Function to get due date urgency
  const getDueDateUrgency = (task) => {
    const taskKey = `${task.categoryId}-${task.subcategoryId}-${task.id}`;
    const completionData = taskCompletion[taskKey];
    const dueDate = completionData?.dueDate;
    
    if (!dueDate) return 'no-date';
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const currentStatus = getTaskStatus(task);
    if (currentStatus === 'completed') return 'completed';
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'due-soon';
    return 'due-later';
  };

  // Function to format due date
  const formatDueDate = (dueDate) => {
    if (!dueDate) return 'No deadline';
    return new Date(dueDate).toLocaleDateString();
  };

  // Function to get due date for a task
  const getTaskDueDate = (task) => {
    const taskKey = `${task.categoryId}-${task.subcategoryId}-${task.id}`;
    const completionData = taskCompletion[taskKey];
    return completionData?.dueDate || null;
  };

  // Calculate team member statistics
  const getMemberStats = (memberName) => {
    const tasks = getTasksForMember(memberName);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => getTaskStatus(task) === 'completed').length;
    const inProgressTasks = tasks.filter(task => getTaskStatus(task) === 'in-progress').length;
    const pendingTasks = tasks.filter(task => getTaskStatus(task) === 'pending').length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      progressPercentage,
      activeTasks: tasks.filter(task => getTaskStatus(task) === 'in-progress')
    };
  };

  // Get all team members with their stats, sorted by total tasks
  const teamMemberStats = teamMembers
    .map(member => ({
      name: member,
      ...getMemberStats(member)
    }))
    .sort((a, b) => b.totalTasks - a.totalTasks);

  return (
    <div className="team-dashboard">
      <div className="dashboard-header">
        <div className="header-top">
          <div>
            <h1>👥 Team Dashboard</h1>
            <p>Track progress and workload across the team</p>
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
              className="toggle-btn active"
            >
              <User size={16} />
              Team Dashboard
            </button>
            <button 
              className="toggle-btn"
              onClick={() => onViewChange('cluster')}
            >
              <Target size={16} />
              Cluster View
            </button>
          </div>
        </div>
      </div>

      <div className="team-grid">
        {teamMemberStats.map((member) => (
          <div key={member.name} className="member-card">
            <div className="card-header">
              <div className="member-info">
                <User className="member-icon" />
                <h3 className="member-name">{member.name}</h3>
              </div>
              <div className="task-count">
                {member.totalTasks} {member.totalTasks === 1 ? 'task' : 'tasks'}
              </div>
            </div>

            {member.totalTasks === 0 ? (
              <div className="no-tasks">
                <p>No tasks assigned</p>
              </div>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value pending">{member.pendingTasks}</div>
                    <div className="stat-label">Pending</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value in-progress">{member.inProgressTasks}</div>
                    <div className="stat-label">In Progress</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value completed">{member.completedTasks}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                </div>

                <div className="progress-section">
                  <div className="progress-header">
                    <span>Progress</span>
                    <span className="progress-percentage">{member.progressPercentage}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${member.progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {member.activeTasks.length > 0 && (
                  <div className="active-tasks">
                    <h4>Active Tasks</h4>
                    <div className="task-list">
                      {member.activeTasks.map((task) => {
                        const urgency = getDueDateUrgency(task);
                        const dueDate = getTaskDueDate(task);
                        
                        return (
                          <div key={`${task.categoryId}-${task.subcategoryId}-${task.id}`} 
                               className={`task-item urgency-${urgency}`}>
                            <div className="task-name">{task.name}</div>
                            <div className="task-meta">
                              <span className="due-date">
                                {formatDueDate(dueDate)}
                              </span>
                              <span className={`urgency-indicator ${urgency}`}>
                                {urgency === 'overdue' && <AlertCircle size={12} />}
                                {urgency === 'due-soon' && <Clock size={12} />}
                                {urgency === 'due-later' && <Circle size={12} />}
                                {urgency === 'no-date' && <Circle size={12} />}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamDashboard;
