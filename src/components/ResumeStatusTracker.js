// src/components/ResumeStatusTracker.js
import React, { useState, useEffect, useRef } from 'react';
import { jobsApi } from '../utils/api';

function ResumeStatusTracker({ resumeId, onComplete }) {
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('Starting resume generation...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const intervalRefs = useRef({ status: null, progress: null });
  const isMounted = useRef(true);

  useEffect(() => {
    if (!resumeId) {
      setError('No resume ID provided for tracking');
      return;
    }

    // Reset mounted flag when component mounts
    isMounted.current = true;

    // Manual implementation of status polling
    const checkStatus = async () => {
      try {
        if (!isMounted.current) return;

        console.log('Checking resume status for:', resumeId);
        const statusData = await jobsApi.getResumeStatus(resumeId);

        if (!isMounted.current) return;

        console.log('Resume status:', statusData);

        if (statusData.status === 'completed') {
          setStatus('completed');
          setProgress(100);
          setMessage('Resume generated successfully!');

          // Clear intervals once completed
          if (intervalRefs.current.status) {
            clearInterval(intervalRefs.current.status);
            intervalRefs.current.status = null;
          }
          if (intervalRefs.current.progress) {
            clearInterval(intervalRefs.current.progress);
            intervalRefs.current.progress = null;
          }

          // Notify parent component
          if (onComplete && isMounted.current) {
            onComplete(statusData);
          }
        } else if (statusData.status === 'error') {
          setStatus('error');
          setError(`Resume generation failed: ${statusData.message || 'Unknown error'}`);

          // Clear intervals on error
          if (intervalRefs.current.status) {
            clearInterval(intervalRefs.current.status);
            intervalRefs.current.status = null;
          }
          if (intervalRefs.current.progress) {
            clearInterval(intervalRefs.current.progress);
            intervalRefs.current.progress = null;
          }
        } else {
          // Still in progress, update message if available
          if (statusData.message) {
            setMessage(statusData.message);
          }
        }
      } catch (error) {
        if (!isMounted.current) return;

        console.error('Error checking resume status:', error);
        setStatus('error');
        setError(`Failed to check resume status: ${error.message}`);

        // Clear intervals on error
        if (intervalRefs.current.status) {
          clearInterval(intervalRefs.current.status);
          intervalRefs.current.status = null;
        }
        if (intervalRefs.current.progress) {
          clearInterval(intervalRefs.current.progress);
          intervalRefs.current.progress = null;
        }
      }
    };

    // Progress update function
    const updateProgress = () => {
      if (!isMounted.current) return;

      setProgress(prevProgress => {
        // Only increment progress if we're still processing
        if (prevProgress < 90 && status !== 'completed' && status !== 'error') {
          return prevProgress + 5;
        }
        return prevProgress;
      });
    };

    // Initial check
    checkStatus();

    // Set up polling at regular intervals (every 3 seconds)
    intervalRefs.current.status = setInterval(checkStatus, 3000);

    // Set up progress updates (every 2 seconds)
    intervalRefs.current.progress = setInterval(updateProgress, 2000);

    // Clean up function
    return () => {
      console.log('ResumeStatusTracker cleanup - stopping polling');
      isMounted.current = false;

      if (intervalRefs.current.status) {
        clearInterval(intervalRefs.current.status);
        intervalRefs.current.status = null;
      }
      if (intervalRefs.current.progress) {
        clearInterval(intervalRefs.current.progress);
        intervalRefs.current.progress = null;
      }
    };
  }, [resumeId, onComplete]);

  // Additional cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('ResumeStatusTracker unmounting');
      isMounted.current = false;
    };
  }, []);

  return (
    <div className="p-4 border rounded-md bg-gray-50">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Resume Generation Status</h3>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            status === 'error' ? 'bg-red-600' :
            status === 'completed' ? 'bg-green-600' : 'bg-indigo-600'
          }`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Status message */}
      <div className="flex items-center">
        {status === 'pending' && (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}

        {status === 'completed' && (
          <svg className="h-5 w-5 text-green-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}

        {status === 'error' && (
          <svg className="h-5 w-5 text-red-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}

        <span className={`
          text-sm font-medium
          ${status === 'error' ? 'text-red-800' :
          status === 'completed' ? 'text-green-800' : 'text-gray-800'}
        `}>
          {error || message}
        </span>
      </div>
    </div>
  );
}

export default ResumeStatusTracker;