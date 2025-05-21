// Updated Dashboard.js with API client usage
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import JobSearch from "./JobSearch";
import JobList from "./JobList";
import JobDetail from "./JobDetail";
import Navbar from "./Navbar";
import { jobsApi } from "../utils/api";

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showJobSearch, setShowJobSearch] = useState(false);
  const { currentUser, getUserSettings } = useAuth();
  const navigate = useNavigate();
  const [userSettings, setUserSettings] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);

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

        // Use the API client to get system status
        const statusData = await jobsApi.getSystemStatus();
        setSystemStatus(statusData);

        // Use the API client to fetch jobs
        console.log("Fetching jobs with user ID:", currentUser.uid);
        const jobsResponse = await jobsApi.getJobs({
          limit: 100,
          offset: 0
        });

        setJobs(jobsResponse.jobs || []);
      } catch (err) {
        setError("Failed to fetch data: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    // Make sure currentUser is fully loaded before making requests
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
  };

  const handleJobClick = (job) => {
    setSelectedJob(job);
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
    } catch (error) {
      console.error("Failed to update job status:", error);
      setError(`Failed to update job status: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded" role="alert">
            <span className="block sm:inline">{error}</span>
            <button
              className="float-right font-bold"
              onClick={() => setError("")}
            >
              &times;
            </button>
          </div>
        )}

        {systemStatus && systemStatus.status !== "online" && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 mb-4 rounded" role="alert">
            <span className="font-bold">System Status: </span>
            <span className="block sm:inline">{systemStatus.message || "The system is experiencing issues."}</span>
          </div>
        )}

        {/* Main Action Bar */}
        <div className="bg-white rounded-lg shadow mb-6 p-4 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 mb-4 sm:mb-0">Job Applications</h1>
          <button
            onClick={() => setShowJobSearch(!showJobSearch)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm"
          >
            {showJobSearch ? "Close Job Form" : "Add New Job"}
          </button>
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
            />
          </div>

          {/* Job Detail Column */}
          <div className="w-full lg:w-1/2">
            {selectedJob ? (
              <JobDetail
                job={selectedJob}
                onStatusChange={handleStatusChange}
                userId={currentUser.uid}
              />
            ) : (
              <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center min-h-[200px]">
                <p className="text-gray-500">Select a job to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;