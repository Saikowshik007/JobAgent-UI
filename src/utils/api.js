// src/utils/api.js - Updated API client to match your OpenAPI specification
import { auth } from '../firebase/firebase';

// API Base URL - configured for DuckDNS with fallback
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://jobtrackai.duckdns.org'
    : 'http://localhost:8000'
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

  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    throw new Error('Unable to connect to API server. Please check your connection and try again.');
  }

  if (error.message.includes('CORS') || error.message.includes('Cross-Origin')) {
    throw new Error('CORS error: Unable to access API. Please check server configuration.');
  }

  if (error.message.includes('status 5')) {
    throw new Error('Server error: Please try again later or contact support.');
  }

  if (error.message.includes('status 4')) {
    throw error;
  }

  throw error;
}

// Generic API request function
async function apiRequest(endpoint, options = {}) {
  const user = auth.currentUser;

  console.log(`Making request to ${endpoint}`);
  console.log('Current user:', user ? `${user.uid} (authenticated)` : 'No user (unauthenticated)');

  if (!user) {
    console.warn("No authenticated user! Request will use default user_id on server.");
  }

  const headers = {
    ...(options.headers || {})
  };

  // Add user ID if authenticated
  if (user) {
    headers['X-User-Id'] = user.uid;
  }

  // Don't set Content-Type for FormData requests
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  headers['Accept'] = 'application/json';

  logHeaders(headers);

  const config = {
    method: 'GET',
    ...options,
    headers,
    mode: 'cors',
    credentials: user ? 'include' : 'omit',
    ...(process.env.NODE_ENV === 'development' && {
      cache: 'no-cache'
    })
  };

  try {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log(`Sending ${config.method} request to ${fullUrl}`);

    const response = await fetch(fullUrl, config);
    console.log(`Response status: ${response.status} ${response.statusText}`);

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

// Enhanced retry logic
async function apiRequestWithRetry(endpoint, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequest(endpoint, options);
    } catch (error) {
      lastError = error;

      if (error.message.includes('status 4') ||
          error.message.includes('CORS') ||
          error.message.includes('Cross-Origin')) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`Request failed, retrying in ${delay}ms (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// System API
export const systemApi = {
  getStatus() {
    return apiRequest('/api/status');
  },

  clearCache() {
    return apiRequest('/api/cache/clear', { method: 'DELETE' });
  },

  cleanupCache() {
    return apiRequest('/api/cache/cleanup', { method: 'POST' });
  },

  getCacheStats() {
    return apiRequest('/api/cache/stats');
  }
};

// Jobs API - Updated to match your OpenAPI spec
export const jobsApi = {
  // Get all jobs with filtering
  getJobs(params = {}) {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/api/jobs/${queryString ? '?' + queryString : ''}`);
  },

  // Get specific job
  getJob(jobId) {
    return apiRequest(`/api/jobs/${jobId}`);
  },

  // Analyze job from URL
  analyzeJob(jobUrl, status = null, apiKey = null) {
    const formData = new FormData();
    formData.append('job_url', jobUrl);
    if (status) {
      formData.append('status', status);
    }

    const headers = {};
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    return apiRequestWithRetry('/api/jobs/analyze', {
      method: 'POST',
      headers,
      body: formData
    });
  },

  // Update job status
  updateJobStatus(jobId, status) {
    return apiRequest(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // Delete job
  deleteJob(jobId, cascadeResumes = false) {
    const params = new URLSearchParams();
    if (cascadeResumes) {
      params.append('cascade_resumes', 'true');
    }

    return apiRequest(`/api/jobs/${jobId}${params.toString() ? '?' + params.toString() : ''}`, {
      method: 'DELETE'
    });
  },

  // Delete multiple jobs
  deleteJobsBatch(jobIds, cascadeResumes = false) {
    const params = new URLSearchParams();
    if (cascadeResumes) {
      params.append('cascade_resumes', 'true');
    }

    return apiRequest(`/api/jobs/batch${params.toString() ? '?' + params.toString() : ''}`, {
      method: 'DELETE',
      body: JSON.stringify(jobIds)
    });
  },

  // Get job statistics
  getJobStats() {
    return apiRequest('/api/jobs/stats');
  },

  // Get resumes for a specific job
  getJobResumes(jobId) {
    return apiRequest(`/api/jobs/${jobId}/resumes`);
  },

  // Legacy method for compatibility
  addJobByUrl(jobUrl, apiKey) {
    return this.analyzeJob(jobUrl, null, apiKey);
  },

    // Legacy methods for compatibility
  getSystemStatus: () => systemApi.getStatus(),
  generateResume: (jobId, settings, customize = true, template = "standard") => {
    return resumeApi.generateResume(jobId, settings, customize, template);
  },
  getResumeYaml: (resumeId) => resumeApi.getResumeYaml(resumeId),
  getResumeStatus: (resumeId) => resumeApi.getResumeStatus(resumeId)
};

// Resume API - Updated to match your OpenAPI spec
export const resumeApi = {
  // Generate resume
  generateResume(jobId, settings, customize = true, template = "standard", handleExisting = "replace") {
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
    }

    const params = new URLSearchParams();
    params.append('handle_existing', handleExisting);

    const headers = {};
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    return apiRequestWithRetry(`/api/resume/generate?${params.toString()}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
  },

  // Get resume status
  getResumeStatus(resumeId) {
    return apiRequest(`/api/resume/${resumeId}/status`);
  },

  // Download resume
  downloadResume(resumeId, format = 'yaml') {
    const params = new URLSearchParams();
    params.append('format', format);

    return apiRequest(`/api/resume/${resumeId}/download?${params.toString()}`);
  },

  // Get resume YAML content
  async getResumeYaml(resumeId) {
    try {
      const response = await this.downloadResume(resumeId, 'yaml');
      return response.content;
    } catch (error) {
      console.error('Error downloading resume YAML:', error);
      throw error;
    }
  },

  // Upload custom resume
  uploadResume(file, jobId = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (jobId) {
      formData.append('job_id', jobId);
    }

    return apiRequest('/api/resume/upload', {
      method: 'POST',
      body: formData
    });
  },

  // Update resume YAML
  updateResumeYaml(resumeId, yamlContent) {
    const formData = new FormData();
    formData.append('yaml_content', yamlContent);

    return apiRequest(`/api/resume/${resumeId}/update-yaml`, {
      method: 'POST',
      body: formData
    });
  },

  // Delete resume
  deleteResume(resumeId, updateJob = true) {
    const params = new URLSearchParams();
    params.append('update_job', updateJob.toString());

    return apiRequest(`/api/resume/${resumeId}?${params.toString()}`, {
      method: 'DELETE'
    });
  },

  // Get user resumes
  getUserResumes(params = {}) {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/api/resume/${queryString ? '?' + queryString : ''}`);
  },

  // Get active resume generations
  getActiveResumeGenerations() {
    return apiRequest('/api/resume/active');
  },

  // Polling for resume status
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

          if (statusData.status === 'processing' || statusData.status === 'queued' || statusData.status === 'pending') {
            setTimeout(checkStatus, interval);
          } else {
            console.warn(`Unknown resume status: ${statusData.status}, continuing to poll...`);
            setTimeout(checkStatus, interval);
          }
        } catch (error) {
          console.error(`Error checking resume status (attempt ${attempts}):`, error);

          if (attempts >= 5) {
            reject(error);
            return;
          }

          setTimeout(checkStatus, interval * 2);
        }
      };

      checkStatus();
    });
  },

  // Legacy method for compatibility
  async saveResumeYaml(resumeId, yamlContent) {
    try {
      return await this.updateResumeYaml(resumeId, yamlContent);
    } catch (error) {
      console.error(`Error saving resume YAML:`, error);
      throw error;
    }
  }
};

