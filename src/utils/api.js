// src/utils/api.js - Client-side API calls with improved CORS handling
import { auth } from '../firebase/firebase';

// API Base URL - configured for DuckDNS with fallback
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://jobtrackai.duckdns.org'  // Your DuckDNS domain
    : 'http://localhost:8000'           // Local development
  );

// Helper to log headers for debugging
function logHeaders(headers) {
  if (process.env.NODE_ENV === 'development') {
    console.log("API Request Headers:");
    for (const [key, value] of Object.entries(headers)) {
      console.log(`  ${key}: ${value}`);
    }
  }
}

// Enhanced error handling
function handleApiError(error, endpoint) {
  console.error(`API request to ${endpoint} failed:`, error);

  // Network connectivity issues
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    throw new Error('Unable to connect to API server. Please check your connection and try again.');
  }

  // CORS specific errors
  if (error.message.includes('CORS') || error.message.includes('Cross-Origin')) {
    throw new Error('CORS error: Unable to access API. Please check server configuration.');
  }

  // Server errors
  if (error.message.includes('status 5')) {
    throw new Error('Server error: Please try again later or contact support.');
  }

  // Client errors
  if (error.message.includes('status 4')) {
    throw error; // Don't modify 4xx errors, they're usually specific
  }

  throw error;
}

// Generic API request function with enhanced authentication and error handling
async function apiRequest(endpoint, options = {}) {
  const user = auth.currentUser;

  // Debug output
  console.log(`Making request to ${endpoint}`);
  console.log('Current user:', user ? `${user.uid} (authenticated)` : 'No user (unauthenticated)');

  if (!user) {
    console.warn("No authenticated user! Request will use default user_id on server.");
  }

  // Prepare headers
  const headers = {
    ...(options.headers || {})
  };

  // Add user ID if authenticated
  if (user) {
    headers['X-User-Id'] = user.uid;
  }

  // Don't set Content-Type for FormData requests as it will be set automatically with boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Add Accept header
  headers['Accept'] = 'application/json';

  // Log headers for debugging
  logHeaders(headers);

  const config = {
    method: 'GET',
    ...options,
    headers,
    // CORS configuration
    mode: 'cors',
    // Only include credentials for authenticated endpoints
    credentials: user ? 'include' : 'omit',
    // Add cache control for development
    ...(process.env.NODE_ENV === 'development' && {
      cache: 'no-cache'
    })
  };

  try {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log(`Sending ${config.method} request to ${fullUrl}`);

    const response = await fetch(fullUrl, config);
    console.log(`Response status: ${response.status} ${response.statusText}`);

    // Log response headers for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log("Response Headers:");
      for (const [key, value] of response.headers.entries()) {
        console.log(`  ${key}: ${value}`);
      }
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (jsonError) {
        console.warn('Failed to parse error response as JSON:', jsonError);
        errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
      }

      throw new Error(
        errorData?.detail ||
        errorData?.message ||
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    handleApiError(error, endpoint);
  }
}

// Enhanced retry logic for critical operations
async function apiRequestWithRetry(endpoint, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequest(endpoint, options);
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx) or CORS errors
      if (error.message.includes('status 4') ||
          error.message.includes('CORS') ||
          error.message.includes('Cross-Origin')) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Request failed, retrying in ${delay}ms (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Enhanced resume API with better error handling
export const resumeApi = {
  generateResume(jobId, settings, customize = true, template = "standard") {
    const apiKey = settings?.openaiApiKey || "";
    const resumeData = settings?.resumeData || null;

    console.log(`Generating resume for job ${jobId} with resume data: ${resumeData ? 'Present' : 'Not provided'}`);

    const requestBody = {
      job_id: jobId,
      customize: customize,
      template: template
    };

    if (resumeData) {
      requestBody.resume_data = resumeData;
      console.log("Including user's resume data in generation request");
    } else {
      console.warn("No resume data provided for job-specific customization");
    }

    return apiRequestWithRetry('/api/resume/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey
      },
      body: JSON.stringify(requestBody)
    });
  },

  getResumeStatus(resumeId) {
    return apiRequest(`/api/resume/${resumeId}/status`);
  },

  async pollResumeStatus(resumeId, maxAttempts = 20, interval = 3000) {
    let attempts = 0;
    let lastStatus = null;

    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          if (attempts >= maxAttempts) {
            reject(new Error('Resume generation polling timed out after 60 seconds'));
            return;
          }

          const statusData = await this.getResumeStatus(resumeId);
          attempts++;

          if (!lastStatus || lastStatus !== statusData.status) {
            console.log(`Resume status (attempt ${attempts}/${maxAttempts}): ${statusData.status}`);
            lastStatus = statusData.status;
          }

          if (statusData.status === 'completed') {
            resolve(statusData);
            return;
          }

          if (statusData.status === 'error' || statusData.status === 'failed') {
            reject(new Error(statusData.message || statusData.error || 'Resume generation failed'));
            return;
          }

          // Continue polling for in-progress statuses
          if (statusData.status === 'processing' || statusData.status === 'queued' || statusData.status === 'pending') {
            setTimeout(checkStatus, interval);
          } else {
            // Unknown status, continue polling but log warning
            console.warn(`Unknown resume status: ${statusData.status}, continuing to poll...`);
            setTimeout(checkStatus, interval);
          }
        } catch (error) {
          console.error(`Error checking resume status (attempt ${attempts}):`, error);

          // If we've made several attempts and keep failing, give up
          if (attempts >= 5) {
            reject(error);
            return;
          }

          // Otherwise, retry after a longer delay
          setTimeout(checkStatus, interval * 2);
        }
      };

      checkStatus();
    });
  },

  async getResumeYaml(resumeId) {
    try {
      const response = await apiRequest(`/api/resume/${resumeId}/download?format=yaml`);
      return response.content;
    } catch (error) {
      console.error('Error downloading resume YAML:', error);
      throw error;
    }
  },

  uploadToSimplify(jobId, resumeId = null) {
    return apiRequest('/api/resume/upload-to-simplify', {
      method: 'POST',
      body: JSON.stringify({
        job_id: jobId,
        resume_id: resumeId
      })
    });
  },

  async saveResumeYaml(resumeId, yamlContent) {
    try {
      const formData = new FormData();
      formData.append('yaml_content', yamlContent);

      return await apiRequest(`/api/resume/${resumeId}/update-yaml`, {
        method: 'POST',
        body: formData
      });
    } catch (error) {
      console.error(`Error saving resume YAML:`, error);
      throw error;
    }
  },
};

