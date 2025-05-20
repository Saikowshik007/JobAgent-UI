import React, { useState, useEffect } from 'react';
import { jobsApi } from '../utils/api';
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import ResumeYamlModal from './ResumeYamlModal';

function ResumeStatusTracker({ resumeId, onComplete }) {
  const [status, setStatus] = useState('generating');
  const [message, setMessage] = useState('Resume generation in progress...');
  const [error, setError] = useState(null);
  const [pollingComplete, setPollingComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let pollingTimeout;

    const checkStatus = async () => {
      try {
        // Use the improved polling method to reduce API calls
        const statusData = await jobsApi.resumeApi.pollResumeStatus(resumeId);

        if (!isMounted) return;

        setStatus(statusData.status);
        setMessage('Resume generated successfully!');
        setPollingComplete(true);

        if (statusData.status === 'completed' && onComplete) {
          onComplete(statusData);
        }
      } catch (error) {
        if (!isMounted) return;

        console.error('Error checking resume status:', error);
        setStatus('error');
        setError(error.message || 'An error occurred while generating your resume.');
        setPollingComplete(true);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
      clearTimeout(pollingTimeout);
    };
  }, [resumeId, onComplete]);

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        {!pollingComplete && (
          <div className="mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
        )}
        <h3 className="text-md font-medium">Resume Status: {status}</h3>
      </div>

      {error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="text-gray-600">{message}</div>
      )}

      {status === 'completed' && (
        <div className="text-green-600">Resume is now ready! You can view or download it below.</div>
      )}
    </div>
  );
}

export default ResumeStatusTracker;