// Simplify API - Updated to match your OpenAPI spec
export const simplifyApi = {
  // Store authentication tokens
  storeTokens(tokens) {
    console.log('🔑 Storing authentication tokens...');
    return apiRequest('/api/simplify/store-tokens', {
      method: 'POST',
      body: JSON.stringify(tokens)
    });
  },

  // Check session validity
  checkSession() {
    return apiRequest('/api/simplify/check-session');
  },

  // Get stored tokens
  getStoredTokens() {
    return apiRequest('/api/simplify/get-tokens');
  },

  // Upload PDF resume to Simplify
  uploadResumeToSimplify(pdfBlob, resumeId, jobId = null) {
    console.log('📤 Uploading resume to Simplify via backend proxy...');

    const formData = new FormData();
    const fileName = `resume_${resumeId}.pdf`;
    formData.append('resume_pdf', pdfBlob, fileName);
    formData.append('resume_id', resumeId);

    if (jobId) {
      formData.append('job_id', jobId);
    }

    return apiRequest('/api/simplify/upload-resume-pdf', {
      method: 'POST',
      body: formData
    });
  },

  // Get current user ID for token management
  getCurrentUserId() {
    const user = auth.currentUser;
    return user?.uid || 'default_user';
  }
};

// Enhanced health check function
export const healthCheck = async () => {
  try {
    console.log('Performing health check...');

    const response = await fetch(`${API_BASE_URL}/api/status`, {
      method: 'GET',
      mode: 'cors',
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

// CORS testing utility
export const testCORS = async () => {
  try {
    console.log('Testing CORS configuration...');

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