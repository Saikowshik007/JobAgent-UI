// src/components/Settings.js - Updated with ChatGPT model selection
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import yaml from "js-yaml";
import { pdf, Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
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

// PDF styles for resume generation
const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: 'Times-Roman',
    lineHeight: 1.3,
  },
  header: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontFamily: 'Times-Roman'
  },
  contact: {
    textAlign: 'center',
    fontSize: 9,
    marginBottom: 5,
    fontFamily: 'Times-Roman'
  },
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
    fontFamily: 'Times-Roman'
  },
  jobBlock: { marginBottom: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  jobTitle: {
    fontStyle: 'italic',
    fontFamily: 'Times-Roman'
  },
  bullet: {
    marginLeft: 8,
    marginBottom: 1,
    fontFamily: 'Times-Roman'
  },
  textNormal: {
    marginBottom: 3,
    fontFamily: 'Times-Roman'
  },
  projectTitle: {
    fontWeight: 'bold',
    color: 'blue',
    textDecoration: 'none',
    fontFamily: 'Times-Roman'
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
    flexWrap: 'wrap'
  },
  projectTech: {
    fontSize: 8,
    fontStyle: 'italic',
    color: '#000000',
    marginLeft: 8,
    marginTop: 1,
    fontFamily: 'Times-Roman'
  },
  boldText: {
    fontWeight: 'bold',
    fontFamily: 'Times-Roman'
  }
});

// Text sanitization function
const sanitizeText = (text) => {
  if (text === null || text === undefined) return '';
  const stringValue = String(text);
  if (!isNaN(text) && !isNaN(parseFloat(text))) {
    return stringValue;
  }
  return stringValue
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/–/g, '-')
    .replace(/—/g, '--')
    .replace(/\u00A0/g, ' ')
    .replace(/\u2022/g, '•')
    .trim();
};

