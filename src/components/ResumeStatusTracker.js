// src/components/ResumeStatusTracker.js - Fixed to not fetch YAML prematurely
import React, { useState, useEffect, useRef } from 'react';
import { resumeApi } from '../utils/api';

function ResumeStatusTracker({ resumeId, onComplete, onStatusUpdate }) {
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('Starting resume generation...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [statusData, setStatusData] = useState(null);
  const intervalRefs = useRef({ status: null, progress: null });
  const isMounted = useRef(true);
  const callbacks = useRef({ onComplete, onStatusUpdate });

  useEffect(() => {
    callbacks.current = { onComplete, onStatusUpdate };
  }, [onComplete, onStatusUpdate]);

  useEffect(() => {
    if (!resumeId) {
      setError('No resume ID provided for tracking');
      return;
    }

    // Reset mounted flag when component mounts
    isMounted.current = true;

    // Status polling function - ONLY checks status, doesn't fetch YAML
    const checkStatus = async () => {
      try {
        if (!isMounted.current) return;

        console.log('Checking resume status for:', resumeId);
        const response = await resumeApi.getResumeStatus(resumeId);

        if (!isMounted.current) return;

        console.log('Resume status response:', response);
        setStatusData(response);
        callbacks.current.onStatusUpdate?.({ ...response, resumeId });

        if (typeof response.progress_percentage === 'number') {
          setProgress(response.progress_percentage);
        }

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

          // Notify parent component - DON'T pass YAML data, just completion status
          if (callbacks.current.onComplete && isMounted.current) {
            callbacks.current.onComplete({
              ...response,
              resumeId: resumeId
            });
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
          setStatus(response.status === 'in_progress' ? 'processing' : (response.status || 'processing'));
          if (response.message) {
            setMessage(response.message);
          }

          // Update progress based on status
          if (response.status === 'queued') {
            setProgress(10);
            setMessage('Resume generation queued...');
          } else if (response.status === 'in_progress' || response.status === 'processing') {
            setMessage(response.message || 'Tailoring the resume...');
          } else if (response.status === 'pending') {
            setProgress(5);
            setMessage('Initializing resume generation...');
          }
        }
      } catch (error) {
        if (!isMounted.current) return;

        console.error('Error checking resume status:', error);

        // Don't treat 404 as a fatal error during generation - resume might not exist yet
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          console.log('Resume not found yet (404) - this is normal during generation');
          setMessage('Resume generation in progress...');
          setProgress(prev => Math.min(prev + 2, 85));
          return; // Don't set error state, just continue polling
        }

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

    // Initial check
    checkStatus();

    // Poll server-owned generation state. Progress is never invented in the UI.
    intervalRefs.current.status = setInterval(checkStatus, 3000); // Check every 3 seconds

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
  }, [resumeId]);

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
              {typeof statusData.progress_percentage === 'number' && (
                <span>Progress: {statusData.progress_percentage}%</span>
              )}
              {statusData.stage && (
                <span className="ml-3">Step: {statusData.stage.replace(/_/g, ' ')}</span>
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
