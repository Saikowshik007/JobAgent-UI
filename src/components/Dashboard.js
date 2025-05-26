// Enhanced Dashboard.js with beautiful animations and effects
import React, { useState, useEffect } from "react";
import { 
  Briefcase, Building2, Users, Trophy, FileText, Plus, Trash2, 
  RefreshCw, Settings, TrendingUp, Target, CheckCircle, 
  BarChart3, PieChart, Activity, Zap, AlertTriangle
} from "lucide-react";

// Mock components for demo - replace with your actual imports
const JobSearch = ({ onSearchComplete, userSettings, userId }) => (
  <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
    <h3 className="text-lg font-semibold text-indigo-900 mb-2">Job Search Component</h3>
    <p className="text-indigo-700">Enhanced JobSearch component would be rendered here</p>
  </div>
);

const JobList = ({ jobs, selectedJob, onJobClick, bulkDeleteMode, selectedJobs, onDeleteJob }) => (
  <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Job List Component</h3>
    <p className="text-gray-600">Enhanced JobList component would be rendered here</p>
  </div>
);

const JobDetail = ({ job, onStatusChange, userId, onDeleteJob }) => (
  <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Detail Component</h3>
    <p className="text-gray-600">Enhanced JobDetail component would be rendered here</p>
  </div>
);

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showJobSearch, setShowJobSearch] = useState(false);
  const [userSettings, setUserSettings] = useState({ openaiApiKey: "test-key" });
  const [systemStatus, setSystemStatus] = useState({ status: "online" });
  const [jobStats, setJobStats] = useState({
    total_jobs: 24,
    status_counts: {
      APPLIED: 8,
      INTERVIEW: 3,
      OFFER: 1,
      NEW: 12
    },
    resumes_generated: 15
  });
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [statusChangeAnimation, setStatusChangeAnimation] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Mock user data
  const currentUser = { uid: "user-123" };

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleSearchComplete = (newJobs) => {
    setJobs(prevJobs => [...newJobs, ...prevJobs]);
    setShowJobSearch(false);
    
    // Show success animation
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
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
      // Trigger status change animation
      setStatusChangeAnimation({ jobId, status: newStatus });
      
      // Update job status
      const updatedJobs = jobs.map(job =>
        job.id === jobId ? { ...job, status: newStatus } : job
      );
      setJobs(updatedJobs);

      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob({ ...selectedJob, status: newStatus });
      }

      // Clear animation after 2 seconds
      setTimeout(() => {
        setStatusChangeAnimation(null);
      }, 2000);

    } catch (error) {
      console.error("Failed to update job status:", error);
      setError(`Failed to update job status: ${error.message}`);
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
      const remainingJobs = jobs.filter(job => !selectedJobs.has(job.id));
      setJobs(remainingJobs);
      setSelectedJobs(new Set());
      setBulkDeleteMode(false);

      if (selectedJob && selectedJobs.has(selectedJob.id)) {
        setSelectedJob(null);
      }
    } catch (error) {
      setError(`Failed to delete jobs: ${error.message}`);
    }
  };

  const handleDeleteJob = async (jobId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this job? This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      const remainingJobs = jobs.filter(job => job.id !== jobId);
      setJobs(remainingJobs);

      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(null);
      }
    } catch (error) {
      setError(`Failed to delete job: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-r-4 border-l-4 border-purple-500 animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-gray-700 font-medium">Loading your job dashboard...</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      {/* Enhanced Navbar */}
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Job Tracker Pro
              </h1>
            </div>
            <button className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto py-8 px-6">
        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg max-w-sm">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 animate-bounce" />
                <p className="text-green-800 font-medium">Job added successfully!</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert with animation */}
        {error && (
          <div className="animate-slide-down mb-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-red-800 font-medium">{error}</span>
                </div>
                <button
                  className="text-red-400 hover:text-red-600 transition-colors duration-200"
                  onClick={() => setError("")}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Statistics Dashboard */}
        {jobStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all duration-200 border border-gray-100 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Jobs</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{jobStats.total_jobs || 0}</p>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+12% this week</span>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl">
                  <Briefcase className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all duration-200 border border-gray-100 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Applied</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{jobStats.status_counts?.APPLIED || 0}</p>
                  <div className="flex items-center text-sm text-green-600">
                    <Target className="h-4 w-4 mr-1" />
                    <span>33% conversion</span>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all duration-200 border border-gray-100 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Interviews</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{jobStats.status_counts?.INTERVIEW || 0}</p>
                  <div className="flex items-center text-sm text-purple-600">
                    <Users className="h-4 w-4 mr-1" />
                    <span>38% success rate</span>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-purple-100 to-violet-100 rounded-xl">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all duration-200 border border-gray-100 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Resumes</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{jobStats.resumes_generated || 0}</p>
                  <div className="flex items-center text-sm text-indigo-600">
                    <FileText className="h-4 w-4 mr-1" />
                    <span>AI-generated</span>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-xl">
                  <FileText className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Action Bar */}
        <div className="bg-white rounded-xl shadow-lg mb-8 p-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg">
                <Activity className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Job Applications</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {jobs.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      setBulkDeleteMode(!bulkDeleteMode);
                      setSelectedJobs(new Set());
                    }}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105
                      ${bulkDeleteMode
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                      }
                    `}
                  >
                    <Trash2 className="h-4 w-4 mr-2 inline" />
                    {bulkDeleteMode ? "Cancel Bulk Delete" : "Bulk Delete"}
                  </button>

                  {bulkDeleteMode && selectedJobs.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105 animate-pulse"
                    >
                      Delete Selected ({selectedJobs.size})
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => {/* Clear cache function */}}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105"
              >
                <RefreshCw className="h-4 w-4 mr-2 inline" />
                Clear Cache
              </button>

              <button
                onClick={() => setShowJobSearch(!showJobSearch)}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105"
              >
                <Plus className="h-4 w-4 mr-2 inline" />
                {showJobSearch ? "Close Job Form" : "Add New Job"}
              </button>
            </div>
          </div>

          {bulkDeleteMode && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg animate-slide-down">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-700 font-medium">
                  Bulk Delete Mode: Click on jobs to select them for deletion.
                  Selected jobs will be highlighted.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Job Search Panel with smooth animation */}
        {showJobSearch && (
          <div className="animate-slide-down mb-8">
            <JobSearch
              onSearchComplete={handleSearchComplete}
              userSettings={userSettings}
              userId={currentUser.uid}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="animate-slide-in-left">
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

          <div className="animate-slide-in-right">
            {selectedJob ? (
              <JobDetail
                job={selectedJob}
                onStatusChange={handleStatusChange}
                userId={currentUser.uid}
                onDeleteJob={handleDeleteJob}
              />
            ) : (
              <div className="bg-white shadow-lg rounded-xl p-8 flex items-center justify-center min-h-[400px] border border-gray-100">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 bg-gradient-to-r from-gray-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">
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

      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slide-in-right-toast {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }
        
        .animate-slide-in-left {
          animation: slide-in-left 0.6s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.6s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slide-in-right-toast 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;