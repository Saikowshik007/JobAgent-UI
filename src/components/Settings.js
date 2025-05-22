// src/components/Settings.js
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import yaml from "js-yaml";

function Settings() {
  const { currentUser, getUserSettings, updateUserSettings } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("account");
  const [resumeFile, setResumeFile] = useState(null);
  const [formData, setFormData] = useState({
    openaiApiKey: "",
    settings: {
      selenium: {
        headless: true
      },
      cache: {
        job_cache_size: 1000,
        search_cache_size: 100
      }
    }
  });

  const [resumeData, setResumeData] = useState({
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

  useEffect(() => {
    async function loadUserSettings() {
      try {
        // Load user settings
        const settings = await getUserSettings();
        if (settings) {
          setFormData({
            openaiApiKey: settings.openaiApiKey || "",
            settings: {
              selenium: {
                headless: settings.settings?.selenium?.headless ?? true
              },
              cache: {
                job_cache_size: settings.settings?.cache?.job_cache_size ?? 1000,
                search_cache_size: settings.settings?.cache?.search_cache_size ?? 100
              }
            }
          });
        }

        // Load resume data
        if (currentUser) {
          const resumeRef = doc(db, "resumes", currentUser.uid);
          const resumeSnap = await getDoc(resumeRef);

          if (resumeSnap.exists()) {
            const resumeData = resumeSnap.data();
            setResumeData(resumeData);
          }
        }
      } catch (err) {
        setError("Failed to load settings: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUserSettings();
  }, [getUserSettings, currentUser]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "headless") {
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          selenium: {
            ...prev.settings.selenium,
            headless: checked
          }
        }
      }));
    } else if (name === "job_cache_size" || name === "search_cache_size") {
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          cache: {
            ...prev.settings.cache,
            [name]: parseInt(value)
          }
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Resume file upload handler
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

  // Basic info handlers
  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setResumeData(prev => ({
      ...prev,
      basic: {
        ...prev.basic,
        [name]: value
      }
    }));
  };

  const handleWebsiteChange = (index, value) => {
    setResumeData(prev => {
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
    setResumeData(prev => ({
      ...prev,
      basic: {
        ...prev.basic,
        websites: [...prev.basic.websites, ""]
      }
    }));
  };

  // Objective handler
  const handleObjectiveChange = (e) => {
    setResumeData(prev => ({
      ...prev,
      objective: e.target.value
    }));
  };

  // Education handlers
  const handleEducationChange = (schoolIndex, field, value) => {
    setResumeData(prev => {
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
    setResumeData(prev => {
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
    setResumeData(prev => {
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
    setResumeData(prev => ({
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
    setResumeData(prev => {
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
    setResumeData(prev => {
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
    setResumeData(prev => {
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
    setResumeData(prev => {
      const experiences = [...prev.experiences];
      experiences[expIndex].highlights[highlightIndex] = value;
      return {
        ...prev,
        experiences
      };
    });
  };

  const addExperience = () => {
    setResumeData(prev => ({
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
    setResumeData(prev => {
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
    setResumeData(prev => {
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
    setResumeData(prev => {
      const projects = [...prev.projects];
      projects[projIndex].highlights[highlightIndex] = value;
      return {
        ...prev,
        projects
      };
    });
  };

  const addProject = () => {
    setResumeData(prev => ({
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
    setResumeData(prev => {
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
    setResumeData(prev => {
      const skills = [...prev.skills];
      skills[catIndex].category = value;
      return {
        ...prev,
        skills
      };
    });
  };

  const handleSkillChange = (catIndex, skillIndex, value) => {
    setResumeData(prev => {
      const skills = [...prev.skills];
      skills[catIndex].skills[skillIndex] = value;
      return {
        ...prev,
        skills
      };
    });
  };

  const addSkillCategory = () => {
    setResumeData(prev => ({
      ...prev,
      skills: [...prev.skills, {
        category: "",
        skills: [""]
      }]
    }));
  };

  const addSkill = (catIndex) => {
    setResumeData(prev => {
      const skills = [...prev.skills];
      skills[catIndex].skills.push("");
      return {
        ...prev,
        skills
      };
    });
  };

  // Delete button component for consistency
  const DeleteButton = ({ onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center w-6 h-6 ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
      title="Remove"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );

  // Remove functions
  const removeWebsite = (index) => {
    setResumeData(prev => {
      const websites = [...prev.basic.websites];
      websites.splice(index, 1);
      return {
        ...prev,
        basic: {
          ...prev.basic,
          websites
        }
      };
    });
  };

  const removeEducation = (schoolIndex) => {
    setResumeData(prev => {
      const schools = [...prev.education];
      schools.splice(schoolIndex, 1);
      return {
        ...prev,
        education: schools
      };
    });
  };

  const removeDegree = (schoolIndex, degreeIndex) => {
    setResumeData(prev => {
      const schools = [...prev.education];
      schools[schoolIndex].degrees.splice(degreeIndex, 1);
      return {
        ...prev,
        education: schools
      };
    });
  };

  const removeExperience = (expIndex) => {
    setResumeData(prev => {
      const experiences = [...prev.experiences];
      experiences.splice(expIndex, 1);
      return {
        ...prev,
        experiences
      };
    });
  };

  const removeHighlight = (expIndex, highlightIndex) => {
    setResumeData(prev => {
      const experiences = [...prev.experiences];
      experiences[expIndex].highlights.splice(highlightIndex, 1);
      return {
        ...prev,
        experiences
      };
    });
  };

  const removeProject = (projIndex) => {
    setResumeData(prev => {
      const projects = [...prev.projects];
      projects.splice(projIndex, 1);
      return {
        ...prev,
        projects
      };
    });
  };

  const removeProjectHighlight = (projIndex, highlightIndex) => {
    setResumeData(prev => {
      const projects = [...prev.projects];
      projects[projIndex].highlights.splice(highlightIndex, 1);
      return {
        ...prev,
        projects
      };
    });
  };

  const removeSkillCategory = (catIndex) => {
    setResumeData(prev => {
      const skills = [...prev.skills];
      skills.splice(catIndex, 1);
      return {
        ...prev,
        skills
      };
    });
  };

  const removeSkill = (catIndex, skillIndex) => {
    setResumeData(prev => {
      const skills = [...prev.skills];
      skills[catIndex].skills.splice(skillIndex, 1);
      return {
        ...prev,
        skills
      };
    });
  };

  // Export resume as YAML
  const exportResumeYaml = () => {
    try {
      const yamlContent = yaml.dump(resumeData);
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.yaml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to export resume: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      // Update user settings
      await updateUserSettings({
        openaiApiKey: formData.openaiApiKey,
        settings: formData.settings
      });

      // Update resume data
      if (currentUser) {
        const resumeRef = doc(db, "resumes", currentUser.uid);
        await setDoc(resumeRef, {
          ...resumeData,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setSuccess("Settings and resume updated successfully!");
    } catch (err) {
      setError("Failed to update settings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !resumeData.basic.name) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <div className="flex justify-center items-center h-64 flex-grow">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />

      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-2xl font-bold text-gray-900">User Settings</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Update your JobTrak configuration and resume.
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-6 mb-4 rounded" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 mx-6 mb-4 rounded" role="alert">
              <span className="block sm:inline">{success}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("account")}
                className={`${
                  activeTab === "account"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm mr-8`}
              >
                Account Settings
              </button>
              <button
                onClick={() => setActiveTab("resume")}
                className={`${
                  activeTab === "resume"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Resume
              </button>
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
            {activeTab === "account" && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">API Keys</h3>

                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-6">
                      <label htmlFor="openaiApiKey" className="block text-sm font-medium text-gray-700">
                        OpenAI API Key (Optional)
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="openaiApiKey"
                          id="openaiApiKey"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={formData.openaiApiKey}
                          onChange={handleInputChange}
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Used for AI-powered features like resume generation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Application Settings</h3>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="headless"
                            name="headless"
                            type="checkbox"
                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            checked={formData.settings.selenium.headless}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="headless" className="font-medium text-gray-700">
                            Headless Browser Mode
                          </label>
                          <p className="text-gray-500">
                            Run browser automation in the background (recommended).
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-3">
                        <label htmlFor="job_cache_size" className="block text-sm font-medium text-gray-700">
                          Job Cache Size
                        </label>
                        <div className="mt-1">
                          <input
                            type="number"
                            name="job_cache_size"
                            id="job_cache_size"
                            min="100"
                            max="5000"
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            value={formData.settings.cache.job_cache_size}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="search_cache_size" className="block text-sm font-medium text-gray-700">
                          Search Cache Size
                        </label>
                        <div className="mt-1">
                          <input
                            type="number"
                            name="search_cache_size"
                            id="search_cache_size"
                            min="10"
                            max="500"
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            value={formData.settings.cache.search_cache_size}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "resume" && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Resume Information</h3>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={exportResumeYaml}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Export YAML
                      </button>
                      <label className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
                        Import YAML
                        <input
                          type="file"
                          accept=".yaml,.yml"
                          className="hidden"
                          onChange={handleResumeUpload}
                        />
                      </label>
                    </div>
                  </div>

                  {resumeFile && (
                    <p className="mt-2 text-sm text-green-600 mb-4">
                      Resume successfully loaded: {resumeFile.name}
                    </p>
                  )}

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
                          value={resumeData.basic.name}
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
                          value={resumeData.basic.address}
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
                          value={resumeData.basic.email}
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
                          value={resumeData.basic.phone}
                          onChange={handleBasicInfoChange}
                        />
                      </div>
                    </div>

                    {/* Websites */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Websites/Profiles
                      </label>
                      {resumeData.basic.websites.map((website, index) => (
                        <div key={index} className="flex items-center mt-2">
                          <input
                            type="text"
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            value={website}
                            onChange={(e) => handleWebsiteChange(index, e.target.value)}
                            placeholder="https://yourwebsite.com"
                          />
                          {resumeData.basic.websites.length > 1 && (
                            <DeleteButton onClick={() => removeWebsite(index)} />
                          )}
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
                  <div className="border-b border-gray-200 py-5">
                    <h4 className="text-md font-medium text-gray-800">Professional Summary</h4>
                    <div className="mt-4">
                      <textarea
                        id="objective"
                        name="objective"
                        rows={4}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                        placeholder="Write a brief summary of your professional background and goals"
                        value={resumeData.objective}
                        onChange={handleObjectiveChange}
                      ></textarea>
                    </div>
                  </div>

                  {/* Education - Abbreviated for space */}
                  <div className="border-b border-gray-200 py-5">
                    <h4 className="text-md font-medium text-gray-800">Education</h4>
                    {resumeData.education.map((school, schoolIndex) => (
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

                  {/* Work Experience - Abbreviated */}
                  <div className="border-b border-gray-200 py-5">
                    <h4 className="text-md font-medium text-gray-800">Work Experience</h4>
                    {resumeData.experiences.map((exp, expIndex) => (
                      <div key={expIndex} className="mt-4 p-4 border border-gray-200 rounded-md relative">
                        {resumeData.experiences.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExperience(expIndex)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
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
                            <div key={highlightIndex} className="mt-2 flex items-center">
                              <textarea
                                rows={2}
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                                value={highlight}
                                onChange={(e) => handleHighlightChange(expIndex, highlightIndex, e.target.value)}
                                placeholder="Describe an achievement or responsibility"
                              ></textarea>
                              {exp.highlights.length > 1 && (
                                <DeleteButton onClick={() => removeHighlight(expIndex, highlightIndex)} />
                              )}
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
                  </div>  </div>

                  {/* Projects - Abbreviated */}
                  <div className="border-b border-gray-200 py-5">
                    <h4 className="text-md font-medium text-gray-800">Projects</h4>
                    {resumeData.projects.map((project, projIndex) => (
                      <div key={projIndex} className="mt-4 p-4 border border-gray-200 rounded-md relative">
                        {resumeData.projects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeProject(projIndex)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
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
                            <div key={highlightIndex} className="mt-2 flex items-center">
                              <textarea
                                rows={2}
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                                value={highlight}
                                onChange={(e) => handleProjectHighlightChange(projIndex, highlightIndex, e.target.value)}
                                placeholder="Describe what you accomplished with this project"
                              ></textarea>
                              {project.highlights.length > 1 && (
                                <DeleteButton onClick={() => removeProjectHighlight(projIndex, highlightIndex)} />
                              )}
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
                  <div className="pt-5">
                    <h4 className="text-md font-medium text-gray-800">Skills</h4>
                    {resumeData.skills.map((skillCat, catIndex) => (
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
              </div>
            )}

            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {loading ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Settings;