// src/components/ResumeStatusTracker.js - Updated to use new API endpoints
import React, { useState, useEffect, useRef } from 'react';
import { resumeApi } from '../utils/api';

function ResumeStatusTracker({ resumeId, onComplete }) {
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('Starting resume generation...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [statusData, setStatusData] = useState(null);
  const intervalRefs = useRef({ status: null, progress: null });
  const isMounted = useRef(true);

  useEffect(() => {
    if (!resumeId) {
      setError('No resume ID provided for tracking');
      return;
    }

    // Reset mounted flag when component mounts
    isMounted.current = true;

    // Status polling function
    const checkStatus = async () => {
      try {
        if (!isMounted.current) return;

        console.log('Checking resume status for:', resumeId);
        const response = await resumeApi.getResumeStatus(resumeId);

        if (!isMounted.current) return;

        console.log('Resume status response:', response);
        setStatusData(response);

        // Update status and message based on response
        if (response.status === 'completed') {
          setStatus('completed');
          setProgress(100);
          setMessage(response.message || 'Resume generated successfully!');

          // Clear intervals
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
            onComplete(response);
          }
        } else if (response.status === 'error' || response.status === 'failed') {
          setStatus('error');
          setError(response.message || response.error || 'Resume generation failed');

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
          // Still in progress
          setStatus(response.status || 'processing');
          if (response.message) {
            setMessage(response.message);
          }

          // Update progress based on status
          if (response.status === 'queued') {
            setProgress(10);
            setMessage('Resume generation queued...');
          } else if (response.status === 'processing') {
            setMessage('Analyzing job requirements and tailoring resume...');
            // Progress will be updated by the progress interval
          } else if (response.status === 'pending') {
            setProgress(5);
            setMessage('Initializing resume generation...');
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
        // Only increment progress if we're still processing and not completed
        if (prevProgress < 90 && status !== 'completed' && status !== 'error') {
          // Faster progress updates for active processing
          if (status === 'processing') {
            return Math.min(prevProgress + 8, 90);
          } else {
            return Math.min(prevProgress + 3, 85);
          }
        }
        return prevProgress;
      });
    };

    // Initial check
    checkStatus();

    // Set up polling intervals
    intervalRefs.current.status = setInterval(checkStatus, 3000); // Check every 3 seconds
    intervalRefs.current.progress = setInterval(updateProgress, 2000); // Update progress every 2 seconds

    // Cleanup function
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

  // Helper function to get status display info
  const getStatusDisplay = () => {
    switch (status) {
      case 'queued':
        return {
          color: 'text-blue-800',
          bgColor: 'bg-blue-600',
          icon: 'clock'
        };
      case 'processing':
        return {
          color: 'text-indigo-800',
          bgColor: 'bg-indigo-600',
          icon: 'spinner'
        };
      case 'completed':
        return {
          color: 'text-green-800',
          bgColor: 'bg-green-600',
          icon: 'check'
        };
      case 'error':
      case 'failed':
        return {
          color: 'text-red-800',
          bgColor: 'bg-red-600',
          icon: 'error'
        };
      default:
        return {
          color: 'text-gray-800',
          bgColor: 'bg-indigo-600',
          icon: 'spinner'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="p-4 border rounded-md bg-gray-50">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Resume Generation Status</h3>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${statusDisplay.bgColor}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Status message with icon */}
      <div className="flex items-center">
        {statusDisplay.icon === 'spinner' && (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}

        {statusDisplay.icon === 'check' && (
          <svg className="h-5 w-5 text-green-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}

        {statusDisplay.icon === 'error' && (
          <svg className="h-5 w-5 text-red-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}

        {statusDisplay.icon === 'clock' && (
          <svg className="h-5 w-5 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}

        <div className="flex-1">
          <span className={`text-sm font-medium ${statusDisplay.color}`}>
            {error || message}
          </span>

          {/* Additional status details */}
          {statusData && (statusData.progress_percentage || statusData.estimated_time_remaining) && (
            <div className="mt-1 text-xs text-gray-600">
              {statusData.progress_percentage && (
                <span>Progress: {statusData.progress_percentage}%</span>
              )}
              {statusData.estimated_time_remaining && (
                <span className="ml-3">ETA: {statusData.estimated_time_remaining}s</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Retry button for errors */}
      {status === 'error' && (
        <div className="mt-3">
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Retry Generation
          </button>
        </div>
      )}
    </div>
  );
}

export default ResumeStatusTracker;