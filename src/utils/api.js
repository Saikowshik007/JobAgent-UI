// src/utils/api.js
// Clean API client: expects a full `user` object to be passed in from the UI.
// No legacy headers, no Firebase lookups here.

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://jobtrackai.duckdns.org'
    : 'http://localhost:8000');

// ------------------------ core fetch wrapper ------------------------

async function apiRequest(endpoint, options = {}) {
  const headers = { ...(options.headers || {}), Accept: 'application/json' };

  // If body is FormData, DON'T set Content-Type (browser will set it)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    mode: 'cors',
    // Do not force credentials here; caller can add if needed
    ...(process.env.NODE_ENV === 'development' && { cache: 'no-cache' }),
    ...options,
    headers,
  });

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

function assertUser(user) {
  if (!user || typeof user !== 'object') {
    throw new Error('API call requires a `user` object. Pass it from AuthContext/Firestore.');
  }
  if (!user.id) {
    throw new Error('`user.id` is required.');
  }
  if (!user.model) {
    throw new Error('`user.model` is required.');
  }
  // api_key may be empty string if you don’t store keys
  if (user.api_key === undefined) {
    throw new Error('`user.api_key` must be defined (can be an empty string).');
  }
}

// ------------------------ API Groups ------------------------

export const systemApi = {
  getStatus: () => apiRequest('/api/status'),
  clearCache: () => apiRequest('/api/cache/clear', { method: 'DELETE' }),
  cleanupCache: () => apiRequest('/api/cache/cleanup', { method: 'POST' }),
  getCacheStats: () => apiRequest('/api/cache/stats'),
};

export const jobsApi = {
  list(params = {}, user) {
    assertUser(user);
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    // Include user on read-only endpoints only if your backend expects it (most don't).
    return apiRequest(`/api/jobs/${qs.toString() ? `?${qs}` : ''}`);
  },

  get(jobId, user) {
    assertUser(user);
    return apiRequest(`/api/jobs/${jobId}`);
  },

  /**
   * POST /api/jobs/analyze
   * Backend expects Form(...) fields and a full `user` via Depends(get_user).
   */
  analyze(jobUrl, { status = null } = {}, user) {
    assertUser(user);
    const form = new FormData();
    form.append('job_url', jobUrl);
    if (status) form.append('status', status);
    form.append('user', JSON.stringify(user));
    return apiRequest('/api/jobs/analyze', { method: 'POST', body: form });
  },

  analyzeDescription(description, { status = null } = {}, user) {
    assertUser(user);
    const form = new FormData();
    form.append('job_description', description);
    if (status) form.append('status', status);
    form.append('user', JSON.stringify(user));
    return apiRequest('/api/jobs/analyze-description', { method: 'POST', body: form });
  },

  updateStatus(jobId, status, user) {
    assertUser(user);
    return apiRequest(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  delete(jobId, { cascadeResumes = false } = {}, user) {
    assertUser(user);
    const qs = new URLSearchParams();
    if (cascadeResumes) qs.append('cascade_resumes', 'true');
    return apiRequest(`/api/jobs/${jobId}${qs.toString() ? `?${qs}` : ''}`, {
      method: 'DELETE',
    });
  },

  deleteBatch(jobIds, { cascadeResumes = false } = {}, user) {
    assertUser(user);
    const qs = new URLSearchParams();
    if (cascadeResumes) qs.append('cascade_resumes', 'true');
    return apiRequest(`/api/jobs/batch${qs.toString() ? `?${qs}` : ''}`, {
      method: 'DELETE',
      body: JSON.stringify(jobIds),
    });
  },

  statusCounts(user) {
    assertUser(user);
    return apiRequest('/api/jobs/status');
  },

  resumes(jobId, user) {
    assertUser(user);
    return apiRequest(`/api/jobs/${jobId}/resumes`);
  },
};

export const resumeApi = {
  /**
   * POST /api/resume/generate
   * Body is JSON and includes the `user` object.
   */
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
    assertUser(user);

    const body = {
      job_id: jobId,
      customize,
      template,
      user, // <— critical: send the full user object here
    };
    if (resumeData) body.resume_data = resumeData;
    if (includeObjective !== undefined) body.include_objective = includeObjective;

    const qs = new URLSearchParams({ handle_existing: handleExisting });

    return apiRequest(`/api/resume/generate?${qs.toString()}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getResumeStatus(resumeId, user) {
    assertUser(user);
    return apiRequest(`/api/resume/${resumeId}/status`);
  },

  downloadResume(resumeId, format = 'yaml', user) {
    assertUser(user);
    const qs = new URLSearchParams({ format });
    return apiRequest(`/api/resume/${resumeId}/download?${qs.toString()}`);
  },

  uploadResume(file, { jobId = null } = {}, user) {
    assertUser(user);
    const form = new FormData();
    form.append('file', file);
    if (jobId) form.append('job_id', jobId);
    // If your backend needs user here, include it too:
    // form.append('user', JSON.stringify(user));
    return apiRequest('/api/resume/upload', { method: 'POST', body: form });
  },

  updateResumeYaml(resumeId, yamlContent, user) {
    assertUser(user);
    const form = new FormData();
    form.append('yaml_content', yamlContent);
    // If needed: form.append('user', JSON.stringify(user));
    return apiRequest(`/api/resume/${resumeId}/update-yaml`, {
      method: 'POST',
      body: form,
    });
  },

  deleteResume(resumeId, { updateJob = true } = {}, user) {
    assertUser(user);
    const qs = new URLSearchParams({ update_job: String(updateJob) });
    return apiRequest(`/api/resume/${resumeId}?${qs.toString()}`, { method: 'DELETE' });
  },

  getUserResumes(params = {}, user) {
    assertUser(user);
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    return apiRequest(`/api/resume/${qs.toString() ? `?${qs}` : ''}`);
  },

  getActiveResumeGenerations(user) {
    assertUser(user);
    return apiRequest('/api/resume/active');
  },
};
