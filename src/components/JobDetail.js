import React, { useState, useEffect } from 'react';
import { jobsApi } from '../utils/api';
import ResumeStatusTracker from './ResumeStatusTracker';
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import ResumeYamlModal from './ResumeYamlModal';

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
  const { currentUser, getUserSettings } = useAuth();

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

  // Fetch resume YAML if resumeId is available and status is RESUME_GENERATED
  useEffect(() => {
    if (resumeId && job.status === 'RESUME_GENERATED' && !resumeYaml) {
      fetchResumeYaml();
    }
  }, [resumeId, job.status]);

  const fetchResumeYaml = async () => {
    try {
      const yamlContent = await jobsApi.getResumeYaml(resumeId);
      setResumeYaml(yamlContent);
    } catch (error) {
      console.error('Error fetching resume YAML:', error);
      setResumeError(`Failed to fetch resume YAML: ${error.message}`);
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

  const handleUploadToSimplify = async () => {
    try {
      setUploadingToSimplify(true);
      setResumeError('');
      setResumeMessage('');

      // Use the stored resumeId if available, otherwise let the API use job's default resume
      await jobsApi.uploadToSimplify(job.id, resumeId);
      setResumeMessage('Resume uploaded to Simplify successfully!');
    } catch (error) {
      setResumeError('Failed to upload to Simplify: ' + error.message);
    } finally {
      setUploadingToSimplify(false);
    }
  };

  const handleResumeComplete = async (resumeData) => {
    setResumeMessage('Resume generated successfully!');
    // Make sure job status is updated
    onStatusChange(job.id, 'RESUME_GENERATED');

    // Fetch the YAML content after completion
    await fetchResumeYaml();
  };

  const handleSaveYaml = async (yamlContent, parsedData) => {
    // Here you would implement saving the edited YAML back to the server
    // This would require a new API endpoint for updating resume content
    setResumeMessage('Resume YAML updates would be saved here (endpoint not implemented).');
    setResumeYaml(yamlContent);
  };

  // Access job properties safely
  const metadata = job.metadata || {};

  // Get title from either top-level or metadata
  const title = job.title || metadata.job_title || "Untitled Position";

  // Get company from either top-level or metadata
  const company = job.company || metadata.company || "Unknown Company";

  // Get location from either top-level or determine from metadata
  const location = job.location || (metadata.is_fully_remote ? "Remote" : "Not specified");

  // Extract date posted from metadata if it exists
  const getDatePosted = () => {
    if (metadata.date_posted) {
      return metadata.date_posted;
    }
    return 'Not specified';
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

  // Get job description
  const description = job.description || metadata.job_summary || "No description available";

  // Format skills sections if available
  const formatSkillsList = (skills) => {
    if (!skills || skills.length === 0) return "None listed";
    return skills.join(", ");
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{company}</p>
        </div>
        <div>
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

      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl className="sm:divide-y sm:divide-gray-200">
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Location</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{location}</dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Job Type</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{getJobType()}</dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Date Posted</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{getDatePosted()}</dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Easy Apply</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{isEasyApply()}</dd>
          </div>

          {/* Technical Skills Section */}
          {metadata.technical_skills && (
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Technical Skills</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatSkillsList(metadata.technical_skills)}
              </dd>
            </div>
          )}

          {/* Non-Technical Skills Section */}
          {metadata.non_technical_skills && (
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Non-Technical Skills</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatSkillsList(metadata.non_technical_skills)}
              </dd>
            </div>
          )}

          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Job URL</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {job.job_url ? (
                <a
                  href={job.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  Open Job Posting
                </a>
              ) : (
                'Not available'
              )}
            </dd>
          </div>

          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Description</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="prose max-w-none max-h-72 overflow-y-auto">
                {description}

                {/* Render duties if available */}
                {metadata.duties && metadata.duties.length > 0 && (
                  <>
                    <h4 className="text-sm font-medium text-gray-900 mt-4">Responsibilities:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {metadata.duties.map((duty, index) => (
                        <li key={index} className="text-sm">{duty}</li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Render qualifications if available */}
                {metadata.qualifications && metadata.qualifications.length > 0 && (
                  <>
                    <h4 className="text-sm font-medium text-gray-900 mt-4">Qualifications:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {metadata.qualifications.map((qual, index) => (
                        <li key={index} className="text-sm">{qual}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </dd>
          </div>

          {resumeId && job.status === 'RESUME_GENERATED' && (
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Resume</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowYamlModal(true)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    View/Edit Resume
                  </button>
                </div>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {!userResumeData && (
        <div className="px-4 py-3 bg-yellow-100 text-yellow-700 border border-yellow-400 rounded mx-4 my-2">
          No resume data found. Please update your resume in Settings before generating a customized resume.
        </div>
      )}

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

      {/* Resume Status Tracker */}
      {showStatusTracker && resumeId && (
        <div className="px-4 py-3">
          <ResumeStatusTracker
            resumeId={resumeId}
            onComplete={handleResumeComplete}
          />
        </div>
      )}

      {/* Resume YAML Modal */}
      {showYamlModal && resumeYaml && (
        <ResumeYamlModal
          yamlContent={resumeYaml}
          onSave={handleSaveYaml}
          onClose={() => setShowYamlModal(false)}
        />
      )}

      <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 space-x-3">
        <button
          type="button"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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