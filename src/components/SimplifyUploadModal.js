// SimplifyUploadModal.js - Generate PDF in UI and upload to Simplify

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { simplifyApi, jobsApi } from '../utils/api';
import { pdf } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet, Font, Link } from '@react-pdf/renderer';
import yaml from 'js-yaml';

// Register fonts for PDF generation (same as ResumeYamlModal)
Font.register({
  family: 'Calibri',
  fonts: [
    { src: '/fonts/calibri.ttf' },
    { src: '/fonts/calibrib.ttf', fontWeight: 'bold' },
    { src: '/fonts/calibrii.ttf', fontStyle: 'italic' },
  ]
});

// PDF styles (same as ResumeYamlModal)
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

// PDF Document component (same as ResumeYamlModal)
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
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState({
    authorization: '',
    csrf: '',
    cookies: ''
  });
  const [resumeData, setResumeData] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(null);
  const { currentUser } = useAuth();

  // Fetch resume data and check session when modal opens
  useEffect(() => {
    if (isOpen && resumeId && !resumeData) {
      fetchResumeData();
    }
    if (isOpen) {
      checkExistingSession();
    }
  }, [isOpen, resumeId]);

  const checkExistingSession = async () => {
    try {
      console.log('Checking for existing Simplify session...');
      const sessionCheck = await simplifyApi.checkSession();
      setSessionStatus(sessionCheck);

      if (sessionCheck.has_session) {
        console.log('Existing session found! Skipping to upload step.');
        console.log(`Session age: ${sessionCheck.session_age_hours?.toFixed(1)} hours`);

        // Skip directly to step 3 (upload)
        setStep(3);
        setStatus('ready');

        // Show user the session info
        if (sessionCheck.session_age_hours) {
          const hoursAgo = sessionCheck.session_age_hours.toFixed(1);
          setError(''); // Clear any previous errors
          console.log(`Using existing session from ${hoursAgo} hours ago`);
        }
      } else {
        console.log('No existing session found, user needs to provide tokens');
        setStep(1); // Start from login step
      }
    } catch (err) {
      console.error('Error checking existing session:', err);
      setSessionStatus({ has_session: false, error: err.message });
      // If check fails, just start from step 1
      setStep(1);
    }
  };

  const fetchResumeData = async () => {
    try {
      console.log('Fetching resume YAML for PDF generation...');
      const yamlContent = await jobsApi.getResumeYaml(resumeId);

      if (yamlContent) {
        const parsed = yaml.load(yamlContent);
        setResumeData(parsed);
        console.log('Resume data loaded for PDF generation');
      }
    } catch (err) {
      console.error('Failed to fetch resume data:', err);
      setError('Failed to load resume data: ' + err.message);
    }
  };

  const generatePdfBlob = async () => {
    if (!resumeData) {
      throw new Error('Resume data not available');
    }

    setGeneratingPdf(true);
    console.log('Generating PDF from resume data...');

    try {
      // Generate PDF using the same component as ResumeYamlModal
      const pdfBlob = await pdf(<ResumeDocument data={resumeData} />).toBlob();
      console.log('PDF generated successfully, size:', pdfBlob.size, 'bytes');
      return pdfBlob;
    } finally {
      setGeneratingPdf(false);
    }
  };

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
      // Step 1: Generate PDF
      console.log('Step 1: Generating PDF from resume data...');
      const pdfBlob = await generatePdfBlob();

      // Step 2: Upload PDF to Simplify
      console.log('Step 2: Uploading PDF to Simplify...');

      // Create FormData with the PDF blob
      const formData = new FormData();
      formData.append('resume_pdf', pdfBlob, `resume_${resumeId}.pdf`);
      formData.append('resume_id', resumeId);
      formData.append('job_id', jobId);

      // Use the updated API that accepts PDF data
      const result = await simplifyApi.uploadResumeWithPdf(formData);

      console.log('Upload successful:', result);
      setStatus('success');
      onUploadComplete?.(result);

    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed: ' + err.message);
      setStatus('error');
    }
  };

  const testApiConnection = async () => {
    try {
      console.log('Testing API connection...');
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
          <p>Resume Data: {resumeData ? '✓ Loaded' : '✗ Not loaded'}</p>
          <p>Session Status: {sessionStatus ? (
            sessionStatus.has_session ?
              `✓ Active (${sessionStatus.session_age_hours?.toFixed(1)}h old)` :
              '✗ No session'
          ) : '⏳ Checking...'}</p>
          <div className="mt-2 space-x-2">
            <button
              onClick={testApiConnection}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
            >
              Test API Connection
            </button>
            {!resumeData && (
              <button
                onClick={fetchResumeData}
                className="px-2 py-1 bg-green-500 text-white rounded text-xs"
              >
                Retry Load Resume
              </button>
            )}
            <button
              onClick={checkExistingSession}
              className="px-2 py-1 bg-purple-500 text-white rounded text-xs"
            >
              Check Session
            </button>
          </div>
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

            {/* Bookmarklet Option */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
              <h5 className="font-medium text-purple-800 mb-2">🚀 Quick Setup (Recommended)</h5>
              <p className="text-sm text-purple-700 mb-3">
                Drag this bookmarklet to your bookmarks bar for one-click token capture:
              </p>
              <div className="bg-white p-3 rounded border-2 border-dashed border-purple-300 mb-3">
                <a
                  href={`javascript:(function(){
                    console.log('JobTrak: Starting token capture...');

                    // Get all cookies as object
                    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
                      const [key, value] = cookie.trim().split('=');
                      if (key && value) acc[key] = decodeURIComponent(value);
                      return acc;
                    }, {});

                    console.log('JobTrak: Found cookies:', Object.keys(cookies));

                    // Extract tokens with multiple fallback methods
                    const auth = cookies.authorization ||
                                localStorage.getItem('authorization') ||
                                sessionStorage.getItem('authorization') ||
                                localStorage.getItem('auth_token') ||
                                sessionStorage.getItem('auth_token');

                    const csrf = cookies.csrf ||
                                cookies['csrf-token'] ||
                                cookies._token ||
                                localStorage.getItem('csrf') ||
                                sessionStorage.getItem('csrf') ||
                                document.querySelector('meta[name="csrf-token"]')?.content ||
                                document.querySelector('input[name="_token"]')?.value;

                    console.log('JobTrak: Auth token found:', !!auth);
                    console.log('JobTrak: CSRF token found:', !!csrf);

                    if (!auth) {
                      alert('❌ Authorization token not found. Make sure you are logged into Simplify Jobs.');
                      console.log('JobTrak: Available cookies:', Object.keys(cookies));
                      return;
                    }

                    if (!csrf) {
                      alert('❌ CSRF token not found. Make sure you are logged into Simplify Jobs.');
                      console.log('JobTrak: Available cookies:', Object.keys(cookies));
                      return;
                    }

                    // Send to JobTrak API
                    const apiUrl = '${process.env.REACT_APP_API_BASE_URL || window.location.origin}/api/simplify/auto-capture';
                    console.log('JobTrak: Sending to:', apiUrl);

                    fetch(apiUrl, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-User-Id': 'bookmarklet-user'
                      },
                      credentials: 'include',
                      body: JSON.stringify({
                        cookies: document.cookie,
                        csrf: csrf,
                        authorization: auth,
                        url: window.location.href,
                        timestamp: new Date().toISOString(),
                        debug: {
                          cookieKeys: Object.keys(cookies),
                          domain: window.location.hostname
                        }
                      })
                    }).then(response => {
                      console.log('JobTrak: Response status:', response.status);
                      if (response.ok) {
                        alert('✅ Tokens captured successfully! Go back to JobTrak and refresh.');
                      } else {
                        response.text().then(text => {
                          alert('❌ Failed to capture tokens: ' + text);
                          console.log('JobTrak: Error response:', text);
                        });
                      }
                    }).catch(error => {
                      console.error('JobTrak: Fetch error:', error);
                      alert('❌ Network error: ' + error.message);
                    });
                  })();`}
                  className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium cursor-move select-all"
                  draggable="true"
                  onClick={(e) => e.preventDefault()}
                >
                  📌 JobTrak Token Capture
                </a>
              </div>
              <div className="text-xs text-purple-600 space-y-1">
                <p><strong>Instructions:</strong></p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Drag the purple button above to your bookmarks bar</li>
                  <li>Make sure you're logged into Simplify Jobs</li>
                  <li>Click the bookmark while on simplify.jobs</li>
                  <li>Check browser console (F12) for debug info if it fails</li>
                  <li>Come back here and click "Check if Tokens Captured"</li>
                </ol>
              </div>

              {/* Debug helper */}
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <p className="font-medium text-yellow-800">Debug Helper:</p>
                <p className="text-yellow-700">If the bookmarklet fails, open browser console (F12) on Simplify.jobs and run:</p>
                <code className="block mt-1 p-1 bg-white rounded text-xs">
                  console.log('Cookies:', document.cookie.split(';').map(c => c.trim().split('=')[0]));
                </code>
              </div>
            </div>

            {/* Manual Option */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-800 mb-2">Manual Method</h5>
              <p className="text-sm text-blue-800 mb-3">
                Or login manually and capture tokens in the next step:
              </p>
              <button
                onClick={() => window.open('https://simplify.jobs/auth/login', '_blank')}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Open Simplify Login (New Tab)
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Use Manual Method
              </button>
              <button
                onClick={checkExistingSession}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Check if Tokens Captured
              </button>
            </div>

            {/* Manual token input for debugging */}
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm font-medium text-gray-700 mb-2">Quick Manual Capture (Debug):</p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Paste authorization cookie value here"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  value={sessionData.authorization}
                  onChange={(e) => handleInputChange('authorization', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Paste csrf cookie value here"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  value={sessionData.csrf}
                  onChange={(e) => handleInputChange('csrf', e.target.value)}
                />
                <button
                  onClick={saveSession}
                  disabled={!sessionData.authorization || !sessionData.csrf}
                  className="w-full py-1 px-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  Quick Save Tokens
                </button>
              </div>
            </div>
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
                ✓ Session ready! Your Simplify authentication is valid and ready to upload your resume PDF.
              </p>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4">
              <h5 className="font-medium mb-2">Upload Details:</h5>
              <p className="text-sm text-gray-600">Resume ID: {resumeId}</p>
              <p className="text-sm text-gray-600">Job ID: {jobId}</p>
              <p className="text-sm text-gray-600">
                Resume Data: {resumeData ? (
                  <span className="text-green-600">✓ Loaded ({resumeData.basic?.name || 'Unnamed'})</span>
                ) : (
                  <span className="text-red-600">✗ Not loaded</span>
                )}
              </p>
            </div>

            <button
              onClick={uploadResume}
              disabled={status === 'uploading' || status === 'success' || !resumeData || generatingPdf}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {status === 'uploading' || generatingPdf ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full inline-block"></span>
                  {generatingPdf ? 'Generating PDF...' : 'Uploading to Simplify...'}
                </>
              ) : status === 'success' ? (
                '✓ Upload Complete!'
              ) : !resumeData ? (
                'Waiting for Resume Data...'
              ) : (
                'Generate PDF & Upload to Simplify'
              )}
            </button>

            {status !== 'success' && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Update Session
                </button>
                <button
                  onClick={checkExistingSession}
                  className="flex-1 py-2 px-4 border border-blue-300 rounded text-blue-700 hover:bg-blue-50"
                >
                  Refresh Session Status
                </button>
              </div>
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
              🎉 Resume PDF generated and uploaded successfully to Simplify Jobs!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimplifyUploadModal;