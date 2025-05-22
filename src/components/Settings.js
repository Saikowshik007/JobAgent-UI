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
                            id="