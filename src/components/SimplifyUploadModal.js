import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { simplifyApi } from '../utils/api';

const SimplifyUploadModal = ({ isOpen, onClose, resumeId, jobId, onUploadComplete }) => {
  const [loginWindow, setLoginWindow] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, logging-in, capturing, uploading, success, error
  const [error, setError] = useState('');
  const [sessionCaptured, setSessionCaptured] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal closes
      if (loginWindow && !loginWindow.closed) {
        loginWindow.close();
      }
    }
  }, [isOpen, loginWindow]);

  const openSimplifyLogin = () => {
    setStatus('logging-in');
    setError('');

    // Open Simplify login in new window
    const newWindow = window.open(
      'https://simplify.jobs/auth/login',
      'simplify_login',
      'width=1200,height=800,scrollbars=yes,resizable=yes'
    );

    setLoginWindow(newWindow);

    // Monitor the window
    const checkWindow = setInterval(() => {
      if (newWindow.closed) {
        clearInterval(checkWindow);
        setStatus('idle');
        setLoginWindow(null);
      }
    }, 1000);
  };

  const captureSession = async () => {
    setStatus('capturing');
    setError('');

    try {
      // This will capture cookies from the Simplify domain
      // We'll need to implement this on the backend
      const response = await fetch('/api/simplify/capture-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.uid
        }
      });

      if (response.ok) {
        setSessionCaptured(true);
        setStatus('ready-to-upload');
      } else {
        throw new Error('Failed to capture session');
      }
    } catch (err) {
      setError('Failed to capture session: ' + err.message);
      setStatus('error');
    }
  };

  const uploadResume = async () => {
    setStatus('uploading');
    setError('');

    try {
      const result = await simplifyApi.uploadResume(resumeId, jobId);
      setStatus('success');
      onUploadComplete?.(result);
    } catch (err) {
      setError('Upload failed: ' + err.message);
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Upload Resume to Simplify</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Step 1: Login */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Step 1: Login to Simplify</h4>
              {status === 'logging-in' && (
                <span className="text-blue-600 text-sm">In progress...</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Open Simplify Jobs and complete your login (including any CAPTCHA).
            </p>
            <button
              onClick={openSimplifyLogin}
              disabled={status === 'logging-in'}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {status === 'logging-in' ? 'Login Window Open...' : 'Open Simplify Login'}
            </button>
          </div>

          {/* Step 2: Capture Session */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Step 2: Capture Session</h4>
              {sessionCaptured && (
                <span className="text-green-600 text-sm">✓ Captured</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              After logging in, capture your session to enable uploads.
            </p>
            <button
              onClick={captureSession}
              disabled={status !== 'idle' || sessionCaptured}
              className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {status === 'capturing' ? 'Capturing...' : sessionCaptured ? 'Session Captured' : 'Capture Session'}
            </button>
          </div>

          {/* Step 3: Upload */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Step 3: Upload Resume</h4>
              {status === 'success' && (
                <span className="text-green-600 text-sm">✓ Uploaded</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Upload your generated resume to Simplify Jobs.
            </p>
            <button
              onClick={uploadResume}
              disabled={!sessionCaptured || status === 'uploading' || status === 'success'}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {status === 'uploading' ? 'Uploading...' : status === 'success' ? 'Upload Complete!' : 'Upload Resume'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 text-sm">
                Resume uploaded successfully to Simplify Jobs!
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimplifyUploadModal;
