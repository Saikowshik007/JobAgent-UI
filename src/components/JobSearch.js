// src/components/JobSearch.js
import React, { useState } from "react";

function JobSearch({ onSearchComplete, userSettings, userId }) {
  const [jobUrl, setJobUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async (e) => {
    e.preventDefault();

    if (!jobUrl.trim()) {
      setError("Please enter a job URL");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Create FormData for the request
      const formData = new FormData();
      formData.append('job_url', jobUrl);

      // Add the user's API key from settings if available
      const apiKey = userSettings?.openaiApiKey || "";

      console.log("Sending job URL:", jobUrl);
      console.log("Using API key:", apiKey ? "Yes (key hidden)" : "No");

      const response = await fetch("http://localhost:8000/api/jobs/analyze", {
        method: "POST",
        headers: {
          "x_user_id": userId,
          "X-Api-Key": apiKey
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Job analyze response:", data); // Debug log

      // Extract job details from the response
      const jobDetails = data.job_details;

      if (!jobDetails) {
        throw new Error("Invalid response: missing job details");
      }

      // Process the job to make it compatible with JobList and JobDetail components
      const processedJob = {
        ...jobDetails,
        // Add these fields at the top level for compatibility with JobList
        title: jobDetails.metadata.job_title,
        company: jobDetails.metadata.company,
        description: jobDetails.metadata.job_summary,
        // Determine location based on remote status
        location: jobDetails.metadata.is_fully_remote ? "Remote" : "On-site",
        // Keep the full metadata object for JobDetail to use
      };

      console.log("Processed job:", processedJob); // Debug log

      // Pass the processed job to the parent component
      onSearchComplete([processedJob]);

      // Clear the input after successful analysis
      setJobUrl("");
    } catch (err) {
      console.error("Job analysis error:", err); // Debug log
      setError("Job analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Add Job by URL</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleAnalyze}>
        <div className="space-y-4">
          <div>
            <label htmlFor="job-url" className="block text-sm font-medium text-gray-700">
              Job URL
            </label>
            <input
              type="url"
              id="job-url"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g. https://www.linkedin.com/jobs/view/12345678"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
            />
            <p className="mt-1 text-sm text-gray-500">
              Paste the URL of a job posting from LinkedIn, Indeed, or other job boards
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                Analyzing Job...
              </>
            ) : (
              "Add Job"
            )}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Instructions</h3>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Find a job posting on LinkedIn, Indeed, or other job sites</li>
          <li>Copy the URL from your browser's address bar</li>
          <li>Paste it in the field above and click "Add Job"</li>
          <li>The job will be analyzed and added to your job list</li>
        </ol>
      </div>

      {userSettings?.openaiApiKey ? (
        <div className="mt-4 p-4 bg-green-50 rounded-md">
          <p className="text-sm text-green-700">✓ API Key detected. Job analysis will use your OpenAI API key.</p>
        </div>
      ) : (
        <div className="mt-4 p-4 bg-yellow-50 rounded-md">
          <p className="text-sm text-yellow-700">⚠️ No API Key found. Please add your OpenAI API key in Settings.</p>
        </div>
      )}
    </div>
  );
}

export default JobSearch;