// ResumeYamlModal.js - Complete fixed version with objective toggle
import React, { useState, useEffect, useRef } from 'react';
import yaml from 'js-yaml';
import { Document, Page, Text, View, StyleSheet, PDFViewer, Font, Link } from '@react-pdf/renderer';

Font.register({
  family: 'Calibri',
  fonts: [
    { src: '/fonts/calibri.ttf' },
    { src: '/fonts/calibrib.ttf', fontWeight: 'bold' },
    { src: '/fonts/calibrii.ttf', fontStyle: 'italic' },
  ]
});

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

const ResumeDocument = ({ data }) => {
  // Debug: Log the data to see what we're getting
  console.log('ResumeDocument received data:', data);
  console.log('Objective value:', data.objective);
  console.log('Objective type:', typeof data.objective);
  console.log('Objective is null/undefined:', data.objective == null);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        {data.basic && (
          <>
            <Text style={styles.header}>{data.basic.name || 'Your Name'}</Text>
            <Text style={styles.contact}>
              {[data.basic.email, data.basic.phone, ...(data.basic.websites || [])].filter(Boolean).join(' | ')}
            </Text>
          </>
        )}

        {/* Objective Section - Only show if exists and has content */}
        {data.objective && data.objective.trim() && (
          <>
            <Text style={styles.sectionTitle}>Objective</Text>
            <Text style={styles.textNormal}>{data.objective}</Text>
          </>
        )}

        {/* Experience Section */}
        {data.experiences && data.experiences.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Experience</Text>
            {data.experiences.map((exp, idx) => (
              <View key={idx} style={styles.jobBlock}>
                <View style={styles.row}>
                  <Text style={{ fontWeight: 'bold' }}>{exp.company || 'Company Name'}</Text>
                  <Text>{exp.titles?.[0]?.startdate} - {exp.titles?.[0]?.enddate}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.jobTitle}>{exp.titles?.[0]?.name || exp.titles?.[0]?.title}</Text>
                  <Text style={styles.jobTitle}>{exp.location}</Text>
                </View>
                {exp.highlights?.map((point, i) => (
                  <Text key={i} style={styles.bullet}>• {point}</Text>
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

        {/* Education Section */}
        {data.education && data.education.length > 0 && (
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

        {/* Skills Section */}
        {data.skills && data.skills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Skills</Text>
            {data.skills.map((s, idx) => (
              <Text key={idx} style={styles.textNormal}>
                <Text style={{ fontWeight: 'bold' }}>{s.category}:</Text> {s.skills.join(', ')}
              </Text>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
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

const ResumeYamlModal = ({ yamlContent, onSave, onClose }) => {
  const [resumeData, setResumeData] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const modalRef = useRef(null);
  const [showYamlView, setShowYamlView] = useState(false);
  const [yamlString, setYamlString] = useState('');
  const [includeObjective, setIncludeObjective] = useState(true);

  useEffect(() => {
    if (yamlContent) {
      try {
        const parsed = yaml.load(yamlContent);
        console.log('Parsed YAML data:', parsed);
        console.log('Objective in parsed data:', parsed.objective);

        setResumeData(parsed);
        setYamlString(yamlContent);
        // Set objective inclusion based on whether objective exists and has content
        setIncludeObjective(parsed.objective && parsed.objective.trim() !== '');
      } catch (err) {
        console.error("Error parsing YAML:", err);
      }
    }

    const handleEscape = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [yamlContent, onClose]);

  const updateYamlString = (newData) => {
    try {
      console.log('Updating YAML with data:', newData);
      console.log('Objective in new data:', newData.objective);

      const newYaml = yaml.dump(newData, { lineWidth: -1, noRefs: true });
      console.log('Generated YAML:', newYaml);

      setYamlString(newYaml);
    } catch (err) {
      console.error("Error generating YAML:", err);
    }
  };

  // Basic information handlers
  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    const newData = {
      ...resumeData,
      basic: {
        ...resumeData.basic,
        [name]: value
      }
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const handleWebsiteChange = (index, value) => {
    const websites = [...(resumeData.basic?.websites || [])];
    websites[index] = value;

    const newData = {
      ...resumeData,
      basic: {
        ...resumeData.basic,
        websites
      }
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const removeWebsite = (index) => {
    const websites = [...(resumeData.basic?.websites || [])];
    websites.splice(index, 1);

    const newData = {
      ...resumeData,
      basic: {
        ...resumeData.basic,
        websites
      }
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const addWebsite = () => {
    const websites = [...(resumeData.basic?.websites || []), ""];

    const newData = {
      ...resumeData,
      basic: {
        ...resumeData.basic,
        websites
      }
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  // Objective handler with better debugging
  const handleObjectiveChange = (e) => {
    const objectiveValue = e.target.value;
    console.log('Objective changed to:', objectiveValue);

    const newData = {
      ...resumeData,
      objective: objectiveValue
    };

    console.log('New resume data with objective:', newData);
    setResumeData(newData);
    updateYamlString(newData);
  };

  // Education handlers
  const handleEducationChange = (schoolIndex, field, value) => {
    const schools = [...(resumeData.education || [])];
    schools[schoolIndex] = {
      ...schools[schoolIndex],
      [field]: value
    };

    const newData = {
      ...resumeData,
      education: schools
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const removeEducation = (schoolIndex) => {
    const schools = [...(resumeData.education || [])];
    schools.splice(schoolIndex, 1);

    const newData = {
      ...resumeData,
      education: schools
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const addEducation = () => {
    const schools = [...(resumeData.education || []), {
      school: "",
      degrees: [{
        names: [""],
        dates: ""
      }]
    }];

    const newData = {
      ...resumeData,
      education: schools
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const handleDegreeChange = (schoolIndex, degreeIndex, field, value) => {
    const schools = [...(resumeData.education || [])];
    if (!schools[schoolIndex].degrees[degreeIndex]) {
      schools[schoolIndex].degrees[degreeIndex] = {};
    }
    schools[schoolIndex].degrees[degreeIndex] = {
      ...schools[schoolIndex].degrees[degreeIndex],
      [field]: value
    };

    const newData = {
      ...resumeData,
      education: schools
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const handleDegreeNameChange = (schoolIndex, degreeIndex, nameIndex, value) => {
    const schools = [...(resumeData.education || [])];
    const names = [...(schools[schoolIndex].degrees[degreeIndex].names || [])];
    names[nameIndex] = value;
    schools[schoolIndex].degrees[degreeIndex].names = names;

    const newData = {
      ...resumeData,
      education: schools
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  // Experience handlers
  const handleExperienceChange = (expIndex, field, value) => {
    const experiences = [...(resumeData.experiences || [])];
    experiences[expIndex] = {
      ...experiences[expIndex],
      [field]: value
    };

    const newData = {
      ...resumeData,
      experiences
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const removeExperience = (expIndex) => {
    const experiences = [...(resumeData.experiences || [])];
    experiences.splice(expIndex, 1);

    const newData = {
      ...resumeData,
      experiences
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const addExperience = () => {
    const experiences = [...(resumeData.experiences || []), {
      company: "",
      location: "",
      titles: [{
        name: "",
        startdate: "",
        enddate: ""
      }],
      highlights: [""]
    }];

    const newData = {
      ...resumeData,
      experiences
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const handleTitleChange = (expIndex, titleIndex, field, value) => {
    const experiences = [...(resumeData.experiences || [])];
    experiences[expIndex].titles[titleIndex] = {
      ...experiences[expIndex].titles[titleIndex],
      [field]: value
    };

    const newData = {
      ...resumeData,
      experiences
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const handleHighlightChange = (expIndex, highlightIndex, value) => {
    const experiences = [...(resumeData.experiences || [])];
    experiences[expIndex].highlights[highlightIndex] = value;

    const newData = {
      ...resumeData,
      experiences
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const removeHighlight = (expIndex, highlightIndex) => {
    const experiences = [...(resumeData.experiences || [])];
    experiences[expIndex].highlights.splice(highlightIndex, 1);

    const newData = {
      ...resumeData,
      experiences
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const addHighlight = (expIndex) => {
    const experiences = [...(resumeData.experiences || [])];
    experiences[expIndex].highlights.push("");

    const newData = {
      ...resumeData,
      experiences
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  // Skills handlers
  const handleSkillCategoryChange = (catIndex, value) => {
    const skills = [...(resumeData.skills || [])];
    skills[catIndex].category = value;

    const newData = {
      ...resumeData,
      skills
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const removeSkillCategory = (catIndex) => {
    const skills = [...(resumeData.skills || [])];
    skills.splice(catIndex, 1);

    const newData = {
      ...resumeData,
      skills
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const addSkillCategory = () => {
    const skills = [...(resumeData.skills || []), {
      category: "",
      skills: [""]
    }];

    const newData = {
      ...resumeData,
      skills
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const handleSkillChange = (catIndex, skillIndex, value) => {
    const skills = [...(resumeData.skills || [])];
    skills[catIndex].skills[skillIndex] = value;

    const newData = {
      ...resumeData,
      skills
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const removeSkill = (catIndex, skillIndex) => {
    const skills = [...(resumeData.skills || [])];
    skills[catIndex].skills.splice(skillIndex, 1);

    const newData = {
      ...resumeData,
      skills
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const addSkill = (catIndex) => {
    const skills = [...(resumeData.skills || [])];
    skills[catIndex].skills.push("");

    const newData = {
      ...resumeData,
      skills
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  // Project handlers
  const handleProjectChange = (projIndex, field, value) => {
    const projects = [...(resumeData.projects || [])];
    projects[projIndex] = {
      ...projects[projIndex],
      [field]: value
    };

    const newData = {
      ...resumeData,
      projects
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const removeProject = (projIndex) => {
    const projects = [...(resumeData.projects || [])];
    projects.splice(projIndex, 1);

    const newData = {
      ...resumeData,
      projects
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const addProject = () => {
    const projects = [...(resumeData.projects || []), {
      name: "",
      technologies: "",
      link: "",
      highlights: [""]
    }];

    const newData = {
      ...resumeData,
      projects
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const handleProjectHighlightChange = (projIndex, highlightIndex, value) => {
    const projects = [...(resumeData.projects || [])];
    projects[projIndex].highlights[highlightIndex] = value;

    const newData = {
      ...resumeData,
      projects
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const removeProjectHighlight = (projIndex, highlightIndex) => {
    const projects = [...(resumeData.projects || [])];
    projects[projIndex].highlights.splice(highlightIndex, 1);

    const newData = {
      ...resumeData,
      projects
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const addProjectHighlight = (projIndex) => {
    const projects = [...(resumeData.projects || [])];
    projects[projIndex].highlights.push("");

    const newData = {
      ...resumeData,
      projects
    };
    setResumeData(newData);
    updateYamlString(newData);
  };

  const handleSave = () => {
    if (resumeData) {
      console.log('Saving resume data:', resumeData);
      console.log('Saving YAML string:', yamlString);
      onSave(yamlString, resumeData);
      onClose();
    }
  };

  const handleBackgroundClick = (e) => e.target === modalRef.current && onClose();

  if (!resumeData) return null;

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto" onClick={handleBackgroundClick}>
      <div className="bg-white rounded-lg shadow-xl w-[80%] h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">Resume Editor</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowYamlView(!showYamlView)}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              {showYamlView ? "Form View" : "YAML View"}
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Save Changes
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("basic")}
                className={`${
                  activeTab === "basic"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab("objective")}
                className={`${
                  activeTab === "objective"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                Objective
              </button>
              <button
                onClick={() => setActiveTab("education")}
                className={`${
                  activeTab === "education"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                Education
              </button>
              <button
                onClick={() => setActiveTab("experience")}
                className={`${
                  activeTab === "experience"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                Experience
              </button>
              <button
                onClick={() => setActiveTab("projects")}
                className={`${
                  activeTab === "projects"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                Projects
              </button>
              <button
                onClick={() => setActiveTab("skills")}
                className={`${
                  activeTab === "skills"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                Skills
              </button>
              <div className="flex-grow"></div>
              <button
                onClick={() => setShowYamlView(!showYamlView)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {showYamlView ? "Form View" : "YAML View"}
              </button>
            </nav>
          </div>

          {/* Main Area - Split between edit and preview */}
          <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
            {/* Editor Panel - 50% width */}
            <div className="col-span-1 border rounded overflow-hidden">
              {showYamlView ? (
                <textarea
                  value={yamlString}
                  onChange={(e) => {
                    setYamlString(e.target.value);
                    try {
                      const parsed = yaml.load(e.target.value);
                      setResumeData(parsed);
                    } catch {}
                  }}
                  className="w-full h-full p-4 border-0 font-mono text-sm resize-none focus:outline-none focus:ring-0"
                  placeholder="YAML content here..."
                />
              ) : (
                <div className="h-full overflow-y-auto p-4 bg-white">
                  {/* Basic Information */}
                  {activeTab === "basic" && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900">Basic Information</h4>

                      <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            value={resumeData.basic?.name || ""}
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
                            value={resumeData.basic?.address || ""}
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
                            value={resumeData.basic?.email || ""}
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
                            value={resumeData.basic?.phone || ""}
                            onChange={handleBasicInfoChange}
                          />
                        </div>
                      </div>

                      {/* Websites */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Websites/Profiles
                        </label>
                        {(resumeData.basic?.websites || []).map((website, index) => (
                          <div key={index} className="flex items-center mt-2">
                            <input
                              type="text"
                              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              value={website}
                              onChange={(e) => handleWebsiteChange(index, e.target.value)}
                              placeholder="https://yourwebsite.com"
                            />
                            <DeleteButton onClick={() => removeWebsite(index)} />
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
                  )}

                  {/* Objective Tab */}
                  {activeTab === "objective" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-medium text-gray-900">Professional Objective</h4>
                                                  <div className="flex items-center">
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                checked={includeObjective}
                                onChange={(e) => {
                                  const shouldInclude = e.target.checked;
                                  setIncludeObjective(shouldInclude);

                                  const newData = {
                                    ...resumeData,
                                    objective: shouldInclude ? (resumeData.objective || "") : undefined
                                  };
                                  setResumeData(newData);
                                  updateYamlString(newData);
                                }}
                              />
                              <span className="ml-2 text-sm font-medium text-gray-700">Include in resume</span>
                            </label>
                          </div>
                        </div>

                        {/* Debug info - remove in production */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                          <strong>Debug Info:</strong>
                          <br />Include objective: {includeObjective.toString()}
                          <br />Current objective value: "{resumeData.objective}"
                          <br />Type: {typeof resumeData.objective}
                          <br />Is empty: {!resumeData.objective || resumeData.objective.trim() === ''}
                        </div>

                        <div className={includeObjective ? '' : 'opacity-50'}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Professional Summary/Objective
                          </label>
                          <p className="text-sm text-gray-500 mb-3">
                            Write a brief 2-3 sentence summary of your professional background, key skills, and career goals.
                            This should be tailored to the specific job you're applying for.
                          </p>
                          <textarea
                            rows={6}
                            disabled={!includeObjective}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="Example: Experienced software engineer with 5+ years in full-stack development seeking to leverage expertise in React and Node.js to contribute to innovative web applications at a fast-growing technology company."
                            value={includeObjective ? (resumeData.objective || "") : ""}
                            onChange={handleObjectiveChange}
                          />
                          <div className="mt-2 text-sm text-gray-500">
                            Characters: {includeObjective ? (resumeData.objective || "").length : 0} / 500 (recommended max)
                          </div>
                        </div>

                        {/* Tips section */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-md">
                          <h5 className="font-medium text-gray-900 mb-2">💡 Tips for a Strong Objective:</h5>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Keep it concise (2-3 sentences)</li>
                            <li>• Include your years of experience</li>
                            <li>• Mention 2-3 key skills relevant to the job</li>
                            <li>• State what type of role you're seeking</li>
                            <li>• Tailor it to the specific company/position</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {activeTab === "education" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-medium text-gray-900">Education</h4>
                          <button
                            type="button"
                            onClick={addEducation}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            + Add Education
                          </button>
                        </div>

                        {(resumeData.education || []).map((school, schoolIndex) => (
                          <div key={schoolIndex} className="mt-4 p-4 border border-gray-200 rounded-md relative">
                            <button
                              type="button"
                              onClick={() => removeEducation(schoolIndex)}
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                School/University
                              </label>
                              <input
                                type="text"
                                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                value={school.school || ""}
                                onChange={(e) => handleEducationChange(schoolIndex, 'school', e.target.value)}
                              />
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
                                      value={degree.gpa || ""}
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
                                      value={degree.dates || ""}
                                      onChange={(e) => handleDegreeChange(schoolIndex, degreeIndex, 'dates', e.target.value)}
                                      placeholder="e.g., August 2021-May 2023"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Experience */}
                    {activeTab === "experience" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-medium text-gray-900">Work Experience</h4>
                          <button
                            type="button"
                            onClick={addExperience}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            + Add Experience
                          </button>
                        </div>

                        {(resumeData.experiences || []).map((exp, expIndex) => (
                          <div key={expIndex} className="mt-4 p-4 border border-gray-200 rounded-md relative">
                            <button
                              type="button"
                              onClick={() => removeExperience(expIndex)}
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Company
                                </label>
                                <input
                                  type="text"
                                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                  value={exp.company || ""}
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
                                  value={exp.location || ""}
                                  onChange={(e) => handleExperienceChange(expIndex, 'location', e.target.value)}
                                />
                              </div>
                            </div>

                            {(exp.titles || []).map((title, titleIndex) => (
                              <div key={titleIndex} className="mt-4">
                                <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-3 sm:gap-x-4">
                                  <div className="sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Job Title
                                    </label>
                                    <input
                                      type="text"
                                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                      value={title.name || title.title || ""}
                                      onChange={(e) => handleTitleChange(expIndex, titleIndex, 'name', e.target.value)}
                                    />
                                  </div>
                                  <div className="sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Start Date
                                    </label>
                                    <input
                                      type="text"
                                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                      value={title.startdate || ""}
                                      onChange={(e) => handleTitleChange(expIndex, titleIndex, 'startdate', e.target.value)}
                                      placeholder="January 2023"
                                    />
                                  </div>
                                  <div className="sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                      End Date
                                    </label>
                                    <input
                                      type="text"
                                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                      value={title.enddate || ""}
                                      onChange={(e) => handleTitleChange(expIndex, titleIndex, 'enddate', e.target.value)}
                                      placeholder="Present"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}

                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Highlights/Responsibilities
                              </label>
                              {(exp.highlights || []).map((highlight, highlightIndex) => (
                                <div key={highlightIndex} className="mt-2 flex items-center">
                                  <textarea
                                    rows={2}
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                                    value={highlight}
                                    onChange={(e) => handleHighlightChange(expIndex, highlightIndex, e.target.value)}
                                    placeholder="Describe an achievement or responsibility"
                                  />
                                  <DeleteButton onClick={() => removeHighlight(expIndex, highlightIndex)} />
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
                      </div>
                    )}

                    {/* Projects */}
                    {activeTab === "projects" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-medium text-gray-900">Projects</h4>
                          <button
                            type="button"
                            onClick={addProject}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            + Add Project
                          </button>
                        </div>

                        {(resumeData.projects || []).map((project, projIndex) => (
                          <div key={projIndex} className="mt-4 p-4 border border-gray-200 rounded-md relative">
                            <button
                              type="button"
                              onClick={() => removeProject(projIndex)}
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Project Name
                                </label>
                                <input
                                  type="text"
                                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                  value={project.name || ""}
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
                                  value={project.technologies || ""}
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
                                  value={project.link || ""}
                                  onChange={(e) => handleProjectChange(projIndex, 'link', e.target.value)}
                                  placeholder="https://github.com/yourusername/project"
                                />
                              </div>
                            </div>

                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Project Highlights
                              </label>
                              {(project.highlights || []).map((highlight, highlightIndex) => (
                                <div key={highlightIndex} className="mt-2 flex items-center">
                                  <textarea
                                    rows={2}
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                                    value={highlight}
                                    onChange={(e) => handleProjectHighlightChange(projIndex, highlightIndex, e.target.value)}
                                    placeholder="Describe what you accomplished with this project"
                                  />
                                  <DeleteButton onClick={() => removeProjectHighlight(projIndex, highlightIndex)} />
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
                      </div>
                    )}

                    {/* Skills */}
                    {activeTab === "skills" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-medium text-gray-900">Skills</h4>
                          <button
                            type="button"
                            onClick={addSkillCategory}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            + Add Skill Category
                          </button>
                        </div>

                        {(resumeData.skills || []).map((skillCat, catIndex) => (
                          <div key={catIndex} className="mt-4 p-4 border border-gray-200 rounded-md relative">
                            <button
                              type="button"
                              onClick={() => removeSkillCategory(catIndex)}
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Skill Category
                              </label>
                              <input
                                type="text"
                                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                value={skillCat.category || ""}
                                onChange={(e) => handleSkillCategoryChange(catIndex, e.target.value)}
                                placeholder="e.g., Technical, Languages, Soft Skills"
                              />
                            </div>

                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Skills
                              </label>
                              <div className="mt-2 grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-2">
                                {(skillCat.skills || []).map((skill, skillIndex) => (
                                  <div key={skillIndex} className="flex items-center">
                                    <input
                                      type="text"
                                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                      value={skill}
                                      onChange={(e) => handleSkillChange(catIndex, skillIndex, e.target.value)}
                                      placeholder="Enter a skill"
                                    />
                                    <DeleteButton onClick={() => removeSkill(catIndex, skillIndex)} />
                                  </div>
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
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Panel - 50% width */}
              <div className="col-span-1 border rounded bg-gray-100 overflow-hidden">
                {resumeData && (
                  <PDFViewer width="100%" height="100%" className="rounded">
                    <ResumeDocument data={resumeData} />
                  </PDFViewer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  export default ResumeYamlModal;