// ResumeDocument component for PDF generation
const ResumeDocument = ({ data, userLocation }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        {data.basic && (
          <>
            <Text style={styles.header}>{sanitizeText(data.basic.name) || 'Your Name'}</Text>
            <Text style={styles.contact}>
              {[
                sanitizeText(data.basic.email),
                sanitizeText(data.basic.phone),
                sanitizeText(data.basic.address || userLocation),
                ...(data.basic.websites || []).map(site => sanitizeText(site))
              ].filter(Boolean).join(' | ')}
            </Text>
          </>
        )}

        {/* Objective Section */}
        {data.objective && typeof data.objective === 'string' && data.objective.trim() && (
          <>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.textNormal}>{sanitizeText(data.objective)}</Text>
          </>
        )}

        {/* Experience Section */}
        {data.experiences && data.experiences.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Experience</Text>
            {data.experiences.map((exp, idx) => (
              <View key={idx} style={styles.jobBlock}>
                <View style={styles.row}>
                  <Text style={styles.boldText}>
                    {sanitizeText(exp.company) || 'Company Name'}
                  </Text>
                  <Text style={{ fontFamily: 'Times-Roman' }}>
                    {sanitizeText(exp.titles?.[0]?.startdate)} - {sanitizeText(exp.titles?.[0]?.enddate)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.jobTitle}>
                    {sanitizeText(exp.titles?.[0]?.name || exp.titles?.[0]?.title)}
                  </Text>
                  <Text style={styles.jobTitle}>{sanitizeText(exp.location)}</Text>
                </View>
                {exp.highlights?.map((point, i) => (
                  <Text key={i} style={styles.bullet}>• {sanitizeText(point)}</Text>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Projects Section */}
        {data.projects && data.projects.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Projects</Text>
            {data.projects.map((proj, idx) => (
              <View key={idx} style={styles.jobBlock}>
                <View style={styles.projectTitleRow}>
                  {proj.link ? (
                    <Link src={sanitizeText(proj.link)} style={styles.projectTitle}>
                      {sanitizeText(proj.name)}
                    </Link>
                  ) : (
                    <Text style={styles.boldText}>
                      {sanitizeText(proj.name)}
                    </Text>
                  )}
                  {proj.technologies && typeof proj.technologies === 'string' && proj.technologies.trim() && (
                    <Text style={styles.projectTech}>({sanitizeText(proj.technologies)})</Text>
                  )}
                </View>
                {proj.highlights?.map((point, i) => (
                  <Text key={i} style={styles.bullet}>• {sanitizeText(point)}</Text>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Education Section */}
        {data.education && data.education.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Education</Text>
            {data.education.map((edu, idx) => (
              <View key={idx} style={styles.jobBlock}>
                <View style={styles.row}>
                  <Text style={styles.boldText}>
                    {sanitizeText(edu.school)}, {sanitizeText(edu.degrees?.[0]?.names?.join(', '))}
                    {edu.degrees?.[0]?.gpa && ` (GPA: ${sanitizeText(edu.degrees[0].gpa)})`}
                  </Text>
                  <Text style={{ fontFamily: 'Times-Roman' }}>
                    {sanitizeText(edu.degrees?.[0]?.dates)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Skills Section */}
        {data.skills && data.skills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Skills</Text>
            {data.skills.map((skillCategory, idx) => {
              if (skillCategory.subcategories) {
                return skillCategory.subcategories.map((subcat, subIdx) => (
                  <Text key={`${idx}-${subIdx}`} style={styles.textNormal}>
                    <Text style={styles.boldText}>
                      {sanitizeText(subcat.name)}:
                    </Text> {(subcat.skills || []).map(skill => sanitizeText(skill)).join(', ')}
                  </Text>
                ));
              }
              else if (skillCategory.skills) {
                return (
                  <Text key={idx} style={styles.textNormal}>
                    <Text style={styles.boldText}>
                      {sanitizeText(skillCategory.category)}:
                    </Text> {skillCategory.skills.map(skill => sanitizeText(skill)).join(', ')}
                  </Text>
                );
              }
              return null;
            })}
          </>
        )}
      </Page>
    </Document>
  );
};

function Settings() {
  const { currentUser, getUserSettings, updateUserSettings } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("account");
  const [resumeFile, setResumeFile] = useState(null);
  const [userLocation, setUserLocation] = useState('');

  // Available ChatGPT models
  const availableModels = [
    { value: "gpt-5", label: "GPT-5 (Latest, Multimodal)", description: "Flagship model for coding, reasoning, and agentic tasks across domains" },
    { value: "gpt-5-mini", label: "GPT-5 Mini (Latest, Multimodal)", description: "A faster, more cost-efficient version of GPT-5 for well-defined tasks" },
    { value: "gpt-4o", label: "GPT-4o (Multimodal)", description: "Most capable model with vision capabilities" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Faster and more cost-effective version of GPT-4o" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo", description: "Previous generation flagship model" },
    { value: "gpt-4", label: "GPT-4", description: "Original GPT-4 model" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", description: "Fast and economical option" }
  ];

  // Account settings form data
  const [formData, setFormData] = useState({
    openaiApiKey: "",
    settings: {
      model: "gpt-4o", // Move model INSIDE settings
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
        // Load user settings
        const settings = await getUserSettings();
        if (settings) {
          setFormData({
            openaiApiKey: settings.openaiApiKey || "",
            settings: {
              model: settings.model || settings.settings?.model || "gpt-4o", // Load model from either location
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

        // Load resume data and user location
        if (currentUser) {
          const resumeRef = doc(db, "resumes", currentUser.uid);
          const resumeSnap = await getDoc(resumeRef);

          if (resumeSnap.exists()) {
            const resumeData = resumeSnap.data();
            setResumeData(resumeData);
          }
        }

        // Load user location
        if (settings && settings.basic && settings.basic.address) {
          setUserLocation(settings.basic.address);
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
      // Handle model INSIDE settings, not at root level
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          model: value  // Model goes in settings
        }
      }));
    } else if (name === "headless") {
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
    } else if (name === "openaiApiKey") {
      // Handle API key at root level
      setFormData(prev => ({
        ...prev,
        openaiApiKey: value  // Root level API key
      }));
    } else {
      // Handle other root-level fields
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

  // Export resume as YAML
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

  // Export resume as PDF with custom filename
  const exportResumePdf = async () => {
    try {
      if (!resumeData || !resumeData.basic) {
        setError("Resume data is not available");
        return;
      }

      // Generate filename: fullname_role.pdf
      const fullName = (resumeData.basic.name || 'resume')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      const role = resumeData.experiences?.[0]?.titles?.[0]?.name ||
                   resumeData.experiences?.[0]?.titles?.[0]?.title ||
                   'professional';

      const roleFormatted = role
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      const filename = `${fullName}_${roleFormatted}.pdf`;

      // Generate PDF blob
      const blob = await pdf(<ResumeDocument data={resumeData} userLocation={userLocation} />).toBlob();

      // Download the PDF
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`Resume downloaded as ${filename}`);
    } catch (err) {
      setError("Failed to export PDF: " + err.message);
      console.error("PDF export error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      console.log('Saving settings to Firebase:', {
        openaiApiKey: formData.openaiApiKey ? `${formData.openaiApiKey.substring(0, 10)}...` : 'NOT SET',
        model: formData.settings.model, // Model is now in settings
        settings: formData.settings
      }); // Debug log

      // Structure the update to save model ONLY in settings, not at root
      const updateData = {
        openaiApiKey: formData.openaiApiKey,  // Root level
        settings: formData.settings,          // This includes model inside settings
        features: {
          advanced_parsing: true,
          batch_operations: true,
          simplify_integration: true,
          custom_templates: true
          // NO model field here
        }
      };;

      console.log('Update data structure:', updateData); // Debug log

      await updateUserSettings(updateData);

      // Update resume data
      if (currentUser) {
        const resumeRef = doc(db, "resumes", currentUser.uid);
        await setDoc(resumeRef, {
          ...resumeData,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setSuccess("Settings and resume updated successfully!");

      // Debug: Load settings back to verify they were saved correctly
      setTimeout(async () => {
        const savedSettings = await getUserSettings();
        console.log('Settings after save (verification):', {
          openaiApiKey: savedSettings?.openaiApiKey ? `${savedSettings.openaiApiKey.substring(0, 10)}...` : 'NOT SET',
          model: savedSettings?.model,
          rootLevelModel: savedSettings?.model,           // Should have value
          featuresModel: savedSettings?.features?.model,  // Should be undefined
          settingsModel: savedSettings?.settings?.model   // Should be undefined
        });
      }, 1000);

    } catch (err) {
      setError("Failed to update settings: " + err.message);
      console.error('Settings save error:', err);
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
                      <h3 className="text-lg font-medium text-gray-900 mb-4">API Configuration</h3>

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
                                placeholder="sk-..."
                            />
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            Used for AI-powered features like resume generation and job analysis.
                          </p>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                            AI Model Selection
                          </label>
                          <div className="mt-1">
                            <select
                                name="model"
                                id="model"
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                value={formData.settings.model}
                                onChange={handleInputChange}
                            >
                              {availableModels.map((model) => (
                                  <option key={model.value} value={model.value}>
                                    {model.label}
                                  </option>
                              ))}
                            </select>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            {availableModels.find(m => m.value === formData.model)?.description ||
                             "Select the ChatGPT model to use for AI-powered features."}
                          </p>
                          <div className="mt-2 text-xs text-gray-400">
                            <strong>Current selection:</strong> {formData.model}
                          </div>
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
                    <div className="bg-gray-50 rounded-lg">
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-gray-900">Resume Information</h3>
                          <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={exportResumePdf}
                                className="inline-flex items-center px-3 py-2 border border-indigo-600 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download PDF
                            </button>
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