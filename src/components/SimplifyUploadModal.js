// SimplifyUploadModal.js - Simplified bookmarklet-only version

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

const SimplifyUploadModal = ({ isOpen, onClose, resumeId, jobId, onUploadComplete }) => {
  const [status, setStatus] = useState('checking'); // checking, need-tokens, ready, uploading, success, error
  const [error, setError] = useState('');
  const [resumeData, setResumeData] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(null);
  const { currentUser } = useAuth();

  // Auto-check session and load resume data when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('checking');
      setError('');
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

      if (sessionCheck.has_session) {
        console.log('✅ Session found! Ready to upload.');
        setStatus('ready');
      } else {
        console.log('❌ No session found. Need tokens.');
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

  const uploadResume = async () => {
    setStatus('uploading');
    setError('');

    try {
      console.log('🚀 Starting upload process...');

      // Generate PDF
      const pdfBlob = await generatePdfBlob();

      // Upload to Simplify
      const formData = new FormData();
      formData.append('resume_pdf', pdfBlob, `resume_${resumeId}.pdf`);
      formData.append('resume_id', resumeId);
      formData.append('job_id', jobId);

      const result = await simplifyApi.uploadResumeWithPdf(formData);

      console.log('✅ Upload successful:', result);
      setStatus('success');
      onUploadComplete?.(result);

    } catch (err) {
      console.error('❌ Upload failed:', err);
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

        {/* Need Tokens */}
        {status === 'need-tokens' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">🔐 Authentication Required</h4>
              <p className="text-sm text-yellow-700">
                You need to capture your Simplify.jobs authentication tokens first.
              </p>
            </div>

            {/* Enhanced Bookmarklet */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
              <h5 className="font-medium text-purple-800 mb-3">🚀 One-Click Setup</h5>

              <div className="bg-white p-3 rounded border-2 border-dashed border-purple-300 mb-3">
                <a
                  href={`javascript:(function(){
try {
  console.log('🔍 JobTrak Token Capture Starting...');

  var apiUrl = '${process.env.REACT_APP_API_BASE_URL || 'https://jobtrackai.duckdns.org'}';
  var userId = '${currentUser?.uid}';

  if (!userId) {
    alert('❌ Error: No user ID found. Please make sure you are logged into JobTrak.');
    return;
  }

  console.log('👤 Using User ID:', userId);
  console.log('🌐 API URL:', apiUrl);
  console.log('🍪 Raw cookies:', document.cookie);

  // Parse all cookies
  var cookies = {};
  document.cookie.split(';').forEach(function(cookie) {
    var parts = cookie.trim().split('=');
    if (parts[0] && parts[1]) {
      cookies[parts[0]] = decodeURIComponent(parts[1]);
    }
  });

  console.log('📋 Available cookie names:', Object.keys(cookies));

  // Find CSRF token - try multiple patterns
  var csrf = null;
  var csrfSource = '';

  // Pattern 1: Direct csrf cookie
  if (cookies.csrf) {
    csrf = cookies.csrf;
    csrfSource = 'csrf';
  }
  // Pattern 2: Look for any cookie containing 'csrf' in name
  else {
    Object.keys(cookies).forEach(function(key) {
      if (key.toLowerCase().includes('csrf') && !csrf) {
        csrf = cookies[key];
        csrfSource = key;
      }
    });
  }

  // Pattern 3: Look for JWT-like tokens in cookies (our target token was a JWT)
  if (!csrf) {
    Object.keys(cookies).forEach(function(key) {
      var value = cookies[key];
      if (value.startsWith('eyJ') && value.split('.').length === 3 && !csrf) {
        csrf = value;
        csrfSource = key + '(JWT)';
      }
    });
  }

  console.log('🔍 CSRF Token Status:');
  console.log('  Found:', !!csrf);
  console.log('  Source:', csrfSource);
  if (csrf) {
    console.log('  Preview:', csrf.substring(0, 50) + '...');
  }

  // For Simplify, we might not need a separate auth token
  // The authentication might be handled by cookies automatically
  var auth = csrf; // Use CSRF as auth token (based on your network trace)
  var authSource = 'csrf-as-auth';

  console.log('🔍 Auth Token Status:');
  console.log('  Using CSRF as auth:', !!auth);
  console.log('  Source:', authSource);

  if (!csrf) {
    var errorMsg = 'CSRF token not found!\\n\\n';
    errorMsg += 'Available cookies: ' + Object.keys(cookies).join(', ') + '\\n\\n';
    errorMsg += 'Make sure you are logged into Simplify Jobs and try again.';
    alert('❌ ' + errorMsg);
    return;
  }

  console.log('📤 Sending tokens to JobTrak...');

  var payload = {
    cookies: document.cookie,
    csrf: csrf,
    authorization: auth,
    url: location.href,
    timestamp: new Date().toISOString(),
    token_source: 'csrf:' + csrfSource + ', auth:' + authSource
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
    alert('✅ Tokens captured successfully!\\n\\nCSRF Source: ' + csrfSource + '\\n\\nGo back to JobTrak and refresh the modal.');
  })
  .catch(function(error) {
    console.error('❌ Error:', error);
    alert('❌ Failed to capture tokens:\\n\\n' + error.message + '\\n\\nCSRF was found from: ' + csrfSource);
  });

} catch(error) {
  console.error('❌ Bookmarklet Error:', error);
  alert('❌ Bookmarklet Error:\\n\\n' + error.message + '\\n\\nCheck browser console for details.');
}
})();`}
                  className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium cursor-move select-all"
                  draggable="true"
                  onClick={(e) => e.preventDefault()}
                >
                  📌 Capture Simplify Tokens
                </a>
              </div>

              <div className="text-xs text-purple-600 space-y-1">
                <p><strong>Steps:</strong></p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Drag the purple button above to your bookmarks bar</li>
                  <li>Go to <a href="https://simplify.jobs" target="_blank" rel="noopener noreferrer" className="underline">simplify.jobs</a> and make sure you're logged in</li>
                  <li>Click the bookmark you just created</li>
                  <li>Check the alert message - it should say "Tokens captured successfully"</li>
                  <li>Come back here and click "Check Again"</li>
                </ol>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={retryCheck}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Check Again
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
                Authentication confirmed! Your resume will be generated as a PDF and uploaded to Simplify.
              </p>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4">
              <h5 className="font-medium mb-2">Upload Details:</h5>
              <p className="text-sm text-gray-600">Resume: {resumeData?.basic?.name || 'Unnamed'}</p>
              <p className="text-sm text-gray-600">Job ID: {jobId}</p>
              <p className="text-sm text-gray-600">Session: {sessionStatus?.session_age_hours?.toFixed(1)}h old</p>
            </div>

            <button
              onClick={uploadResume}
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
              {generatingPdf ? 'Generating PDF...' : 'Uploading to Simplify...'}
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
            <p className="text-gray-600">Your resume has been uploaded to Simplify Jobs.</p>
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