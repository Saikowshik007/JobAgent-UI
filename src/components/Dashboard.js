// Dashboard.js - Clean version with proper fixes
import React, { useState, useEffect } from "react";
import { jobsApi, systemApi, resumeApi } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import JobSearch from "./JobSearch";
import JobList from "./JobList";
import JobDetail from "./JobDetail";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ResumeYamlModal from "./ResumeYamlModal";
import SimplifyUploadModal from "./SimplifyUploadModal";
import { Plus, X } from "lucide-react";

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showJobSearch, setShowJobSearch] = useState(false);
  const [userSettings, setUserSettings] = useState(null);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);

  // Modal states
  const [showYamlModal, setShowYamlModal] = useState(false);
  const [resumeYaml, setResumeYaml] = useState(null);
  const [resumeYamlVersion, setResumeYamlVersion] = useState(0);
  const [currentResumeId, setCurrentResumeId] = useState(null);
  const [showSimplifyModal, setShowSimplifyModal] = useState(false);

  const { currentUser, getUserSettings } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    async function fetchData() {
      try {
        const settings = await getUserSettings();
        setUserSettings(settings);
        await systemApi.getStatus();
        const jobsResponse = await jobsApi.getJobs({ limit: 100, offset: 0 });
        setJobs(jobsResponse.jobs || []);
        try {
          await jobsApi.getJobStats();
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

  const handleJobClick = (job) => {
    if (bulkDeleteMode) {
      console.log("Bulk operation not implemented");
    } else {
      console.log("🎯 Selecting job:", job);
      setSelectedJob(job);
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await jobsApi.updateJobStatus(jobId, newStatus);
      const updatedJobs = jobs.map(job => job.id === jobId ? { ...job, status: newStatus } : job);
      setJobs(updatedJobs);
      if (selectedJob && selectedJob.id === jobId)
        setSelectedJob({ ...selectedJob, status: newStatus });
      refreshJobStats();
    } catch (error) {
      console.error("Failed to update job status:", error);
      setError(`Failed to update job status: ${error.message}`);
    }
  };

  const refreshJobStats = async () => {
    try {
      await jobsApi.getJobStats();
    } catch (error) {
      console.warn("Failed to refresh job statistics:", error);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Delete this job?")) return;
    try {
      await jobsApi.deleteJob(jobId, false);
      setJobs(jobs.filter(job => job.id !== jobId));
      if (selectedJob?.id === jobId) setSelectedJob(null);
      refreshJobStats();
    } catch (error) {
      console.error("Failed to delete job:", error);
      setError(`Failed to delete job: ${error.message}`);
    }
  };

  const handleSearchComplete = (newJobs) => {
    console.log("🆕 Jobs received from search:", newJobs);

    if (!Array.isArray(newJobs) || newJobs.length === 0) {
      console.warn("⚠️ No valid jobs received from search");
      return;
    }

    const validatedJobs = newJobs.filter(job => {
      if (!job || !job.id) {
        console.warn("⚠️ Skipping invalid job (missing ID):", job);
        return false;
      }

      console.log("✅ Adding job:", {
        id: job.id,
        title: job.title || job.metadata?.job_title || "No title",
        company: job.company || job.metadata?.company || "No company",
        status: job.status
      });

      return true;
    });

    if (validatedJobs.length === 0) {
      console.error("❌ No valid jobs to add");
      setError("Failed to add jobs - invalid job data received");
      return;
    }

    setJobs(prevJobs => {
      console.log("📝 Current jobs count:", prevJobs.length);
      console.log("📝 Adding jobs count:", validatedJobs.length);
      const updatedJobs = [...validatedJobs, ...prevJobs];
      console.log("📊 Total jobs after adding:", updatedJobs.length);
      return updatedJobs;
    });

    refreshJobStats();

    const firstNewJob = validatedJobs[0];
    if (firstNewJob) {
      console.log("🎯 Auto-selecting first new job:", {
        id: firstNewJob.id,
        title: firstNewJob.title || firstNewJob.metadata?.job_title,
        company: firstNewJob.company || firstNewJob.metadata?.company
      });
      setSelectedJob(firstNewJob);
    }

    setShowJobSearch(false);
  };

  const handleShowYamlModal = async (resumeId) => {
    try {
      setCurrentResumeId(resumeId);
      const yamlContent = await resumeApi.getResumeYaml(resumeId);
      if (yamlContent) {
        setResumeYaml(yamlContent);
        setShowYamlModal(true);
      } else {
        setError('Failed to fetch resume content');
      }
    } catch (error) {
      console.error('Error fetching resume YAML:', error);
      setError(`Failed to fetch resume: ${error.message}`);
    }
  };

  const handleSaveYaml = async (yamlContent, parsedData) => {
    try {
      await resumeApi.updateResumeYaml(currentResumeId, yamlContent);
      setResumeYaml(yamlContent);
      setResumeYamlVersion(prev => prev + 1);

      if (selectedJob && selectedJob.resume_id === currentResumeId) {
        console.log('Resume updated successfully');
      }
    } catch (error) {
      console.error('Error saving resume YAML:', error);
      setError(`Failed to save resume: ${error.message}`);
    }
  };

  const handleShowSimplifyModal = (resumeId) => {
    setCurrentResumeId(resumeId);
    setShowSimplifyModal(true);
  };

  if (loading) return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
  );

  return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-6">
          {/* Header with Add Job Button */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Dashboard</h1>
              <p className="text-gray-600">Manage your job applications and track your progress</p>
              {process.env.NODE_ENV === 'development' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Jobs: {jobs.length} | Selected: {selectedJob ? `${selectedJob.title || 'Untitled'} (${selectedJob.id})` : 'None'}
                  </div>
              )}
            </div>
            <button
                onClick={() => setShowJobSearch(!showJobSearch)}
                className={`
              inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm
              text-sm font-medium text-white transition-all duration-200 transform hover:scale-105
              ${showJobSearch
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500'
                }
              focus:outline-none focus:ring-2 focus:ring-offset-2
            `}
            >
              {showJobSearch ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </>
              ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Job
                  </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                        onClick={() => setError("")}
                        className="text-red-400 hover:text-red-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
          )}

          {/* Job Search Panel with Animation */}
          {showJobSearch && (
              <div className="mb-6 transform transition-all duration-500 ease-in-out animate-in slide-in-from-top-2 fade-in">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <JobSearch
                      onSearchComplete={handleSearchComplete}
                      userSettings={userSettings}
                      userId={currentUser?.uid}
                  />
                </div>
              </div>
          )}

          {/* Main Dashboard Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/2">
              <JobList
                  jobs={jobs}
                  selectedJob={selectedJob}
                  onJobClick={handleJobClick}
                  bulkDeleteMode={bulkDeleteMode}
                  selectedJobs={selectedJobs}
                  onDeleteJob={handleDeleteJob}
              />
            </div>
            <div className="w-full lg:w-1/2">
              {selectedJob ? (
                  <JobDetail
                      job={selectedJob}
                      onStatusChange={handleStatusChange}
                      onDeleteJob={handleDeleteJob}
                      onShowYamlModal={handleShowYamlModal}
                      onShowSimplifyModal={handleShowSimplifyModal}
                      resumeYamlVersion={resumeYamlVersion}
                  />
              ) : (
                  <div className="p-8 bg-white rounded-xl shadow text-center">
                    <div className="text-gray-400 mb-4">
                      <Plus className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Job Selected</h3>
                    <p className="text-gray-600 mb-4">
                      Select a job from the list to view details.
                    </p>
                  </div>
              )}
            </div>
          </div>
        </main>
        <Footer />

        {/* Modals */}
        {showYamlModal && (
            <ResumeYamlModal
                yamlContent={resumeYaml}
                onSave={handleSaveYaml}
                onClose={() => {
                  setShowYamlModal(false);
                  setResumeYaml(null);
                  setCurrentResumeId(null);
                }}
            />
        )}

        {showSimplifyModal && selectedJob && (
            <SimplifyUploadModal
                isOpen={showSimplifyModal}
                onClose={() => {
                  setShowSimplifyModal(false);
                  setCurrentResumeId(null);
                }}
                resumeId={currentResumeId}
                jobId={selectedJob.id}
                resumeYamlVersion={resumeYamlVersion}
                onUploadComplete={() => {
                  setShowSimplifyModal(false);
                  setCurrentResumeId(null);
                }}
            />
        )}
      </div>
  );
}

export default Dashboard;