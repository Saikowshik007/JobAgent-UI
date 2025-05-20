// React PDF-based modal with compact layout and user-friendly YAML form editor
import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
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

const ResumeYamlModal = ({ yamlContent, onSave, onClose }) => {
  const [editorContent, setEditorContent] = useState('');
  const [resumeData, setResumeData] = useState(null);
  const editorRef = useRef(null);
  const modalRef = useRef(null);
  const yamlChangeTimeoutRef = useRef(null);

  useEffect(() => {
    if (yamlContent) {
      try {
        const parsed = yaml.load(yamlContent);
        setResumeData(parsed);
        const formatted = yaml.dump(parsed, { lineWidth: -1, noRefs: true });
        setEditorContent(formatted);
      } catch (err) {
        setEditorContent(yamlContent);
      }
    }
    const handleEscape = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      if (yamlChangeTimeoutRef.current) clearTimeout(yamlChangeTimeoutRef.current);
    };
  }, [yamlContent, onClose]);

  const handleEditorChange = (value) => {
    setEditorContent(value);
    if (yamlChangeTimeoutRef.current) clearTimeout(yamlChangeTimeoutRef.current);
    yamlChangeTimeoutRef.current = setTimeout(() => {
      try {
        const parsed = yaml.load(value);
        setResumeData(parsed);
      } catch {}
    }, 500);
  };

  const handleSave = () => {
    try {
      const parsed = yaml.load(editorContent);
      onSave(editorContent, parsed);
      onClose();
    } catch {}
  };

  const handleBackgroundClick = (e) => e.target === modalRef.current && onClose();

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={handleBackgroundClick}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-full flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">Resume Editor</h3>
          <div className="flex items-center space-x-3">
            <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Save Changes</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[700px]">
          <div className="h-full border rounded p-2 bg-gray-50">
            <textarea
              value={editorContent}
              onChange={(e) => handleEditorChange(e.target.value)}
              className="w-full h-full p-2 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Edit your YAML here..."
            />
          </div>
          <div className="h-full border rounded bg-gray-100">
            {resumeData && (
              <PDFViewer width="100%" height="100%">
                <ResumeDocument data={resumeData} />
              </PDFViewer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeYamlModal;
