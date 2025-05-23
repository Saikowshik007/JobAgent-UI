import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SimplifyJobActions = ({ job, isSimplifyConnected, onActionComplete }) => {
  const [isApplying, setIsApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const { currentUser } = useAuth();

  const applyToJob = async () => {
    if (!isSimplifyConnected) {
      alert('Please connect your Simplify Jobs account first');
      return;
    }

    setIsApplying(true);
    setApplicationStatus(null);

    try {
      // First, check if we have the job URL in Simplify format
      const simplifyUrl = job.job_url || job.url;
      if (!simplifyUrl || !simplifyUrl.includes('simplify.jobs')) {
        throw new Error('This job is not from Simplify Jobs');
      }

      // Extract job ID from Simplify URL
      const jobIdMatch = simplifyUrl.match(/\/jobs\/([^\/\?]+)/);
      if (!jobIdMatch) {
        throw new Error('Could not extract job ID from Simplify URL');
      }

      const simplifyJobId = jobIdMatch[1];

      // Make API request to apply
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/simplify/api-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.uid
        },
        body: JSON.stringify({
          endpoint: `/jobs/${simplifyJobId}/apply`,
          method: 'POST',
          data: {
            // Add any additional application data here
          }
        })
      });

      const result = await response.json();

      if (result.status_code === 200 || result.status_code === 201) {
        setApplicationStatus('success');
        onActionComplete?.('applied');
      } else {
        throw new Error(`Application failed with status ${result.status_code}`);
      }

    } catch (error) {
      console.error('Error applying to job:', error);
      setApplicationStatus('error');
      alert('Failed to apply to job: ' + error.message);
    } finally {
      setIsApplying(false);
    }
  };

  const viewOnSimplify = () => {
    const simplifyUrl = job.job_url || job.url;
    if (simplifyUrl) {
      window.open(simplifyUrl, '_blank');
    }
  };

  const isSimplifyJob = job.job_url?.includes('simplify.jobs') || job.url?.includes('simplify.jobs');

  if (!isSimplifyJob) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          This job is not from Simplify Jobs. Automated application is not available.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Simplify Jobs Actions</h4>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Simplify Job
        </span>
      </div>

      {applicationStatus === 'success' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          ✅ Successfully applied to this job!
        </div>
      )}

      {applicationStatus === 'error' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ❌ Failed to apply to this job. Please try again.
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={applyToJob}
          disabled={!isSimplifyConnected || isApplying || applicationStatus === 'success'}
          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApplying ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Applying...
            </>
          ) : applicationStatus === 'success' ? (
            '✅ Applied'
          ) : (
            '🚀 Quick Apply'
          )}
        </button>

        <button
          onClick={viewOnSimplify}
          className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View on Simplify
        </button>
      </div>

      {!isSimplifyConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            Connect your Simplify Jobs account to enable quick apply functionality.
          </p>
        </div>
      )}
    </div>
  );
};

export default SimplifyJobActions;