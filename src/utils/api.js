import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { jobsApi, resumeApi } from '../services/api';

function JobsComponent() {
  const { currentUser, getUserSettingsForApi } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userSettings, setUserSettings] = useState(null);
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Load user settings on component mount
  useEffect(() => {
    async function loadUserSettings() {
      try {
        const settings = await getUserSettingsForApi();
        setUserSettings(settings);
      } catch (err) {
        console.error('Failed to load user settings:', err);
      }
    }

    if (currentUser) {
      loadUserSettings();
    }
  }, [currentUser, getUserSettingsForApi]);

  // Load jobs using the new API contract (user_id is handled automatically)
  useEffect(() => {
    async function loadJobs() {
      if (!currentUser) return;

      try {
        setLoading(true);
        // No need to pass user_id - it's handled automatically by the API client
        const response = await jobsApi.getJobs({
          limit: 50,
          offset: 0
        });
        setJobs(response.jobs || []);
      } catch (err) {
        setError('Failed to load jobs: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, [currentUser]);

  // Add job by URL using new API structure
  const handleAddJobByUrl = async (jobUrl) => {
    if (!userSettings) {
      setError('User settings not loaded');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // User ID is handled automatically by the API client
      const response = await jobsApi.analyzeJob(jobUrl, 'new', userSettings);

      // Refresh jobs list
      const updatedJobs = await jobsApi.getJobs();
      setJobs(updatedJobs.jobs || []);

      setJobUrl('');
      console.log('Job added successfully:', response);
    } catch (err) {
      setError('Failed to add job: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add job by description using new API endpoint
  const handleAddJobByDescription = async (description) => {
    if (!userSettings) {
      setError('User settings not loaded');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // User ID is handled automatically by the API client
      const response = await jobsApi.analyzeJobDescription(description, 'new', userSettings);

      // Refresh jobs list
      const updatedJobs = await jobsApi.getJobs();
      setJobs(updatedJobs.jobs || []);

      setJobDescription('');
      console.log('Job added from description successfully:', response);
    } catch (err) {
      setError('Failed to add job from description: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update job status using new API structure
  const handleUpdateJobStatus = async (jobId, newStatus) => {
    try {
      // User ID is handled automatically by the API client
      await jobsApi.updateJobStatus(jobId, newStatus);

      // Update local state
      setJobs(jobs.map(job =>
        job.id === jobId ? { ...job, status: newStatus } : job
      ));
    } catch (err) {
      setError('Failed to update job status: ' + err.message);
    }
  };

  // Delete job using new API structure
  const handleDeleteJob = async (jobId, cascadeResumes = false) => {
    try {
      // User ID is handled automatically by the API client
      await jobsApi.deleteJob(jobId, cascadeResumes);

      // Remove from local state
      setJobs(jobs.filter(job => job.id !== jobId));
    } catch (err) {
      setError('Failed to delete job: ' + err.message);
    }
  };

  // Generate resume using new API structure
  const handleGenerateResume = async (jobId) => {
    if (!userSettings) {
      setError('User settings not loaded');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Get user's resume data from Firebase/settings
      const settingsWithResumeData = {
        ...userSettings,
        resumeData: null, // This would be loaded from your resume store
        includeObjective: userSettings.includeObjective
      };

      // Generate resume using new API structure (user ID handled automatically)
      const response = await resumeApi.generateResume(
        jobId,
        settingsWithResumeData,
        true, // customize
        'standard', // template
        'replace' // handle_existing
      );

      console.log('Resume generation started:', response);

      // Poll for completion if needed (user ID handled automatically)
      if (response.resume_id) {
        const finalStatus = await resumeApi.pollResumeStatus(response.resume_id);
        console.log('Resume generation completed:', finalStatus);
      }

    } catch (err) {
      setError('Failed to generate resume: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get job resumes using new API structure
  const handleGetJobResumes = async (jobId) => {
    try {
      // User ID is handled automatically by the API client
      const response = await jobsApi.getJobResumes(jobId);
      console.log('Job resumes:', response.resumes);
      return response.resumes;
    } catch (err) {
      setError('Failed to get job resumes: ' + err.message);
      return [];
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading jobs...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Job Management</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* User Settings Info */}
      {userSettings && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
          <h3 className="font-medium text-blue-900">Current Settings:</h3>
          <p className="text-sm text-blue-700">
            Model: {userSettings.model} |
            API Key: {userSettings.openaiApiKey ? '✓ Configured' : '✗ Not set'} |
            Include Objective: {userSettings.includeObjective ? 'Yes' : 'No'}
          </p>
        </div>
      )}

      {/* Add Job by URL */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Add Job by URL</h2>
        <div className="flex gap-4">
          <input
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://company.com/job-posting"
            className="flex-1 border border-gray-300 rounded px-3 py-2"
          />
          <button
            onClick={() => handleAddJobByUrl(jobUrl)}
            disabled={!jobUrl || loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Add Job
          </button>
        </div>
      </div>

      {/* Add Job by Description */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Add Job by Description</h2>
        <div className="space-y-4">
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description text here..."
            rows={6}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <button
            onClick={() => handleAddJobByDescription(jobDescription)}
            disabled={!jobDescription || loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Add Job from Description
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Your Jobs ({jobs.length})</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {jobs.map((job) => (
            <div key={job.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {job.metadata?.title || 'Job Title Not Available'}
                  </h3>
                  <p className="text-gray-600">
                    {job.metadata?.company || 'Company Not Available'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Status: <span className="font-medium">{job.status}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Added: {new Date(job.date_found).toLocaleDateString()}
                  </p>
                  {job.metadata?.input_method === 'description' && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      From Description
                    </span>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <select
                    value={job.status}
                    onChange={(e) => handleUpdateJobStatus(job.id, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="new">New</option>
                    <option value="applied">Applied</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="rejected">Rejected</option>
                    <option value="offered">Offered</option>
                  </select>

                  <button
                    onClick={() => handleGenerateResume(job.id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Generate Resume
                  </button>

                  <button
                    onClick={() => handleGetJobResumes(job.id)}
                    className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                  >
                    View Resumes
                  </button>

                  <button
                    onClick={() => handleDeleteJob(job.id, false)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {jobs.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No jobs found. Add your first job using the forms above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobsComponent;
