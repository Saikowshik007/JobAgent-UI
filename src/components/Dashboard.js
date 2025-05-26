import { jobsApi, systemApi } from "../utils/api";
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import JobSearch from "./JobSearch";
import JobList from "./JobList";
import JobDetail from "./JobDetail";
import Navbar from "./Navbar";
import Footer from "./Footer";

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showJobSearch, setShowJobSearch] = useState(false);
  const [userSettings, setUserSettings] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [jobStats, setJobStats] = useState(null);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);

  const { currentUser, getUserSettings } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    async function fetchData() {
      try {
        // Fetch user settings from Firebase
        const settings = await getUserSettings();
        setUserSettings(settings);

        // Fetch system status
        const statusData = await systemApi.getStatus();
        setSystemStatus(statusData);

        // Fetch jobs
        console.log("Fetching jobs with user ID:", currentUser.uid);
        const jobsResponse = await jobsApi.getJobs({
          limit: 100,
          offset: 0
        });

        setJobs(jobsResponse.jobs || []);

        // Fetch job statistics
        try {
          const statsData = await jobsApi.getJobStats();
          setJobStats(statsData);
        } catch (statsError) {
          console.warn("Failed to fetch job statistics:", statsError);
        }

      } catch (err) {
        setError("Failed to fetch data: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    if (currentUser.uid) {
      fetchData();
    } else {
      setError("User authentication not complete. Please wait or refresh.");
    }
  }, [currentUser, navigate, getUserSettings]);

  const handleSearchComplete = (newJobs) => {
    setJobs(prevJobs => {
      // Add only jobs that don't already exist in the list
      const existingJobIds = new Set(prevJobs.map(job => job.id));
      const uniqueNewJobs = newJobs.filter(job => !existingJobIds.has(job.id));
      return [...uniqueNewJobs, ...prevJobs];
    });
    // Close the job search panel after adding a job
    setShowJobSearch(false);

    // Refresh job stats
    refreshJobStats();
  };

  const handleJobClick = (job) => {
    if (bulkDeleteMode) {
      toggleJobSelection(job.id);
    } else {
      setSelectedJob(job);
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      // Use the API client to update job status
      await jobsApi.updateJobStatus(jobId, newStatus);

      // Update the job status in the UI
      const updatedJobs = jobs.map(job =>
        job.id === jobId ? { ...job, status: newStatus } : job
      );
      setJobs(updatedJobs);

      // Update the selected job if it's the one being modified
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob({ ...selectedJob, status: newStatus });
      }

      // Refresh job stats
      refreshJobStats();
    } catch (error) {
      console.error("Failed to update job status:", error);
      setError(`Failed to update job status: ${error.message}`);
    }
  };

  const refreshJobStats = async () => {
    try {
      const statsData = await jobsApi.getJobStats();
      setJobStats(statsData);
    } catch (error) {
      console.warn("Failed to refresh job statistics:", error);
    }
  };

  const toggleJobSelection = (jobId) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedJobs.size === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedJobs.size} job(s)? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      const jobIds = Array.from(selectedJobs);
      await jobsApi.deleteJobsBatch(jobIds, false); // Don't cascade delete resumes by default

      // Remove deleted jobs from the UI
      const remainingJobs = jobs.filter(job => !selectedJobs.has(job.id));
      setJobs(remainingJobs);

      // Clear selection and exit bulk mode
      setSelectedJobs(new Set());
      setBulkDeleteMode(false);

      // Clear selected job if it was deleted
      if (selectedJob && selectedJobs.has(selectedJob.id)) {
        setSelectedJob(null);
      }

      // Refresh stats
      refreshJobStats();

    } catch (error) {
      console.error("Failed to delete jobs:", error);
      setError(`Failed to delete jobs: ${error.message}`);
    }
  };

  const handleDeleteJob = async (jobId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this job? This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      await jobsApi.deleteJob(jobId, false); // Don't cascade delete resumes by default

      // Remove job from the UI
      const remainingJobs = jobs.filter(job => job.id !== jobId);
      setJobs(remainingJobs);

      // Clear selected job if it was deleted
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(null);
      }

      // Refresh stats
      refreshJobStats();

    } catch (error) {
      console.error("Failed to delete job:", error);
      setError(`Failed to delete job: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your job dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />

      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 flex-grow">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded" role="alert">
            <div className="flex justify-between items-center">
              <span className="block sm:inline">{error}</span>
              <button
                className="font-bold ml-4"
                onClick={() => setError("")}
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {systemStatus && systemStatus.status !== "online" && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 mb-4 rounded" role="alert">
            <span className="font-bold">System Status: </span>
            <span className="block sm:inline">{systemStatus.message || "The system is experiencing issues."}</span>
          </div>
        )}

        {/* Job Statistics Dashboard */}
        {jobStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                  <p className="text-2xl font-semibold text-gray-900">{jobStats.total_jobs || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Applied</p>
                  <p className="text-2xl font-semibold text-gray-900">{jobStats.status_counts?.APPLIED || 0}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Interview</p>
                  <p className="text-2xl font-semibold text-gray-900">{jobStats.status_counts?.INTERVIEW || 0}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Resumes Generated</p>
                  <p className="text-2xl font-semibold text-gray-900">{jobStats.resumes_generated || 0}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Action Bar */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Job Applications</h1>

            <div className="flex flex-wrap gap-2">
              {/* Bulk actions */}
              {jobs.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      setBulkDeleteMode(!bulkDeleteMode);
                      setSelectedJobs(new Set());
                    }}
                    className={`px-3 py-2 text-sm font-medium rounded-md shadow-sm ${
                      bulkDeleteMode
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    {bulkDeleteMode ? "Cancel Bulk Delete" : "Bulk Delete"}
                  </button>

                  {bulkDeleteMode && selectedJobs.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm"
                    >
                      Delete Selected ({selectedJobs.size})
                    </button>
                  )}
                </>
              )}

              {/* Cache management */}
              <button
                onClick={systemApi.clearCache}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
              >
                Clear Cache
              </button>

              {/* Add job button */}
              <button
                onClick={() => setShowJobSearch(!showJobSearch)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm"
              >
                {showJobSearch ? "Close Job Form" : "Add New Job"}
              </button>
            </div>
          </div>

          {/* Bulk delete instructions */}
          {bulkDeleteMode && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>Bulk Delete Mode:</strong> Click on jobs to select them for deletion.
                Selected jobs will be highlighted. Click "Delete Selected" when ready.
              </p>
            </div>
          )}
        </div>

        {/* Job Search Panel (collapsible) */}
        {showJobSearch && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <JobSearch
              onSearchComplete={handleSearchComplete}
              userSettings={userSettings}
              userId={currentUser.uid}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Job List Column */}
          <div className="w-full lg:w-1/2">
            <JobList
              jobs={jobs}
              userId={currentUser.uid}
              selectedJob={selectedJob}
              onJobClick={handleJobClick}
              bulkDeleteMode={bulkDeleteMode}
              selectedJobs={selectedJobs}
              onDeleteJob={handleDeleteJob}
            />
          </div>

          {/* Job Detail Column */}
          <div className="w-full lg:w-1/2">
            {selectedJob ? (
              <JobDetail
                job={selectedJob}
                onStatusChange={handleStatusChange}
                userId={currentUser.uid}
                onDeleteJob={handleDeleteJob}
              />
            ) : (
              <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                  </svg>
                  <p className="mt-2 text-gray-500">
                    {bulkDeleteMode
                      ? "Select jobs from the list to delete them"
                      : "Select a job to view details"
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;