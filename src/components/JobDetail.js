import React, { useState, useEffect, useRef } from 'react';
import { resumeApi } from '../utils/api';
import ResumeStatusTracker from './ResumeStatusTracker';
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

function JobDetail({ job, onStatusChange, onDeleteJob, onShowYamlModal, onShowSimplifyModal, resumeYamlVersion }) {
  const [generatingResume, setGeneratingResume] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [resumeMessage, setResumeMessage] = useState('');
  const [uploadingToSimplify, setUploadingToSimplify] = useState(false);
  const [resumeId, setResumeId] = useState(job?.resume_id || null);
  const [showStatusTracker, setShowStatusTracker] = useState(false);
  const [userResumeData, setUserResumeData] = useState(null);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [lastStatusChange, setLastStatusChange] = useState(null);
  const [userSettings, setUserSettings] = useState(null); // Add state for user settings

  const { currentUser, getUserSettings } = useAuth();
  const currentJobId = useRef(job?.id);

  // COMPLETE state reset when job changes
  useEffect(() => {
    if (job?.id && currentJobId.current !== job.id) {
      console.log(`Job changed from ${currentJobId.current} to ${job.id} - resetting ALL state`);

      // Reset ALL job-specific state completely
      setGeneratingResume(false);
      setResumeError('');
      setResumeMessage('');
      setUploadingToSimplify(false);
      setShowStatusTracker(false);
      setExpandedDescription(false);
      setStatusChanging(false);
      setLastStatusChange(null);

      // Update the job ID tracker
      currentJobId.current = job.id;

      // Update resume ID from the new job
      setResumeId(job.resume_id || null);
    }
  }, [job?.id, job?.resume_id]);

  // Fetch user's resume data and settings when component mounts
  useEffect(() => {
    async function fetchUserData() {
      if (currentUser) {
        try {
          // Fetch user settings
          const settings = await getUserSettings();
          setUserSettings(settings);
          console.log('Loaded user settings:', settings);

          // Fetch user resume data
          const resumeRef = doc(db, "resumes", currentUser.uid);
          const resumeSnap = await getDoc(resumeRef);

          if (resumeSnap.exists()) {
            const resumeData = resumeSnap.data();
            setUserResumeData(resumeData);
            console.log('Loaded user resume data:', resumeData);
          } else {
            console.log("No resume found for user");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    }

    fetchUserData();
  }, [currentUser, getUserSettings]);

  // Helper function to determine includeObjective flag
  const getIncludeObjectiveFlag = () => {
    // Check if user has objective/professional summary in their resume
    const hasObjectiveInResume = userResumeData?.objective &&
        userResumeData.objective.trim().length > 0;

    // Priority: 1. User setting, 2. Auto-detect from resume, 3. Default true
    if (userSettings?.settings?.resume?.include_objective !== undefined) {
      // User has explicitly set a preference
      console.log(`Using user setting: include_objective = ${userSettings.settings.resume.include_objective}`);
      return userSettings.settings.resume.include_objective;
    } else if (hasObjectiveInResume) {
      // User has an objective in their resume, so they probably want it
      console.log(`Auto-detected: User has objective in resume, including it`);
      return true;
    } else {
      // No objective in resume, but still default to true for new users
      console.log(`Default: No objective in resume, but defaulting to true`);
      return true;
    }
  };

  // Updated to match the API's JobStatusEnum values
  const statusOptions = [
    { value: 'NEW', label: 'New' },
    { value: 'INTERESTED', label: 'Interested' },
    { value: 'RESUME_GENERATED', label: 'Resume Generated' },
    { value: 'APPLIED', label: 'Applied' },
    { value: 'INTERVIEW', label: 'Interviewing' },
    { value: 'OFFER', label: 'Offer' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'DECLINED', label: 'Declined' }
  ];

  const getStatusColors = (status) => {
    switch (status) {
      case "NEW": return { bg: "bg-gray-100", text: "text-gray-800", ring: "ring-gray-300" };
      case "INTERESTED": return { bg: "bg-blue-100", text: "text-blue-800", ring: "ring-blue-300" };
      case "RESUME_GENERATED": return { bg: "bg-purple-100", text: "text-purple-800", ring: "ring-purple-300" };
      case "APPLIED": return { bg: "bg-yellow-100", text: "text-yellow-800", ring: "ring-yellow-300" };
      case "INTERVIEW": return { bg: "bg-indigo-100", text: "text-indigo-800", ring: "ring-indigo-300" };
      case "OFFER": return { bg: "bg-green-100", text: "text-green-800", ring: "ring-green-300" };
      case "REJECTED": return { bg: "bg-red-100", text: "text-red-800", ring: "ring-red-300" };
      case "DECLINED": return { bg: "bg-orange-100", text: "text-orange-800", ring: "ring-orange-300" };
      default: return { bg: "bg-gray-100", text: "text-gray-800", ring: "ring-gray-300" };
    }
  };

  const currentStatusColors = getStatusColors(job.status);

  const handleGenerateResume = async () => {
    try {
      setGeneratingResume(true);
      setResumeError('');
      setResumeMessage('');
      setShowStatusTracker(false);

      if (!userResumeData) {
        throw new Error("Your resume data is not available. Please update your resume in Settings.");
      }

      // Get the includeObjective flag using our helper function
      const includeObjective = getIncludeObjectiveFlag();

      const requestData = {
        job_id: job.id,
        customize: true,
        template: "standard",
        resume_data: userResumeData,
        include_objective: includeObjective
      };

      console.log("Resume generation request:", {
        jobId: job.id,
        hasResumeData: !!userResumeData,
        includeObjective,
        hasObjectiveInResume: !!(userResumeData?.objective?.trim()),
        userSetting: userSettings?.settings?.resume?.include_objective
      });

      // Use resumeApi.generateResume with the enhanced settings
      const response = await resumeApi.generateResume(
          job.id,
          {
            openaiApiKey: userSettings?.openaiApiKey,
            resumeData: userResumeData,
            includeObjective: includeObjective
          },
          true, // customize
          "standard", // template
          "replace" // handleExisting
      );

      if (response && response.resume_id) {
        setResumeId(response.resume_id);
        setShowStatusTracker(true);
        onStatusChange(job.id, 'RESUME_GENERATED');
      } else {
        setResumeMessage('Resume generation initiated. Check status later.');
      }
    } catch (error) {
      setResumeError('Failed to generate resume: ' + error.message);
    } finally {
      setGeneratingResume(false);
    }
  };

  const handleViewEditResume = () => {
    if (resumeId) {
      onShowYamlModal(resumeId);
    }
  };

  const handleUploadToSimplify = () => {
    if (resumeId) {
      onShowSimplifyModal(resumeId);
    }
  };

  const handleResumeComplete = async (resumeData) => {
    console.log('Resume generation completed:', resumeData);
    setResumeMessage('Resume generated successfully!');
    setShowStatusTracker(false);

    if (job.status !== 'RESUME_GENERATED') {
      onStatusChange(job.id, 'RESUME_GENERATED');
    }
  };

  // Enhanced status change handler with animation
  const handleStatusChange = async (newStatus) => {
    if (newStatus === job.status) return;

    setStatusChanging(true);
    setLastStatusChange(newStatus);

    try {
      await onStatusChange(job.id, newStatus);

      // Show success animation
      setTimeout(() => {
        setLastStatusChange(null);
      }, 2000);
    } catch (error) {
      setResumeError('Failed to update status: ' + error.message);
    } finally {
      setStatusChanging(false);
    }
  };

  const handleDeleteJob = () => {
    const title = job.title || job.metadata?.job_title || "this job";
    const company = job.company || job.metadata?.company || "Unknown Company";

    const confirmDelete = window.confirm(
        `Are you sure you want to delete the job "${title}" at "${company}"? This action cannot be undone.`
    );

    if (confirmDelete) {
      onDeleteJob(job.id);
    }
  };

  const isUploadToSimplifyEnabled = () => {
    const currentStatus = job.status;
    const enabledStatuses = ['RESUME_GENERATED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'DECLINED'];
    return enabledStatuses.includes(currentStatus) && resumeId;
  };

  // Access job properties safely with better fallbacks
  const metadata = job.metadata || {};
  const title = job.title || metadata.job_title || "Untitled Position";
  const company = job.company || metadata.company || "Unknown Company";
  const team = metadata.team || null;
  const location = job.location || (job.metadata?.is_fully_remote ? "Remote" : job.metadata?.location) || "Location not specified";

  // Format date string if available
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString; // Return original if parsing fails
    }
  };

  const getDatePosted = () => {
    if (metadata.date_posted) return formatDate(metadata.date_posted);
    if (job.date_found) return formatDate(job.date_found);
    return 'Not specified';
  };

  const getAppliedDate = () => job.applied_date ? formatDate(job.applied_date) : 'Not applied yet';
  const getRejectedDate = () => job.rejected_date ? formatDate(job.rejected_date) : 'N/A';
  const getJobType = () => metadata.employment_type || metadata.job_type || 'Not specified';
  const isEasyApply = () => metadata.is_easy_apply === true ? 'Yes' : 'No';
  const getSalary = () => metadata.salary || 'Not specified';
  const description = job.description || metadata.job_summary || "No description available";

  // Validate job object after hooks
  if (!job || !job.id) {
    console.error("❌ JobDetail received invalid job:", job);
    return (
        <div className="p-8 bg-white rounded-xl shadow text-center">
          <div className="text-red-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid Job Data</h3>
          <p className="text-gray-600">
            The selected job data is invalid. Please try selecting a different job.
          </p>
        </div>
    );
  }

  return (
      <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-white/20 overflow-hidden">
        {/* Enhanced Job Header */}
        <div className="relative px-6 py-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b border-gray-200">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5"></div>
          <div className="relative flex flex-wrap justify-between items-center gap-4">
            <div className="flex-grow">
              <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
              <p className="mt-1 text-lg text-gray-700 font-medium">{company}</p>
              {/* Debug info in development */}
              {process.env.NODE_ENV === 'development' && (
                  <p className="mt-1 text-xs text-gray-500">Job ID: {job.id}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Enhanced Status Selector */}
              <div className="relative">
                <select
                    className={`
                  appearance-none pl-4 pr-10 py-3 rounded-xl border-0 shadow-lg text-sm font-medium
                  transition-all duration-300 transform hover:scale-105 focus:scale-105
                  ${currentStatusColors.bg} ${currentStatusColors.text}
                  ${statusChanging ? 'animate-pulse' : ''}
                  ${lastStatusChange ? `ring-4 ${currentStatusColors.ring}` : ''}
                `}
                    value={job.status || 'NEW'}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={statusChanging}
                >
                  {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {statusChanging ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
                  ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                  )}
                </div>
              </div>

              {/* Enhanced Delete Job Button */}
              <button
                  onClick={handleDeleteJob}
                  className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 transform hover:scale-110 shadow-sm hover:shadow-md"
                  title="Delete job"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Job Details */}
        <div className="px-6 py-6 space-y-8">
          {/* Primary Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Location</span>
              <span className="text-base text-gray-900 font-medium">{location}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Job Type</span>
              <span className="text-base text-gray-900 font-medium">{getJobType()}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Date Posted/Found</span>
              <span className="text-base text-gray-900 font-medium">{getDatePosted()}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Salary</span>
              <span className="text-base text-gray-900 font-medium">{getSalary()}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-gray-500">Easy Apply</span>
              <span className="text-base text-gray-900 font-medium">{isEasyApply()}</span>
            </div>
            {team && (
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-gray-500">Team</span>
                  <span className="text-base text-gray-900 font-medium">{team}</span>
                </div>
            )}
          </div>

          {/* Enhanced Application Status Info */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Application Status</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-sm font-medium text-gray-500">Applied Date</span>
                <p className="text-base text-gray-900 font-medium">{getAppliedDate()}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-gray-500">Rejected Date</span>
                <p className="text-base text-gray-900 font-medium">{getRejectedDate()}</p>
              </div>
            </div>
          </div>

          {/* Enhanced Skills Sections */}
          {((metadata.technical_skills && metadata.technical_skills.length > 0) ||
              (metadata.non_technical_skills && metadata.non_technical_skills.length > 0) ||
              (metadata.ats_keywords && metadata.ats_keywords.length > 0)) && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Skills & Keywords</span>
                </h4>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {metadata.technical_skills && (
                      <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 hover:shadow-md transition-shadow duration-200">
                        <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                          <span>Technical Skills</span>
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {metadata.technical_skills.map((skill, index) => (
                              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200 hover:bg-blue-200 transition-colors duration-150">
                        {skill}
                      </span>
                          ))}
                        </div>
                      </div>
                  )}

                  {metadata.non_technical_skills && (
                      <div className="bg-green-50 p-5 rounded-xl border border-green-200 hover:shadow-md transition-shadow duration-200">
                        <h5 className="text-sm font-semibold text-green-900 mb-3 flex items-center space-x-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Soft Skills</span>
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {metadata.non_technical_skills.map((skill, index) => (
                              <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full border border-green-200 hover:bg-green-200 transition-colors duration-150">
                        {skill}
                      </span>
                          ))}
                        </div>
                      </div>
                  )}

                  {metadata.ats_keywords && (
                      <div className="bg-purple-50 p-5 rounded-xl border border-purple-200 lg:col-span-2 hover:shadow-md transition-shadow duration-200">
                        <h5 className="text-sm font-semibold text-purple-900 mb-3 flex items-center space-x-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          <span>ATS Keywords</span>
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {metadata.ats_keywords.map((keyword, index) => (
                              <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full border border-purple-200 hover:bg-purple-200 transition-colors duration-150">
                        {keyword}
                      </span>
                          ))}
                        </div>
                      </div>
                  )}
                </div>
              </div>
          )}

          {/* Enhanced Description Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Job Description</span>
              </h4>

              <button
                  onClick={() => setExpandedDescription(!expandedDescription)}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{expandedDescription ? "Show Less" : "Show More"}</span>
              </button>
            </div>

            <div className={`bg-gray-50 rounded-xl p-6 transition-all duration-300 hover:shadow-md ${expandedDescription ? 'max-h-none' : 'max-h-64 overflow-hidden'}`}>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                  {description}
                </div>

                {metadata.duties && metadata.duties.length > 0 && (
                    <div className="mt-6">
                      <h5 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                        <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Key Responsibilities</span>
                      </h5>
                      <ul className="space-y-2">
                        {metadata.duties.map((duty, index) => (
                            <li key={index} className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-gray-700">{duty}</span>
                            </li>
                        ))}
                      </ul>
                    </div>
                )}

                {metadata.qualifications && metadata.qualifications.length > 0 && (
                    <div className="mt-6">
                      <h5 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                        <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 004.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span>Required Qualifications</span>
                      </h5>
                      <ul className="space-y-2">
                        {metadata.qualifications.map((qual, index) => (
                            <li key={index} className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-gray-700">{qual}</span>
                            </li>
                        ))}
                      </ul>
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced resume section */}
          {resumeId && (job.status === 'RESUME_GENERATED' || job.status === 'APPLIED' || job.status === 'INTERVIEW' || job.status === 'OFFER' || job.status === 'REJECTED' || job.status === 'DECLINED') && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-purple-900 flex items-center space-x-2">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Generated Resume</span>
                  </h4>
                  <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full ring-2 ring-green-200">
                  Ready
                </span>
                  </div>
                </div>
                <div className="flex">
                  <button
                      onClick={handleViewEditResume}
                      className="inline-flex items-center space-x-2 px-6 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-purple-600 hover:bg-purple-700 transition-all duration-200 transform hover:scale-105"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>View/Edit Resume</span>
                  </button>
                </div>
              </div>
          )}
        </div>

        {/* Enhanced Error/Success Messages */}
        {userResumeData && userSettings && (
            <div className="mx-6 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 text-sm text-blue-800">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Resume will {getIncludeObjectiveFlag() ? 'include' : 'exclude'} an objective section
                </span>
                <span className="text-blue-600">
                  (Change in Settings)
                </span>
              </div>
            </div>
        )}

        {resumeError && (
            <div className="mx-6 mb-4 animate-slide-down">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start space-x-3">
                  <svg className="h-5 w-5 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800">{resumeError}</p>
                </div>
              </div>
            </div>
        )}

        {resumeMessage && (
            <div className="mx-6 mb-4 animate-slide-down">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <svg className="h-5 w-5 text-green-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-green-800">{resumeMessage}</p>
                </div>
              </div>
            </div>
        )}

        {/* Resume Status Tracker */}
        {showStatusTracker && resumeId && (
            <div className="mx-6 mb-4 animate-slide-down">
              <ResumeStatusTracker
                  resumeId={resumeId}
                  onComplete={handleResumeComplete}
              />
            </div>
        )}

        {/* Enhanced Action Buttons */}
        <div className="px-6 py-6 bg-gradient-to-r from-gray-50 to-slate-50 flex flex-wrap gap-4 justify-end rounded-b-2xl border-t border-gray-200">
          <button
              onClick={handleGenerateResume}
              disabled={generatingResume || showStatusTracker || !userResumeData}
              className="flex items-center justify-center space-x-2 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
          >
            {generatingResume ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span>Generating Resume...</span>
                </>
            ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate Resume</span>
                </>
            )}
          </button>

          <button
              onClick={handleUploadToSimplify}
              disabled={uploadingToSimplify || !isUploadToSimplifyEnabled()}
              className="flex items-center justify-center space-x-2 py-3 px-6 bg-white text-gray-700 border border-gray-300 font-medium rounded-xl shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
          >
            {uploadingToSimplify ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600"></div>
                  <span>Uploading to Simplify...</span>
                </>
            ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Upload to Simplify</span>
                </>
            )}
          </button>

          <button
              onClick={() => {
                onStatusChange(job.id, 'APPLIED');
                if (job.job_url) {
                  window.open(job.job_url, '_blank');
                }
              }}
              disabled={!job.job_url}
              className="flex items-center justify-center space-x-2 py-3 px-6 bg-white text-gray-700 border border-gray-300 font-medium rounded-xl shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Apply</span>
          </button>
        </div>

        <style jsx>{`
          @keyframes slide-down {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .animate-slide-down {
            animation: slide-down 0.3s ease-out;
          }
        `}</style>
      </div>
  );
}

export default JobDetail;