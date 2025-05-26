
import React, { useState, useEffect } from 'react';
import { jobsApi } from '../utils/api';
import JobDetail from './JobDetail';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_found');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  const [addJobUrl, setAddJobUrl] = useState('');
  const [addingJob, setAddingJob] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const { currentUser } = useAuth();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await jobsApi.getAllJobs();
      setJobs(response || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch jobs: ' + err.message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await jobsApi.updateJobStatus(jobId, newStatus);
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId ? { ...job, status: newStatus } : job
        )
      );

      // Update selected job if it's the one being changed
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      setError('Failed to update job status: ' + err.message);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await jobsApi.deleteJob(jobId);
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));

      // Clear selected job if it was deleted
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(null);
      }
    } catch (err) {
      setError('Failed to delete job: ' + err.message);
    }
  };

  const handleAddJob = async (e) => {
    e?.preventDefault?.();
    if (!addJobUrl.trim()) return;

    try {
      setAddingJob(true);
      setError('');

      const newJob = await jobsApi.addJob({ job_url: addJobUrl.trim() });
      setJobs(prevJobs => [newJob, ...prevJobs]);
      setAddJobUrl('');
      setShowAddJobForm(false);
    } catch (err) {
      setError('Failed to add job: ' + err.message);
    } finally {
      setAddingJob(false);
    }
  };

  // Filter and sort jobs
  const filteredAndSortedJobs = jobs
    .filter(job => {
      const matchesSearch = !searchTerm ||
        (job.title && job.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.company && job.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.metadata?.job_title && job.metadata.job_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.metadata?.company && job.metadata.company.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle nested properties
      if (sortBy === 'title') {
        aValue = a.title || a.metadata?.job_title || '';
        bValue = b.title || b.metadata?.job_title || '';
      } else if (sortBy === 'company') {
        aValue = a.company || a.metadata?.company || '';
        bValue = b.company || b.metadata?.company || '';
      }

      // Handle dates
      if (sortBy === 'date_found' || sortBy === 'applied_date') {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const statusOptions = [
    { value: 'ALL', label: 'All Status', count: jobs.length },
    { value: 'NEW', label: 'New', count: jobs.filter(j => j.status === 'NEW').length },
    { value: 'INTERESTED', label: 'Interested', count: jobs.filter(j => j.status === 'INTERESTED').length },
    { value: 'RESUME_GENERATED', label: 'Resume Generated', count: jobs.filter(j => j.status === 'RESUME_GENERATED').length },
    { value: 'APPLIED', label: 'Applied', count: jobs.filter(j => j.status === 'APPLIED').length },
    { value: 'INTERVIEW', label: 'Interviewing', count: jobs.filter(j => j.status === 'INTERVIEW').length },
    { value: 'OFFER', label: 'Offer', count: jobs.filter(j => j.status === 'OFFER').length },
    { value: 'REJECTED', label: 'Rejected', count: jobs.filter(j => j.status === 'REJECTED').length },
    { value: 'DECLINED', label: 'Declined', count: jobs.filter(j => j.status === 'DECLINED').length },
  ];

  const getStatusColors = (status) => {
    switch (status) {
      case "NEW": return { bg: "bg-gray-100", text: "text-gray-800", dot: "bg-gray-400" };
      case "INTERESTED": return { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-400" };
      case "RESUME_GENERATED": return { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-400" };
      case "APPLIED": return { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-400" };
      case "INTERVIEW": return { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-400" };
      case "OFFER": return { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-400" };
      case "REJECTED": return { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-400" };
      case "DECLINED": return { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-400" };
      default: return { bg: "bg-gray-100", text: "text-gray-800", dot: "bg-gray-400" };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-slide-down">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Job Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Welcome back, {currentUser?.email}! You have {jobs.length} jobs tracked.
              </p>
            </div>

            <button
              onClick={() => setShowAddJobForm(!showAddJobForm)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Job</span>
            </button>
          </div>
        </div>

        {/* Add Job Form */}
        {showAddJobForm && (
          <div className="mb-8 animate-slide-down">
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Job</h3>
              <form onSubmit={handleAddJob} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-grow">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className={`h-5 w-5 transition-colors duration-200 ${focusedField === 'jobUrl' ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <input
                      type="url"
                      value={addJobUrl}
                      onChange={(e) => setAddJobUrl(e.target.value)}
                      onFocus={() => setFocusedField('jobUrl')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Paste job URL here (LinkedIn, Indeed, etc.)"
                      className={`
                        block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                        focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200
                        ${focusedField === 'jobUrl' ? 'transform scale-105 shadow-lg' : 'hover:shadow-md'}
                      `}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addingJob}
                    className={`
                      inline-flex items-center space-x-2 px-6 py-3 border border-transparent
                      text-sm font-medium rounded-xl shadow-sm text-white transition-all duration-200
                      transform hover:scale-105
                      ${addingJob
                        ? 'bg-indigo-400 cursor-not-allowed animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                      }
                    `}
                  >
                    {addingJob ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add Job</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddJobForm(false)}
                    className="px-4 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 animate-slide-down">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-8 animate-slide-in">
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-6 border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search jobs by title or company..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-md focus:shadow-lg"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-md focus:shadow-lg"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Options */}
              <div>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="block w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-md focus:shadow-lg"
                >
                  <option value="date_found-desc">Newest First</option>
                  <option value="date_found-asc">Oldest First</option>
                  <option value="title-asc">Title A-Z</option>
                  <option value="title-desc">Title Z-A</option>
                  <option value="company-asc">Company A-Z</option>
                  <option value="company-desc">Company Z-A</option>
                  <option value="status-asc">Status A-Z</option>
                  <option value="status-desc">Status Z-A</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Jobs List */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Jobs ({filteredAndSortedJobs.length})
                </h2>
              </div>

              <div className="max-h-[70vh] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading jobs...</p>
                  </div>
                ) : filteredAndSortedJobs.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V8m8 0V6a2 2 0 00-2-2H10a2 2 0 00-2 2v2" />
                    </svg>
                    <p className="text-gray-600">No jobs found</p>
                    <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or add some jobs</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredAndSortedJobs.map((job, index) => {
                      const title = job.title || job.metadata?.job_title || "Untitled Position";
                      const company = job.company || job.metadata?.company || "Unknown Company";
                      const statusColors = getStatusColors(job.status);
                      const isSelected = selectedJob && selectedJob.id === job.id;

                      return (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJob(job)}
                          className={`
                            p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 animate-slide-in
                            ${isSelected ? 'bg-indigo-50 border-r-4 border-indigo-500' : ''}
                          `}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-grow min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {title}
                              </h3>
                              <p className="text-sm text-gray-600 truncate mt-1">
                                {company}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(job.date_found)}
                              </p>
                            </div>
                            <div className="ml-2 flex-shrink-0">
                              <span className={`
                                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${statusColors.bg} ${statusColors.text}
                              `}>
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusColors.dot}`}></div>
                                {job.status || 'NEW'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Job Detail */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="animate-slide-in">
                <JobDetail
                  job={selectedJob}
                  onStatusChange={handleStatusChange}
                  onDeleteJob={handleDeleteJob}
                />
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-white/20 p-12 text-center animate-slide-in">
                <svg className="h-24 w-24 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V8m8 0V6a2 2 0 00-2-2H10a2 2 0 00-2 2v2" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Job</h3>
                <p className="text-gray-600">Choose a job from the list to view details and manage your application</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }

        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }

        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }

        .bg-grid-pattern {
          background-image: radial-gradient(circle, #000 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;