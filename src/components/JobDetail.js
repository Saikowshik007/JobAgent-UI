import React from "react";

function JobDetail({ job, onStatusChange }) {
  const statusOptions = [
    { value: "NEW", label: "New" },
    { value: "INTERESTED", label: "Interested" },
    { value: "APPLIED", label: "Applied" },
    { value: "INTERVIEWING", label: "Interviewing" },
    { value: "OFFER", label: "Offer" },
    { value: "REJECTED", label: "Rejected" },
    { value: "NOT_INTERESTED", label: "Not Interested" }
  ];

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
      <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 space-x-3">
        <button
          type="button"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={() => onStatusChange(job.id, "APPLIED")}
        >
          Mark as Applied
        </button>

        <button
          type="button"
          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={() => window.open(job.linkedin_url, '_blank')}
          disabled={!job.linkedin_url}
        >
          Apply on LinkedIn
        </button>
      </div>
    </div>
  );
}

export default JobDetail;