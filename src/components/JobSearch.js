import React, { useState } from "react";
import {
  Link, Plus, Sparkles, Target, FileText, Send, MessageSquare,
  Trophy, XCircle, MinusCircle, CheckCircle, AlertCircle,
  Loader2, Zap, Globe, Key, Info, Type, ArrowUpDown
} from "lucide-react";
import { jobsApi } from "../utils/api";

function JobSearch({ onSearchComplete, userSettings, userId }) {
  const [inputMode, setInputMode] = useState("url"); // "url" or "description"
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ status: '', message: '' });
  const [selectedStatus, setSelectedStatus] = useState("NEW");
  const [showSuccess, setShowSuccess] = useState(false);

  // Available status options with icons and colors
  const statusOptions = [
    { value: "NEW", label: "New", icon: Sparkles, color: "text-gray-600", bgColor: "bg-gray-50" },
    { value: "INTERESTED", label: "Interested", icon: Target, color: "text-blue-600", bgColor: "bg-blue-50" },
    { value: "RESUME_GENERATED", label: "Resume Generated", icon: FileText, color: "text-purple-600", bgColor: "bg-purple-50" },
    { value: "APPLIED", label: "Applied", icon: Send, color: "text-yellow-600", bgColor: "bg-yellow-50" },
    { value: "INTERVIEW", label: "Interview", icon: MessageSquare, color: "text-indigo-600", bgColor: "bg-indigo-50" },
    { value: "OFFER", label: "Offer", icon: Trophy, color: "text-green-600", bgColor: "bg-green-50" },
    { value: "REJECTED", label: "Rejected", icon: XCircle, color: "text-red-600", bgColor: "bg-red-50" },
    { value: "DECLINED", label: "Declined", icon: MinusCircle, color: "text-orange-600", bgColor: "bg-orange-50" }
  ];

  const handleAnalyze = async (e) => {
    e.preventDefault();

    // Validation based on input mode
    if (inputMode === "url" && !jobUrl.trim()) {
      setError("Please enter a job URL");
      return;
    }

    if (inputMode === "description" && !jobDescription.trim()) {
      setError("Please paste the job description");
      return;
    }

    if (inputMode === "description" && jobDescription.trim().length < 50) {
      setError("Job description is too short. Please provide a complete job description.");
      return;
    }

    // Check if API key is available
    const apiKey = userSettings?.openaiApiKey || "";
    if (!apiKey) {
      setError("OpenAI API key is required. Please add it in your settings.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setShowSuccess(false);

      if (inputMode === "url") {
        setProgress({ status: 'analyzing', message: 'Analyzing job posting from URL...' });
      } else {
        setProgress({ status: 'analyzing', message: 'Analyzing job description...' });
      }

      console.log(`🔍 Starting job analysis (${inputMode}):`, {
        url: inputMode === "url" ? jobUrl : null,
        description: inputMode === "description" ? `${jobDescription.substring(0, 100)}...` : null,
        status: selectedStatus,
        hasApiKey: !!apiKey
      });

      // Make API call based on input mode
      let response;
      if (inputMode === "url") {
        response = await jobsApi.analyzeJob(jobUrl, selectedStatus, apiKey);
      } else {
        // For description mode, we'll use the existing analyze endpoint
        // but pass the description in a way the backend can handle
        response = await jobsApi.analyzeJobDescription(jobDescription, selectedStatus, apiKey);
      }

      console.log("📋 Job analysis response:", response);

      // Handle different response structures
      let newJob = null;

      if (response.job_details) {
        newJob = response.job_details;
      } else if (response.job) {
        newJob = response.job;
      } else if (response.id) {
        newJob = response;
      } else if (Array.isArray(response) && response.length > 0) {
        newJob = response[0];
      } else {
        console.error("❌ Unexpected response structure:", response);
        throw new Error("Invalid response structure from job analysis");
      }

      // Validate the job object has required fields
      if (!newJob || !newJob.id) {
        console.error("❌ Invalid job object:", newJob);
        throw new Error("Job analysis returned invalid data - missing job ID");
      }

      // Ensure the job has basic required fields
      const validatedJob = {
        ...newJob,
        id: newJob.id,
        title: newJob.title || newJob.metadata?.job_title || "Untitled Position",
        company: newJob.company || newJob.metadata?.company || "Unknown Company",
        status: newJob.status || selectedStatus,
        date_found: newJob.date_found || new Date().toISOString(),
        job_url: newJob.job_url || (inputMode === "url" ? jobUrl : null),
        description: newJob.description || (inputMode === "description" ? jobDescription : null),
        metadata: {
          ...newJob.metadata,
          input_method: inputMode
        }
      };

      console.log("✅ Validated job:", validatedJob);

      // Pass the job to the parent component
      onSearchComplete([validatedJob]);

      // Clear form
      setJobUrl("");
      setJobDescription("");
      setShowSuccess(true);
      setProgress({
        status: 'success',
        message: `Job added successfully ${inputMode === "url" ? "from URL" : "from description"}!`
      });

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

    } catch (err) {
      console.error("❌ Job analysis error:", err);

      let errorMessage = "Job analysis failed";

      if (err.message) {
        errorMessage += ": " + err.message;
      } else {
        errorMessage += ": Unknown error";
      }

      // Add specific error handling for common issues
      if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        errorMessage = "Access denied. Please check your API key and try again.";
      } else if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        errorMessage = "Authentication failed. Please check your API key.";
      } else if (err.message?.includes('400') || err.message?.includes('Bad Request')) {
        errorMessage = inputMode === "url"
            ? "Invalid job URL or request. Please check the URL and try again."
            : "Invalid job description. Please check the content and try again.";
      } else if (err.message?.includes('409')) {
        errorMessage = inputMode === "url"
            ? "This job URL has already been added to your list."
            : "A job with this description has already been added to your list.";
      } else if (err.message?.includes('timeout')) {
        errorMessage = "Request timed out. Please try again.";
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }

      setError(errorMessage);
      setProgress({ status: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const selectedStatusOption = statusOptions.find(option => option.value === selectedStatus);
  const SelectedIcon = selectedStatusOption?.icon || Sparkles;

  return (
      <div className="relative">
        {/* Header with gradient and icon */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Add Job
            </h2>
          </div>
          <p className="text-gray-600">Add jobs by URL or paste job descriptions directly</p>
        </div>

        {/* Input Mode Toggle */}
        <div className="mb-6">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1">
            <button
                type="button"
                onClick={() => setInputMode("url")}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                    inputMode === "url"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                }`}
            >
              <Globe className="h-4 w-4" />
              <span>From URL</span>
            </button>
            <button
                type="button"
                onClick={() => setInputMode("description")}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                    inputMode === "description"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                }`}
            >
              <Type className="h-4 w-4" />
              <span>From Description</span>
            </button>
          </div>
        </div>

        {/* Animated Error Alert */}
        {error && (
            <div className="animate-slide-down mb-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                  <button
                      onClick={() => setError("")}
                      className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors duration-200"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Animated Success Alert */}
        {showSuccess && !error && (
            <div className="animate-slide-down mb-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 animate-bounce" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">{progress.message}</p>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleAnalyze} className="space-y-6">
          {/* Dynamic Input Field */}
          {inputMode === "url" ? (
              <div className="group">
                <label htmlFor="job-url" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Link className="h-4 w-4" />
                  <span>Job URL</span>
                </label>
                <div className="relative">
                  <input
                      type="url"
                      id="job-url"
                      className="
                  block w-full rounded-xl border-gray-300 shadow-sm
                  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                  transition-all duration-200 pl-12 py-3
                  group-hover:shadow-md
                "
                      placeholder="https://www.linkedin.com/jobs/view/12345678"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      disabled={loading}
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Globe className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors duration-200" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500 flex items-center space-x-1">
                  <Info className="h-4 w-4" />
                  <span>Paste the URL of a job posting from LinkedIn, Indeed, or other job boards</span>
                </p>
              </div>
          ) : (
              <div className="group">
                <label htmlFor="job-description" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Type className="h-4 w-4" />
                  <span>Job Description</span>
                </label>
                <div className="relative">
              <textarea
                  id="job-description"
                  rows={8}
                  className="
                  block w-full rounded-xl border-gray-300 shadow-sm
                  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                  transition-all duration-200 pl-4 pr-4 py-3
                  group-hover:shadow-md resize-none
                "
                  placeholder="Paste the complete job description here...

Example:
Software Engineer - Remote
We are seeking a talented Software Engineer to join our team...

Requirements:
- 3+ years of experience with JavaScript
- Experience with React and Node.js
- Bachelor's degree in Computer Science or related field

Responsibilities:
- Develop and maintain web applications
- Collaborate with cross-functional teams
- Write clean, maintainable code"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={loading}
              />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-gray-500 flex items-center space-x-1">
                    <Info className="h-4 w-4" />
                    <span>Copy and paste the complete job description including title, company, requirements, etc.</span>
                  </p>
                  <span className="text-xs text-gray-400">
                {jobDescription.length} characters
              </span>
                </div>
              </div>
          )}

          {/* Status Selection */}
          <div className="group">
            <label htmlFor="initial-status" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <SelectedIcon className={`h-4 w-4 ${selectedStatusOption?.color}`} />
              <span>Initial Status</span>
            </label>
            <div className="relative">
              <select
                  id="initial-status"
                  className="
                block w-full rounded-xl border-gray-300 shadow-sm
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                transition-all duration-200 py-3 pl-4 pr-10
                group-hover:shadow-md appearance-none
              "
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={loading}
              >
                {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <SelectedIcon className={`h-5 w-5 ${selectedStatusOption?.color}`} />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Choose the initial status for this job in your pipeline
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex flex-wrap gap-4">
            <button
                type="submit"
                disabled={loading}
                className={`
              relative flex-grow sm:flex-grow-0 justify-center py-3 px-6 border border-transparent
              rounded-xl shadow-lg text-sm font-medium text-white overflow-hidden
              transition-all duration-300 transform hover:scale-105
              ${loading
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }
            `}
            >
              {loading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
              )}
              <div className="relative flex items-center justify-center space-x-2">
                {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{progress.status === 'analyzing' ? 'Analyzing...' : 'Processing...'}</span>
                    </>
                ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      <span>Add Job</span>
                    </>
                )}
              </div>
            </button>
          </div>
        </form>

        {/* Enhanced Instructions Section */}
        <div className="mt-8 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Info className="h-4 w-4 text-indigo-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                {inputMode === "url" ? "URL Instructions" : "Description Instructions"}
              </h3>
            </div>

            <div className="flex items-center space-x-3">
              <button
                  onClick={() => setInputMode(inputMode === "url" ? "description" : "url")}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors duration-200"
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Switch Mode
              </button>

              {userSettings?.openaiApiKey ? (
                  <div className="animate-pulse">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ring-2 ring-green-200">
                  <Key className="h-3 w-3 mr-1" />
                  API Key Ready
                </span>
                  </div>
              ) : (
                  <div className="animate-pulse">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ring-2 ring-yellow-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  No API Key
                </span>
                  </div>
              )}
            </div>
          </div>

          {inputMode === "url" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-indigo-600">1</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Copy Job URL</p>
                      <p className="text-xs text-gray-600">From LinkedIn, Indeed, or other job sites</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-purple-600">2</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Choose Status</p>
                      <p className="text-xs text-gray-600">Select the initial status for the job</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-green-600">3</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Paste & Add</p>
                      <p className="text-xs text-gray-600">Paste the URL and click "Add Job"</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">4</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Auto Analysis</p>
                      <p className="text-xs text-gray-600">System analyzes and adds it to your list</p>
                    </div>
                  </div>
                </div>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-indigo-600">1</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Copy Full Description</p>
                      <p className="text-xs text-gray-600">Include title, company, requirements, and responsibilities</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-purple-600">2</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Paste in Text Area</p>
                      <p className="text-xs text-gray-600">Use the large text area above</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-green-600">3</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Choose Status</p>
                      <p className="text-xs text-gray-600">Select initial status and click "Add Job"</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">4</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">AI Analysis</p>
                      <p className="text-xs text-gray-600">System extracts key details automatically</p>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {!userSettings?.openaiApiKey && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-800">Add your OpenAI API key in settings for job analysis to work</p>
                </div>
              </div>
          )}
        </div>

        {/* Benefits Section */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center space-x-2 mb-3">
              <Globe className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">URL Method</h4>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Automatic data extraction</li>
              <li>• Gets all job details</li>
              <li>• Works with most job sites</li>
              <li>• Preserves original formatting</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center space-x-2 mb-3">
              <Type className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-purple-900">Description Method</h4>
            </div>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Works when URLs fail</li>
              <li>• Copy from any source</li>
              <li>• No access restrictions</li>
              <li>• Perfect for PDFs/emails</li>
            </ul>
          </div>
        </div>

        {/* Loading Progress Bar */}
        {loading && (
            <div className="mt-6">
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full animate-progress"></div>
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">{progress.message}</p>
            </div>
        )}

        <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
      </div>
  );
}

export default JobSearch;