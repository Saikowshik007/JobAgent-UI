// src/utils/api.js
// Full API client (system, jobs, resume, simplify, health) with user-object support.
// IMPORTANT: For endpoints that depend on FastAPI Depends(get_user), we embed `user`.
// - FormData endpoints: append('user', JSON.stringify(user))
// - JSON endpoints: { ..., user }

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://jobtrackai.duckdns.org'
    : 'http://localhost:8000');

// ------------------------ helpers ------------------------

function assertUser(user, where = 'this call') {
  if (!user || typeof user !== 'object') {
    throw new Error(`A full 'user' object is required for ${where}. Build it from AuthContext/Firestore.`);
  }
  if (!user.id) throw new Error("user.id is required");
  if (user.api_key === undefined) throw new Error("user.api_key must be defined (can be '')");
  if (!user.model) throw new Error("user.model is required");
}

function logDev(...args) {
  if (process.env.NODE_ENV === 'development') console.log(...args);
}

async function apiRequest(endpoint, options = {}) {
  const headers = { ...(options.headers || {}), Accept: 'application/json' };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const user = auth.currentUser;
    if (user) {
      headers['X-User-Id'] = user.uid;
    }
  const cfg = {
    method: 'GET',
    mode: 'cors',
    ...(process.env.NODE_ENV === 'development' && { cache: 'no-cache' }),
    ...options,
    headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  logDev(`[API] ${cfg.method} ${url}`);

  const res = await fetch(url, cfg);
  if (!res.ok) {
    let msg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      msg = j?.detail || j?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  return isJson ? res.json() : res.text();
}

async function apiRequestWithRetry(endpoint, options = {}, maxRetries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequest(endpoint, options);
    } catch (e) {
      lastErr = e;
      // Don’t retry on 4xx or CORS
      const msg = (e && e.message) || '';
      if (msg.includes('HTTP 4') || msg.includes('CORS') || msg.includes('Cross-Origin')) break;
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        logDev(`[API] retrying ${endpoint} in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// ------------------------ System API ------------------------

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
  },
};

// ------------------------ Jobs API ------------------------

export const jobsApi = {
  // GET /api/jobs?status=...&search=...&page=... etc.
  getJobs(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    return apiRequest(`/api/jobs/${qs.toString() ? `?${qs}` : ''}`);
  },

  // GET /api/jobs/{id}
  getJob(jobId) {
    return apiRequest(`/api/jobs/${jobId}`);
  },

  // POST /api/jobs/analyze  (FormData; requires user)
  analyzeJob(jobUrl, { status = null } = {}, user) {
    assertUser(user, 'jobsApi.analyzeJob');
    const form = new FormData();
    form.append('job_url', jobUrl);
    if (status) form.append('status', status);
    form.append('user', JSON.stringify(user)); // <— critical
    return apiRequestWithRetry('/api/jobs/analyze', { method: 'POST', body: form });
  },

  // Optional: analyze pasted description (FormData; requires user)
  analyzeJobDescription(description, { status = null } = {}, user) {
    assertUser(user, 'jobsApi.analyzeJobDescription');
    const form = new FormData();
    form.append('job_description', description);
    if (status) form.append('status', status);
    form.append('user', JSON.stringify(user));
    return apiRequestWithRetry('/api/jobs/analyze-description', { method: 'POST', body: form });
  },

  // PUT /api/jobs/{id}/status
  updateJobStatus(jobId, status) {
    return apiRequest(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // DELETE /api/jobs/{id}?cascade_resumes=true
  deleteJob(jobId, { cascadeResumes = false } = {}) {
    const qs = new URLSearchParams();
    if (cascadeResumes) qs.append('cascade_resumes', 'true');
    return apiRequest(`/api/jobs/${jobId}${qs.toString() ? `?${qs}` : ''}`, {
      method: 'DELETE',
    });
  },

  // DELETE /api/jobs/batch?cascade_resumes=true
  deleteJobsBatch(jobIds, { cascadeResumes = false } = {}) {
    const qs = new URLSearchParams();
    if (cascadeResumes) qs.append('cascade_resumes', 'true');
    return apiRequest(`/api/jobs/batch${qs.toString() ? `?${qs}` : ''}`, {
      method: 'DELETE',
      body: JSON.stringify(jobIds),
    });
  },

  // GET /api/jobs/status
  getJobStats() {
    return apiRequest('/api/jobs/status');
  },

  // GET /api/jobs/{id}/resumes
  getJobResumes(jobId) {
    return apiRequest(`/api/jobs/${jobId}/resumes`);
  },

  // Legacy convenience kept (but now uses user)
  addJobByUrl(jobUrl, user) {
    return this.analyzeJob(jobUrl, {}, user);
  },

  // Legacy passthroughs preserved for callers that reference through jobsApi
  getSystemStatus: () => systemApi.getStatus(),
  generateResume: (jobId, settings, customize = true, template = 'standard', handleExisting = 'replace', user) =>
    resumeApi.generateResume(jobId, { ...settings, customize, template, handleExisting }, user),
  getResumeYaml: (resumeId) => resumeApi.getResumeYaml(resumeId),
  getResumeStatus: (resumeId) => resumeApi.getResumeStatus(resumeId),
};

// ------------------------ Resume API ------------------------

export const resumeApi = {
  // POST /api/resume/generate  (JSON; requires user)
  generateResume(
    jobId,
    {
      resumeData = null,
      includeObjective = undefined,
      customize = true,
      template = 'standard',
      handleExisting = 'replace',
    } = {},
    user
  ) {
    assertUser(user, 'resumeApi.generateResume');

    const body = {
      job_id: jobId,
      customize,
      template,
      user, // <— critical
    };
    if (resumeData) body.resume_data = resumeData;
    if (includeObjective !== undefined) body.include_objective = includeObjective;

    const qs = new URLSearchParams({ handle_existing: handleExisting });

    return apiRequest(`/api/resume/generate?${qs.toString()}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // GET /api/resume/{id}/status
  getResumeStatus(resumeId) {
    return apiRequest(`/api/resume/${resumeId}/status`);
  },

  // Poll status utility (client-side)
  async pollResumeStatus(resumeId, { interval = 2000, maxAttempts = 30 } = {}) {
    let attempts = 0;
    let last = null;

    return new Promise((resolve, reject) => {
      const tick = async () => {
        try {
          if (attempts >= maxAttempts) return reject(new Error('Resume generation polling timed out'));
          const data = await this.getResumeStatus(resumeId);
          attempts++;

          if (data.status !== last) {
            logDev(`[Resume] status ${attempts}/${maxAttempts}: ${data.status}`);
            last = data.status;
          }

          if (data.status === 'completed') return resolve(data);
          if (['error', 'failed'].includes(data.status)) return reject(new Error(data.message || 'Resume failed'));

          setTimeout(tick, interval);
        } catch (e) {
          if (attempts >= 5) return reject(e);
          setTimeout(tick, interval * 2);
        }
      };
      tick();
    });
  },

  // GET /api/resume/{id}/download?format=yaml|pdf|...
  downloadResume(resumeId, format = 'yaml') {
    const qs = new URLSearchParams({ format });
    return apiRequest(`/api/resume/${resumeId}/download?${qs.toString()}`);
  },

  // Convenience: fetch YAML as text via download endpoint
  async getResumeYaml(resumeId) {
    return this.downloadResume(resumeId, 'yaml');
  },

  // POST /api/resume/upload (multipart file; job_id optional)
  uploadResume(file, { jobId = null } = {}) {
    const form = new FormData();
    form.append('file', file);
    if (jobId) form.append('job_id', jobId);
    return apiRequest('/api/resume/upload', { method: 'POST', body: form });
  },

  // POST /api/resume/{id}/update-yaml (multipart form)
  updateResumeYaml(resumeId, yamlContent) {
    const form = new FormData();
    form.append('yaml_content', yamlContent);
    return apiRequest(`/api/resume/${resumeId}/update-yaml`, { method: 'POST', body: form });
  },

  // DELETE /api/resume/{id}?update_job=true
  deleteResume(resumeId, { updateJob = true } = {}) {
    const qs = new URLSearchParams({ update_job: String(updateJob) });
    return apiRequest(`/api/resume/${resumeId}?${qs.toString()}`, { method: 'DELETE' });
  },

  // GET /api/resume?status=...
  getUserResumes(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    return apiRequest(`/api/resume/${qs.toString() ? `?${qs}` : ''}`);
  },

  // GET /api/resume/active
  getActiveResumeGenerations() {
    return apiRequest('/api/resume/active');
  },
};

// ------------------------ Simplify API ------------------------

export const simplifyApi = {
  // POST /api/simplify/store-tokens
  storeTokens(tokens) {
    return apiRequest('/api/simplify/store-tokens', {
      method: 'POST',
      body: JSON.stringify(tokens),
    });
  },

  // GET /api/simplify/check-session
  checkSession() {
    return apiRequest('/api/simplify/check-session');
  },

  // POST /api/simplify/login
  login(credentials) {
    return apiRequest('/api/simplify/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // POST /api/simplify/upload-resume-pdf (multipart)
  uploadResumePDF(file, { jobId = null } = {}) {
    const form = new FormData();
    form.append('file', file);
    if (jobId) form.append('job_id', jobId);
    return apiRequest('/api/simplify/upload-resume-pdf', { method: 'POST', body: form });
  },

  // Utility for your token storage logic if needed elsewhere
  getCurrentUserId(getAuthUser) {
    const u = typeof getAuthUser === 'function' ? getAuthUser() : null;
    return u?.uid || 'default_user';
  },
};

// ------------------------ Health / CORS utilities ------------------------

export const healthCheck = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/status`, {
      method: 'GET',
      mode: 'cors',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const j = await res.json();
    return { ok: true, data: j };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};

export const testCORS = async () => {
  try {
    const optionsRes = await fetch(`${API_BASE_URL}/api/status`, {
      method: 'OPTIONS',
      mode: 'cors',
      headers: {
        Origin: window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    const getOk = await systemApi.getStatus().then(() => true).catch(() => false);

    return {
      optionsOk: optionsRes.ok,
      getOk,
      corsConfigured: optionsRes.headers.get('access-control-allow-origin') !== null,
    };
  } catch (e) {
    return { optionsOk: false, getOk: false, corsConfigured: false, error: e.message };
  }
};
