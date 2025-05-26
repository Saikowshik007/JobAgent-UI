// JobDetail.js - Fixed version with proper YAML state reset on job change
import React, { useState, useEffect, useRef } from 'react';
import { jobsApi, resumeApi } from '../utils/api';
import ResumeStatusTracker from './ResumeStatusTracker';
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import ResumeYamlModal from './ResumeYamlModal';
import SimplifyUploadModal from './SimplifyUploadModal';

function JobDetail({ job, onStatusChange, onDeleteJob }) {
  const [generatingResume, setGeneratingResume] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [resumeMessage, setResumeMessage] = useState('');
  const [uploadingToSimplify, setUploadingToSimplify] = useState(false);
  const [resumeId, setResumeId] = useState(job.resume_id || null);
  const [showStatusTracker, setShowStatusTracker] = useState(false);
  const [userResumeData, setUserResumeData] = useState(null);
  const [resumeYaml, setResumeYaml] = useState(null);
  const [showYamlModal, setShowYamlModal] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [fetchingYamlForModal, setFetchingYamlForModal] = useState(false);
  const [showSimplifyModal, setShowSimplifyModal] = useState(false);

  const { currentUser, getUserSettings } = useAuth();
  const fetchingYaml = useRef(false);
  const yamlFetched = useRef(false);
  const currentJobId = useRef(job.id);

  // Clear ALL state when job changes - this is the key fix
  useEffect(() => {
    if (currentJobId.current !== job.id) {
      console.log(`Job changed from ${currentJobId.current} to ${job.id} - resetting all state`);

      // Reset ALL job-specific state
      setResumeError('');
      setResumeMessage('');
      setShowStatusTracker(false);
      setUploadingToSimplify(false);
      setFetchingYamlForModal(false);

      // Reset YAML-related state
      setResumeYaml(null);
      yamlFetched.current = false;
      fetchingYaml.current = false;

      // Update the job ID tracker
      currentJobId.current = job.id;

      // Update resume ID from the new job
      setResumeId(job.resume_id || null);
    }
  }, [job.id]);

  // Fetch user's resume data when component mounts
  useEffect(() => {
    async function fetchUserResume() {
      if (currentUser) {
        try {
          const resumeRef = doc(db, "resumes", currentUser.uid);
          const resumeSnap = await getDoc(resumeRef);

          if (resumeSnap.exists()) {
            setUserResumeData(resumeSnap.data());
          } else {
            console.log("No resume found for user");
          }
        } catch (error) {
          console.error("Error fetching user resume:", error);
        }
      }
    }

    fetchUserResume();
  }, [currentUser]);

  // Fetch YAML when conditions are met
  useEffect(() => {
    console.log('Checking if should fetch YAML:', {
      resumeId,
      status: job.status,
      hasYaml: !!resumeYaml,
      yamlFetched: yamlFetched.current,
      fetching: fetchingYaml.current,
      jobId: job.id
    });

    if (resumeId &&
        job.status === 'RESUME_GENERATED' &&
        !resumeYaml &&
        !yamlFetched.current &&
        !fetchingYaml.current) {
      console.log('Conditions met - fetching YAML for job', job.id);
      fetchResumeYaml();
    }
  }, [resumeId, job.status, resumeYaml, job.id]);

  const fetchResumeYaml = async () => {
    if (fetchingYaml.current || yamlFetched.current) {
      console.log('Skipping YAML fetch - already fetching or fetched');
      return;
    }

    try {
      fetchingYaml.current = true;
      console.log('Fetching resume YAML for resumeId:', resumeId, 'jobId:', job.id);

      const yamlContent = await resumeApi.getResumeYaml(resumeId);
      if (yamlContent) {
        setResumeYaml(yamlContent);
        yamlFetched.current = true;
        console.log('Resume YAML fetched successfully for job', job.id);
      }
    } catch (error) {
      console.error('Error fetching resume YAML:', error);
      setResumeError(`Failed to fetch resume YAML: ${error.message}`);
    } finally {
      fetchingYaml.current = false;
    }
  };

  const handleViewEditResume = async () => {
    try {
      if (resumeYaml) {
        setShowYamlModal(true);
        return;
      }

      if (resumeId && !fetchingYamlForModal) {
        setFetchingYamlForModal(true);
        setResumeError('');

        console.log('Fetching resume YAML for modal, resumeId:', resumeId);

        const yamlContent = await resumeApi.getResumeYaml(resumeId);
        if (yamlContent) {
          setResumeYaml(yamlContent);
          yamlFetched.current = true;
          setShowYamlModal(true);
          console.log('Resume YAML fetched successfully for modal');
        } else {
          setResumeError('Failed to fetch resume content');
        }
      }
    } catch (error) {
      console.error('Error fetching resume YAML for modal:', error);
      setResumeError(`Failed to fetch resume: ${error.message}`);
    } finally {
      setFetchingYamlForModal(false);
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

  const handleGenerateResume = async () => {
    try {
      setGeneratingResume(true);
      setResumeError('');
      setResumeMessage('');
      setShowStatusTracker(false);

      // Reset YAML state for new resume generation
      setResumeYaml(null);
      yamlFetched.current = false;

      if (!userResumeData) {
        throw new Error("Your resume data is not available. Please update your resume in Settings.");
      }

      const settings = await getUserSettings() || {};
      const requestData = {
        ...settings,
        resumeData: userResumeData
      };

      console.log("Sending resume data for job:", job.id);

      const response = await resumeApi.generateResume(job.id, requestData, true);

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

  const handleUploadToSimplify = () => {
    setShowSimplifyModal(true);
  };

  const handleSimplifyUploadComplete = (result) => {
    setResumeMessage('Resume uploaded to Simplify successfully!');
    setShowSimplifyModal(false);
  };

  const handleResumeComplete = async (resumeData) => {
    setResumeMessage('Resume generated successfully!');
    setShowStatusTracker(false);

    if (job.status !== 'RESUME_GENERATED') {
      onStatusChange(job.id, 'RESUME_GENERATED');
    }

    if (!resumeYaml && !yamlFetched.current) {
      await fetchResumeYaml();
    }
  };

  const handleSaveYaml = async (yamlContent, parsedData) => {
    try {
      setResumeError('');
      setResumeMessage('Saving resume changes...');

      await resumeApi.updateResumeYaml(resumeId, yamlContent);
      setResumeYaml(yamlContent);
      setResumeMessage('Resume updated successfully!');
    } catch (error) {
      console.error('Error saving resume YAML:', error);
      setResumeError(`Failed to save resume: ${error.message}`);
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

  // Access job properties safely
  const metadata = job.metadata || {};
  const title = job.title || metadata.job_title || "Untitled Position";
  const company = job.company || metadata.company || "Unknown Company";
  const team = metadata.team || null;
  const location = job.location || (job.metadata?.is_fully_remote ? "Remote" : job.metadata?.location);

  // Format date string if available
  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString();
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

  const formatSkillsList = (skills) => {
    if (!skills || skills.length === 0) return "None listed";
    return skills.join(", ");
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Job Header */}
      <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
        <div className="flex-grow">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-md text-gray-700">{company}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={job.status || 'NEW'}
            onChange={(e) => onStatusChange(job.id, e.target.value)}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Delete Job Button */}
          <button
            onClick={handleDeleteJob}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Delete job"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Job Details */}
      <div className="px-6 py-4">
        {/* Primary Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">Location</span>
            <span className="text-base text-gray-900">{location}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">Job Type</span>
            <span className="text-base text-gray-900">{getJobType()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">Date Posted/Found</span>
            <span className="text-base text-gray-900">{getDatePosted()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">Salary</span>
            <span className="text-base text-gray-900">{getSalary()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">Easy Apply</span>
            <span className="text-base text-gray-900">{isEasyApply()}</span>
          </div>
          {team && (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-500">Team</span>
              <span className="text-base text-gray-900">{team}</span>
            </div>
          )}
        </div>

        {/* Application Status Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Application Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Applied Date</span>
              <p className="text-sm text-gray-900">{getAppliedDate()}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Rejected Date</span>
              <p className="text-sm text-gray-900">{getRejectedDate()}</p>
            </div>
          </div>
        </div>

        {/* Skills Sections */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {metadata.technical_skills && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Technical Skills</h4>
              <p className="text-base text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {formatSkillsList(metadata.technical_skills)}
              </p>
            </div>
          )}

          {metadata.non_technical_skills && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Non-Technical Skills</h4>
              <p className="text-base text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {formatSkillsList(metadata.non_technical_skills)}
              </p>
            </div>
          )}
        </div>

        {/* ATS Keywords */}
        {metadata.ats_keywords && metadata.ats_keywords.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-500 mb-1">ATS Keywords</h4>
            <p className="text-base text-gray-900 bg-gray-50 px-3 py-2 rounded">
              {formatSkillsList(metadata.ats_keywords)}
            </p>
          </div>
        )}

        {/* Description Section */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-500">Description</h4>
            <button
              onClick={() => setExpandedDescription(!expandedDescription)}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              {expandedDescription ? "Show Less" : "Show More"}
            </button>
          </div>

          <div className={`prose prose-sm max-w-none bg-gray-50 p-4 rounded ${expandedDescription ? '' : 'max-h-64 overflow-y-auto'}`}>
            <div className="whitespace-pre-line">
              {description}
            </div>

            {metadata.duties && metadata.duties.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">Responsibilities:</h5>
                <ul className="list-disc pl-5 space-y-2">
                  {metadata.duties.map((duty, index) => (
                    <li key={index}>{duty}</li>
                  ))}
                </ul>
              </div>
            )}

            {metadata.qualifications && metadata.qualifications.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">Qualifications:</h5>
                <ul className="list-disc pl-5 space-y-2">
                  {metadata.qualifications.map((qual, index) => (
                    <li key={index}>{qual}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Resume section */}
        {resumeId && (job.status === 'RESUME_GENERATED' || job.status === 'APPLIED' || job.status === 'INTERVIEW' || job.status === 'OFFER' || job.status === 'REJECTED' || job.status === 'DECLINED') && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2">Resume</h4>
            <div className="flex">
              <button
                onClick={handleViewEditResume}
                disabled={fetchingYamlForModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fetchingYamlForModal ? (
                  <>
                    <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                    Loading Resume...
                  </>
                ) : (
                  "View/Edit Resume"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error/Success Messages */}
      {!userResumeData && (
        <div className="mx-6 mb-4 px-4 py-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
          <p className="font-medium">No resume data found</p>
          <p className="text-sm">Please update your resume in Settings before generating a customized resume.</p>
        </div>
      )}

      {resumeError && (
        <div className="mx-6 mb-4 px-4 py-3 bg-red-50 border-l-4 border-red-400 text-red-700">
          <p>{resumeError}</p>
        </div>
      )}

      {resumeMessage && (
        <div className="mx-6 mb-4 px-4 py-3 bg-green-50 border-l-4 border-green-400 text-green-700">
          <p>{resumeMessage}</p>
        </div>
      )}

      {/* Resume Status Tracker */}
      {showStatusTracker && resumeId && (
        <div className="mx-6 mb-4">
          <ResumeStatusTracker
            resumeId={resumeId}
            onComplete={handleResumeComplete}
          />
        </div>
      )}

      {/* Modals */}
      {showYamlModal && (
        <ResumeYamlModal
          yamlContent={resumeYaml}
          onSave={handleSaveYaml}
          onClose={() => setShowYamlModal(false)}
        />
      )}

      {showSimplifyModal && (
        <SimplifyUploadModal
          isOpen={showSimplifyModal}
          onClose={() => setShowSimplifyModal(false)}
          resumeId={resumeId}
          jobId={job.id}
          onUploadComplete={handleSimplifyUploadComplete}
        />
      )}

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gray-50 flex flex-wrap gap-3 justify-end rounded-b-lg">
        <button
          type="button"
          className="flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={handleGenerateResume}
          disabled={generatingResume || showStatusTracker || !userResumeData}
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
          className="flex items-center justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleUploadToSimplify}
          disabled={uploadingToSimplify || !isUploadToSimplifyEnabled()}
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
          className="flex items-center justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={() => {
            onStatusChange(job.id, 'APPLIED');
            window.open(job.job_url, '_blank');
          }}
          disabled={!job.job_url}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default JobDetail;