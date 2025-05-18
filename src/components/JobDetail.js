import React, { useState } from "react";

function JobDetail({ job, onStatusChange, userId }) {
  const [generatingResume, setGeneratingResume] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeMessage, setResumeMessage] = useState("");
  const [uploadingToSimplify, setUploadingToSimplify] = useState(false);

  // Updated to match the API's JobStatusEnum values
  const statusOptions = [
    { value: "NEW", label: "New" },
    { value: "INTERESTED", label: "Interested" },
    { value: "RESUME_GENERATED", label: "Resume Generated" },
    { value: "APPLIED", label: "Applied" },
    { value: "INTERVIEW", label: "Interviewing" },
    { value: "OFFER", label: "Offer" },
    { value: "REJECTED", label: "Rejected" },
    { value: "DECLINED", label: "Declined" }
  ];

  const handleGenerateResume = async () => {
    try {
      setGeneratingResume(true);
      setResumeError("");
      setResumeMessage("");

      const response = await fetch("http://localhost:8000/api/resume/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": userId
        },
        body: JSON.stringify({
          job_id: job.id,
          customize: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResumeMessage("Resume generated successfully!");

      // Update job status to RESUME_GENERATED
      onStatusChange(job.id, "RESUME_GENERATED");

    } catch (error) {
      setResumeError("Failed to generate resume: " + error.message);
    } finally {
      setGeneratingResume(false);
    }
  };

  const handleUploadToSimplify = async () => {
    try {
      setUploadingToSimplify(true);
      setResumeError("");
      setResumeMessage("");

      const response = await fetch("http://localhost:8000/api/resume/upload-to-simplify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": userId
        },
        body: JSON.stringify({
          job_id: job.id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResumeMessage("Resume uploaded to Simplify successfully!");

    } catch (error) {
      setResumeError("Failed to upload to Simplify: " + error.message);
    } finally {
      setUploadingToSimplify(false);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">{job.title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{job.company}</p>
        </div>
        <div>
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={job.status || "NEW"}
            onChange={(e) => onStatusChange(job.id, e.target.value)}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl className="sm:divide-y sm:divide-gray-200">
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Location</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{job.location || "Not specified"}</dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Job Type</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{job.job_type || "Not specified"}</dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Date Posted</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {job.date_posted ? new Date(job.date_posted).toLocaleDateString() : "Not specified"}
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Easy Apply</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {job.easy_apply ? "Yes" : "No"}
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">LinkedIn URL</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {job.url ? (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  Open in LinkedIn
                </a>
              ) : (
                "Not available"
              )}
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Description</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div
                className="prose max-w-none max-h-72 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: job.description || "No description available" }}
              />
            </dd>
          </div>
        </dl>
      </div>

      {resumeError && (
        <div className="px-4 py-3 bg-red-100 text-red-700 border border-red-400 rounded mx-4 my-2">
          {resumeError}
        </div>
      )}

      {resumeMessage && (
        <div className="px-4 py-3 bg-green-100 text-green-700 border border-green-400 rounded mx-4 my-2">
          {resumeMessage}
        </div>
      )}

      <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 space-x-3">
        <button
          type="button"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={handleGenerateResume}
          disabled={generatingResume}
        >
          {generatingResume ? (
            <>
              <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
              Generating Resume...
            </>
          ) : (
            "Generate Resume"
          )}
        </button>

        <button
          type="button"
          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={handleUploadToSimplify}
          disabled={uploadingToSimplify || job.status !== "RESUME_GENERATED"}
        >
          {uploadingToSimplify ? (
            <>
              <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-gray-700 rounded-full"></span>
              Uploading to Simplify...
            </>
          ) : (
            "Upload to Simplify"
          )}
        </button>

        <button
          type="button"
          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={() => {
            onStatusChange(job.id, "APPLIED");
            window.open(job.url, '_blank');
          }}
          disabled={!job.url}
        >
          Apply on LinkedIn
        </button>
      </div>
    </div>
  );
}

export default JobDetail;