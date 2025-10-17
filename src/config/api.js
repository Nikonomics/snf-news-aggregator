// API Configuration
// This allows the app to work both locally and on Render

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default {
  baseURL: API_BASE_URL,
  endpoints: {
    clusters: `${API_BASE_URL}/api/clusters`,
    tasks: `${API_BASE_URL}/api/tasks`,
    clusterTasks: (clusterId) => `${API_BASE_URL}/api/clusters/${clusterId}/tasks`,
    clusterStats: (clusterId) => `${API_BASE_URL}/api/clusters/${clusterId}/stats`,
  }
};

