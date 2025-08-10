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

// Jobs API - Updated to match Python API contract
export const jobsApi = {
  // Get all jobs with filtering - Updated to include user_id in path
  getJobs(userId, params = {}) {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/api/jobs/${userId}${queryString ? '?' + queryString : ''}`);
  },

  // Get specific job - Updated to include user_id in path
  getJob(userId, jobId) {
    return apiRequest(`/api/jobs/${userId}/${jobId}`);
  },

  // Analyze job from URL
  analyzeJob(jobUrl, status = null, userSettings = {}) {
    const formData = new FormData();
    formData.append('job_url', jobUrl);
    if (status) {
      formData.append('status', status);
    }

    const headers = {};
    // Add API key if provided in user settings
    if (userSettings.openaiApiKey) {
      headers['X-Api-Key'] = userSettings.openaiApiKey;
    }
    // Add model if provided in user settings
    if (userSettings.model) {
      headers['X-Model'] = userSettings.model;
    }

    return apiRequestWithRetry('/api/jobs/analyze', {
      method: 'POST',
      headers,
      body: formData
    });
  },

  // Analyze job from description text - New endpoint
  analyzeJobDescription(jobDescription, status = null, userSettings = {}) {
    const formData = new FormData();
    formData.append('job_description', jobDescription);
    if (status) {
      formData.append('status', status);
    }

    const headers = {};
    // Add API key if provided in user settings
    if (userSettings.openaiApiKey) {
      headers['X-Api-Key'] = userSettings.openaiApiKey;
    }
    // Add model if provided in user settings
    if (userSettings.model) {
      headers['X-Model'] = userSettings.model;
    }

    return apiRequestWithRetry('/api/jobs/analyze-description', {
      method: 'POST',
      headers,
      body: formData
    });
  },

  // Update job status - Updated to include user_id in path
  updateJobStatus(userId, jobId, status) {
    return apiRequest(`/api/jobs/${userId}/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // Delete job - Updated to include user_id in path
  deleteJob(userId, jobId, cascadeResumes = false) {
    const params = new URLSearchParams();
    if (cascadeResumes) {
      params.append('cascade_resumes', 'true');
    }

    return apiRequest(`/api/jobs/${userId}/${jobId}${params.toString() ? '?' + params.toString() : ''}`, {
      method: 'DELETE'
    });
  },

  // Delete multiple jobs - Updated to include user_id in path
  deleteJobsBatch(userId, jobIds, cascadeResumes = false) {
    const params = new URLSearchParams();
    if (cascadeResumes) {
      params.append('cascade_resumes', 'true');
    }

    return apiRequest(`/api/jobs/${userId}/batch${params.toString() ? '?' + params.toString() : ''}`, {
      method: 'DELETE',
      body: JSON.stringify(jobIds)
    });
  },

  // Get job statistics - Updated to include user_id in path
  getJobStats(userId) {
    return apiRequest(`/api/jobs/${userId}/status`);
  },

  // Get resumes for a specific job - Updated to include user_id in path
  getJobResumes(userId, jobId) {
    return apiRequest(`/api/jobs/${userId}/${jobId}/resumes`);
  },

  // Legacy method for compatibility
  addJobByUrl(jobUrl, userSettings) {
    return this.analyzeJob(jobUrl, null, userSettings);
  },

  // Legacy methods for compatibility
  getSystemStatus: () => systemApi.getStatus(),
  generateResume: (jobId, settings, customize = true, template = "standard") => {
    return resumeApi.generateResume(jobId, settings, customize, template);
  },
  getResumeYaml: (userId, resumeId) => resumeApi.getResumeYaml(userId, resumeId),
  getResumeStatus: (userId, resumeId) => resumeApi.getResumeStatus(userId, resumeId)
};

// Resume API - Updated to match Python API contract
export const resumeApi = {
  // Generate resume with enhanced settings support
  generateResume(jobId, userSettings, customize = true, template = "standard", handleExisting = "replace") {
    console.log(`Generating resume for job ${jobId} with user settings`);

    const requestBody = {
      job_id: jobId,
      customize: customize,
      template: template,
      user: {
        id: userSettings.userId || auth.currentUser?.uid,
        api_key: userSettings.openaiApiKey || "",
        model: userSettings.model || "gpt-4o"
      }
    };

    // Add resume data if provided
    if (userSettings.resumeData) {
      requestBody.resume_data = userSettings.resumeData;
      console.log("Including user's resume data in generation request");
    }

    // Add includeObjective flag if provided
    if (userSettings.includeObjective !== undefined) {
      requestBody.include_objective = userSettings.includeObjective;
      console.log(`Including include_objective flag: ${userSettings.includeObjective}`);
    }

    const params = new URLSearchParams();
    params.append('handle_existing', handleExisting);

    return apiRequestWithRetry(`/api/resume/generate?${params.toString()}`, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },

  // Get resume status - Updated to include user_id in path
  getResumeStatus(userId, resumeId) {
    return apiRequest(`/api/resume/${userId}/${resumeId}/status`);
  },

  // Download resume - Updated to include user_id in path
  downloadResume(userId, resumeId, format = 'yaml') {
    const params = new URLSearchParams();
    params.append('format', format);

    return apiRequest(`/api/resume/${userId}/${resumeId}/download?${params.toString()}`);
  },

  // Get resume YAML content - Updated to include user_id in path
  async getResumeYaml(userId, resumeId) {
    try {
      const response = await this.downloadResume(userId, resumeId, 'yaml');
      return response.content;
    } catch (error) {
      console.error('Error downloading resume YAML:', error);
      throw error;
    }
  },

  // Upload custom resume - Updated to include user_id in path
  uploadResume(userId, file, jobId = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (jobId) {
      formData.append('job_id', jobId);
    }

    return apiRequest(`/api/resume/${userId}/upload`, {
      method: 'POST',
      body: formData
    });
  },

  // Update resume YAML - Updated to include user_id in path
  updateResumeYaml(userId, resumeId, yamlContent) {
    const formData = new FormData();
    formData.append('yaml_content', yamlContent);

    return apiRequest(`/api/resume/${userId}/${resumeId}/update-yaml`, {
      method: 'POST',
      body: formData
    });
  },

  // Delete resume - Updated to include user_id in path
  deleteResume(userId, resumeId, updateJob = true) {
    const params = new URLSearchParams();
    params.append('update_job', updateJob.toString());

    return apiRequest(`/api/resume/${userId}/${resumeId}?${params.toString()}`, {
      method: 'DELETE'
    });
  },

  // Get user resumes - Updated to include user_id in path
  getUserResumes(userId, params = {}) {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    return apiRequest(`/api/resume/${userId}/${queryString ? '?' + queryString : ''}`);
  },

  // Get active resume generations - Updated to include user_id in path
  getActiveResumeGenerations(userId) {
    return apiRequest(`/api/resume/${userId}/active`);
  },

  // Polling for resume status - Updated to include user_id
  async pollResumeStatus(userId, resumeId, maxAttempts = 20, interval = 3000) {
    let attempts = 0;
    let lastStatus = null;

    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          if (attempts >= maxAttempts) {
            reject(new Error('Resume generation polling timed out after 60 seconds'));
            return;
          }

          const statusData = await this.getResumeStatus(userId, resumeId);
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
};

// Simplify API - Updated to match Python API contract with user_id in path
export const simplifyApi = {
  // Store authentication tokens - Updated to include user_id in path
  storeTokens(userId, tokens) {
    console.log(`🔑 Storing authentication tokens for user ${userId}...`);
    return apiRequest(`/api/simplify/${userId}/store-tokens`, {
      method: 'POST',
      body: JSON.stringify(tokens)
    });
  },

  // Check session validity - Updated to include user_id in path
  checkSession(userId) {
    return apiRequest(`/api/simplify/${userId}/check-session`);
  },

  // Get stored tokens - Updated to include user_id in path
  getStoredTokens(userId) {
    return apiRequest(`/api/simplify/${userId}/get-tokens`);
  },

  // Upload PDF resume to Simplify - Updated to include user_id in path
  uploadResumeToSimplify(userId, pdfBlob, resumeId, jobId = null) {
    console.log('📤 Uploading resume to Simplify via backend proxy...');

    const formData = new FormData();
    const fileName = `resume_${resumeId}.pdf`;
    formData.append('resume_pdf', pdfBlob, fileName);
    formData.append('resume_id', resumeId);

    if (jobId) {
      formData.append('job_id', jobId);
    }

    return apiRequest(`/api/simplify/${userId}/upload-resume-pdf`, {
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