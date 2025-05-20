// src/components/JobList.js
import React, { useState } from "react";
import JobDetail from "./JobDetail";

function JobList({ jobs, userId }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleJobClick = (job) => {
    setSelectedJob(job);
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x_user_id": userId // Added user authentication
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update the job status in the UI
      const updatedJobs = jobs.map(job =>
        job.id === jobId ? { ...job, status: newStatus } : job
      );

      // Update the selected job if it's the one being modified
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob({ ...selectedJob, status: newStatus });
      }
    } catch (error) {
      console.error("Failed to update job status:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900">Job Results</h2>

          <div className="mt-3 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search jobs..."
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
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

        <div className="border-t border-gray-200">
          {filteredJobs.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
              No jobs found. Try another search or filter.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {filteredJobs.map((job) => {
                const title = getJobTitle(job);
                const company = getJobCompany(job);
                const location = getJobLocation(job);
                const date = getJobDate(job);

                return (
                  <li
                    key={job.id}
                    className={`px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer ${
                      selectedJob && selectedJob.id === job.id ? "bg-indigo-50" : ""
                    }`}
                    onClick={() => handleJobClick(job)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">{title}</p>
                      <div className="ml-2 flex-shrink-0 flex">
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
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {company}
                        </p>
                        {location && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            {location}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          {date ? new Date(date).toLocaleDateString() : "Recent"}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {selectedJob ? (
        <JobDetail job={selectedJob} onStatusChange={handleStatusChange} userId={userId} />
      ) : (
        <div className="bg-white shadow sm:rounded-lg p-6 flex items-center justify-center">
          <p className="text-gray-500">Select a job to view details</p>
        </div>
      )}
    </div>
  );
}

export default JobList;