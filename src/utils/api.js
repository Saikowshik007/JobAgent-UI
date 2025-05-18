import { auth } from '../firebase/firebase';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Helper function to get the current user's ID token for authentication
async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return await user.getIdToken();
}

// Generic API request function with authentication
async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail ||
      `API request failed with status ${response.status}: ${response.statusText}`
    );
  }

  return await response.json();
}
// Job-related API functions
export const jobsApi = {
  // Search for jobs on LinkedIn
  search: (searchParams) => {
    return apiRequest('/api/jobs/search', {
      method: 'POST',
      body: JSON.stringify(searchParams)
    });
  },

  // Get all jobs with optional filtering
  getJobs: (params = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });

    return apiRequest(`/api/jobs?${queryParams.toString()}`);
  },

  // Get a specific job by ID
  getJob: (jobId) => {
    return apiRequest(`/api/jobs/${jobId}`);
  },

  // Update the status of a job
  updateStatus: (jobId, status) => {
    return apiRequest(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // Generate a resume for a job (placeholder)
  generateResume: (jobId, resumeData) => {
    return apiRequest(`/api/resume/generate`, {
      method: 'POST',
      body: JSON.stringify({
        job_id: jobId,
        ...resumeData
      })
    });
  }
};

// System-related API functions
export const systemApi = {
  // Get system status and job statistics
  getStatus: () => {
    return apiRequest('/api/status');
  }
};

export default {
  jobs: jobsApi,
  system: systemApi
};
