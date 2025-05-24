// Updated React Component with hybrid approach
const SimplifyUploadModal = ({ isOpen, onClose, resumeId, jobId, onUploadComplete }) => {
  const [status, setStatus] = useState('checking'); // checking, need-auth, ready, uploading, success, error
  const [error, setError] = useState('');
  const [resumeData, setResumeData] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [showAuthInput, setShowAuthInput] = useState(false);
  const { currentUser } = useAuth();

  // Auto-check session and load resume data when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('checking');
      setError('');
      setAuthToken('');
      setShowAuthInput(false);
      checkSessionAndLoadData();
    }
  }, [isOpen, resumeId]);

  const checkSessionAndLoadData = async () => {
    try {
      console.log('🔍 Checking session and loading resume data...');

      // Check session status
      const sessionCheck = await simplifyApi.checkSession();
      setSessionStatus(sessionCheck);

      // Load resume data if we haven't already
      if (!resumeData && resumeId) {
        await fetchResumeData();
      }

      if (sessionCheck.has_session && sessionCheck.session_age_hours < 24) {
        console.log('✅ Valid session found! Ready to upload.');
        setStatus('ready');
      } else {
        console.log('❌ No valid session found. Need authentication.');
        setStatus('need-auth');
      }
    } catch (err) {
      console.error('❌ Error during initialization:', err);
      setError(`Initialization failed: ${err.message}`);
      setStatus('error');
    }
  };

  const fetchResumeData = async () => {
    try {
      console.log('📄 Loading resume YAML for PDF generation...');
      const yamlContent = await jobsApi.getResumeYaml(resumeId);

      if (yamlContent) {
        const parsed = yaml.load(yamlContent);
        setResumeData(parsed);
        console.log('✅ Resume data loaded successfully');
      }
    } catch (err) {
      console.error('❌ Failed to fetch resume data:', err);
      throw new Error(`Failed to load resume data: ${err.message}`);
    }
  };

  const generatePdfBlob = async () => {
    if (!resumeData) {
      throw new Error('Resume data not available');
    }

    setGeneratingPdf(true);
    console.log('🔄 Generating PDF from resume data...');

    try {
      const pdfBlob = await pdf(<ResumeDocument data={resumeData} />).toBlob();
      console.log('✅ PDF generated successfully, size:', pdfBlob.size, 'bytes');
      return pdfBlob;
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Enhanced bookmarklet that only captures CSRF
  const csrfCaptureBookmarklet = `javascript:(function(){
try {
  console.log('🔍 JobTrak CSRF Capture Starting...');

  var apiUrl = '${process.env.REACT_APP_API_BASE_URL || 'https://jobtrackai.duckdns.org'}';
  var userId = '${simplifyApi.getCurrentUserId()}';

  if (!userId || userId === 'default_user') {
    alert('❌ Error: No user ID found. Please make sure you are logged into JobTrak.');
    return;
  }

  // Check if we're on Simplify.jobs
  if (!location.hostname.includes('simplify.jobs')) {
    alert('❌ This bookmarklet must be run on simplify.jobs\\n\\nCurrent site: ' + location.hostname);
    return;
  }

  console.log('👤 Using User ID:', userId);
  console.log('🌐 API URL:', apiUrl);

  // Get CSRF token from cookies
  var cookies = {};
  document.cookie.split(';').forEach(function(cookie) {
    var parts = cookie.trim().split('=');
    if (parts[0] && parts[1]) {
      cookies[parts[0]] = decodeURIComponent(parts[1]);
    }
  });

  var csrf = cookies.csrf;

  console.log('🔍 CSRF Token Status:', !!csrf);
  console.log('🍪 Available cookies:', Object.keys(cookies));

  if (!csrf) {
    alert('❌ CSRF token not found!\\n\\nMake sure you are logged into Simplify Jobs and try again.\\n\\nAvailable cookies: ' + Object.keys(cookies).join(', '));
    return;
  }

  console.log('📤 Sending CSRF token to JobTrak...');

  var payload = {
    csrf: csrf,
    cookies: document.cookie,
    url: location.href,
    timestamp: new Date().toISOString(),
    capture_method: 'csrf_only'
  };

  fetch(apiUrl + '/api/simplify/auto-capture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  })
  .then(function(response) {
    console.log('📡 Response status:', response.status);
    if (response.ok) {
      return response.json();
    } else {
      return response.text().then(function(text) {
        throw new Error('HTTP ' + response.status + ': ' + text);
      });
    }
  })
  .then(function(result) {
    console.log('✅ Success:', result);
    alert('✅ CSRF token captured successfully!\\n\\nGo back to JobTrak and enter your authorization token.');
  })
  .catch(function(error) {
    console.error('❌ Error:', error);
    alert('❌ Failed to capture CSRF token:\\n\\n' + error.message);
  });

} catch(error) {
  console.error('❌ Bookmarklet Error:', error);
  alert('❌ Bookmarklet Error:\\n\\n' + error.message + '\\n\\nCheck browser console for details.');
}
})();`;

  const handleAuthSubmit = async () => {
    if (!authToken.trim()) {
      setError('Please enter your authorization token');
      return;
    }

    try {
      console.log('🔑 Submitting authorization token...');

      // Use the API method instead of direct fetch
      await simplifyApi.storeAuthToken(authToken.trim());

      console.log('✅ Authorization stored successfully');
      setStatus('ready');
      setShowAuthInput(false);

    } catch (err) {
      console.error('❌ Failed to store authorization:', err);
      setError(`Failed to store authorization: ${err.message}`);
    }
  };

  const uploadToSimplifyViaBackend = async () => {
    setStatus('uploading');
    setError('');

    try {
      console.log('🚀 Starting upload via backend...');

      // Generate PDF
      const pdfBlob = await generatePdfBlob();

      console.log('📤 Uploading via backend proxy...');

      // Upload via backend using the API method
      const result = await simplifyApi.uploadResumeToSimplify(pdfBlob, resumeId, jobId);

      console.log('✅ Backend upload successful:', result);

      setStatus('success');
      onUploadComplete?.(result);

    } catch (err) {
      console.error('❌ Backend upload failed:', err);
      setError(`Upload failed: ${err.message}`);
      setStatus('error');
    }
  };

  const retryCheck = () => {
    setStatus('checking');
    setError('');
    checkSessionAndLoadData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Upload to Simplify Jobs</h3>
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
          <p>User: {currentUser?.uid}</p>
          <p>Resume: {resumeData ? '✅ Loaded' : '❌ Not loaded'}</p>
          <p>Session: {sessionStatus?.has_session ? '✅ Active' : '❌ None'}</p>
          <p>Status: {status}</p>
        </div>

        {/* Checking Status */}
        {status === 'checking' && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Checking session and loading resume data...</p>
          </div>
        )}

        {/* Need Authentication */}
        {status === 'need-auth' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">🔐 Authentication Required</h4>
              <p className="text-sm text-yellow-700">
                Two-step authentication process: First capture CSRF token, then provide authorization token.
              </p>
            </div>

            {/* Step 1: CSRF Capture */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-800 mb-3">Step 1: Capture CSRF Token</h5>

              <div className="bg-white p-3 rounded border-2 border-dashed border-blue-300 mb-3">
                <a
                  href={csrfCaptureBookmarklet}
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium cursor-move select-all"
                  draggable="true"
                  onClick={(e) => e.preventDefault()}
                >
                  📌 Capture CSRF Token
                </a>
              </div>

              <div className="text-xs text-blue-600 space-y-1">
                <p><strong>Instructions:</strong></p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Drag the blue button above to your bookmarks bar</li>
                  <li>Go to <a href="https://simplify.jobs" target="_blank" rel="noopener noreferrer" className="underline">simplify.jobs</a> and make sure you're logged in</li>
                  <li>Click the bookmark you just created</li>
                  <li>Wait for success message, then continue to Step 2</li>
                </ol>
              </div>
            </div>

            {/* Step 2: Authorization Token Input */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-lg p-4">
              <h5 className="font-medium text-green-800 mb-3">Step 2: Enter Authorization Token</h5>

              <div className="space-y-3">
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  <p><strong>How to find your authorization token:</strong></p>
                  <ol className="list-decimal ml-4 mt-1 space-y-1">
                    <li>On simplify.jobs, open Developer Tools (F12)</li>
                    <li>Go to Application tab → Cookies → https://simplify.jobs</li>
                    <li>Find the "authorization" cookie and copy its value</li>
                    <li>Paste it below</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <textarea
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Paste your authorization token here..."
                    className="w-full p-3 border rounded text-sm font-mono"
                    rows="3"
                  />
                  <button
                    onClick={handleAuthSubmit}
                    disabled={!authToken.trim()}
                    className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Submit Authorization Token
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={retryCheck}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Check Session Again
              </button>
              <button
                onClick={() => window.open('https://simplify.jobs', '_blank')}
                className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Open Simplify
              </button>
            </div>
          </div>
        )}

        {/* Ready to Upload */}
        {status === 'ready' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">✅ Ready to Upload</h4>
              <p className="text-sm text-green-700">
                Authentication confirmed! Your resume will be generated and uploaded via our secure backend.
              </p>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4">
              <h5 className="font-medium mb-2">Upload Details:</h5>
              <p className="text-sm text-gray-600">Resume: {resumeData?.basic?.name || 'Unnamed'}</p>
              <p className="text-sm text-gray-600">Job ID: {jobId}</p>
              <p className="text-sm text-gray-600">Upload Method: Secure Backend Proxy</p>
            </div>

            <button
              onClick={uploadToSimplifyViaBackend}
              disabled={!resumeData}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {!resumeData ? 'Loading Resume Data...' : 'Generate PDF & Upload to Simplify'}
            </button>

            <button
              onClick={retryCheck}
              className="w-full py-2 px-4 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Refresh Status
            </button>
          </div>
        )}

        {/* Uploading */}
        {status === 'uploading' && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 mb-2">
              {generatingPdf ? 'Generating PDF...' : 'Uploading via secure backend...'}
            </p>
            <p className="text-xs text-gray-500">This may take a few moments</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Upload Successful! 🎉</h4>
            <p className="text-gray-600">Your resume has been uploaded to Simplify Jobs via our secure backend.</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">❌ Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>

            <button
              onClick={retryCheck}
              className="w-full py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default SimplifyUploadModal;