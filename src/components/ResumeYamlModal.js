// ResumeYamlModal.js - Updated with location in header
import React, { useState, useEffect, useRef } from 'react';
import yaml from 'js-yaml';
import { Document, Page, Text, View, StyleSheet, PDFViewer, Font, Link } from '@react-pdf/renderer';
import { useResumeData, useDragAndDrop } from '../hooks/useResumeData';
import {
  DragHandle,
  DeleteButton,
  DraggableItem,
  BasicInfoForm,
  ProfessionalSummaryForm,
  HighlightItem,
  AddButton,
  SectionHeader
} from './resume/ResumeFormComponents';

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

const ResumeDocument = ({ data }) => {
  // Build contact information array including location
  const buildContactInfo = () => {
    const contactItems = [];

    // Add email if exists
    if (data.basic?.email) {
      contactItems.push(data.basic.email);
    }

    // Add phone if exists
    if (data.basic?.phone) {
      contactItems.push(data.basic.phone);
    }

    // Add location if exists
    if (data.basic?.address) {
      contactItems.push(data.basic.address);
    }

    // Add websites if they exist
    if (data.basic?.websites && Array.isArray(data.basic.websites)) {
      const validWebsites = data.basic.websites.filter(website => website && website.trim());
      contactItems.push(...validWebsites);
    }

    return contactItems;
  };

  return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          {data.basic && (
              <>
                <Text style={styles.header}>{data.basic.name || 'Your Name'}</Text>
                <Text style={styles.contact}>
                  {buildContactInfo().join(' | ')}
                </Text>
              </>
          )}

          {/* Objective Section - Only show if exists and has content */}
          {data.objective && data.objective.trim() && (
              <>
                <Text style={styles.sectionTitle}>Professional Summary</Text>
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
                      <View style={styles.projectTitleRow}>
                        {proj.link ? (
                            <Link src={proj.link} style={styles.projectTitle}>{proj.name}</Link>
                        ) : (
                            <Text style={{ fontWeight: 'bold' }}>{proj.name}</Text>
                        )}
                        {proj.technologies && proj.technologies.trim() && (
                            <Text style={styles.projectTech}>({proj.technologies})</Text>
                        )}
                      </View>
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
                        <Text style={{ fontWeight: 'bold' }}>
                          {edu.school}, {edu.degrees?.[0]?.names?.join(', ')}
                          {edu.degrees?.[0]?.gpa && ` (GPA: ${edu.degrees?.[0]?.gpa})`}
                        </Text>
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
                {data.skills.map((skillCategory, idx) => {
                  // Handle subcategories structure (Technical skills)
                  if (skillCategory.subcategories) {
                    return skillCategory.subcategories.map((subcat, subIdx) => (
                        <Text key={`${idx}-${subIdx}`} style={styles.textNormal}>
                          <Text style={{ fontWeight: 'bold' }}>{subcat.name}:</Text> {(subcat.skills || []).join(', ')}
                        </Text>
                    ));
                  }
                  // Handle direct skills structure (Non-technical skills)
                  else if (skillCategory.skills) {
                    return (
                        <Text key={idx} style={styles.textNormal}>
                          <Text style={{ fontWeight: 'bold' }}>{skillCategory.category}:</Text> {skillCategory.skills.join(', ')}
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

const ResumeYamlModal = ({ yamlContent, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState("basic");
  const modalRef = useRef(null);
  const [showYamlView, setShowYamlView] = useState(false);
  const [yamlString, setYamlString] = useState('');
  const [includeObjective, setIncludeObjective] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  // Use custom hooks for resume data and drag & drop
  const resumeHook = useResumeData();
  const { resumeData, setResumeData } = resumeHook;
  const dragHook = useDragAndDrop(resumeData, setResumeData);

  useEffect(() => {
    if (yamlContent) {
      try {
        const parsed = yaml.load(yamlContent);
        setResumeData(parsed);
        setYamlString(yamlContent);
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
  }, [yamlContent, onClose, setResumeData]);

  const updateYamlString = (newData) => {
    try {
      const newYaml = yaml.dump(newData, { lineWidth: -1, noRefs: true });
      setYamlString(newYaml);
    } catch (err) {
      console.error("Error generating YAML:", err);
    }
  };

  // Update YAML string whenever resume data changes
  useEffect(() => {
    updateYamlString(resumeData);
  }, [resumeData]);

  const handleSave = () => {
    if (resumeData) {
      onSave(yamlString, resumeData);
      onClose();
    }
  };

  const handleBackgroundClick = (e) => e.target === modalRef.current && onClose();

  if (!resumeData) return null;

  return (
      <div ref={modalRef} className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto" onClick={handleBackgroundClick}>
        <div className="bg-white rounded-lg shadow-xl w-[98%] h-[98vh] flex flex-col max-w-[1600px]" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-2xl font-semibold text-gray-900">Resume Editor</h3>
            <div className="flex items-center space-x-4">
              <button
                  onClick={() => setShowYamlView(!showYamlView)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-medium"
              >
                {showYamlView ? "Form View" : "YAML View"}
              </button>
              <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-medium"
              >
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
              <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Save Changes
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500 p-2">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden p-6 flex flex-col">
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {[
                  { id: "basic", label: "Basic Info" },
                  { id: "objective", label: "Professional Summary" },
                  { id: "education", label: "Education" },
                  { id: "experience", label: "Experience" },
                  { id: "projects", label: "Projects" },
                  { id: "skills", label: "Skills" }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${
                            activeTab === tab.id
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        } whitespace-nowrap py-3 px-2 border-b-2 font-medium text-base`}
                    >
                      {tab.label}
                    </button>
                ))}
              </nav>
            </div>

            {/* Main Area */}
            <div className={`flex-1 ${showPreview ? 'grid grid-cols-5 gap-6' : 'flex'} overflow-hidden`}>
              {/* Editor Panel */}
              <div className={`${showPreview ? 'col-span-2' : 'flex-1'} border rounded overflow-hidden`}>
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
                        className="w-full h-full p-6 border-0 font-mono text-base resize-none focus:outline-none focus:ring-0"
                        placeholder="YAML content here..."
                    />
                ) : (
                    <div className="h-full overflow-y-auto p-8 bg-white">
                      {/* Basic Information */}
                      {activeTab === "basic" && (
                          <div className="space-y-8">
                            <h4 className="text-2xl font-medium text-gray-900">Basic Information</h4>
                            <BasicInfoForm
                                basicData={resumeData.basic}
                                onBasicInfoChange={resumeHook.handleBasicInfoChange}
                                onWebsiteChange={resumeHook.handleWebsiteChange}
                                onAddWebsite={resumeHook.addWebsite}
                                onRemoveWebsite={resumeHook.removeWebsite}
                                size="lg"
                            />
                          </div>
                      )}

                      {/* Objective Tab */}
                      {activeTab === "objective" && (
                          <ProfessionalSummaryForm
                              objective={resumeData.objective}
                              onObjectiveChange={resumeHook.handleObjectiveChange}
                              includeObjective={includeObjective}
                              onIncludeObjectiveChange={(e) => {
                                const shouldInclude = e.target.checked;
                                setIncludeObjective(shouldInclude);
                                const newData = {
                                  ...resumeData,
                                  objective: shouldInclude ? (resumeData.objective || "") : undefined
                                };
                                setResumeData(newData);
                              }}
                              size="lg"
                              showToggle={true}
                          />
                      )}

                      {/* Education */}
                      {activeTab === "education" && (
                          <div className="space-y-8">
                            <SectionHeader
                                title="Education"
                                onAdd={resumeHook.addEducation}
                                addButtonText="+ Add Education"
                                showDragTip={(resumeData.education || []).length > 1}
                                size="lg"
                            />

                            {(resumeData.education || []).map((school, schoolIndex) => (
                                <DraggableItem
                                    key={schoolIndex}
                                    onDragStart={(e) => dragHook.handleDragStart(e, 'education', schoolIndex)}
                                    onDragEnd={dragHook.handleDragEnd}
                                    onDragOver={dragHook.handleDragOver}
                                    onDrop={(e) => dragHook.handleDrop(e, 'education', schoolIndex)}
                                    isDragging={dragHook.draggedItem?.type === 'education' && dragHook.draggedItem?.sectionIndex === schoolIndex}
                                    className="mt-8 p-6 border border-gray-200 rounded-lg relative bg-white hover:shadow-md transition-shadow"
                                >
                                  <div className="absolute top-4 left-4">
                                    <DragHandle />
                                  </div>
                                  <button
                                      type="button"
                                      onClick={() => resumeHook.removeEducation(schoolIndex)}
                                      className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                  <div className="ml-12">
                                    <label className="block text-base font-medium text-gray-700 mb-3">
                                      School/University
                                    </label>
                                    <input
                                        type="text"
                                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm text-base border-gray-300 rounded-lg p-4"
                                        value={school.school || ""}
                                        onChange={(e) => resumeHook.handleEducationChange(schoolIndex, 'school', e.target.value)}
                                    />

                                    {(school.degrees || []).map((degree, degreeIndex) => (
                                        <div key={degreeIndex} className="mt-8 pl-6 border-l-2 border-gray-200">
                                          <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                                            <div>
                                              <label className="block text-base font-medium text-gray-700 mb-3">
                                                Degree
                                              </label>
                                              <input
                                                  type="text"
                                                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm text-base border-gray-300 rounded-lg p-4"
                                                  value={(degree.names && degree.names[0]) || ""}
                                                  onChange={(e) => resumeHook.handleDegreeNameChange(schoolIndex, degreeIndex, 0, e.target.value)}
                                                  placeholder="e.g., B.S. Computer Science"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-base font-medium text-gray-700 mb-3">
                                                GPA (Optional)
                                              </label>
                                              <input
                                                  type="text"
                                                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm text-base border-gray-300 rounded-lg p-4"
                                                  value={degree.gpa || ""}
                                                  onChange={(e) => resumeHook.handleDegreeChange(schoolIndex, degreeIndex, 'gpa', e.target.value)}
                                              />
                                            </div>
                                            <div className="sm:col-span-2">
                                              <label className="block text-base font-medium text-gray-700 mb-3">
                                                Dates
                                              </label>
                                              <input
                                                  type="text"
                                                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm text-base border-gray-300 rounded-lg p-4"
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
                      )}

                      {/* Projects */}
                      {activeTab === "projects" && (
                          <div className="space-y-8">
                            <SectionHeader
                                title="Projects"
                                onAdd={resumeHook.addProject}
                                addButtonText="+ Add Project"
                                showDragTip={(resumeData.projects || []).length > 1}
                                size="lg"
                            />

                            {(resumeData.projects || []).map((project, projIndex) => (
                                <DraggableItem
                                    key={projIndex}
                                    onDragStart={(e) => dragHook.handleDragStart(e, 'project', projIndex)}
                                    onDragEnd={dragHook.handleDragEnd}
                                    onDragOver={dragHook.handleDragOver}
                                    onDrop={(e) => dragHook.handleDrop(e, 'project', projIndex)}
                                    isDragging={dragHook.draggedItem?.type === 'project' && dragHook.draggedItem?.sectionIndex === projIndex && dragHook.draggedItem?.itemIndex === null}
                                    className="mt-8 p-6 border border-gray-200 rounded-lg relative bg-white hover:shadow-md transition-shadow"
                                >
                                  <div className="absolute top-4 left-4">
                                    <DragHandle />
                                  </div>
                                  <button
                                      type="button"
                                      onClick={() => resumeHook.removeProject(projIndex)}
                                      className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>

                                  <div className="ml-12">
                                    {/* Preview of how it will look in PDF */}
                                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                                      <div className="text-sm text-gray-600 mb-2">Preview:</div>
                                      <div className="flex items-baseline flex-wrap">
                                        <span className="font-bold text-blue-600">{project.name || "Project Name"}</span>
                                        {project.technologies && project.technologies.trim() && (
                                            <span className="text-xs text-gray-500 italic ml-2">({project.technologies})</span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                                      <div>
                                        <label className="block text-base font-medium text-gray-700 mb-3">
                                          Project Name
                                        </label>
                                        <input
                                            type="text"
                                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm text-base border-gray-300 rounded-lg p-4"
                                            value={project.name || ""}
                                            onChange={(e) => resumeHook.handleProjectChange(projIndex, 'name', e.target.value)}
                                            placeholder="e.g., JobAgent AI Platform"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-base font-medium text-gray-700 mb-3">
                                          Technologies Used
                                          <span className="text-sm text-gray-500 block font-normal">Will appear in italics next to project name</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm text-base border-gray-300 rounded-lg p-4"
                                            value={project.technologies || ""}
                                            onChange={(e) => resumeHook.handleProjectChange(projIndex, 'technologies', e.target.value)}
                                            placeholder="e.g., React, FastAPI, PostgreSQL, OpenAI GPT-4"
                                        />
                                      </div>
                                      <div className="sm:col-span-2">
                                        <label className="block text-base font-medium text-gray-700 mb-3">
                                          Project Link (Optional)
                                          <span className="text-sm text-gray-500 block font-normal">Will make project name clickable in PDF</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm text-base border-gray-300 rounded-lg p-4"
                                            value={project.link || ""}
                                            onChange={(e) => resumeHook.handleProjectChange(projIndex, 'link', e.target.value)}
                                            placeholder="https://github.com/yourusername/project"
                                        />
                                      </div>
                                    </div>

                                    <div className="mt-8">
                                      <label className="block text-base font-medium text-gray-700 mb-4">
                                        Project Highlights
                                      </label>
                                      {(project.highlights || []).length > 1 && (
                                          <div className="text-xs text-gray-500 mb-3">
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
                                              size="lg"
                                              enableDrag={true}
                                              onDragStart={(e) => dragHook.handleDragStart(e, 'project', projIndex, highlightIndex)}
                                              onDragEnd={dragHook.handleDragEnd}
                                              onDragOver={dragHook.handleDragOver}
                                              onDrop={(e) => dragHook.handleDrop(e, 'project', projIndex, highlightIndex)}
                                              isDragging={dragHook.draggedItem?.type === 'project' && dragHook.draggedItem?.sectionIndex === projIndex && dragHook.draggedItem?.itemIndex === highlightIndex}
                                          />
                                      ))}
                                      <AddButton onClick={() => resumeHook.addProjectHighlight(projIndex)} size="lg">
                                        + Add Highlight
                                      </AddButton>
                                    </div>
                                  </div>
                                </DraggableItem>
                            ))}
                          </div>
                      )}

                      {/* Skills */}
                      {activeTab === "skills" && (
                          <div className="space-y-8">
                            <SectionHeader
                                title="Skills"
                                onAdd={resumeHook.addSkillCategory}
                                addButtonText="+ Add Skill Category"
                                showDragTip={(resumeData.skills || []).length > 1}
                                size="lg"
                            />

                            {(resumeData.skills || []).map((skillCat, catIndex) => (
                                <DraggableItem
                                    key={catIndex}
                                    onDragStart={(e) => dragHook.handleDragStart(e, 'skill', catIndex)}
                                    onDragEnd={dragHook.handleDragEnd}
                                    onDragOver={dragHook.handleDragOver}
                                    onDrop={(e) => dragHook.handleDrop(e, 'skill', catIndex)}
                                    isDragging={dragHook.draggedItem?.type === 'skill' && dragHook.draggedItem?.sectionIndex === catIndex && dragHook.draggedItem?.itemIndex === null}
                                    className="mt-8 p-6 border border-gray-200 rounded-lg relative bg-white hover:shadow-md transition-shadow"
                                >
                                  <div className="absolute top-4 left-4">
                                    <DragHandle />
                                  </div>
                                  <button
                                      type="button"
                                      onClick={() => resumeHook.removeSkillCategory(catIndex)}
                                      className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>

                                  <div style={{ marginLeft: '3rem' }}>
                                    <label className="block text-base font-medium text-gray-700 mb-3">
                                      Skill Category
                                    </label>
                                    <input
                                        type="text"
                                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm text-base border-gray-300 rounded-lg p-4"
                                        value={skillCat.category || ""}
                                        onChange={(e) => resumeHook.handleSkillCategoryChange(catIndex, e.target.value)}
                                        placeholder="e.g., Technical, Languages, Soft Skills"
                                    />
                                  </div>

                                  {/* Handle subcategories structure */}
                                  {skillCat.subcategories && (
                                      <div style={{ marginLeft: '3rem', marginTop: '2rem' }}>
                                        <div className="space-y-6">
                                          {skillCat.subcategories.map((subcat, subcatIndex) => (
                                              <div key={subcatIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                                <div className="flex justify-between items-center mb-4">
                                                  <label className="block text-sm font-medium text-gray-700">
                                                    Subcategory: {subcat.name}
                                                  </label>
                                                  <button
                                                      type="button"
                                                      onClick={() => resumeHook.removeSkillSubcategory(catIndex, subcatIndex)}
                                                      className="text-red-500 hover:text-red-700"
                                                  >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                  </button>
                                                </div>

                                                <input
                                                    type="text"
                                                    className="mb-3 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm text-sm border-gray-300 rounded-md p-2"
                                                    value={subcat.name || ""}
                                                    onChange={(e) => resumeHook.handleSkillSubcategoryNameChange(catIndex, subcatIndex, e.target.value)}
                                                    placeholder="e.g., Languages & Frameworks"
                                                />

                                                <div className="space-y-2">
                                                  {(subcat.skills || []).map((skill, skillIndex) => (
                                                      <div key={skillIndex} className="flex items-center">
                                                        <input
                                                            type="text"
                                                            className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full shadow-sm text-sm border-gray-300 rounded-md p-2"
                                                            value={skill}
                                                            onChange={(e) => resumeHook.handleSkillInSubcategoryChange(catIndex, subcatIndex, skillIndex, e.target.value)}
                                                            placeholder="Enter a skill"
                                                        />
                                                        {(subcat.skills || []).length > 1 && (
                                                            <DeleteButton onClick={() => resumeHook.removeSkillFromSubcategory(catIndex, subcatIndex, skillIndex)} size="sm" />
                                                        )}
                                                      </div>
                                                  ))}
                                                  <AddButton onClick={() => resumeHook.addSkillToSubcategory(catIndex, subcatIndex)} size="sm">
                                                    + Add Skill
                                                  </AddButton>
                                                </div>
                                              </div>
                                          ))}
                                          <AddButton onClick={() => resumeHook.addSkillSubcategory(catIndex)} size="sm">
                                            + Add Subcategory
                                          </AddButton>
                                        </div>
                                      </div>
                                  )}

                                  {/* Handle direct skills structure */}
                                  {skillCat.skills && !skillCat.subcategories && (
                                      <div style={{ marginLeft: '3rem', marginTop: '2rem' }}>
                                        <label className="block text-base font-medium text-gray-700 mb-4">
                                          Skills
                                        </label>
                                        {(skillCat.skills || []).length > 1 && (
                                            <div className="text-xs text-gray-500 mb-3">
                                              Drag to reorder skills
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                          {(skillCat.skills || []).map((skill, skillIndex) => (
                                              <DraggableItem
                                                  key={skillIndex}
                                                  onDragStart={(e) => dragHook.handleDragStart(e, 'skill', catIndex, skillIndex)}
                                                  onDragEnd={dragHook.handleDragEnd}
                                                  onDragOver={dragHook.handleDragOver}
                                                  onDrop={(e) => dragHook.handleDrop(e, 'skill', catIndex, skillIndex)}
                                                  isDragging={dragHook.draggedItem?.type === 'skill' && dragHook.draggedItem?.sectionIndex === catIndex && dragHook.draggedItem?.itemIndex === skillIndex}
                                                  className="flex items-center bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                                              >
                                                <div className="mr-3">
                                                  <DragHandle />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full shadow-sm text-base border-gray-300 rounded-lg p-4"
                                                    value={skill}
                                                    onChange={(e) => resumeHook.handleSkillChange(catIndex, skillIndex, e.target.value)}
                                                    placeholder="Enter a skill"
                                                />
                                                {(skillCat.skills || []).length > 1 && (
                                                    <DeleteButton onClick={() => resumeHook.removeSkill(catIndex, skillIndex)} />
                                                )}
                                              </DraggableItem>
                                          ))}
                                        </div>
                                        <AddButton onClick={() => resumeHook.addSkill(catIndex)} size="lg">
                                          + Add Skill
                                        </AddButton>
                                      </div>
                                  )}

                                  {/* Show conversion button for subcategories */}
                                  {skillCat.subcategories && (
                                      <div style={{ marginLeft: '3rem', marginTop: '1rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => resumeHook.convertSubcategoriesToFlat(catIndex)}
                                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                                        >
                                          Convert to simple skill list
                                        </button>
                                      </div>
                                  )}

                                  {/* Show conversion button for flat skills */}
                                  {skillCat.skills && !skillCat.subcategories && skillCat.category?.toLowerCase() === 'technical' && (
                                      <div style={{ marginLeft: '3rem', marginTop: '1rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => resumeHook.convertFlatToSubcategories(catIndex)}
                                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                                        >
                                          Convert to subcategories
                                        </button>
                                      </div>
                                  )}
                                </DraggableItem>
                            ))}
                          </div>
                      )}
                    </div>
                )}
              </div>

              {/* Preview Panel */}
              {showPreview && (
                  <div className="col-span-3 border rounded bg-gray-100 overflow-hidden">
                    {resumeData && (
                        <PDFViewer width="100%" height="100%" className="rounded" key={JSON.stringify(resumeData)}>
                          <ResumeDocument data={resumeData} />
                        </PDFViewer>
                    )}
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};

export default ResumeYamlModal;