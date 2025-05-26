// Enhanced Register.js with beautiful animations but keeping original structure
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import Footer from "./Footer";
import yaml from "js-yaml";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [entryMethod, setEntryMethod] = useState("upload");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const { signup } = useAuth();
  const navigate = useNavigate();

  // Manual entry form state
  const [manualResumeData, setManualResumeData] = useState({
    basic: {
      name: "",
      address: "",
      email: "",
      phone: "",
      websites: [""]
    },
    objective: "",
    education: [
      {
        school: "",
        degrees: [
          {
            names: [""],
            gpa: "",
            dates: ""
          }
        ]
      }
    ],
    experiences: [
      {
        company: "",
        skip_name: false,
        location: "",
        titles: [
          {
            name: "",
            startdate: "",
            enddate: ""
          }
        ],
        highlights: [""]
      }
    ],
    projects: [
      {
        name: "",
        technologies: "",
        link: "",
        hyperlink: false,
        show_link: false,
        highlights: [""]
      }
    ],
    skills: [
      {
        category: "",
        skills: [""]
      }
    ]
  });

  const toggleEntryMethod = () => {
    setEntryMethod(entryMethod === "upload" ? "manual" : "upload");
    // Clear any existing resume data when switching methods
    if (entryMethod === "upload") {
      setResumeData(null);
      setResumeFile(null);
    }
  };

  // Function to download sample resume file
  const downloadSampleFile = () => {
    try {
      // Fetch the sample file from the public folder
      fetch('/sample-resume.yaml')
        .then(response => {
          if (!response.ok) {
            throw new Error('Sample file not found');
          }
          return response.blob();
        })
        .then(blob => {
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'sample-resume.yaml';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(error => {
          console.error('Error downloading sample file:', error);
          setError('Failed to download sample file. Please try again.');
        });
    } catch (error) {
      console.error('Error downloading sample file:', error);
      setError('Failed to download sample file. Please try again.');
    }
  };

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      setError("Please upload a valid YAML resume file");
      return;
    }

    setResumeFile(file);

    // Read and parse the YAML file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const yamlContent = event.target.result;
        const parsedData = yaml.load(yamlContent);
        setResumeData(parsedData);
        setError("");
      } catch (err) {
        setError("Failed to parse resume file: " + err.message);
      }
    };
    reader.onerror = () => {
      setError("Failed to read resume file");
    };
    reader.readAsText(file);
  };

  // Handle changes to the manual entry form
  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setManualResumeData(prev => ({
      ...prev,
      basic: {
        ...prev.basic,
        [name]: value
      }
    }));
  };

  const handleWebsiteChange = (index, value) => {
    setManualResumeData(prev => {
      const websites = [...prev.basic.websites];
      websites[index] = value;
      return {
        ...prev,
        basic: {
          ...prev.basic,
          websites
        }
      };
    });
  };

  const addWebsite = () => {
    setManualResumeData(prev => ({
      ...prev,
      basic: {
        ...prev.basic,
        websites: [...prev.basic.websites, ""]
      }
    }));
  };

  const handleObjectiveChange = (e) => {
    setManualResumeData(prev => ({
      ...prev,
      objective: e.target.value
    }));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    // Validate resume data based on entry method
    if (entryMethod === "upload" && !resumeData) {
      return setError("Please upload your resume YAML file");
    }

    try {
      setError("");
      setLoading(true);

      // Sign up the user
      const user = await signup(email, password, openaiApiKey);

      // Upload resume data to Firestore based on entry method
      if (entryMethod === "upload") {
        await uploadResumeToFirebase(user.uid, resumeData);
      } else {
        await uploadResumeToFirebase(user.uid, manualResumeData);
      }

      navigate("/dashboard");
    } catch (error) {
      setError("Failed to create an account: " + error.message);
    }

    setLoading(false);
  }

  async function uploadResumeToFirebase(userId, resumeData) {
    try {
      // Create a document reference for this user's resume
      const resumeRef = doc(db, "resumes", userId);

      // Upload the resume data
      await setDoc(resumeRef, {
        basic: resumeData.basic || {},
        objective: resumeData.objective || "",
        education: resumeData.education || [],
        experiences: resumeData.experiences || [],
        projects: resumeData.projects || [],
        skills: resumeData.skills || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log("Resume successfully uploaded to Firebase");
    } catch (error) {
      console.error("Error uploading resume:", error);
      throw error;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="relative flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center animate-slide-down">
            <h2 className="mt-6 text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              JobAgent - Create your account
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative animate-slide-down" role="alert">
              <div className="flex items-center space-x-2">
                <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="block sm:inline">{error}</span>
              </div>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {/* Account Information Section */}
            <div className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-2xl p-8 border border-white/20 animate-slide-in">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className={`h-5 w-5 transition-colors duration-200 ${focusedField === 'email' ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      id="email-address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className={`
                        block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                        focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200
                        ${focusedField === 'email' ? 'transform scale-105 shadow-lg' : 'hover:shadow-md'}
                      `}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className={`h-5 w-5 transition-colors duration-200 ${focusedField === 'password' ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className={`
                        block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl
                        focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200
                        ${focusedField === 'password' ? 'transform scale-105 shadow-lg' : 'hover:shadow-md'}
                      `}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L5.636 5.636m14.142 14.142L15.536 15.536M9.878 9.878l6.364-6.364M2.98 2.98l18.04 18.04" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className={`h-5 w-5 transition-colors duration-200 ${focusedField === 'confirmPassword' ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className={`
                        block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl
                        focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200
                        ${focusedField === 'confirmPassword' ? 'transform scale-105 shadow-lg' : 'hover:shadow-md'}
                      `}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L5.636 5.636m14.142 14.142L15.536 15.536M9.878 9.878l6.364-6.364M2.98 2.98l18.04 18.04" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="openai-api-key" className="block text-sm font-medium text-gray-700">
                    OpenAI API Key (Optional)
                  </label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v.01M15 4H9m6 0a2 2 0 012 2M9 4a2 2 0 00-2 2m0 0H5a2 2 0 00-2 2v6a2 2 0 002 2h2M7 4V2a2 2 0 011-1h8a2 2 0 011 1v2m-9 0h10m-9 0a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2H9z" />
                      </svg>
                    </div>
                    <input
                      id="openai-api-key"
                      name="openai-api-key"
                      type="text"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:shadow-md"
                      placeholder="For AI-powered features like resume generation"
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Resume Section Toggle */}
            <div className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-2xl p-8 border border-white/20 animate-slide-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Resume Information</h3>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={toggleEntryMethod}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105"
                  >
                    Switch to {entryMethod === "upload" ? "Manual Entry" : "File Upload"}
                  </button>
                </div>
              </div>

              {entryMethod === "upload" ? (
                /* File Upload Option */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">
                      Upload your resume.yaml file to automatically fill your profile
                    </p>
                    <button
                      type="button"
                      onClick={downloadSampleFile}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Sample File
                    </button>
                  </div>

                  <input
                    id="resume-upload"
                    name="resume-upload"
                    type="file"
                    accept=".yaml,.yml"
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-xl file:border-0
                      file:text-sm file:font-medium
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100 transition-all duration-200"
                    onChange={handleResumeUpload}
                  />

                  {resumeData && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl animate-slide-down">
                      <div className="flex items-center space-x-2">
                        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-green-600">
                          Resume successfully loaded: {resumeFile?.name}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-800">
                      <strong>Need help getting started?</strong> Download our sample file to see the expected format, then customize it with your own information.
                    </p>
                  </div>
                </div>
              ) : (
                /* Manual Entry Option */
                <div className="space-y-8">
                  {/* Basic Information */}
                  <div className="border-b border-gray-200 pb-5">
                    <h4 className="text-md font-medium text-gray-800">Basic Information</h4>
                    <div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          value={manualResumeData.basic.name}
                          onChange={handleBasicInfoChange}
                        />
                      </div>
                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                          Location
                        </label>
                        <input
                          type="text"
                          name="address"
                          id="address"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          value={manualResumeData.basic.address}
                          onChange={handleBasicInfoChange}
                          placeholder="City, State"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          id="contact-email"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          value={manualResumeData.basic.email}
                          onChange={handleBasicInfoChange}
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          name="phone"
                          id="phone"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          value={manualResumeData.basic.phone}
                          onChange={handleBasicInfoChange}
                        />
                      </div>
                    </div>

                    {/* Websites */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Websites/Profiles
                      </label>
                      <button
                        type="button"
                        onClick={addWebsite}
                        className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        + Add Website
                      </button>
                    </div>
                  </div>

                  {/* Professional Summary */}
                  <div className="border-b border-gray-200 pb-5">
                    <h4 className="text-md font-medium text-gray-800">Professional Summary</h4>
                    <div className="mt-4">
                      <textarea
                        id="objective"
                        name="objective"
                        rows={4}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                        placeholder="Write a brief summary of your professional background and goals"
                        value={manualResumeData.objective}
                        onChange={handleObjectiveChange}
                      ></textarea>
                    </div>
                  </div>

                  <div className="text-center text-sm text-gray-500">
                    <p>Note: Complete your full profile after registration in Settings.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className={`
                  inline-flex justify-center items-center space-x-2 py-3 px-8 border border-transparent
                  shadow-sm text-sm font-medium rounded-xl text-white transition-all duration-200
                  transform hover:scale-105
                  ${loading
                    ? 'bg-indigo-400 cursor-not-allowed animate-pulse'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  }
                `}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Register</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            <div className="text-sm text-center">
              <p>
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      <Footer />

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }

        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }

        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }

        .bg-grid-pattern {
          background-image: radial-gradient(circle, #000 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}

export default Register;