// Debug-focused API client
import { auth } from '../firebase/firebase';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Helper to log headers for debugging
function logHeaders(headers) {
  console.log("API Request Headers:");
  for (const [key, value] of Object.entries(headers)) {
    console.log(`  ${key}: ${value}`);
  }
}

// Generic API request function with authentication
async function apiRequest(endpoint, options = {}) {
  const user = auth.currentUser;

  // Debug output
  console.log(`Making request to ${endpoint}`);
  console.log(`Current user:`, user ? `${user.uid} (authenticated)` : 'No user (unauthenticated)');

  if (!user) {
    console.warn("No authenticated user! Request will use default user_id on server.");
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(user && { 'x_user_id': user.uid }),
    ...options.headers
  };

  // Log headers for debugging
  logHeaders(headers);

  const config = {
    ...options,
    headers
  };

  try {
    console.log(`Sending request to ${API_BASE_URL}${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.detail ||
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    throw error;
  }
}

// Job-related API functions
export const jobsApi = {
  // Get system status
  getSystemStatus: () => {
    return apiRequest('/api/status');
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
};

// Export for convenience
export default {
  jobs: jobsApi
};