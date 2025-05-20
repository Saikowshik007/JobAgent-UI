import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
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
  const [entryMethod, setEntryMethod] = useState("upload"); // "upload" or "manual"
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

  // Education handlers
  const handleEducationChange = (schoolIndex, field, value) => {
    setManualResumeData(prev => {
      const schools = [...prev.education];
      schools[schoolIndex] = {
        ...schools[schoolIndex],
        [field]: value
      };
      return {
        ...prev,
        education: schools
      };
    });
  };

  const handleDegreeChange = (schoolIndex, degreeIndex, field, value) => {
    setManualResumeData(prev => {
      const schools = [...prev.education];
      schools[schoolIndex].degrees[degreeIndex] = {
        ...schools[schoolIndex].degrees[degreeIndex],
        [field]: value
      };
      return {
        ...prev,
        education: schools
      };
    });
  };

  const handleDegreeNameChange = (schoolIndex, degreeIndex, nameIndex, value) => {
    setManualResumeData(prev => {
      const schools = [...prev.education];
      const names = [...schools[schoolIndex].degrees[degreeIndex].names];
      names[nameIndex] = value;
      schools[schoolIndex].degrees[degreeIndex].names = names;
      return {
        ...prev,
        education: schools
      };
    });
  };

  const addEducation = () => {
    setManualResumeData(prev => ({
      ...prev,
      education: [...prev.education, {
        school: "",
        degrees: [{
          names: [""],
          gpa: "",
          dates: ""
        }]
      }]
    }));
  };

  const addDegree = (schoolIndex) => {
    setManualResumeData(prev => {
      const schools = [...prev.education];
      schools[schoolIndex].degrees.push({
        names: [""],
        gpa: "",
        dates: ""
      });
      return {
        ...prev,
        education: schools
      };
    });
  };

  // Experience handlers
  const handleExperienceChange = (expIndex, field, value) => {
    setManualResumeData(prev => {
      const experiences = [...prev.experiences];
      experiences[expIndex] = {
        ...experiences[expIndex],
        [field]: value
      };
      return {
        ...prev,
        experiences
      };
    });
  };

  const handleTitleChange = (expIndex, titleIndex, field, value) => {
    setManualResumeData(prev => {
      const experiences = [...prev.experiences];
      experiences[expIndex].titles[titleIndex] = {
        ...experiences[expIndex].titles[titleIndex],
        [field]: value
      };
      return {
        ...prev,
        experiences
      };
    });
  };

  const handleHighlightChange = (expIndex, highlightIndex, value) => {
    setManualResumeData(prev => {
      const experiences = [...prev.experiences];
      experiences[expIndex].highlights[highlightIndex] = value;
      return {
        ...prev,
        experiences
      };
    });
  };

  const addExperience = () => {
    setManualResumeData(prev => ({
      ...prev,
      experiences: [...prev.experiences, {
        company: "",
        skip_name: false,
        location: "",
        titles: [{
          name: "",
          startdate: "",
          enddate: ""
        }],
        highlights: [""]
      }]
    }));
  };

  const addHighlight = (expIndex) => {
    setManualResumeData(prev => {
      const experiences = [...prev.experiences];
      experiences[expIndex].highlights.push("");
      return {
        ...prev,
        experiences
      };
    });
  };

  // Projects handlers
  const handleProjectChange = (projIndex, field, value) => {
    setManualResumeData(prev => {
      const projects = [...prev.projects];
      projects[projIndex] = {
        ...projects[projIndex],
        [field]: value
      };
      return {
        ...prev,
        projects
      };
    });
  };

  const handleProjectHighlightChange = (projIndex, highlightIndex, value) => {
    setManualResumeData(prev => {
      const projects = [...prev.projects];
      projects[projIndex].highlights[highlightIndex] = value;
      return {
        ...prev,
        projects
      };
    });
  };

  const addProject = () => {
    setManualResumeData(prev => ({
      ...prev,
      projects: [...prev.projects, {
        name: "",
        technologies: "",
        link: "",
        hyperlink: false,
        show_link: false,
        highlights: [""]
      }]
    }));
  };

  const addProjectHighlight = (projIndex) => {
    setManualResumeData(prev => {
      const projects = [...prev.projects];
      projects[projIndex].highlights.push("");
      return {
        ...prev,
        projects
      };
    });
  };

  // Skills handlers
  const handleSkillCategoryChange = (catIndex, value) => {
    setManualResumeData(prev => {
      const skills = [...prev.skills];
      skills[catIndex].category = value;
      return {
        ...prev,
        skills
      };
    });
  };

  const handleSkillChange = (catIndex, skillIndex, value) => {
    setManualResumeData(prev => {
      const skills = [...prev.skills];
      skills[catIndex].skills[skillIndex] = value;
      return {
        ...prev,
        skills
      };
    });
  };

  const addSkillCategory = () => {
    setManualResumeData(prev => ({
      ...prev,
      skills: [...prev.skills, {
        category: "",
        skills: [""]
      }]
    }));
  };

  const addSkill = (catIndex) => {
    setManualResumeData(prev => {
      const skills = [...prev.skills];
      skills[catIndex].skills.push("");
      return {
        ...prev,
        skills
      };
    });
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            JobTrak - Create your account
          </h2>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Account Information Section */}
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="openai-api-key" className="block text-sm font-medium text-gray-700">
                  OpenAI API Key (Optional)
                </label>
                <input
                  id="openai-api-key"
                  name="openai-api-key"
                  type="text"
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="For AI-powered features like resume generation"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Resume Section Toggle */}
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Resume Information</h3>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={toggleEntryMethod}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Switch to {entryMethod === "upload" ? "Manual Entry" : "File Upload"}
                </button>
              </div>
            </div>

            {entryMethod === "upload" ? (
              /* File Upload Option */
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Upload your resume.yaml file to automatically fill your profile
                </p>
                <input
                  id="resume-upload"
                  name="resume-upload"
                  type="file"
                  accept=".yaml,.yml"
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                  onChange={handleResumeUpload}
                />
                {resumeData && (
                  <p className="mt-2 text-sm text-green-600">
                    Resume successfully loaded: {resumeFile?.name}
                  </p>
                )}
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
                    {manualResumeData.basic.websites.map((website, index) => (
                      <div key={index} className="flex mt-2">
                        <input
                          type="text"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          value={website}
                          onChange={(e) => handleWebsiteChange(index, e.target.value)}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addWebsite}
                      className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      + Add Website
                    </button>
                  </div>
                </div>

                {/* Objective */}
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

                {/* Education */}
                <div className="border-b border-gray-200 pb-5">
                  <h4 className="text-md font-medium text-gray-800">Education</h4>
                  {manualResumeData.education.map((school, schoolIndex) => (
                    <div key={schoolIndex} className="mt-4 p-4 border border-gray-200 rounded-md">
                      <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            School/University
                          </label>
                          <input
                            type="text"
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            value={school.school}
                            onChange={(e) => handleEducationChange(schoolIndex, 'school', e.target.value)}
                          />
                        </div>
                      </div>

                      {school.degrees.map((degree, degreeIndex) => (
                        <div key={degreeIndex} className="mt-4 pl-4 border-l-2 border-gray-200">
                          <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Degree
                              </label>
                              <input
                                type="text"
                                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                value={degree.names[0] || ""}
                                onChange={(e) => handleDegreeNameChange(schoolIndex, degreeIndex, 0, e.target.value)}
                                placeholder="e.g., B.S. Computer Science"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                GPA (Optional)
                              </label>
                              <input
                                type="text"
                                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                value={degree.gpa}
                                onChange={(e) => handleDegreeChange(schoolIndex, degreeIndex, 'gpa', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Dates
                              </label>
                              <input
                                type="text"
                                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                value={degree.dates}
                                onChange={(e) => handleDegreeChange(schoolIndex, degreeIndex, 'dates', e.target.value)}
                                placeholder="e.g., August 2021-May 2023"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => addDegree(schoolIndex)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          + Add Another Degree
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addEducation}
                    className="mt-4 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    + Add Another Institution
                  </button>
                </div>

                {/* Work Experience */}
                <div className="border-b border-gray-200 pb-5">
                  <h4 className="text-md font-medium text-gray-800">Work Experience</h4>
                  {manualResumeData.experiences.map((exp, expIndex) => (
                    <div key={expIndex} className="mt-4 p-4 border border-gray-200 rounded-md">
                      <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Company
                          </label>
                          <input
                            type="text"
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            value={exp.company}
                            onChange={(e) => handleExperienceChange(expIndex, 'company', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Location
                          </label>
                          <input
                            type="text"
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            value={exp.location}
                            onChange={(e) => handleExperienceChange(expIndex, 'location', e.target.value)}
                          />
                        </div>
                      </div>

                      {exp.titles.map((title, titleIndex) => (
                        <div key={titleIndex} className="mt-4">
                          <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Job Title
                              </label>
                              <input
                                type="text"
                                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                value={title.name}
                                onChange={(e) => handleTitleChange(expIndex, titleIndex, 'name', e.target.value)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-x-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Start Date
                                </label>
                                <input
                                  type="text"
                                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                  value={title.startdate}
                                  onChange={(e) => handleTitleChange(expIndex, titleIndex, 'startdate', e.target.value)}
                                  placeholder="January 2023"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  End Date
                                </label>
                                <input
                                  type="text"
                                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                  value={title.enddate}
                                  onChange={(e) => handleTitleChange(expIndex, titleIndex, 'enddate', e.target.value)}
                                  placeholder="Present"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Highlights/Responsibilities
                        </label>
                        {exp.highlights.map((highlight, highlightIndex) => (
                          <div key={highlightIndex} className="mt-2">
                            <textarea
                              rows={2}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                              value={highlight}
                              onChange={(e) => handleHighlightChange(expIndex, highlightIndex, e.target.value)}
                              placeholder="Describe an achievement or responsibility"
                            ></textarea>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addHighlight(expIndex)}
                          className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          + Add Highlight
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addExperience}
                    className="mt-4 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    + Add Another Experience
                  </button>
                </div>

                {/* Projects */}
                <div className="border-b border-gray-200 pb-5">
                  <h4 className="text-md font-medium text-gray-800">Projects</h4>
                  {manualResumeData.projects.map((project, projIndex) => (
                    <div key={projIndex} className="mt-4 p-4 border border-gray-200 rounded-md">
                      <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Project Name
                          </label>
                          <input
                            type="text"
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            value={project.name}
                            onChange={(e) => handleProjectChange(projIndex, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Technologies Used
                          </label>
                          <input
                            type="text"
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            value={project.technologies}
                            onChange={(e) => handleProjectChange(projIndex, 'technologies', e.target.value)}
                            placeholder="e.g., Python, React, AWS"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Project Link (Optional)
                          </label>
                          <input
                            type="text"
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            value={project.link}
                            onChange={(e) => handleProjectChange(projIndex, 'link', e.target.value)}
                            placeholder="https://github.com/yourusername/project"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Project Highlights
                        </label>
                        {project.highlights.map((highlight, highlightIndex) => (
                          <div key={highlightIndex} className="mt-2">
                            <textarea
                              rows={2}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                              value={highlight}
                              onChange={(e) => handleProjectHighlightChange(projIndex, highlightIndex, e.target.value)}
                              placeholder="Describe what you accomplished with this project"
                            ></textarea>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addProjectHighlight(projIndex)}
                          className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          + Add Highlight
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addProject}
                    className="mt-4 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    + Add Another Project
                  </button>
                </div>

                {/* Skills */}
                <div>
                  <h4 className="text-md font-medium text-gray-800">Skills</h4>
                  {manualResumeData.skills.map((skillCat, catIndex) => (
                    <div key={catIndex} className="mt-4 p-4 border border-gray-200 rounded-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Skill Category
                        </label>
                        <input
                          type="text"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          value={skillCat.category}
                          onChange={(e) => handleSkillCategoryChange(catIndex, e.target.value)}
                          placeholder="e.g., Technical, Languages, Soft Skills"
                        />
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Skills
                        </label>
                        <div className="mt-2 grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-2">
                          {skillCat.skills.map((skill, skillIndex) => (
                            <input
                              key={skillIndex}
                              type="text"
                              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              value={skill}
                              onChange={(e) => handleSkillChange(catIndex, skillIndex, e.target.value)}
                              placeholder="Enter a skill"
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addSkill(catIndex)}
                          className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          + Add Skill
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addSkillCategory}
                    className="mt-4 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    + Add Skill Category
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? "Creating Account..." : "Register"}
            </button>
          </div>
          <div className="text-sm text-center">
            <p>
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;