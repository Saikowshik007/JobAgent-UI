import React, { useState, useEffect, useRef  } from 'react';
import { jobsApi } from '../utils/api';
import ResumeStatusTracker from './ResumeStatusTracker';
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import ResumeYamlModal from './ResumeYamlModal';
import SimplifyUploadModal from './SimplifyUploadModal';

function JobDetail({ job, onStatusChange }) {
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
  const [fetchingYamlForModal, setFetchingYamlForModal] = useState(false); // New state for modal fetch
  const { currentUser, getUserSettings } = useAuth();
  const fetchingYaml = useRef(false);
  const yamlFetched = useRef(false); // Track if we've already fetched YAML for this resume
  const [showSimplifyModal, setShowSimplifyModal] = useState(false);

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

  // Reset YAML fetch tracking when resumeId changes (new resume)
  useEffect(() => {
    if (resumeId !== job.resume_id) {
      setResumeId(job.resume_id || null);
      yamlFetched.current = false;
      setResumeYaml(null);
    }
  }, [job.resume_id]);

  // Only fetch resume YAML once when conditions are met
  useEffect(() => {
    if (resumeId &&
        job.status === 'RESUME_GENERATED' &&
        !resumeYaml &&
        !yamlFetched.current &&
        !fetchingYaml.current) {
      fetchResumeYaml();
    }
  }, [resumeId, resumeYaml]); // Removed job.status from dependencies

const fetchResumeYaml = async () => {
  if (fetchingYaml.current || yamlFetched.current) {
    return; // Prevent duplicate calls
  }

  try {
    fetchingYaml.current = true;
    console.log('Fetching resume YAML for resumeId:', resumeId);

    const yamlContent = await jobsApi.getResumeYaml(resumeId);
    if (yamlContent) {
      setResumeYaml(yamlContent);
      yamlFetched.current = true; // Mark as fetched
      console.log('Resume YAML fetched successfully');
    }
  } catch (error) {
    console.error('Error fetching resume YAML:', error);
    setResumeError(`Failed to fetch resume YAML: ${error.message}`);
  } finally {
    fetchingYaml.current = false;
  }
};

  // New function to handle View/Edit Resume button click
  const handleViewEditResume = async () => {
    try {
      // If we already have the YAML, just show the modal
      if (resumeYaml) {
        setShowYamlModal(true);
        return;
      }

      // If we don't have the YAML, fetch it first
      if (resumeId && !fetchingYamlForModal) {
        setFetchingYamlForModal(true);
        setResumeError('');

        console.log('Fetching resume YAML for modal, resumeId:', resumeId);

        const yamlContent = await jobsApi.getResumeYaml(resumeId);
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
      setResumeYaml(null);
      yamlFetched.current = false; // Reset YAML fetch tracking

      // Check if we have user resume data
      if (!userResumeData) {
        throw new Error("Your resume data is not available. Please update your resume in Settings.");
      }

      // Get user settings
      const settings = await getUserSettings() || {};

      // Include user resume data in the request
      const requestData = {
        ...settings,
        resumeData: userResumeData
      };

      console.log("Sending resume data for job:", job.id);

      // Make the API call to generate resume
      const response = await jobsApi.generateResume(job.id, requestData, true);

      // Save the resume ID from the response
      if (response && response.resume_id) {
        setResumeId(response.resume_id);
        setShowStatusTracker(true);

        // Update the job status
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
  setShowStatusTracker(false); // Hide the status tracker to stop polling

  // Only update status if it's not already RESUME_GENERATED
  if (job.status !== 'RESUME_GENERATED') {
    onStatusChange(job.id, 'RESUME_GENERATED');
  }

  // Fetch YAML if we haven't already
  if (!resumeYaml && !yamlFetched.current) {
    await fetchResumeYaml();
  }
};

const handleSaveYaml = async (yamlContent, parsedData) => {
  try {
    setResumeError('');
    setResumeMessage('Saving resume changes...');

    // Call the API to save the updated YAML content
    await jobsApi.saveResumeYaml(resumeId, yamlContent);

    // Update the local state with the new YAML content
    setResumeYaml(yamlContent);
    setResumeMessage('Resume updated successfully!');
  } catch (error) {
    console.error('Error saving resume YAML:', error);
    setResumeError(`Failed to save resume: ${error.message}`);
  }
};

  // Access job properties safely
  const metadata = job.metadata || {};

  // Get title from either top-level or metadata
  const title = job.title || metadata.job_title || "Untitled Position";

  // Get company from either top-level or metadata
  const company = job.company || metadata.company || "Unknown Company";

  // Get team if available
  const team = metadata.team || null;

  // Get location from either top-level or determine from metadata
  const location = job.location || (job.metadata?.is_fully_remote ? "Remote" : job.metadata?.location)

  // Format date string if available
  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString();
  };

  // Extract date posted/found
  const getDatePosted = () => {
    if (metadata.date_posted) {
      return formatDate(metadata.date_posted);
    }
    if (job.date_found) {
      return formatDate(job.date_found);
    }
    return 'Not specified';
  };

  // Get applied date if available
  const getAppliedDate = () => {
    if (job.applied_date) {
      return formatDate(job.applied_date);
    }
    return 'Not applied yet';
  };

  // Get rejected date if available
  const getRejectedDate = () => {
    if (job.rejected_date) {
      return formatDate(job.rejected_date);
    }
    return 'N/A';
  };

  // Extract job type from metadata if it exists
  const getJobType = () => {
    if (metadata.employment_type) {
      return metadata.employment_type;
    }
    if (metadata.job_type) {
      return metadata.job_type;
    }
    return 'Not specified';
  };

  // Determine if job is Easy Apply
  const isEasyApply = () => {
    if (metadata.is_easy_apply) {
      return metadata.is_easy_apply === true ? 'Yes' : 'No';
    }
    return 'No';
  };

  // Get salary information if available
  const getSalary = () => {
    if (metadata.salary) {
      return metadata.salary;
    }
    return 'Not specified';
  };

  // Get job description
  const description = job.description || metadata.job_summary || "No description available";

  // Format skills sections if available
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
        <div className="w-full sm:w-auto">
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={job.status || 'NEW'}
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
          {/* Technical Skills */}
          {metadata.technical_skills && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Technical Skills</h4>
              <p className="text-base text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {formatSkillsList(metadata.technical_skills)}
              </p>
            </div>
          )}

          {/* Non-Technical Skills */}
          {metadata.non_technical_skills && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Non-Technical Skills</h4>
              <p className="text-base text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {formatSkillsList(metadata.non_technical_skills)}
              </p>
            </div>
          )}
        </div>

        {/* ATS Keywords if available */}
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

            {/* Render duties if available */}
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

            {/* Render qualifications if available */}
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

      {/* Resume YAML Modal - Updated condition to show modal even if YAML is being fetched */}
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
               className="flex items-center justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
               onClick={handleUploadToSimplify}
               disabled={uploadingToSimplify || job.status !== 'RESUME_GENERATED' || !resumeId}
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