// Job-related API functions
export const jobsApi = {
  getSystemStatus: () => {
    return apiRequest('/api/status');
  },

  getJobs: (params = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/api/jobs${queryString ? '?' + queryString : ''}`);
  },

  getJob: (jobId) => {
    return apiRequest(`/api/jobs/${jobId}`);
  },

  updateJobStatus: (jobId, status) => {
    return apiRequest(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  generateResume: (jobId, settings, customize = true, template = "standard") => {
    return resumeApi.generateResume(jobId, settings, customize, template);
  },

  uploadToSimplify: (jobId, resumeId = null) => {
    return resumeApi.uploadToSimplify(jobId, resumeId);
  },

  getResumeYaml: (resumeId) => {
    return resumeApi.getResumeYaml(resumeId);
  },

  getResumeStatus: (resumeId) => {
    return resumeApi.getResumeStatus(resumeId);
  },

  addJobByUrl: (jobUrl, apiKey) => {
    const formData = new FormData();
    formData.append('job_url', jobUrl);

    return apiRequestWithRetry('/api/jobs/analyze', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey
      },
      body: formData
    });
  }
};

// Simplify API
export const simplifyApi = {
  storeSession: (sessionData) => {
    return apiRequest('/api/simplify/store-session', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  },

  uploadResume: (resumeId, jobId = null) => {
    return apiRequest('/api/simplify/upload-resume', {
      method: 'POST',
      body: JSON.stringify({
        resume_id: resumeId,
        job_id: jobId
      })
    });
  },

  // NEW: Upload resume with PDF data generated in UI
  uploadResumeWithPdf: (formData) => {
    return apiRequest('/api/simplify/upload-resume-pdf', {
      method: 'POST',
      body: formData
      // Note: Don't set Content-Type header - let browser set it with boundary for multipart/form-data
    });
  },

  checkSession: () => {
    return apiRequest('/api/simplify/check-session');
  }
};

// Enhanced health check function without credentials
export const healthCheck = async () => {
  try {
    console.log('Performing health check...');

    // First try without credentials (should work with any CORS setup)
    const response = await fetch(`${API_BASE_URL}/api/status`, {
      method: 'GET',
      mode: 'cors',
      // Remove credentials for health check to avoid CORS issues
      // credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    const isHealthy = response.ok;
    console.log(`Health check result: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${response.status})`);

    if (isHealthy) {
      try {
        const data = await response.json();
        console.log('API Status:', data.status);
      } catch (e) {
        console.warn('Could not parse health check response as JSON');
      }
    }

    return isHealthy;
  } catch (error) {
    console.warn('Health check failed:', error.message);
    return false;
  }
};

// Utility to test CORS configuration
export const testCORS = async () => {
  try {
    console.log('Testing CORS configuration...');

    // Test OPTIONS request
    const optionsResponse = await fetch(`${API_BASE_URL}/api/status`, {
      method: 'OPTIONS',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, X-User-Id'
      }
    });

    console.log('OPTIONS response status:', optionsResponse.status);
    console.log('OPTIONS response headers:');
    for (const [key, value] of optionsResponse.headers.entries()) {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`  ${key}: ${value}`);
      }
    }

    // Test actual GET request
    const getResponse = await healthCheck();

    return {
      optionsOk: optionsResponse.ok,
      getOk: getResponse,
      corsConfigured: optionsResponse.headers.get('access-control-allow-origin') !== null
    };
  } catch (error) {
    console.error('CORS test failed:', error);
    return {
      optionsOk: false,
      getOk: false,
      corsConfigured: false,
      error: error.message
    };
  }
};