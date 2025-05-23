// SimplifyUploadModal.js - Fixed to use the existing API pattern

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { simplifyApi } from '../utils/api';

const SimplifyUploadModal = ({ isOpen, onClose, resumeId, jobId, onUploadComplete }) => {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState({
    authorization: '',
    csrf: '',
    cookies: ''
  });
  const { currentUser } = useAuth();

  const handleInputChange = (field, value) => {
    setSessionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateSession = () => {
    if (!sessionData.authorization || !sessionData.csrf) {
      setError('Please provide both authorization and CSRF tokens');
      return false;
    }
    return true;
  };

  const saveSession = async () => {
    if (!validateSession()) return;

    setStatus('saving');
    setError('');

    try {
      console.log('Saving session data via simplifyApi...');
      
      const requestData = {
        authorization: sessionData.authorization,
        csrf_token: sessionData.csrf,
        raw_cookies: sessionData.cookies,
        captured_at: new Date().toISOString()
      };

      console.log('Request data:', {
        ...requestData,
        authorization: requestData.authorization.substring(0, 20) + '...',
        csrf_token: requestData.csrf_token.substring(0, 20) + '...'
      });

      // Use the existing simplifyApi from api.js
      const result = await simplifyApi.storeSession(requestData);
      
      console.log('Session stored successfully:', result);
      setStep(3);
      setStatus('ready');
      setError('');
      
    } catch (err) {
      console.error('Save session error:', err);
      setError('Failed to save session: ' + err.message);
      setStatus('idle');
    }
  };

  const uploadResume = async () => {
    setStatus('uploading');
    setError('');

    try {
      console.log('Uploading resume via simplifyApi...');
      
      // Use the existing simplifyApi from api.js
      const result = await simplifyApi.uploadResume(resumeId, jobId);
      
      console.log('Upload successful:', result);
      setStatus('success');
      onUploadComplete?.(result);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed: ' + err.message);
      setStatus('error');
    }
  };

  // Test API connection function
  const testApiConnection = async () => {
    try {
      console.log('Testing API connection...');
      console.log('API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
      console.log('Current user:', currentUser?.uid);
      
      // Test with a simple API call first
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/status`);
      const data = await response.json();
      console.log('API test response:', data);
      alert('API connection successful!');
      
    } catch (error) {
      console.error('API test failed:', error);
      alert('API test failed: ' + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Upload Resume to Simplify Jobs</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Debug Info */}
        <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
          <p><strong>Debug Info:</strong></p>
          <p>API Base URL: {process.env.REACT_APP_API_BASE_URL || 'NOT SET'}</p>
          <p>User ID: {currentUser?.uid || 'NOT AUTHENTICATED'}</p>
          <p>Resume ID: {resumeId}</p>
          <p>Job ID: {jobId}</p>
          <button
            onClick={testApiConnection}
            className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
          >
            Test API Connection
          </button>
        </div>

        {/* Step Progress */}
        <div className="flex items-center mb-6">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'} mr-3`}>
            1
          </div>
          <div className={`flex-1 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'} mr-3`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'} mr-3`}>
            2
          </div>
          <div className={`flex-1 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'} mr-3`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
            3
          </div>
        </div>

        {/* Step 1: Login Instructions */}
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Step 1: Login to Simplify Jobs</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-3">
                Please login to Simplify Jobs in a new tab, then come back here.
              </p>
              <button
                onClick={() => window.open('https://simplify.jobs/auth/login', '_blank')}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Open Simplify Login (New Tab)
              </button>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700"
            >
              I'm Logged In - Continue
            </button>
          </div>
        )}

        {/* Step 2: Cookie Capture */}
        {step === 2 && (
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Step 2: Capture Session Data</h4>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h5 className="font-medium text-yellow-800 mb-2">Instructions:</h5>
              <ol className="text-sm text-yellow-800 space-y-1 ml-4 list-decimal">
                <li>Go to Simplify Jobs tab (make sure you're logged in)</li>
                <li>Press <kbd className="bg-gray-200 px-1 rounded">F12</kbd> to open Developer Tools</li>
                <li>Go to <strong>Application</strong> tab → <strong>Cookies</strong> → <strong>https://simplify.jobs</strong></li>
                <li>Find and copy these cookie values:</li>
              </ol>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authorization Token*
                </label>
                <input
                  type="text"
                  placeholder="Find 'authorization' cookie and paste its value here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={sessionData.authorization}
                  onChange={(e) => handleInputChange('authorization', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSRF Token*
                </label>
                <input
                  type="text"
                  placeholder="Find 'csrf' cookie and paste its value here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={sessionData.csrf}
                  onChange={(e) => handleInputChange('csrf', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  All Cookies (Optional - for better compatibility)
                </label>
                <textarea
                  placeholder="Copy entire cookie string from Network tab request headers"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm h-20"
                  value={sessionData.cookies}
                  onChange={(e) => handleInputChange('cookies', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  From Network tab, find any request to simplify.jobs, copy the Cookie header value
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={saveSession}
                disabled={status === 'saving' || !sessionData.authorization || !sessionData.csrf}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {status === 'saving' ? 'Saving...' : 'Save Session'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload */}
        {step === 3 && (
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Step 3: Upload Resume</h4>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                ✓ Session captured successfully! Ready to upload your resume.
              </p>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4">
              <h5 className="font-medium mb-2">Upload Details:</h5>
              <p className="text-sm text-gray-600">Resume ID: {resumeId}</p>
              <p className="text-sm text-gray-600">Job ID: {jobId}</p>
            </div>

            <button
              onClick={uploadResume}
              disabled={status === 'uploading' || status === 'success'}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {status === 'uploading' ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full inline-block"></span>
                  Uploading Resume...
                </>
              ) : status === 'success' ? (
                '✓ Upload Complete!'
              ) : (
                'Upload Resume to Simplify'
              )}
            </button>

            {status !== 'success' && (
              <button
                onClick={() => setStep(2)}
                className="w-full py-2 px-4 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Back to Edit Session
              </button>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {status === 'success' && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-700 text-sm">
              🎉 Resume uploaded successfully to Simplify Jobs!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimplifyUploadModal;
