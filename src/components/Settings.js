// src/components/Settings.js - Refactored using reusable components and hooks
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import yaml from "js-yaml";
import { useResumeData, useDragAndDrop } from "../hooks/useResumeData";
import {
  DeleteButton,
  DraggableItem,
  BasicInfoForm,
  ProfessionalSummaryForm,
  HighlightItem,
  AddButton,
  SectionHeader,
  DragHandle
} from "./resume/ResumeFormComponents";

/**
 * Curated list of current GPT models (text/multimodal general models).
 * Source: OpenAI docs & announcements (GPT-5, GPT-4.1 family, GPT-4o family).
 * Keep this centralized so we can update easily.
 */
const GPT_MODELS = [
  { id: "gpt-5", label: "GPT-5 (flagship)" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  // GPT-4.1 Nano exists but is typically for on-device / constrained scenarios—omit unless you support it.
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
];

function Settings() {
  const { currentUser, getUserSettings, updateUserSettings } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("account");
  const [resumeFile, setResumeFile] = useState(null);

  // Account settings form data
  const [formData, setFormData] = useState({
    openaiApiKey: "",
    settings: {
      model: "gpt-5", // NEW: default to GPT-5 (will be overwritten by Firestore if present)
      selenium: {
        headless: true
      },
      cache: {
        job_cache_size: 1000,
        search_cache_size: 100
      },
      resume: {
        include_objective: false
      }
    }
  });

  // Use custom hooks for resume data and drag & drop
  const resumeHook = useResumeData();
  const { resumeData, setResumeData } = resumeHook;
  const dragHook = useDragAndDrop(resumeData, setResumeData);

  useEffect(() => {
    async function loadUserSettings() {
      try {
        const settings = await getUserSettings();
        if (settings) {
          setFormData({
            openaiApiKey: settings.openaiApiKey || "",
            settings: {
              model: settings.settings?.model || "gpt-5", // NEW: read model from Firestore
              selenium: {
                headless: settings.settings?.selenium?.headless ?? true
              },
              cache: {
                job_cache_size: settings.settings?.cache?.job_cache_size ?? 1000,
                search_cache_size: settings.settings?.cache?.search_cache_size ?? 100
              },
              resume: {
                include_objective: settings.settings?.resume?.include_objective ?? true
              }
            }
          });
        }

        if (currentUser) {
          const resumeRef = doc(db, "resumes", currentUser.uid);
          const resumeSnap = await getDoc(resumeRef);
          if (resumeSnap.exists()) {
            const data = resumeSnap.data();
            setResumeData(data);
          }
        }
      } catch (err) {
        setError("Failed to load settings: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUserSettings();
  }, [getUserSettings, currentUser, setResumeData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "model") {
      // NEW: handle model select changes
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          model: value
        }
      }));
      return;
    }

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
            [name]: parseInt(value, 10)
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

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const yamlContent = event.target.result;
        const parsedData = yaml.load(yamlContent);
        setResumeData(parsedData);
        setError("");
        setSuccess("Resume file loaded successfully!");
      } catch (err) {
        setError("Failed to parse resume file: " + err.message);
      }
    };
    reader.onerror = () => {
      setError("Failed to read resume file");
    };
    reader.readAsText(file);
  };

  const exportResumeYaml = () => {
    try {
      const yamlContent = resumeHook.exportToYaml();
      if (!yamlContent) {
        setError("Failed to export resume");
        return;
      }
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

      // Persist to Firestore:
      await updateUserSettings({
        openaiApiKey: formData.openaiApiKey,
        settings: formData.settings
      });

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

  if (loading && !resumeData.basic?.name) {
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
                    {/* NEW: Model picker */}
                    <div>
                      <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                        Default GPT Model
                      </label>
                      <select
                        id="model"
                        name="model"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        value={formData.settings.model}
                        onChange={handleInputChange}
                      >
                        {GPT_MODELS.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                      <p className="mt-2 text-sm text-gray-500">
                        This model will be used by default when generating resumes or analyzing jobs.
                      </p>
                    </div>

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
                <div className="bg-gray-50 rounded-lg">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
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
                      <p className="mt-2 text-sm text-green-600">
                        Resume successfully loaded: {resumeFile.name}
                      </p>
                    )}
                  </div>

                  {/* Basic Information */}
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="text-md font-medium text-gray-800 mb-4">Basic Information</h4>
                    <BasicInfoForm
                      basicData={resumeData.basic}
                      onBasicInfoChange={resumeHook.handleBasicInfoChange}
                      onWebsiteChange={resumeHook.handleWebsiteChange}
                      onAddWebsite={resumeHook.addWebsite}
                      onRemoveWebsite={resumeHook.removeWebsite}
                      size="sm"
                    />
                  </div>

                  {/* Professional Summary */}
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="text-md font-medium text-gray-800 mb-4">Professional Summary</h4>
                    <ProfessionalSummaryForm
                      objective={resumeData.objective}
                      onObjectiveChange={resumeHook.handleObjectiveChange}
                      size="sm"
                      showToggle={false}
                    />
                  </div>

                  {/* Generation Preferences */}
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="text-md font-medium text-gray-800 mb-4">Generation Preferences</h4>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="include_objective"
                            name="include_objective"
                            type="checkbox"
                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            checked={formData.settings?.resume?.include_objective ?? true}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  resume: {
                                    ...prev.settings.resume,
                                    include_objective: e.target.checked
                                  }
                                }
                              }));
                            }}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="include_objective" className="font-medium text-gray-700">
                            Always Include Objective Section
                          </label>
                          <p className="text-gray-500 mt-1">
                            When enabled, generated resumes will always include an objective/summary section. When disabled, the objective section will be omitted.
                            {resumeData.objective && resumeData.objective.trim().length > 0 && (
                              <span className="block mt-1 text-blue-600">
                                ✓ You have an objective in your resume template
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Education / Experience / Projects / Skills — unchanged below */}
                  {/* ... keep your existing sections exactly as they were ... */}

                  {/* Education */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-800">Education</h4>
                      <AddButton onClick={resumeHook.addEducation} size="sm">
                        + Add Education
                      </AddButton>
                    </div>

                    {(resumeData.education || []).length > 1 && (
                      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded mb-4">
                        💡 Drag the grip handle to reorder entries
                      </div>
                    )}

                    {(resumeData.education || []).map((school, schoolIndex) => (
                      <DraggableItem
                        key={schoolIndex}
                        onDragStart={(e) => dragHook.handleDragStart(e, 'education', schoolIndex)}
                        onDragEnd={dragHook.handleDragEnd}
                        onDragOver={dragHook.handleDragOver}
                        onDrop={(e) => dragHook.handleDrop(e, 'education', schoolIndex)}
                        isDragging={dragHook.draggedItem?.type === 'education' && dragHook.draggedItem?.sectionIndex === schoolIndex}
                        className="mt-4 p-4 border border-gray-200 rounded-md relative hover:shadow-sm transition-shadow"
                        enableDrag={(resumeData.education || []).length > 1}
                      >
                        {(resumeData.education || []).length > 1 && (
                          <div className="absolute top-2 left-2">
                            <DragHandle />
                          </div>
                        )}
                        {(resumeData.education || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => resumeHook.removeEducation(schoolIndex)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        <div className={(resumeData.education || []).length > 1 ? "ml-8" : ""}>
                          <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                School/University
                              </label>
                              <input
                                type="text"
                                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                value={school.school || ""}
                                onChange={(e) => resumeHook.handleEducationChange(schoolIndex, 'school', e.target.value)}
                              />
                            </div>
                          </div>

                          {(school.degrees || []).map((degree, degreeIndex) => (
                            <div key={degreeIndex} className="mt-4 pl-4 border-l-2 border-gray-200">
                              <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">
                                    Degree
                                  </label>
                                  <input
                                    type="text"
                                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                    value={(degree.names && degree.names[0]) || ""}
                                    onChange={(e) => resumeHook.handleDegreeNameChange(schoolIndex, degreeIndex, 0, e.target.value)}
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
                                    value={degree.gpa || ""}
                                    onChange={(e) => resumeHook.handleDegreeChange(schoolIndex, degreeIndex, 'gpa', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">
                                    Dates
                                  </label>
                                  <input
                                    type="text"
                                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                    value={degree.dates || ""}
                                    onChange={(e) => resumeHook.handleDegreeChange(schoolIndex, degreeIndex, 'dates', e.target.value)}
                                    placeholder="e.g., August 2021-May 2023"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DraggableItem>
                    ))}
                  </div>

                  {/* Work Experience */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-800">Work Experience</h4>
                      <AddButton onClick={resumeHook.addExperience} size="sm">
                        + Add Experience
                      </AddButton>
                    </div>

                    {(resumeData.experiences || []).length > 1 && (
                      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded mb-4">
                        💡 Drag the grip handle to reorder entries and highlights
                      </div>
                    )}

                    {(resumeData.experiences || []).map((exp, expIndex) => (
                      <DraggableItem
                        key={expIndex}
                        onDragStart={(e) => dragHook.handleDragStart(e, 'experience', expIndex)}
                        onDragEnd={dragHook.handleDragEnd}
                        onDragOver={dragHook.handleDragOver}
                        onDrop={(e) => dragHook.handleDrop(e, 'experience', expIndex)}
                        isDragging={dragHook.draggedItem?.type === 'experience' && dragHook.draggedItem?.sectionIndex === expIndex && dragHook.draggedItem?.itemIndex === null}
                        className="mt-4 p-4 border border-gray-200 rounded-md relative hover:shadow-sm transition-shadow"
                        enableDrag={(resumeData.experiences || []).length > 1}
                      >
                        {(resumeData.experiences || []).length > 1 && (
                          <div className="absolute top-2 left-2">
                            <DragHandle />
                          </div>
                        )}
                        {(resumeData.experiences || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => resumeHook.removeExperience(expIndex)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        <div className={(resumeData.experiences || []).length > 1 ? "ml-8" : ""}>
                          <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Company
                              </label>
                              <input
                                type="text"
                                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                value={exp.company || ""}
                                onChange={(e) => resumeHook.handleExperienceChange(expIndex, 'company', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Location
                              </label>
                              <input
                                type="text"
                                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                value={exp.location || ""}
                                onChange={(e) => resumeHook.handleExperienceChange(expIndex, 'location', e.target.value)}
                              />
                            </div>
                          </div>

                          {(exp.titles || []).map((title, titleIndex) => (
                            <div key={titleIndex} className="mt-4">
                              <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">
                                    Job Title
                                  </label>
                                  <input
                                    type="text"
                                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                    value={title.name || ""}
                                    onChange={(e) => resumeHook.handleTitleChange(expIndex, titleIndex, 'name', e.target.value)}
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
                                      value={title.startdate || ""}
                                      onChange={(e) => resumeHook.handleTitleChange(expIndex, titleIndex, 'startdate', e.target.value)}
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
                                      value={title.enddate || ""}
                                      onChange={(e) => resumeHook.handleTitleChange(expIndex, titleIndex, 'enddate', e.target.value)}
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
                            {(exp.highlights || []).length > 1 && (
                              <div className="text-xs text-gray-500 mb-2">
                                Drag to reorder highlights
                              </div>
                            )}
                            {(exp.highlights || []).map((highlight, highlightIndex) => (
                              <HighlightItem
                                key={highlightIndex}
                                highlight={highlight}
                                onChange={(e) => resumeHook.handleHighlightChange(expIndex, highlightIndex, e.target.value)}
                                onRemove={() => resumeHook.removeHighlight(expIndex, highlightIndex)}
                                canRemove={(exp.highlights || []).length > 1}
                                placeholder="Describe an achievement or responsibility"
                                size="sm"
                                enableDrag={(exp.highlights || []).length > 1}
                                onDragStart={(e) => dragHook.handleDragStart(e, 'experience', expIndex, highlightIndex)}
                                onDragEnd={dragHook.handleDragEnd}
                                onDragOver={dragHook.handleDragOver}
                                onDrop={(e) => dragHook.handleDrop(e, 'experience', expIndex, highlightIndex)}
                                isDragging={dragHook.draggedItem?.type === 'experience' && dragHook.draggedItem?.sectionIndex === expIndex && dragHook.draggedItem?.itemIndex === highlightIndex}
                              />
                            ))}
                            <AddButton onClick={() => resumeHook.addHighlight(expIndex)} size="sm">
                              + Add Highlight
                            </AddButton>
                          </div>
                        </div>
                      </DraggableItem>
                    ))}
                  </div>

                  {/* Projects */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-800">Projects</h4>
                      <AddButton onClick={resumeHook.addProject} size="sm">
                        + Add Project
                      </AddButton>
                    </div>

                    {(resumeData.projects || []).length > 1 && (
                      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded mb-4">
                        💡 Drag the grip handle to reorder entries and highlights
                      </div>
                    )}

                    {(resumeData.projects || []).map((project, projIndex) => (
                      <DraggableItem
                        key={projIndex}
                        onDragStart={(e) => dragHook.handleDragStart(e, 'project', projIndex)}
                        onDragEnd={dragHook.handleDragEnd}
                        onDragOver={dragHook.handleDragOver}
                        onDrop={(e) => dragHook.handleDrop(e, 'project', projIndex)}
                        isDragging={dragHook.draggedItem?.type === 'project' && dragHook.draggedItem?.sectionIndex === projIndex && dragHook.draggedItem?.itemIndex === null}
                        className="mt-4 p-4 border border-gray-200 rounded-md relative hover:shadow-sm transition-shadow"
                        enableDrag={(resumeData.projects || []).length > 1}
                      >
                        {(resumeData.projects || []).length > 1 && (
                          <div className="absolute top-2 left-2">
                            <DragHandle />
                          </div>
                        )}
                        {(resumeData.projects || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => resumeHook.removeProject(projIndex)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        <div className={(resumeData.projects || []).length > 1 ? "ml-8" : ""}>
                          <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Project Name
                              </label>
                              <input
                                type="text"
                                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                value={project.name || ""}
                                onChange={(e) => resumeHook.handleProjectChange(projIndex, 'name', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Technologies Used
                              </label>
                              <input
                                type="text"
                                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                value={project.technologies || ""}
                                onChange={(e) => resumeHook.handleProjectChange(projIndex, 'technologies', e.target.value)}
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
                                value={project.link || ""}
                                onChange={(e) => resumeHook.handleProjectChange(projIndex, 'link', e.target.value)}
                                placeholder="https://github.com/yourusername/project"
                              />
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">
                              Project Highlights
                            </label>
                            {(project.highlights || []).length > 1 && (
                              <div className="text-xs text-gray-500 mb-2">
                                Drag to reorder highlights
                              </div>
                            )}
                            {(project.highlights || []).map((highlight, highlightIndex) => (
                              <HighlightItem
                                key={highlightIndex}
                                highlight={highlight}
                                onChange={(e) => resumeHook.handleProjectHighlightChange(projIndex, highlightIndex, e.target.value)}
                                onRemove={() => resumeHook.removeProjectHighlight(projIndex, highlightIndex)}
                                canRemove={(project.highlights || []).length > 1}
                                placeholder="Describe what you accomplished with this project"
                                size="sm"
                                enableDrag={(project.highlights || []).length > 1}
                                onDragStart={(e) => dragHook.handleDragStart(e, 'project', projIndex, highlightIndex)}
                                onDragEnd={dragHook.handleDragEnd}
                                onDragOver={dragHook.handleDragOver}
                                onDrop={(e) => dragHook.handleDrop(e, 'project', projIndex, highlightIndex)}
                                isDragging={dragHook.draggedItem?.type === 'project' && dragHook.draggedItem?.sectionIndex === projIndex && dragHook.draggedItem?.itemIndex === highlightIndex}
                              />
                            ))}
                            <AddButton onClick={() => resumeHook.addProjectHighlight(projIndex)} size="sm">
                              + Add Highlight
                            </AddButton>
                          </div>
                        </div>
                      </DraggableItem>
                    ))}
                  </div>

                  {/* Skills */}
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-800">Skills</h4>
                      <AddButton onClick={resumeHook.addSkillCategory} size="sm">
                        + Add Skill Category
                      </AddButton>
                    </div>

                    {(resumeData.skills || []).length > 1 && (
                      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded mb-4">
                        💡 Drag the grip handle to reorder categories and skills
                      </div>
                    )}

                    {(resumeData.skills || []).map((skillCat, catIndex) => (
                      <DraggableItem
                        key={catIndex}
                        onDragStart={(e) => dragHook.handleDragStart(e, 'skill', catIndex)}
                        onDragEnd={dragHook.handleDragEnd}
                        onDragOver={dragHook.handleDragOver}
                        onDrop={(e) => dragHook.handleDrop(e, 'skill', catIndex)}
                        isDragging={dragHook.draggedItem?.type === 'skill' && dragHook.draggedItem?.sectionIndex === catIndex && dragHook.draggedItem?.itemIndex === null}
                        className="mt-4 p-4 border border-gray-200 rounded-md relative hover:shadow-sm transition-shadow"
                        enableDrag={(resumeData.skills || []).length > 1}
                      >
                        {(resumeData.skills || []).length > 1 && (
                          <div className="absolute top-2 left-2">
                            <DragHandle />
                          </div>
                        )}
                        {(resumeData.skills || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => resumeHook.removeSkillCategory(catIndex)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        <div className={(resumeData.skills || []).length > 1 ? "ml-8" : ""}>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Skill Category
                            </label>
                            <input
                              type="text"
                              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              value={skillCat.category || ""}
                              onChange={(e) => resumeHook.handleSkillCategoryChange(catIndex, e.target.value)}
                              placeholder="e.g., Technical, Languages, Soft Skills"
                            />
                          </div>

                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">
                              Skills
                            </label>
                            {(skillCat.skills || []).length > 1 && (
                              <div className="text-xs text-gray-500 mb-2">
                                Drag to reorder skills
                              </div>
                            )}
                            <div className="mt-2 space-y-2">
                              {(skillCat.skills || []).map((skill, skillIndex) => (
                                <DraggableItem
                                  key={skillIndex}
                                  onDragStart={(e) => dragHook.handleDragStart(e, 'skill', catIndex, skillIndex)}
                                  onDragEnd={dragHook.handleDragEnd}
                                  onDragOver={dragHook.handleDragOver}
                                  onDrop={(e) => dragHook.handleDrop(e, 'skill', catIndex, skillIndex)}
                                  isDragging={dragHook.draggedItem?.type === 'skill' && dragHook.draggedItem?.sectionIndex === catIndex && dragHook.draggedItem?.itemIndex === skillIndex}
                                  className="flex items-center bg-gray-50 rounded p-2 hover:bg-gray-100 transition-colors"
                                  enableDrag={(skillCat.skills || []).length > 1}
                                >
                                  {(skillCat.skills || []).length > 1 && (
                                    <div className="mr-2">
                                      <DragHandle />
                                    </div>
                                  )}
                                  <input
                                    type="text"
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                    value={skill}
                                    onChange={(e) => resumeHook.handleSkillChange(catIndex, skillIndex, e.target.value)}
                                    placeholder="Enter a skill"
                                  />
                                  {(skillCat.skills || []).length > 1 && (
                                    <DeleteButton onClick={() => resumeHook.removeSkill(catIndex, skillIndex)} size="sm" />
                                  )}
                                </DraggableItem>
                              ))}
                            </div>
                            <AddButton onClick={() => resumeHook.addSkill(catIndex)} size="sm">
                              + Add Skill
                            </AddButton>
                          </div>
                        </div>
                      </DraggableItem>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
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
