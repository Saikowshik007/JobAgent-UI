
// Fix 1: Updated SimplifyIntegration.js (missing React import)
import React, { useState, useEffect } from 'react'; // Added React import
import { useAuth } from '../contexts/AuthContext';

const SimplifyIntegration = ({ onConnectionStatusChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  // Check existing connection status on component mount
  useEffect(() => {
    if (currentUser?.uid) {
      checkConnectionStatus();
    }
  }, [currentUser]);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/simplify/user-session/${currentUser.uid}`, {
        headers: {
          'X-User-Id': currentUser.uid
        }
      });

      const result = await response.json();

      if (result.has_session) {
        setIsConnected(true);
        setConnectionInfo(result.session_info);
        onConnectionStatusChange?.(true);
      } else {
        setIsConnected(false);
        onConnectionStatusChange?.(false);
      }
    } catch (error) {
      console.error('Error checking Simplify connection status:', error);
      setIsConnected(false);
      onConnectionStatusChange?.(false);
    }
  };

  const initiateConnection = async () => {
    setIsConnecting(true);
    setError('');

    try {
      // Get user's Simplify username (you might want to store this in user settings)
      const username = prompt('Enter your Simplify Jobs email address:');
      if (!username) {
        setIsConnecting(false);
        return;
      }

      // Initiate login process
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/simplify/initiate-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.uid
        },
        body: JSON.stringify({
          username: username
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Open login page in new tab
        const loginWindow = window.open(
          `${process.env.REACT_APP_API_BASE_URL}${result.login_url}`,
          'simplify_login',
          'width=1200,height=800,scrollbars=yes,resizable=yes'
        );

        // Listen for successful login
        const handleMessage = (event) => {
          if (event.data.type === 'SIMPLIFY_LOGIN_SUCCESS') {
            setIsConnected(true);
            setIsConnecting(false);
            onConnectionStatusChange?.(true);
            checkConnectionStatus(); // Refresh connection info
            window.removeEventListener('message', handleMessage);

            if (loginWindow) {
              loginWindow.close();
            }
          }
        };

        window.addEventListener('message', handleMessage);

        // Check if window was closed manually
        const checkClosed = setInterval(() => {
          if (loginWindow.closed) {
            clearInterval(checkClosed);
            setIsConnecting(false);
            window.removeEventListener('message', handleMessage);
            // Check if connection was successful
            setTimeout(checkConnectionStatus, 1000);
          }
        }, 1000);

      } else {
        throw new Error(result.detail || 'Failed to initiate login');
      }
    } catch (error) {
      setError('Failed to connect to Simplify Jobs: ' + error.message);
      setIsConnecting(false);
    }
  };

  const disconnectSimplify = async () => {
    // You can implement disconnect functionality here
    // For now, just reset the state
    setIsConnected(false);
    setConnectionInfo(null);
    onConnectionStatusChange?.(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Simplify Jobs Integration</h3>
          <p className="text-sm text-gray-500">
            Connect your Simplify Jobs account for automated applications
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isConnected
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {isConnected ? 'Connected' : 'Not Connected'}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isConnected ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  Your Simplify Jobs account is connected and ready for automated applications.
                </p>
                {connectionInfo && (
                  <p className="text-xs text-green-600 mt-1">
                    Connected on {new Date(connectionInfo.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={checkConnectionStatus}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Test Connection
            </button>
            <button
              onClick={disconnectSimplify}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">Connect your Simplify Jobs account</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Link your account to enable automatic job applications and resume uploads.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={initiateConnection}
            disabled={isConnecting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect to Simplify Jobs
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default SimplifyIntegration;