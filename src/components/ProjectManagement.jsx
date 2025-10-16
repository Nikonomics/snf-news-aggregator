import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Target, 
  Database, 
  FileText, 
  Globe, 
  Calendar,
  TrendingUp,
  CheckSquare,
  Square,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Search,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

const ProjectManagement = () => {
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    dueDate: '',
    status: 'pending'
  })

  // Data source categories based on your comprehensive catalog
  const dataSourceCategories = [
    {
      id: 'federal-legislative',
      name: 'Federal Legislative Sources',
      icon: <FileText size={16} />,
      color: '#3b82f6',
      tasks: [
        'Set up Congress.gov API monitoring',
        'Configure House Ways and Means Committee tracking',
        'Configure Senate Finance Committee tracking',
        'Configure House Energy and Commerce Committee tracking',
        'Implement bill tracking system',
        'Set up Federal Budget Documents monitoring'
      ]
    },
    {
      id: 'state-legislative',
      name: 'State Legislative Sources',
      icon: <Globe size={16} />,
      color: '#10b981',
      tasks: [
        'Set up LegiScan API for multi-state tracking',
        'Configure monitoring for top 10 states by SNF bed count',
        'Implement state-specific bill tracking',
        'Set up state legislature website monitoring',
        'Configure committee hearing tracking'
      ]
    },
    {
      id: 'federal-regulatory',
      name: 'Federal Regulatory Sources',
      icon: <Database size={16} />,
      color: '#f59e0b',
      tasks: [
        'Configure CMS.gov monitoring',
        'Set up Federal Register API integration',
        'Implement QSO memos tracking',
        'Configure State Operations Manual monitoring',
        'Set up Regulations.gov monitoring',
        'Implement MAC website monitoring'
      ]
    },
    {
      id: 'state-regulatory',
      name: 'State Regulatory Sources',
      icon: <Target size={16} />,
      color: '#8b5cf6',
      tasks: [
        'Set up state Medicaid agency monitoring',
        'Configure state health department tracking',
        'Implement state budget document monitoring',
        'Set up provider bulletin tracking',
        'Configure state survey agency monitoring'
      ]
    },
    {
      id: 'enforcement-oversight',
      name: 'Enforcement & Oversight',
      icon: <AlertTriangle size={16} />,
      color: '#ef4444',
      tasks: [
        'Set up RAC audit monitoring',
        'Configure OIG report tracking',
        'Implement Care Compare data monitoring',
        'Set up state survey results tracking',
        'Configure enforcement action monitoring'
      ]
    },
    {
      id: 'automation-setup',
      name: 'Automation & Technical',
      icon: <Activity size={16} />,
      color: '#06b6d4',
      tasks: [
        'Implement RSS feed monitoring',
        'Set up email subscription monitoring',
        'Configure PDF parsing for regulatory documents',
        'Implement API polling systems',
        'Set up web scraping for state sources',
        'Configure automated alert systems'
      ]
    }
  ]

  // Initialize tasks from categories
  useEffect(() => {
    const initialTasks = []
    dataSourceCategories.forEach(category => {
      category.tasks.forEach((taskTitle, index) => {
        initialTasks.push({
          id: `${category.id}-${index}`,
          title: taskTitle,
          description: `Complete setup for ${taskTitle.toLowerCase()}`,
          category: category.id,
          categoryName: category.name,
          priority: index < 2 ? 'high' : 'medium',
          status: 'pending',
          dueDate: '',
          createdAt: new Date().toISOString(),
          completedAt: null
        })
      })
    })
    setTasks(initialTasks)
  }, [])

  // Filter tasks based on search and filters
  useEffect(() => {
    let filtered = tasks

    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus)
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(task => task.category === filterCategory)
    }

    setFilteredTasks(filtered)
  }, [tasks, searchTerm, filterStatus, filterCategory])

  const toggleTaskStatus = (taskId) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed'
        return {
          ...task,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : null
        }
      }
      return task
    }))
  }

  const addTask = () => {
    if (newTask.title.trim()) {
      const task = {
        id: `custom-${Date.now()}`,
        ...newTask,
        createdAt: new Date().toISOString(),
        completedAt: null
      }
      setTasks([...tasks, task])
      setNewTask({
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        dueDate: '',
        status: 'pending'
      })
      setShowAddTask(false)
    }
  }

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId))
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />
      case 'in-progress':
        return <Clock size={16} className="text-blue-500" />
      case 'pending':
        return <Circle size={16} className="text-gray-400" />
      default:
        return <Circle size={16} className="text-gray-400" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryInfo = (categoryId) => {
    return dataSourceCategories.find(cat => cat.id === categoryId) || {
      name: 'Other',
      icon: <FileText size={16} />,
      color: '#6b7280'
    }
  }

  // Calculate progress statistics
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(task => task.status === 'completed').length
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length
  const pendingTasks = tasks.filter(task => task.status === 'pending').length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Category progress
  const categoryProgress = dataSourceCategories.map(category => {
    const categoryTasks = tasks.filter(task => task.category === category.id)
    const completedCategoryTasks = categoryTasks.filter(task => task.status === 'completed').length
    const categoryPercentage = categoryTasks.length > 0 ? Math.round((completedCategoryTasks / categoryTasks.length) * 100) : 0
    
    return {
      ...category,
      totalTasks: categoryTasks.length,
      completedTasks: completedCategoryTasks,
      percentage: categoryPercentage
    }
  })

  return (
    <div className="project-management">
      <div className="max-w-full mx-auto px-4 py-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">Project Management</h1>
            <span className="text-sm text-gray-500">({totalTasks} tasks)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600 font-medium">{completedTasks} completed</span>
              <span className="text-blue-600 font-medium">{inProgressTasks} in progress</span>
              <span className="text-gray-600">{pendingTasks} pending</span>
            </div>
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} />
              Add Task
            </button>
          </div>
        </div>

        {/* Compact Category Progress */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Category Progress</h3>
            <span className="text-xs text-gray-500">Overall: {completionPercentage}%</span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categoryProgress.map(category => (
              <div key={category.id} className="flex items-center gap-1.5 p-1.5 bg-white rounded border border-gray-200 flex-shrink-0 min-w-0">
                <div 
                  className="p-0.5 rounded"
                  style={{ backgroundColor: `${category.color}20`, color: category.color }}
                >
                  {category.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate max-w-20">{category.name}</div>
                  <div className="text-xs text-gray-500">{category.completedTasks}/{category.totalTasks}</div>
                  <div className="w-16 bg-gray-200 rounded-full h-1 mt-0.5">
                    <div 
                      className="h-1 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${category.percentage}%`,
                        backgroundColor: category.color
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compact Filters */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {dataSourceCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Compact Table Layout */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-8 px-2 py-2 text-left"></th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Task</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Priority</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Due Date</th>
                  <th className="w-8 px-2 py-2 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTasks.map(task => {
                  const categoryInfo = getCategoryInfo(task.category)
                  return (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 py-2">
                        <button
                          onClick={() => toggleTaskStatus(task.id)}
                          className="flex-shrink-0"
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : (
                            <Circle size={16} className="text-gray-400 hover:text-blue-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="min-w-0">
                          <div className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="p-1 rounded"
                            style={{ backgroundColor: `${categoryInfo.color}20`, color: categoryInfo.color }}
                          >
                            {categoryInfo.icon}
                          </div>
                          <span className="text-xs text-gray-600 truncate">{categoryInfo.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          task.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : task.status === 'in-progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status === 'completed' ? 'Done' : task.status === 'in-progress' ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {task.dueDate ? (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Calendar size={12} />
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No date</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Add New Task</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter task title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="2"
                    placeholder="Enter task description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newTask.category}
                      onChange={(e) => setNewTask({...newTask, category: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select category</option>
                      {dataSourceCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={addTask}
                  className="flex-1 bg-blue-600 text-white py-2 px-3 text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Task
                </button>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-3 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectManagement
