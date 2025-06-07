import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { simplifyApi, resumeApi } from '../utils/api';
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
const styles =  StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 50,
    fontSize: 11, // Slightly larger for better OCR
    fontFamily: 'Calibri',
    lineHeight: 1.4, // Better line spacing
    color: '#000000', // Pure black for OCR
  },
  header: {
    fontSize: 16, // Larger name
    textAlign: 'left', // Left-align instead of center
    fontWeight: 'bold',
    marginBottom: 5,
    // Remove text transform for ATS
  },
  contact: {
    textAlign: 'left', // Left-align contact info
    fontSize: 10,
    marginBottom: 15,
    lineHeight: 1.3,
  },
  sectionTitle: {
    fontSize: 12, // Larger section headers
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    // Remove borders and transforms for ATS
    color: '#000000',
  },
  jobBlock: {
    marginBottom: 10, // More spacing between jobs
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  jobTitle: {
    fontStyle: 'normal', // Remove italics for ATS
    fontWeight: 'normal',
  },
  bullet: {
    marginLeft: 15, // Standard bullet indent
    marginBottom: 3,
    lineHeight: 1.4,
  },
  textNormal: {
    marginBottom: 5,
    lineHeight: 1.4,
  },
  // Simplified project styling
  projectTitle: {
    fontWeight: 'bold',
    color: '#000000', // Remove blue color
    // Remove links for ATS compatibility
  },
  projectTech: {
    fontSize: 10,
    color: '#000000',
    marginLeft: 0, // Don't indent
    marginTop: 2,
    fontStyle: 'normal', // Remove italics
  },
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

        {data.objective && data.objective.trim() && (
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
              {data.skills.map((skillCategory, idx) => (
                  <View key={idx} style={{ marginBottom: 3 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 1 }}>{skillCategory.category}:</Text>
                    {skillCategory.subcategories ? (
                        // Handle subcategories structure
                        skillCategory.subcategories.map((subcat, subIdx) => (
                            <Text key={subIdx} style={{ marginLeft: 10, marginBottom: 1 }}>
                              <Text style={{ fontWeight: 'bold' }}>{subcat.name}:</Text> {subcat.skills?.join(', ') || 'No skills'}
                            </Text>
                        ))
                    ) : (
                        // Handle direct skills list (legacy format)
                        <Text style={{ marginLeft: 10 }}>
                          {skillCategory.skills?.join(', ') || 'No skills listed'}
                        </Text>
                    )}
                  </View>
              ))}
            </>
        )}
      </Page>
    </Document>
);

