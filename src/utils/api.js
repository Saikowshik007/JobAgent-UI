// src/utils/api.js - Updated with fixed Simplify API calls

import { auth } from '../firebase/firebase';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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
    ...(options.headers || {}),
    ...(user && { 'X-User-Id': user.uid })
  };

  // Don't set Content-Type for FormData requests as it will be set automatically with boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

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

// Special API request function for Simplify endpoints that handles empty responses
async function simplifyApiRequest(endpoint, options = {}) {
  const user = auth.currentUser;

  console.log(`Making Simplify request to ${endpoint}`);
  console.log(`Current user:`, user ? `${user.uid} (authenticated)` : 'No user (unauthenticated)');

  if (!user) {
    console.warn("No authenticated user! Request will use default user_id on server.");
  }

  const headers = {
    ...(options.headers || {}),
    ...(user && { 'X-User-Id': user.uid })
  };

  // Don't set Content-Type for FormData requests
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  logHeaders(headers);

  const config = {
    ...options,
    headers
  };

  try {
    // FIX: Add the missing API_BASE_URL here
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log(`Sending request to ${fullUrl}`);
    const response = await fetch(fullUrl, config);
    console.log(`Response status: ${response.status} ${response.statusText}`);

    // Get response text first
    const responseText = await response.text();
    console.log(`Response text length: ${responseText.length}`);
    console.log(`Response text: ${responseText}`);

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}: ${response.statusText}`;

      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData?.detail || errorData?.message || errorMessage;
        } catch (parseError) {
          console.log('Failed to parse error response as JSON');
          errorMessage = responseText || errorMessage;
        }
      }

      throw new Error(errorMessage);
    }

    // Handle empty response
    if (!responseText || responseText.trim() === '') {
      console.log('Empty response - assuming success');
      return { message: 'Success', status: 'ok' };
    }

    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(responseText);
      console.log('Parsed JSON response:', jsonData);
      return jsonData;
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.log('Raw response:', responseText);

      // If response is successful but not JSON, return a success object
      if (response.status >= 200 && response.status < 300) {
        return {
          message: 'Success',
          status: 'ok',
          raw_response: responseText
        };
      } else {
        throw new Error('Invalid response format');
      }
    }

  } catch (error) {
    console.error(`Simplify API request to ${endpoint} failed:`, error);
    throw error;
  }
}

export const resumeApi = {
  /**
   * Generate a tailored resume for a job
   * @param {string} jobId - The ID of the job to generate resume for
   * @param {object} settings - User settings containing the API key and resume data
   * @param {boolean} customize - Whether to customize the resume for the job
   * @param {string} template - Template to use (default: "standard")
   * @returns {Promise<Object>} - Resume generation info
   */
  generateResume(jobId, settings, customize = true, template = "standard") {
    // Extract API key and resume data from settings
    const apiKey = settings?.openaiApiKey || "";
    const resumeData = settings?.resumeData || null;

    console.log(`Generating resume for job ${jobId} with resume data: ${resumeData ? 'Present' : 'Not provided'}`);

    // Build request body
    const requestBody = {
      job_id: jobId,
      customize: customize,
      template: template
    };

    // Include resume data if available
    if (resumeData) {
      requestBody.resume_data = resumeData;
      console.log("Including user's resume data in generation request");
    } else {
      console.warn("No resume data provided for job-specific customization");
    }

    return apiRequest('/api/resume/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey
      },
      body: JSON.stringify(requestBody)
    });
  },

  // Get resume status - with polling limitation to prevent API spamming
  getResumeStatus(resumeId) {
    return apiRequest(`/api/resume/${resumeId}/status`);
  },

  // Add a polling mechanism with delay to prevent API spamming
  async pollResumeStatus(resumeId, maxAttempts = 10, interval = 3000) {
    let attempts = 0;
    let lastStatus = null;

    // Create a promise that resolves when resume generation is complete
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          // Don't make a request if we've reached max attempts
          if (attempts >= maxAttempts) {
            reject(new Error('Resume generation polling timed out'));
            return;
          }

          const statusData = await this.getResumeStatus(resumeId);
          attempts++;

          // Only log if status has changed to reduce console noise
          if (!lastStatus || lastStatus !== statusData.status) {
            console.log(`Resume status (attempt ${attempts}/${maxAttempts}): ${statusData.status}`);
            lastStatus = statusData.status;
          }

          if (statusData.status === 'completed') {
            resolve(statusData);
            return;
          }

          if (statusData.status === 'error') {
            reject(new Error(statusData.message || 'Resume generation failed'));
            return;
          }

          // If still generating, wait and check again
          setTimeout(checkStatus, interval);
        } catch (error) {
          reject(error);
        }
      };

      // Start checking status
      checkStatus();
    });
  },

  // Get YAML content only - no PDF download anymore
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

      const user = auth.currentUser;
      const headers = {
        ...(user && { 'X-User-Id': user.uid })
      };

      const response = await fetch(`${API_BASE_URL}/api/resume/${resumeId}/update-yaml`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail ||
          `API request failed with status ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`Error saving resume YAML:`, error);
      throw error;
    }
  },

};

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

  // Get a specific job by ID
  getJob: (jobId) => {
    return apiRequest(`/api/jobs/${jobId}`);
  },

  saveResumeYaml: (resumeId, yamlContent) => {
    return resumeApi.saveResumeYaml(resumeId, yamlContent);
  },

  // Update job status
  updateJobStatus: (jobId, status) => {
    return apiRequest(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // Resume generation methods using resumeApi
  generateResume: (jobId, settings, customize = true, template = "standard") => {
    return resumeApi.generateResume(jobId, settings, customize, template);
  },

  uploadToSimplify: (jobId, resumeId = null) => {
    return resumeApi.uploadToSimplify(jobId, resumeId);
  },

  // Get YAML content only
  getResumeYaml: (resumeId) => {
    return resumeApi.getResumeYaml(resumeId);
  },

  getResumeStatus: (resumeId) => {
    return resumeApi.getResumeStatus(resumeId);
  },

  // NEW METHOD: Add a job by URL
  addJobByUrl: (jobUrl, apiKey) => {
    // Create FormData object as the API expects form data, not JSON
    const formData = new FormData();
    formData.append('job_url', jobUrl);

    return apiRequest('/api/jobs/analyze', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey
      },
      body: formData
    });
  }
};

// Updated Simplify API with special handling
export const simplifyApi = {
  // Store session data for a user
  storeSession: (sessionData) => {
    return simplifyApiRequest('/api/simplify/store-session', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  },

  // Upload resume to Simplify using stored session
  uploadResume: (resumeId, jobId = null) => {
    return simplifyApiRequest('/api/simplify/upload-resume', {
      method: 'POST',
      body: JSON.stringify({
        resume_id: resumeId,
        job_id: jobId
      })
    });
  },

  // Check if user has valid session
  checkSession: () => {
    return simplifyApiRequest('/api/simplify/check-session');
  }
};