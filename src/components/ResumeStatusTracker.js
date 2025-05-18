import React, { useState, useEffect } from 'react';
import { resumeApi } from '../utils/api';

function ResumeStatusTracker({ resumeId, onComplete }) {
  const [status, setStatus] = useState('generating');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [resumeData, setResumeData] = useState(null);

  useEffect(() => {
    if (!resumeId) return;

    const checkStatus = async () => {
      try {
        const data = await resumeApi.getResumeStatus(resumeId);
        setResumeData(data);

        if (data.status === 'completed') {
          setStatus('completed');
          setProgress(100);
          if (onComplete) onComplete(data);
        } else if (data.status === 'error') {
          setStatus('error');
          setError(data.message || 'An error occurred during resume generation');
        } else {
          // Still generating, update progress as estimate
          setProgress((prev) => Math.min(prev + 10, 90));
        }
      } catch (err) {
        setStatus('error');
        setError(err.message || 'Failed to check resume status');
      }
    };

    // Initial check
    checkStatus();

    // Set up polling interval
    const interval = setInterval(checkStatus, 2000);

    // Clear interval on unmount or when complete
    return () => clearInterval(interval);
  }, [resumeId, onComplete]);

  const handleDownload = (format) => {
    if (status === 'completed' && resumeId) {
      resumeApi.downloadResume(resumeId, format);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-md bg-gray-50">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Resume Generation</h3>

      {/* Progress indicator */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div
          className={`h-2.5 rounded-full ${status === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Status message */}
      <div className="text-sm mb-4">
        {status === 'generating' && (
          <p className="text-blue-700">
            <span className="inline-block mr-2 h-4 w-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></span>
            Generating your resume... This may take up to a minute.
          </p>
        )}

        {status === 'completed' && (
          <p className="text-green-700">
            Resume generated successfully!
          </p>
        )}

        {status === 'error' && (
          <p className="text-red-700">
            {error || 'An error occurred during resume generation.'}
          </p>
        )}
      </div>

      {/* Download buttons (only show when complete) */}
      {status === 'completed' && (
        <div className="flex space-x-3">
          <button
            onClick={() => handleDownload('pdf')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Download PDF
          </button>

          <button
            onClick={() => handleDownload('yaml')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Download YAML
          </button>
        </div>
      )}
    </div>
  );
}

export default ResumeStatusTracker;