const SimplifyUploadModal = ({ isOpen, onClose, resumeId, jobId, resumeYamlVersion = 0, onUploadComplete }) => {
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState('');
  const [resumeData, setResumeData] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [lastResumeYamlVersion, setLastResumeYamlVersion] = useState(-1);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setStatus('checking');
      setError('');
      setCsrfToken('');
      setAuthToken('');
      checkSessionAndLoadData();
    }
  }, [isOpen, resumeId]);

  useEffect(() => {
    if (isOpen && resumeYamlVersion !== lastResumeYamlVersion && resumeYamlVersion > 0) {
      console.log(`🔄 Resume YAML version changed from ${lastResumeYamlVersion} to ${resumeYamlVersion} - reloading fresh data`);
      setLastResumeYamlVersion(resumeYamlVersion);
      fetchResumeData(true);
    }
  }, [resumeYamlVersion, isOpen, lastResumeYamlVersion]);

  const checkSessionAndLoadData = async () => {
    try {
      console.log('🔍 Checking session and loading resume data...');
      const sessionCheck = await simplifyApi.checkSession();
      setSessionStatus(sessionCheck);

      if (resumeId) {
        await fetchResumeData();
      }

      if (sessionCheck.has_session && sessionCheck.is_valid && sessionCheck.session_age_hours < 24) {
        console.log('✅ Valid and verified session found! Ready to upload.');
        setStatus('ready');
      } else {
        if (sessionCheck.has_session && !sessionCheck.is_valid) {
          console.log('❌ Session found but tokens are invalid. Need re-authentication.');
        } else {
          console.log('❌ No valid session found. Need authentication.');
        }
        setStatus('need-auth');
      }
    } catch (err) {
      console.error('❌ Error during initialization:', err);
      setError(`Initialization failed: ${err.message}`);
      setStatus('error');
    }
  };

  const fetchResumeData = async (forceRefresh = false) => {
    try {
      if (!forceRefresh && resumeData) {
        console.log('📄 Resume data already loaded, skipping fetch');
        return;
      }

      console.log('📄 Loading resume YAML for PDF generation...');
      const yamlContent = await resumeApi.getResumeYaml(resumeId);

      if (yamlContent) {
        const parsed = yaml.load(yamlContent);
        setResumeData(parsed);
        console.log('✅ Resume data loaded successfully', forceRefresh ? '(forced refresh)' : '');
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

  const handleTokenSubmit = async () => {
    if (!csrfToken.trim() || !authToken.trim()) {
      setError('Please enter both CSRF token and authorization token');
      return;
    }

    try {
      console.log('🔑 Submitting tokens...');
      await simplifyApi.storeTokens({
        csrf: csrfToken.trim(),
        authorization: authToken.trim()
      });

      console.log('✅ Tokens stored successfully');
      setStatus('ready');
    } catch (err) {
      console.error('❌ Failed to store tokens:', err);
      setError(`Failed to store tokens: ${err.message}`);
    }
  };

  const uploadToSimplifyViaBackend = async () => {
    setStatus('uploading');
    setError('');

    try {
      console.log('🚀 Starting upload via backend...');
      console.log('🔄 Fetching fresh resume data before upload...');
      await fetchResumeData(true);
      const pdfBlob = await generatePdfBlob();
      console.log('📤 Uploading via backend proxy...');
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/10 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Upload to Simplify</h3>
                <p className="text-blue-100 text-sm">Streamline your job applications</p>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Checking Status */}
            {status === 'checking' && (
                <div className="text-center py-12">
                  <div className="relative inline-flex items-center justify-center w-16 h-16 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Initializing</h4>
                  <p className="text-gray-600">Checking session and loading resume data...</p>
                </div>
            )}

            {/* Need Authentication */}
            {status === 'need-auth' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-r-xl p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h4 className="font-semibold text-amber-800">Authentication Required</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          {sessionStatus?.has_session && !sessionStatus?.is_valid
                              ? 'Your stored tokens have expired. Please provide fresh authentication tokens.'
                              : 'Please provide your Simplify.jobs authentication tokens to continue.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Instructions Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                    <h5 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      How to Get Your Tokens
                    </h5>

                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-semibold mr-3 mt-0.5">1</div>
                          <div>
                            <p className="font-medium text-gray-900 mb-2">Open Simplify.jobs</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• Go to <a href="https://simplify.jobs" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">simplify.jobs</a> and log in</li>
                              <li>• Open Developer Tools (F12 or right-click → Inspect)</li>
                              <li>• Navigate to the <strong>Application</strong> tab</li>
                              <li>• Expand <strong>Cookies</strong> → <strong>https://simplify.jobs</strong></li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-semibold mr-3 mt-0.5">2</div>
                          <div>
                            <p className="font-medium text-gray-900 mb-2">Copy Required Tokens</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• Find and copy the <code className="bg-gray-100 px-1 rounded">csrf</code> cookie value</li>
                              <li>• Find and copy the <code className="bg-gray-100 px-1 rounded">authorization</code> cookie value</li>
                              <li>• Paste both values in the fields below</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Token Input Forms */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        CSRF Token
                      </label>
                      <textarea
                          value={csrfToken}
                          onChange={(e) => setCsrfToken(e.target.value)}
                          placeholder="Paste the 'csrf' cookie value here..."
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                          rows="2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Authorization Token
                      </label>
                      <textarea
                          value={authToken}
                          onChange={(e) => setAuthToken(e.target.value)}
                          placeholder="Paste the 'authorization' cookie value here..."
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                          rows="3"
                      />
                    </div>

                    <button
                        onClick={handleTokenSubmit}
                        disabled={!csrfToken.trim() || !authToken.trim()}
                        className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100"
                    >
                      Save Tokens & Continue
                    </button>
                  </div>

                  <div className="flex space-x-3">
                    <button
                        onClick={retryCheck}
                        className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                      Check Session Again
                    </button>
                    <button
                        onClick={() => window.open('https://simplify.jobs', '_blank')}
                        className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                    >
                      Open Simplify
                    </button>
                  </div>
                </div>
            )}

            {/* Ready to Upload */}
            {status === 'ready' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-r-xl p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h4 className="font-semibold text-green-800">Ready to Upload</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Authentication confirmed! Your resume will be generated with the latest changes and uploaded securely.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-4">Upload Details</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-600">Resume:</span>
                        <span className="ml-1 font-medium">{resumeData?.basic?.name || 'Unnamed'}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                        </svg>
                        <span className="text-gray-600">Job ID:</span>
                        <span className="ml-1 font-medium font-mono text-xs">{jobId}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-gray-600">Method:</span>
                        <span className="ml-1 font-medium">Secure Backend</span>
                      </div>
                      {resumeYamlVersion > 0 && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-green-600 font-medium">Latest changes (v{resumeYamlVersion})</span>
                          </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                        onClick={uploadToSimplifyViaBackend}
                        disabled={!resumeData}
                        className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100"
                    >
                      {!resumeData ? (
                          <div className="flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Loading Resume Data...
                          </div>
                      ) : (
                          <div className="flex items-center justify-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Generate Fresh PDF & Upload to Simplify
                          </div>
                      )}
                    </button>

                    <button
                        onClick={retryCheck}
                        className="w-full py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                    >
                      Refresh Status
                    </button>
                  </div>
                </div>
            )}

            {/* Uploading */}
            {status === 'uploading' && (
                <div className="text-center py-12">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {generatingPdf ? 'Generating PDF' : 'Uploading Resume'}
                  </h4>
                  <p className="text-gray-600 mb-1">
                    {generatingPdf ? 'Creating PDF with your latest changes...' : 'Uploading via secure backend...'}
                  </p>
                  <p className="text-xs text-gray-500">This may take a few moments</p>
                </div>
            )}

            {/* Success */}
            {status === 'success' && (
                <div className="text-center py-12">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
                    <div className="absolute inset-0 rounded-full bg-green-100"></div>
                    <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20"></div>
                    <svg className="w-10 h-10 text-green-600 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Upload Successful! 🎉</h4>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Your resume with the latest changes has been uploaded to Simplify Jobs via our secure backend.
                  </p>

                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-center text-green-700">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Ready to apply on Simplify!</span>
                    </div>
                  </div>
                </div>
            )}

            {/* Error */}
            {status === 'error' && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
                      <div className="absolute inset-0 rounded-full bg-red-100"></div>
                      <svg className="w-8 h-8 text-red-600 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload Failed</h4>
                  </div>

                  <div className="bg-red-50 border-l-4 border-red-400 rounded-r-xl p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h4 className="font-semibold text-red-800">Error Details</h4>
                        <p className="text-sm text-red-700 mt-1 font-mono bg-red-100 p-2 rounded text-xs">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                      onClick={retryCheck}
                      className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Try Again
                    </div>
                  </button>
                </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default SimplifyUploadModal;