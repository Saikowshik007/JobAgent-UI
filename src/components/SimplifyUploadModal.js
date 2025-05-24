// SimplifyUploadModal.js - Pure Frontend Solution (No Backend Required)

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { jobsApi } from '../utils/api';
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
  const [csrfToken, setCsrfToken] = useState(null);
  const { currentUser } = useAuth();

  // Auto-check tokens and load resume data when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('checking');
      setError('');
      checkTokensAndLoadData();
    }
  }, [isOpen, resumeId]);

  const checkTokensAndLoadData = async () => {
    try {
      console.log('🔍 Checking for stored CSRF token and loading resume data...');

      // Check for stored CSRF token in our domain's localStorage
      const storedToken = localStorage.getItem('jobtrak_simplify_csrf');
      
      // Load resume data if we haven't already
      if (!resumeData && resumeId) {
        await fetchResumeData();
      }

      if (storedToken) {
        console.log('✅ CSRF token found in JobTrak localStorage! Ready to upload.');
        setCsrfToken(storedToken);
        setStatus('ready');
      } else {
        console.log('❌ No CSRF token found in JobTrak localStorage. Need to capture from Simplify.');
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
      console.log('🚀 Starting direct upload to Simplify...');

      // Generate PDF
      const pdfBlob = await generatePdfBlob();

      // Prepare headers for Simplify API
      const headers = {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'origin': 'https://simplify.jobs',
        'referer': 'https://simplify.jobs/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'x-csrf-token': csrfToken,
        'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'dnt': '1'
      };

      // Prepare form data
      const formData = new FormData();
      formData.append('file', pdfBlob, `resume_${resumeId}.pdf`);

      console.log('📤 Uploading directly to Simplify API...');
      console.log('Using CSRF token:', csrfToken.substring(0, 20) + '...');

      // Upload directly to Simplify (browser will include HttpOnly authorization cookie)
      const response = await fetch('https://api.simplify.jobs/v2/candidate/me/resume/upload', {
        method: 'POST',
        headers: headers,
        credentials: 'include', // This ensures HttpOnly cookies are sent
        body: formData
      });

      console.log(`Simplify API response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Simplify upload failed: ${response.status} - ${errorText}`);
      }

      let result;
      try {
        result = await response.json();
        console.log('✅ Upload successful with JSON response:', result);
      } catch {
        result = { message: 'Upload successful', status: response.status };
        console.log('✅ Upload successful (no JSON response)');
      }

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
    checkTokensAndLoadData();
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
          <p>CSRF Token: {csrfToken ? '✅ Ready' : '❌ Missing'}</p>
          <p>Status: {status}</p>
          <p>Token Source: {localStorage.getItem('jobtrak_simplify_csrf') ? 'JobTrak localStorage' : 'Not stored'}</p>
        </div>

        {/* Checking Status */}
        {status === 'checking' && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Checking tokens and loading resume data...</p>
          </div>
        )}

        {/* Need Tokens */}
        {status === 'need-tokens' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">🔑 Get Your CSRF Token</h4>
              <p className="text-sm text-blue-700">
                We need your CSRF token from Simplify to upload resumes. This is a 30-second process.
              </p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Open Simplify.jobs in a new tab</p>
                    <button
                      onClick={() => window.open('https://simplify.jobs', '_blank')}
                      className="mt-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Open Simplify →
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Open browser console (F12 → Console tab)</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Copy and paste this command:</p>
                    <div className="mt-2 bg-gray-900 text-green-400 p-3 rounded font-mono text-sm relative group">
                      <code>
                        {`(() => {
  const csrf = document.cookie.split(';').find(c => c.trim().startsWith('csrf='));
  if (csrf) {
    const token = csrf.split('=')[1];
    console.log('✅ Token:', token);
    navigator.clipboard && navigator.clipboard.writeText(token);
    return token;
  } else {
    console.log('❌ Not logged in');
    return null;
  }
})()`}
                      </code>
                      <button
                        onClick={() => {
                          const script = `(() => {
  const csrf = document.cookie.split(';').find(c => c.trim().startsWith('csrf='));
  if (csrf) {
    const token = csrf.split('=')[1];
    console.log('✅ Token:', token);
    navigator.clipboard && navigator.clipboard.writeText(token);
    return token;
  } else {
    console.log('❌ Not logged in');
    return null;
  }
})()`;
                          navigator.clipboard.writeText(script);
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Paste the token result here:</p>
                    <div className="mt-2 flex space-x-2">
                      <input
                        type="text"
                        placeholder="Paste your CSRF token here..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        value={csrfToken || ''}
                        onChange={(e) => {
                          const token = e.target.value.trim();
                          setCsrfToken(token);
                          if (token.length > 20) {
                            localStorage.setItem('jobtrak_simplify_csrf', token);
                            localStorage.setItem('jobtrak_simplify_csrf_captured_at', new Date().toISOString());
                            console.log('✅ CSRF token saved:', token.substring(0, 20) + '...');
                            setStatus('ready');
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <details className="bg-gray-50 border border-gray-200 rounded-lg">
              <summary className="p-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100">
                💡 Need help? Click here
              </summary>
              <div className="p-3 pt-0 text-sm text-gray-600 space-y-2">
                <p><strong>Console script not working?</strong></p>
                <p>Try this simpler one-liner:</p>
                <code className="bg-gray-800 text-green-400 p-2 rounded block font-mono text-xs">
                  document.cookie.split(';').find(c=>c.includes('csrf=')).split('=')[1]
                </code>
                <p><strong>Still having issues?</strong></p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Make sure you're logged into simplify.jobs</li>
                  <li>Try refreshing the Simplify page and running the script again</li>
                  <li>The token should be a long string (100+ characters)</li>
                </ul>
              </div>
            </details>

            <div className="flex space-x-3">
              <button
                onClick={retryCheck}
                className="flex-1 py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Check Status
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
                CSRF token confirmed! Your resume will be generated as a PDF and uploaded directly to Simplify. Your browser will automatically include the authorization cookie.
              </p>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4">
              <h5 className="font-medium mb-2">Upload Details:</h5>
              <p className="text-sm text-gray-600">Resume: {resumeData?.basic?.name || 'Unnamed'}</p>
              <p className="text-sm text-gray-600">Job ID: {jobId}</p>
              <p className="text-sm text-gray-600">Method: Direct frontend upload</p>
              <p className="text-sm text-gray-600">CSRF Token: {csrfToken?.substring(0, 20)}...</p>
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
              {generatingPdf ? 'Generating PDF...' : 'Uploading directly to Simplify...'}
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
            <p className="text-gray-600">Your resume has been uploaded directly to Simplify Jobs.</p>
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
