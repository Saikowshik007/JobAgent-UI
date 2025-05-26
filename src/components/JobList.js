// src/components/JobList.js - Updated with bulk delete and delete functionality
import React, { useState } from "react";

function JobList({
  jobs,
  userId,
  selectedJob,
  onJobClick,
  bulkDeleteMode = false,
  selectedJobs = new Set(),
  onDeleteJob
}) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Helper function to safely get job display properties
  const getJobTitle = (job) => {
    return job.title || job.metadata?.job_title || "Untitled Position";
  };

  const getJobCompany = (job) => {
    return job.company || job.metadata?.company || "Unknown Company";
  };

  const getJobLocation = (job) => {
    return job.location ||
           (job.metadata?.is_fully_remote ? "Remote" : job.metadata?.location) ||
           null;
  };

  const getJobDate = (job) => {
    return job.date_posted || job.metadata?.date_posted || job.date_found || null;
  };

  // Updated to match the API's JobStatusEnum values
  const statusOptions = [
    { value: "ALL", label: "All Jobs" },
    { value: "NEW", label: "New" },
    { value: "INTERESTED", label: "Interested" },
    { value: "RESUME_GENERATED", label: "Resume Generated" },
    { value: "APPLIED", label: "Applied" },
    { value: "INTERVIEW", label: "Interviewing" },
    { value: "OFFER", label: "Offer" },
    { value: "REJECTED", label: "Rejected" },
    { value: "DECLINED", label: "Declined" }
  ];

  const filteredJobs = jobs.filter(job => {
    if (!job) return false;

    const title = getJobTitle(job);
    const company = getJobCompany(job);
    const location = getJobLocation(job);

    const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;
    const matchesSearch = searchQuery === "" ||
      (title && title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (company && company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (location && location.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const handleDeleteClick = (e, jobId) => {
    e.stopPropagation(); // Prevent job selection when clicking delete
    onDeleteJob(jobId);
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">
            Job Results ({filteredJobs.length})
          </h2>

          {bulkDeleteMode && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Bulk Delete Mode
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search jobs..."
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="">
        {filteredJobs.length === 0 ? (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
            {jobs.length === 0 ? (
              <div>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding your first job posting.</p>
              </div>
            ) : (
              <div>
                <p>No jobs found matching your search criteria.</p>
                <p className="text-sm mt-1">Try adjusting your search or filter.</p>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredJobs.map((job) => {
              const title = getJobTitle(job);
              const company = getJobCompany(job);
              const location = getJobLocation(job);
              const date = getJobDate(job);

              const isSelected = selectedJob && selectedJob.id === job.id;
              const isBulkSelected = selectedJobs.has(job.id);

              return (
                <li
                  key={job.id}
                  className={`px-4 py-4 hover:bg-gray-50 cursor-pointer transition duration-150 ease-in-out relative ${
                    isSelected && !bulkDeleteMode ? "bg-indigo-50 border-l-4 border-indigo-500 pl-3" : ""
                  } ${
                    isBulkSelected ? "bg-red-50 border-l-4 border-red-500 pl-3" : ""
                  }`}
                  onClick={() => onJobClick(job)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {bulkDeleteMode && (
                            <div className="mr-3">
                              <input
                                type="checkbox"
                                checked={isBulkSelected}
                                onChange={() => onJobClick(job)}
                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                          <p className="text-sm font-medium text-indigo-600 truncate">{title}</p>
                        </div>

                        <div className="ml-2 flex items-center space-x-2">
                          {/* Job Status Badge */}
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            job.status === "NEW" ? "bg-gray-100 text-gray-800" :
                            job.status === "INTERESTED" ? "bg-blue-100 text-blue-800" :
                            job.status === "RESUME_GENERATED" ? "bg-purple-100 text-purple-800" :
                            job.status === "APPLIED" ? "bg-yellow-100 text-yellow-800" :
                            job.status === "INTERVIEW" ? "bg-purple-100 text-purple-800" :
                            job.status === "OFFER" ? "bg-green-100 text-green-800" :
                            job.status === "REJECTED" ? "bg-red-100 text-red-800" :
                            job.status === "DECLINED" ? "bg-orange-100 text-orange-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {job.status || "NEW"}
                          </p>

                          {/* Delete Button (only show when not in bulk mode) */}
                          {!bulkDeleteMode && (
                            <button
                              onClick={(e) => handleDeleteClick(e, job.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete job"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                            </svg>
                            {company}
                          </p>
                          {location && (
                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                              <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {location}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h.5a.5.5 0 01.5.5v6a.5.5 0 01-.5.5H7.5a.5.5 0 01-.5-.5V7.5a.5.5 0 01.5-.5H8z" />
                          </svg>
                          <p>
                            {date ? new Date(date).toLocaleDateString() : "Recent"}
                          </p>
                        </div>
                      </div>

                      {/* Resume indicator */}
                      {job.resume_id && (
                        <div className="mt-2 flex items-center text-xs text-purple-600">
                          <svg className="flex-shrink-0 mr-1.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Resume Generated
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default JobList;