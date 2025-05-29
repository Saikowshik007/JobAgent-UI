// Enhanced JobList.js with animations and fancy effects
import React, { useState, useEffect } from "react";
import {
  Briefcase, Building2, MapPin, Calendar, FileText, Trash2,
  Clock, Send, MessageSquare, Trophy, XCircle,
  MinusCircle, Sparkles, Target, Search
} from "lucide-react";

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
  const [animatingJobs, setAnimatingJobs] = useState(new Set());
  const [justUpdatedJobs, setJustUpdatedJobs] = useState(new Set());

  // Track status changes for animations
  useEffect(() => {
    if (selectedJob && selectedJob.id) {
      const currentJob = jobs.find(job => job.id === selectedJob.id);
      if (currentJob && currentJob.status !== selectedJob.status) {
        // Job status changed, trigger animation
        setJustUpdatedJobs(prev => new Set([...prev, selectedJob.id]));

        // Remove animation after 2 seconds
        setTimeout(() => {
          setJustUpdatedJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(selectedJob.id);
            return newSet;
          });
        }, 2000);
      }
    }
  }, [jobs, selectedJob]);

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

  // Get status icon and colors
  const getStatusInfo = (status) => {
    switch (status) {
      case "NEW":
        return {
          icon: Sparkles,
          bgColor: "bg-gray-100",
          textColor: "text-gray-800",
          glowColor: "shadow-gray-200",
          ringColor: "ring-gray-300"
        };
      case "INTERESTED":
        return {
          icon: Target,
          bgColor: "bg-blue-100",
          textColor: "text-blue-800",
          glowColor: "shadow-blue-200",
          ringColor: "ring-blue-300"
        };
      case "RESUME_GENERATED":
        return {
          icon: FileText,
          bgColor: "bg-purple-100",
          textColor: "text-purple-800",
          glowColor: "shadow-purple-200",
          ringColor: "ring-purple-300"
        };
      case "APPLIED":
        return {
          icon: Send,
          bgColor: "bg-yellow-100",
          textColor: "text-yellow-800",
          glowColor: "shadow-yellow-200",
          ringColor: "ring-yellow-300"
        };
      case "INTERVIEW":
        return {
          icon: MessageSquare,
          bgColor: "bg-indigo-100",
          textColor: "text-indigo-800",
          glowColor: "shadow-indigo-200",
          ringColor: "ring-indigo-300"
        };
      case "OFFER":
        return {
          icon: Trophy,
          bgColor: "bg-green-100",
          textColor: "text-green-800",
          glowColor: "shadow-green-200",
          ringColor: "ring-green-300"
        };
      case "REJECTED":
        return {
          icon: XCircle,
          bgColor: "bg-red-100",
          textColor: "text-red-800",
          glowColor: "shadow-red-200",
          ringColor: "ring-red-300"
        };
      case "DECLINED":
        return {
          icon: MinusCircle,
          bgColor: "bg-orange-100",
          textColor: "text-orange-800",
          glowColor: "shadow-orange-200",
          ringColor: "ring-orange-300"
        };
      default:
        return {
          icon: Clock,
          bgColor: "bg-gray-100",
          textColor: "text-gray-800",
          glowColor: "shadow-gray-200",
          ringColor: "ring-gray-300"
        };
    }
  };

  // Updated to match the API's JobStatusEnum values
  const statusOptions = [
    { value: "ALL", label: "All Jobs", icon: Briefcase },
    { value: "NEW", label: "New", icon: Sparkles },
    { value: "INTERESTED", label: "Interested", icon: Target },
    { value: "RESUME_GENERATED", label: "Resume Generated", icon: FileText },
    { value: "APPLIED", label: "Applied", icon: Send },
    { value: "INTERVIEW", label: "Interviewing", icon: MessageSquare },
    { value: "OFFER", label: "Offer", icon: Trophy },
    { value: "REJECTED", label: "Rejected", icon: XCircle },
    { value: "DECLINED", label: "Declined", icon: MinusCircle }
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
    e.stopPropagation();

    // Add delete animation
    setAnimatingJobs(prev => new Set([...prev, jobId]));

    // Trigger actual delete after animation starts
    setTimeout(() => {
      onDeleteJob(jobId);
      setAnimatingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }, 300);
  };

  return (
      <div className="bg-white shadow-xl rounded-xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Job Results
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {filteredJobs.length}
              </span>
              </h2>
            </div>

            {bulkDeleteMode && (
                <div className="animate-pulse">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ring-2 ring-red-200">
                <Trash2 className="h-3 w-3 mr-1" />
                Bulk Delete Mode
              </span>
                </div>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                  type="text"
                  placeholder="Search jobs..."
                  className="shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg transition-all duration-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg transition-all duration-200"
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

        <div className="relative">
          {filteredJobs.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                {jobs.length === 0 ? (
                    <div className="animate-fade-in">
                      <div className="mx-auto h-24 w-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                        <Briefcase className="h-12 w-12 text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs yet</h3>
                      <p className="text-gray-500">Get started by adding your first job posting.</p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                      <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">No jobs found matching your search criteria.</p>
                      <p className="text-sm mt-1 text-gray-500">Try adjusting your search or filter.</p>
                    </div>
                )}
              </div>
          ) : (
              <ul className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {filteredJobs.map((job, index) => {
                  const title = getJobTitle(job);
                  const company = getJobCompany(job);
                  const location = getJobLocation(job);
                  const date = getJobDate(job);
                  const statusInfo = getStatusInfo(job.status);
                  const StatusIcon = statusInfo.icon;

                  const isSelected = selectedJob && selectedJob.id === job.id;
                  const isBulkSelected = selectedJobs.has(job.id);
                  const isAnimating = animatingJobs.has(job.id);
                  const isJustUpdated = justUpdatedJobs.has(job.id);

                  return (
                      <li
                          key={job.id}
                          className={`
                    px-6 py-4 cursor-pointer transition-all duration-300 ease-in-out
                    hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50 hover:shadow-sm
                    transform hover:scale-[1.01] relative group
                    ${isSelected && !bulkDeleteMode ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 shadow-lg" : ""}
                    ${isBulkSelected ? "bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 shadow-lg" : ""}
                    ${isAnimating ? "animate-pulse opacity-50 scale-95" : ""}
                    ${isJustUpdated ? `animate-pulse ring-4 ${statusInfo.ringColor} ${statusInfo.glowColor} shadow-lg` : ""}
                  `}
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animationFillMode: 'both'
                          }}
                          onClick={() => onJobClick(job)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                {bulkDeleteMode && (
                                    <div className="animate-slide-in-left">
                                      <input
                                          type="checkbox"
                                          checked={isBulkSelected}
                                          onChange={() => onJobClick(job)}
                                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded transition-all duration-200"
                                          onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                )}

                                <div className="flex items-center space-x-2">
                                  <Building2 className="h-4 w-4 text-gray-400" />
                                  <h3 className="text-sm font-semibold text-indigo-600 truncate hover:text-indigo-800 transition-colors duration-200">
                                    {title}
                                  </h3>
                                </div>
                              </div>

                              <div className="flex items-center space-x-3">
                                {/* Animated Status Badge */}
                                <div className={`
                            px-3 py-1 inline-flex items-center space-x-1.5 text-xs leading-5 font-medium rounded-full
                            transition-all duration-300 transform hover:scale-105
                            ${statusInfo.bgColor} ${statusInfo.textColor}
                            ${isJustUpdated ? 'animate-bounce ring-2 ring-offset-2 ' + statusInfo.ringColor : ''}
                          `}>
                                  <StatusIcon className="h-3 w-3" />
                                  <span>{job.status || "NEW"}</span>
                                </div>

                                {/* Delete Button with hover animation */}
                                {!bulkDeleteMode && (
                                    <button
                                        onClick={(e) => handleDeleteClick(e, job.id)}
                                        className="
                                p-2 text-gray-400 hover:text-red-500 hover:bg-red-50
                                rounded-full transition-all duration-200 transform hover:scale-110
                                opacity-0 group-hover:opacity-100
                              "
                                        title="Delete job"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Building2 className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                  <span className="font-medium">{company}</span>
                                </div>

                                {location && (
                                    <div className="flex items-center text-sm text-gray-600">
                                      <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                      <span>{location}</span>
                                    </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-sm text-gray-500">
                                  <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                  <span>{date ? new Date(date).toLocaleDateString() : "Recent"}</span>
                                </div>

                                {/* Resume indicator with animation */}
                                {job.resume_id && (
                                    <div className="flex items-center text-xs text-purple-600 animate-fade-in">
                                      <div className="p-1 bg-purple-100 rounded-full mr-1.5">
                                        <FileText className="h-3 w-3" />
                                      </div>
                                      <span className="font-medium">Resume Generated</span>
                                    </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Subtle hover effect line */}
                        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:w-full transition-all duration-300"></div>
                      </li>
                  );
                })}
              </ul>
          )}
        </div>

        <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-slide-in-left {
          animation: slide-in-left 0.3s ease-out;
        }
      `}</style>
      </div>
  );
}

export default JobList;