// src/components/JobSearch.js - Updated to use new API endpoints
import React, { useState } from "react";
import { jobsApi } from "../utils/api";

function JobSearch({ onSearchComplete, userSettings, userId }) {
  const [jobUrl, setJobUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ status: '', message: '' });
  const [selectedStatus, setSelectedStatus] = useState("NEW");

  // Available status options matching your API's JobStatusEnum
  const statusOptions = [
    { value: "NEW", label: "New" },
    { value: "INTERESTED", label: "Interested" },
    { value: "RESUME_GENERATED", label: "Resume Generated" },
    { value: "APPLIED", label: "Applied" },
    { value: "INTERVIEW", label: "Interview" },
    { value: "OFFER", label: "Offer" },
    { value: "REJECTED", label: "Rejected" },
    { value: "DECLINED", label: "Declined" }
  ];

  const handleAnalyze = async (e) => {
    e.preventDefault();

    if (!jobUrl.trim()) {
      setError("Please enter a job URL");
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
      setProgress({ status: 'analyzing', message: 'Analyzing job posting...' });

      // Use the updated API method with status parameter
      const response = await jobsApi.analyzeJob(jobUrl, selectedStatus, apiKey);
      console.log("Job analyze response:", response);

      if (!response || !response.job_details) {
        throw new Error("Invalid response: missing job details");
      }

      // Process the job to make it compatible with JobList and JobDetail components
      const processedJob = {
        ...response.job_details,
        id: response.job_id,
        job_url: response.job_url,
        status: selectedStatus, // Use the selected status
        title: response.job_details.metadata?.job_title || 'Unknown Title',
        company: response.job_details.metadata?.company || 'Unknown Company',
        description: response.job_details.metadata?.job_summary || 'No description available',
        location: response.job_details.metadata?.is_fully_remote ? "Remote" :
                  (response.job_details.metadata?.location || "On-site"),
        date_found: response.job_details.date_found || new Date().toISOString(),
      };

      console.log("Processed job:", processedJob);

      // Pass the processed job to the parent component
      onSearchComplete([processedJob]);

      // Clear the input after successful analysis
      setJobUrl("");
      setProgress({ status: 'success', message: 'Job added successfully!' });
    } catch (err) {
      console.error("Job analysis error:", err);

      // Extract user-friendly error messages
      let errorMessage;
      if (err.message?.includes('timed out')) {
        errorMessage = "Job analysis is taking longer than expected. The server might be busy. Please try again in a moment.";
      } else if (err.message?.includes('409')) {
        errorMessage = "This job already exists in your list.";
      } else if (err.message?.includes('401') || err.message?.includes('403')) {
        errorMessage = "API key is invalid or missing. Please check your settings.";
      } else if (err.message?.includes('429')) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (err.message?.includes('422')) {
        errorMessage = "Invalid job URL or data. Please check the URL and try again.";
      } else {
        errorMessage = "Job analysis failed: " + (err.message || "Unknown error");
      }

      setError(errorMessage);
      setProgress({ status: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Add Job by URL</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {progress.status === 'success' && !error && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 mb-4 rounded" role="alert">
          <span className="block sm:inline">{progress.message}</span>
        </div>
      )}

      <form onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label htmlFor="job-url" className="block text-sm font-medium text-gray-700 mb-1">
            Job URL
          </label>
          <input
            type="url"
            id="job-url"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g. https://www.linkedin.com/jobs/view/12345678"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-500">
            Paste the URL of a job posting from LinkedIn, Indeed, or other job boards
          </p>
        </div>

        <div>
          <label htmlFor="initial-status" className="block text-sm font-medium text-gray-700 mb-1">
            Initial Status
          </label>
          <select
            id="initial-status"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
          <p className="mt-1 text-sm text-gray-500">
            Choose the initial status for this job in your pipeline
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            type="submit"
            disabled={loading}
            className={`
              flex-grow sm:flex-grow-0 justify-center py-2 px-4 border border-transparent
              rounded-md shadow-sm text-sm font-medium text-white
              ${loading
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }
            `}
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                {progress.status === 'analyzing' ? 'Analyzing Job...' : 'Processing...'}
              </>
            ) : (
              "Add Job"
            )}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <div className="flex items-center">
          <h3 className="text-sm font-medium text-gray-900">Quick Instructions</h3>
          {userSettings?.openaiApiKey ? (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              API Key Ready
            </span>
          ) : (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              No API Key
            </span>
          )}
        </div>
        <ol className="mt-2 list-decimal pl-5 space-y-1 text-sm text-gray-700">
          <li>Copy a job URL from LinkedIn, Indeed, or other job sites</li>
          <li>Choose the initial status for the job</li>
          <li>Paste the URL and click "Add Job"</li>
          <li>The system will analyze and add it to your list with the selected status</li>
          {!userSettings?.openaiApiKey && (
            <li className="text-yellow-700 font-medium">Add your API key in settings for best results</li>
          )}
        </ol>
      </div>
    </div>
  );
}

export default JobSearch;