import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { simplifyApi, jobsApi } from '../utils/api';
import { pdf } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet, Font, Link } from '@react-pdf/renderer';
import yaml from 'js-yaml';

// Register fonts for PDF generation
Font.register({
  family: 'Calibri',
  fonts: [
    { src: '/fonts/calibri.ttf' },
    { src: '/fonts/calibrib.ttf', fontWeight: 'bold' },
    { src: '/fonts/calibrii.ttf', fontStyle: 'italic' },
  ]
});

// PDF styles
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: 'Calibri',
    lineHeight: 1.3,
  },
  header: { fontSize: 13, textAlign: 'center', fontWeight: 'bold', marginBottom: 2, textTransform: 'uppercase' },
  contact: { textAlign: 'center', fontSize: 9, marginBottom: 8 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
    paddingBottom: 1,
  },
  jobBlock: { marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  jobTitle: { fontStyle: 'italic' },
  bullet: { marginLeft: 10, marginBottom: 1 },
  textNormal: { marginBottom: 3 },
  projectTitle: { fontWeight: 'bold', color: 'blue', textDecoration: 'none' },
});

// PDF Document component
const ResumeDocument = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {data.basic && (
        <>
          <Text style={styles.header}>{data.basic.name}</Text>
          <Text style={styles.contact}>
            {[data.basic.email, data.basic.phone, ...(data.basic.websites || [])].filter(Boolean).join(' | ')}
          </Text>
        </>
      )}

      {data.objective && (
        <>
          <Text style={styles.sectionTitle}>Objective</Text>
          <Text style={styles.textNormal}>{data.objective}</Text>
        </>
      )}

      {data.experiences && (
        <>
          <Text style={styles.sectionTitle}>Experience</Text>
          {data.experiences.map((exp, idx) => (
            <View key={idx} style={styles.jobBlock}>
              <View style={styles.row}>
                <Text style={{ fontWeight: 'bold' }}>{exp.company}</Text>
                <Text>{exp.titles?.[0]?.startdate} - {exp.titles?.[0]?.enddate}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.jobTitle}>{exp.titles?.[0]?.name}</Text>
                <Text style={styles.jobTitle}>{exp.location}</Text>
              </View>
              {exp.highlights?.map((point, i) => (
                <Text key={i} style={styles.bullet}>• {point}</Text>
              ))}
            </View>
          ))}
        </>
      )}

      {data.projects && (
        <>
          <Text style={styles.sectionTitle}>Projects</Text>
          {data.projects.map((proj, idx) => (
            <View key={idx} style={styles.jobBlock}>
              {proj.link ? (
                <Link src={proj.link} style={styles.projectTitle}>{proj.name}</Link>
              ) : (
                <Text style={{ fontWeight: 'bold' }}>{proj.name}</Text>
              )}
              {proj.highlights?.map((point, i) => (
                <Text key={i} style={styles.bullet}>• {point}</Text>
              ))}
            </View>
          ))}
        </>
      )}

      {data.education && (
        <>
          <Text style={styles.sectionTitle}>Education</Text>
          {data.education.map((edu, idx) => (
            <View key={idx} style={styles.jobBlock}>
              <View style={styles.row}>
                <Text style={{ fontWeight: 'bold' }}>{edu.school}, {edu.degrees?.[0]?.names?.join(', ')}</Text>
                <Text>{edu.degrees?.[0]?.dates}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {data.skills && (
        <>
          <Text style={styles.sectionTitle}>Skills</Text>
          {data.skills.map((s, idx) => (
            <Text key={idx}><Text style={{ fontWeight: 'bold' }}>{s.category}:</Text> {s.skills.join(', ')}</Text>
          ))}
        </>
      )}
    </Page>
  </Document>
);
// Enhanced React Component with Auto-DevTools Bookmarklet
const SimplifyUploadModal = ({ isOpen, onClose, resumeId, jobId, onUploadComplete }) => {
  const [status, setStatus] = useState('checking'); // checking, need-tokens, ready, uploading, success, error
  const [error, setError] = useState('');
  const [resumeData, setResumeData] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const { currentUser } = useAuth();

  // Auto-check session and load resume data when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('checking');
      setError('');
      setShowInstructions(false);
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
        console.log('❌ No valid session found. Need to capture tokens.');
        setStatus('need-tokens');
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

  // Enhanced bookmarklet that captures CSRF AND helps user get authorization token
  const enhancedCaptureBookmarklet = `javascript:(function(){
try {
  console.log('🔍 JobTrak Enhanced Token Capture Starting...');

  var apiUrl = '${process.env.REACT_APP_API_BASE_URL || 'https://jobtrackai.duckdns.org'}';
  var userId = '${currentUser?.uid}';

  if (!userId) {
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

  // Get all cookies
  var cookies = {};
  document.cookie.split(';').forEach(function(cookie) {
    var parts = cookie.trim().split('=');
    if (parts[0] && parts[1]) {
      cookies[parts[0]] = decodeURIComponent(parts[1]);
    }
  });

  var csrf = cookies.csrf;
  var authorization = cookies.authorization;

  console.log('🔍 CSRF Token Status:', !!csrf);
  console.log('🔍 Authorization Token Status:', !!authorization);
  console.log('🍪 Available cookies:', Object.keys(cookies));

  if (!csrf) {
    alert('❌ CSRF token not found!\\n\\nMake sure you are logged into Simplify Jobs and try again.\\n\\nAvailable cookies: ' + Object.keys(cookies).join(', '));
    return;
  }

  // Function to send tokens to backend
  function sendTokensToBackend(csrfToken, authToken) {
    var payload = {
      csrf: csrfToken,
      authorization: authToken,
      cookies: document.cookie,
      url: location.href,
      timestamp: new Date().toISOString(),
      capture_method: 'enhanced_auto'
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
      alert('✅ All tokens captured successfully!\\n\\nBoth CSRF and Authorization tokens have been sent to JobTrak.\\n\\nYou can now go back and upload your resume!');
    })
    .catch(function(error) {
      console.error('❌ Error:', error);
      alert('❌ Failed to send tokens:\\n\\n' + error.message);
    });
  }

  // If we have both tokens, send them immediately
  if (csrf && authorization) {
    console.log('✅ Found both CSRF and Authorization tokens!');
    sendTokensToBackend(csrf, authorization);
    return;
  }

  // If we only have CSRF, help user get authorization token
  if (csrf && !authorization) {
    console.log('📤 Sending CSRF token first...');

    // Send CSRF token first
    var csrfPayload = {
      csrf: csrf,
      cookies: document.cookie,
      url: location.href,
      timestamp: new Date().toISOString(),
      capture_method: 'csrf_only_step1'
    };

    fetch(apiUrl + '/api/simplify/auto-capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      credentials: 'include',
      body: JSON.stringify(csrfPayload)
    })
    .then(function(response) {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Failed to send CSRF token');
      }
    })
    .then(function(result) {
      console.log('✅ CSRF token sent successfully');

      // Now help user get authorization token
      alert('✅ CSRF token captured!\\n\\n🔧 Now I will help you find the Authorization token...\\n\\nClick OK to open Developer Tools and navigate to the cookies.');

      // Try to open DevTools programmatically (this works in some browsers)
      try {
        // Method 1: Try to trigger DevTools via debugger (will pause if DevTools are open)
        setTimeout(function() {
          console.log('%c🔧 DEVELOPER TOOLS GUIDE', 'font-size: 20px; font-weight: bold; color: #2196F3; background: #E3F2FD; padding: 10px; border-radius: 5px;');
          console.log('%c📍 STEP 1: Open Developer Tools', 'font-size: 16px; font-weight: bold; color: #FF9800;');
          console.log('   Press F12 or Ctrl+Shift+I (Windows) or Cmd+Option+I (Mac)');
          console.log('%c📍 STEP 2: Go to Application Tab', 'font-size: 16px; font-weight: bold; color: #FF9800;');
          console.log('   Click on the "Application" tab in DevTools');
          console.log('%c📍 STEP 3: Navigate to Cookies', 'font-size: 16px; font-weight: bold; color: #FF9800;');
          console.log('   In the left sidebar: Storage → Cookies → https://simplify.jobs');
          console.log('%c📍 STEP 4: Find Authorization Token', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
          console.log('   Look for a cookie named "authorization"');
          console.log('   Copy its value');
          console.log('%c📍 STEP 5: Go Back to JobTrak', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
          console.log('   Paste the authorization token in the form');

          // Try to trigger a breakpoint to encourage opening DevTools
          debugger;
        }, 1000);

        // Create visual guide overlay
        var overlay = document.createElement('div');
        overlay.id = 'jobtrak-guide-overlay';
        overlay.innerHTML = \`
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
          ">
            <div style="
              background: white;
              padding: 30px;
              border-radius: 10px;
              max-width: 600px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            ">
              <h2 style="color: #2196F3; margin-bottom: 20px;">🔧 Find Your Authorization Token</h2>
              <div style="text-align: left; margin: 20px 0;">
                <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                  <strong>📍 Step 1:</strong> Press <kbd style="background: #333; color: white; padding: 2px 6px; border-radius: 3px;">F12</kbd> to open Developer Tools
                </div>
                <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                  <strong>📍 Step 2:</strong> Click the <strong>"Application"</strong> tab
                </div>
                <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                  <strong>📍 Step 3:</strong> Navigate to: <strong>Storage → Cookies → https://simplify.jobs</strong>
                </div>
                <div style="margin: 15px 0; padding: 10px; background: #e8f5e8; border-radius: 5px;">
                  <strong>📍 Step 4:</strong> Find the <strong>"authorization"</strong> cookie and copy its value
                </div>
                <div style="margin: 15px 0; padding: 10px; background: #e3f2fd; border-radius: 5px;">
                  <strong>📍 Step 5:</strong> Go back to JobTrak and paste the token
                </div>
              </div>
              <button onclick="document.getElementById('jobtrak-guide-overlay').remove()" style="
                background: #2196F3;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
              ">Got it! Open DevTools</button>
            </div>
          </div>
        \`;
        document.body.appendChild(overlay);

      } catch (e) {
        console.log('Could not automatically open DevTools, but instructions are in console');
      }

    })
    .catch(function(error) {
      console.error('❌ Error sending CSRF:', error);
      alert('❌ Failed to send CSRF token:\\n\\n' + error.message);
    });
  }

} catch(error) {
  console.error('❌ Bookmarklet Error:', error);
  alert('❌ Bookmarklet Error:\\n\\n' + error.message + '\\n\\nCheck browser console for details.');
}
})();`;

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
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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

        {/* Need Tokens */}
        {status === 'need-tokens' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">🔐 Enhanced Token Capture</h4>
              <p className="text-sm text-blue-700">
                Use our smart bookmarklet to automatically capture your Simplify tokens with guided assistance.
              </p>
            </div>

            {/* Enhanced Bookmarklet */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
              <h5 className="font-medium text-purple-800 mb-3">🚀 Smart Token Capture</h5>

              <div className="bg-white p-3 rounded border-2 border-dashed border-purple-300 mb-3">
                <a
                  href={enhancedCaptureBookmarklet}
                  className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:from-purple-700 hover:to-pink-700 text-sm font-medium cursor-move select-all"
                  draggable="true"
                  onClick={(e) => e.preventDefault()}
                >
                  🔧 Smart Capture Tokens
                </a>
              </div>

              <div className="text-xs text-purple-600 space-y-2">
                <p><strong>✨ This enhanced bookmarklet will:</strong></p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>🔍 Automatically capture your CSRF token</li>
                  <li>🔍 Try to find your authorization token automatically</li>
                  <li>🔧 If authorization token not found, open DevTools for you</li>
                  <li>📍 Navigate you to the right place in DevTools</li>
                  <li>📋 Show visual guide with step-by-step instructions</li>
                  <li>✅ Send both tokens to JobTrak when found</li>
                </ul>

                <div className="bg-purple-100 p-2 rounded mt-3">
                  <p><strong>Instructions:</strong></p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Drag the button above to your bookmarks bar</li>
                    <li>Go to <a href="https://simplify.jobs" target="_blank" rel="noopener noreferrer" className="underline font-medium">simplify.jobs</a> and make sure you're logged in</li>
                    <li>Click the bookmark - it will do everything automatically!</li>
                    <li>Follow any on-screen instructions if needed</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Manual Fallback */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-700 mb-2">🔄 Alternative: Manual Capture</h5>
              <p className="text-sm text-gray-600 mb-2">
                If the smart bookmarklet doesn't work, you can manually find and enter your tokens.
              </p>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {showInstructions ? 'Hide' : 'Show'} manual instructions
              </button>

              {showInstructions && (
                <div className="mt-3 text-xs text-gray-600 bg-white p-3 rounded border">
                  <p><strong>Manual Steps:</strong></p>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>Go to simplify.jobs and make sure you're logged in</li>
                    <li>Press F12 to open Developer Tools</li>
                    <li>Click "Application" tab</li>
                    <li>In sidebar: Storage → Cookies → https://simplify.jobs</li>
                    <li>Find "csrf" and "authorization" cookies</li>
                    <li>Copy both values and contact support for manual entry</li>
                  </ol>
                </div>
              )}
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