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

// Resume API functions using authenticated requests
export const resumeApi = {
  /**
   * Generate a tailored resume for a job
   * @param {string} jobId - The ID of the job to generate resume for
   * @param {boolean} customize - Whether to customize the resume for the job
   * @param {string} template - Template to use (default: "standard")
   * @returns {Promise<Object>} - Resume generation info
   */
  generateResume(jobId,settings, customize = true, template = "standard") {
    return apiRequest('/api/resume/generate', {
      method: 'POST',
        headers: {
          'x-api-key': settings.openaiApiKey
        },
      body: JSON.stringify({
        job_id: jobId,
        customize: customize,
        template: template
      })
    });
  },

  /**
   * Get the status of a resume generation process
   * @param {string} resumeId - ID of the resume to check
   * @returns {Promise<Object>} - Resume status data
   */
  getResumeStatus(resumeId) {
    return apiRequest(`/api/resume/${resumeId}/status`);
  },

  /**
   * Poll resume generation status until complete
   * @param {string} resumeId - ID of the resume to check
   * @param {number} maxAttempts - Maximum number of polling attempts
   * @param {number} interval - Polling interval in milliseconds
   * @returns {Promise<Object>} - Final resume data
   */
  async pollResumeStatus(resumeId, maxAttempts = 30, interval = 2000) {
    let attempts = 0;

    // Create a promise that resolves when resume generation is complete
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const statusData = await this.getResumeStatus(resumeId);

          if (statusData.status === 'completed') {
            resolve(statusData);
            return;
          }

          if (statusData.status === 'error') {
            reject(new Error(statusData.message || 'Resume generation failed'));
            return;
          }

          // If still generating and under max attempts, check again
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkStatus, interval);
          } else {
            reject(new Error('Resume generation timed out'));
          }
        } catch (error) {
          reject(error);
        }
      };

      // Start checking status
      checkStatus();
    });
  },

  /**
   * Download a generated resume
   * @param {string} resumeId - ID of the resume to download
   * @param {string} format - Format to download (pdf or yaml)
   */
  downloadResume(resumeId, format = 'pdf') {
    // Create download URL with auth headers if possible
    const user = auth.currentUser;
    const authHeader = user ? `?x_user_id=${user.uid}` : '';

    // Create a hidden download link and click it
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/api/resume/${resumeId}/download${authHeader}&format=${format}`;
    link.download = `resume_${resumeId}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Upload a resume to Simplify
   * @param {string} jobId - The ID of the job to upload resume for
   * @param {string} resumeId - Optional resume ID (if not using job's default resume)
   * @returns {Promise<Object>} - Upload result
   */
  uploadToSimplify(jobId, resumeId = null) {
    return apiRequest('/api/resume/upload-to-simplify', {
      method: 'POST',
      body: JSON.stringify({
        job_id: jobId,
        resume_id: resumeId
      })
    });
  },

  /**
   * Upload a custom resume file
   * @param {File} file - The resume file to upload
   * @param {string} jobId - Optional job ID to associate with the resume
   * @returns {Promise<Object>} - Upload result
   */
  async uploadResumeFile(file, jobId = null) {
    const user = auth.currentUser;

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    if (jobId) {
      formData.append('job_id', jobId);
    }

    // Headers for multipart form data (don't set Content-Type, browser will set it)
    const headers = {
      ...(user && { 'x_user_id': user.uid })
    };

    try {
      console.log(`Uploading resume file to ${API_BASE_URL}/api/resume/upload`);
      const response = await fetch(`${API_BASE_URL}/api/resume/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail ||
          `Upload failed with status ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading resume file:', error);
      throw error;
    }
  }
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

  // Update job status
  updateJobStatus: (jobId, status) => {
    return apiRequest(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // Resume generation methods using resumeApi
  generateResume: (jobId, customize = true, template = "standard") => {
    return resumeApi.generateResume(jobId, customize, template);
  },

  uploadToSimplify: (jobId, resumeId = null) => {
    return resumeApi.uploadToSimplify(jobId, resumeId);
  },

  downloadResume: (resumeId, format = 'pdf') => {
    resumeApi.downloadResume(resumeId, format);
  },

  getResumeStatus: (resumeId) => {
    return resumeApi.getResumeStatus(resumeId);
  }
};