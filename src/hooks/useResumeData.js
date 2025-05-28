// src/hooks/useResumeData.js - Custom hooks for resume data management
import { useState, useCallback } from 'react';
import yaml from 'js-yaml';

// Hook for managing resume data state and operations
export const useResumeData = (initialData = null) => {
    const [resumeData, setResumeData] = useState(initialData || {
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

    // Basic info handlers
    const handleBasicInfoChange = useCallback((e) => {
        const { name, value } = e.target;
        setResumeData(prev => ({
            ...prev,
            basic: {
                ...prev.basic,
                [name]: value
            }
        }));
    }, []);

    const handleWebsiteChange = useCallback((index, value) => {
        setResumeData(prev => {
            const websites = [...(prev.basic?.websites || [])];
            websites[index] = value;
            return {
                ...prev,
                basic: {
                    ...prev.basic,
                    websites
                }
            };
        });
    }, []);

    const addWebsite = useCallback(() => {
        setResumeData(prev => ({
            ...prev,
            basic: {
                ...prev.basic,
                websites: [...(prev.basic?.websites || []), ""]
            }
        }));
    }, []);

    const removeWebsite = useCallback((index) => {
        setResumeData(prev => {
            const websites = [...(prev.basic?.websites || [])];
            websites.splice(index, 1);
            return {
                ...prev,
                basic: {
                    ...prev.basic,
                    websites
                }
            };
        });
    }, []);

    // Objective handler
    const handleObjectiveChange = useCallback((e) => {
        setResumeData(prev => ({
            ...prev,
            objective: e.target.value
        }));
    }, []);

    // Education handlers
    const handleEducationChange = useCallback((schoolIndex, field, value) => {
        setResumeData(prev => {
            const schools = [...(prev.education || [])];
            schools[schoolIndex] = {
                ...schools[schoolIndex],
                [field]: value
            };
            return {
                ...prev,
                education: schools
            };
        });
    }, []);

    const handleDegreeChange = useCallback((schoolIndex, degreeIndex, field, value) => {
        setResumeData(prev => {
            const schools = [...(prev.education || [])];
            if (!schools[schoolIndex].degrees[degreeIndex]) {
                schools[schoolIndex].degrees[degreeIndex] = {};
            }
            schools[schoolIndex].degrees[degreeIndex] = {
                ...schools[schoolIndex].degrees[degreeIndex],
                [field]: value
            };
            return {
                ...prev,
                education: schools
            };
        });
    }, []);

    const handleDegreeNameChange = useCallback((schoolIndex, degreeIndex, nameIndex, value) => {
        setResumeData(prev => {
            const schools = [...(prev.education || [])];
            const names = [...(schools[schoolIndex].degrees[degreeIndex].names || [])];
            names[nameIndex] = value;
            schools[schoolIndex].degrees[degreeIndex].names = names;
            return {
                ...prev,
                education: schools
            };
        });
    }, []);

    const addEducation = useCallback(() => {
        setResumeData(prev => ({
            ...prev,
            education: [...(prev.education || []), {
                school: "",
                degrees: [{
                    names: [""],
                    gpa: "",
                    dates: ""
                }]
            }]
        }));
    }, []);

    const removeEducation = useCallback((schoolIndex) => {
        setResumeData(prev => {
            const schools = [...(prev.education || [])];
            schools.splice(schoolIndex, 1);
            return {
                ...prev,
                education: schools
            };
        });
    }, []);

    // Experience handlers
    const handleExperienceChange = useCallback((expIndex, field, value) => {
        setResumeData(prev => {
            const experiences = [...(prev.experiences || [])];
            experiences[expIndex] = {
                ...experiences[expIndex],
                [field]: value
            };
            return {
                ...prev,
                experiences
            };
        });
    }, []);

    const handleTitleChange = useCallback((expIndex, titleIndex, field, value) => {
        setResumeData(prev => {
            const experiences = [...(prev.experiences || [])];
            experiences[expIndex].titles[titleIndex] = {
                ...experiences[expIndex].titles[titleIndex],
                [field]: value
            };
            return {
                ...prev,
                experiences
            };
        });
    }, []);

    const handleHighlightChange = useCallback((expIndex, highlightIndex, value) => {
        setResumeData(prev => {
            const experiences = [...(prev.experiences || [])];
            experiences[expIndex].highlights[highlightIndex] = value;
            return {
                ...prev,
                experiences
            };
        });
    }, []);

    const addExperience = useCallback(() => {
        setResumeData(prev => ({
            ...prev,
            experiences: [...(prev.experiences || []), {
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
    }, []);

    const removeExperience = useCallback((expIndex) => {
        setResumeData(prev => {
            const experiences = [...(prev.experiences || [])];
            experiences.splice(expIndex, 1);
            return {
                ...prev,
                experiences
            };
        });
    }, []);

    const addHighlight = useCallback((expIndex) => {
        setResumeData(prev => {
            const experiences = [...(prev.experiences || [])];
            experiences[expIndex].highlights.push("");
            return {
                ...prev,
                experiences
            };
        });
    }, []);

    const removeHighlight = useCallback((expIndex, highlightIndex) => {
        setResumeData(prev => {
            const experiences = [...(prev.experiences || [])];
            experiences[expIndex].highlights.splice(highlightIndex, 1);
            return {
                ...prev,
                experiences
            };
        });
    }, []);

    // Project handlers
    const handleProjectChange = useCallback((projIndex, field, value) => {
        setResumeData(prev => {
            const projects = [...(prev.projects || [])];
            projects[projIndex] = {
                ...projects[projIndex],
                [field]: value
            };
            return {
                ...prev,
                projects
            };
        });
    }, []);

    const handleProjectHighlightChange = useCallback((projIndex, highlightIndex, value) => {
        setResumeData(prev => {
            const projects = [...(prev.projects || [])];
            projects[projIndex].highlights[highlightIndex] = value;
            return {
                ...prev,
                projects
            };
        });
    }, []);

    const addProject = useCallback(() => {
        setResumeData(prev => ({
            ...prev,
            projects: [...(prev.projects || []), {
                name: "",
                technologies: "",
                link: "",
                hyperlink: false,
                show_link: false,
                highlights: [""]
            }]
        }));
    }, []);

    const removeProject = useCallback((projIndex) => {
        setResumeData(prev => {
            const projects = [...(prev.projects || [])];
            projects.splice(projIndex, 1);
            return {
                ...prev,
                projects
            };
        });
    }, []);

    const addProjectHighlight = useCallback((projIndex) => {
        setResumeData(prev => {
            const projects = [...(prev.projects || [])];
            projects[projIndex].highlights.push("");
            return {
                ...prev,
                projects
            };
        });
    }, []);

    const removeProjectHighlight = useCallback((projIndex, highlightIndex) => {
        setResumeData(prev => {
            const projects = [...(prev.projects || [])];
            projects[projIndex].highlights.splice(highlightIndex, 1);
            return {
                ...prev,
                projects
            };
        });
    }, []);

    // Skills handlers
    const handleSkillCategoryChange = useCallback((catIndex, value) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            skills[catIndex].category = value;
            return {
                ...prev,
                skills
            };
        });
    }, []);

    const handleSkillChange = useCallback((catIndex, skillIndex, value) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            skills[catIndex].skills[skillIndex] = value;
            return {
                ...prev,
                skills
            };
        });
    }, []);

    const addSkillCategory = useCallback(() => {
        setResumeData(prev => ({
            ...prev,
            skills: [...(prev.skills || []), {
                category: "",
                skills: [""]
            }]
        }));
    }, []);

    const removeSkillCategory = useCallback((catIndex) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            skills.splice(catIndex, 1);
            return {
                ...prev,
                skills
            };
        });
    }, []);

    const addSkill = useCallback((catIndex) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            skills[catIndex].skills.push("");
            return {
                ...prev,
                skills
            };
        });
    }, []);

    const removeSkill = useCallback((catIndex, skillIndex) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            skills[catIndex].skills.splice(skillIndex, 1);
            return {
                ...prev,
                skills
            };
        });
    }, []);

    // Utility functions
    const exportToYaml = useCallback(() => {
        try {
            return yaml.dump(resumeData, { lineWidth: -1, noRefs: true });
        } catch (err) {
            console.error("Error generating YAML:", err);
            return null;
        }
    }, [resumeData]);

    const importFromYaml = useCallback((yamlString) => {
        try {
            const parsed = yaml.load(yamlString);
            setResumeData(parsed);
            return { success: true };
        } catch (err) {
            console.error("Error parsing YAML:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const resetToDefault = useCallback(() => {
        setResumeData({
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
    }, []);
    const handleSkillSubcategoryNameChange = useCallback((catIndex, subcatIndex, value) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            if (skills[catIndex].subcategories) {
                skills[catIndex].subcategories[subcatIndex].name = value;
            }
            return {
                ...prev,
                skills
            };
        });
    }, []);

    const handleSkillInSubcategoryChange = useCallback((catIndex, subcatIndex, skillIndex, value) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            if (skills[catIndex].subcategories) {
                skills[catIndex].subcategories[subcatIndex].skills[skillIndex] = value;
            }
            return {
                ...prev,
                skills
            };
        });
    }, []);

    const addSkillSubcategory = useCallback((catIndex) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            if (!skills[catIndex].subcategories) {
                skills[catIndex].subcategories = [];
            }
            skills[catIndex].subcategories.push({
                name: "",
                skills: [""]
            });
            return {
                ...prev,
                skills
            };
        });
    }, []);

    const removeSkillSubcategory = useCallback((catIndex, subcatIndex) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            if (skills[catIndex].subcategories) {
                skills[catIndex].subcategories.splice(subcatIndex, 1);
            }
            return {
                ...prev,
                skills
            };
        });
    }, []);

    const addSkillToSubcategory = useCallback((catIndex, subcatIndex) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            if (skills[catIndex].subcategories && skills[catIndex].subcategories[subcatIndex]) {
                skills[catIndex].subcategories[subcatIndex].skills.push("");
            }
            return {
                ...prev,
                skills
            };
        });
    }, []);

    const removeSkillFromSubcategory = useCallback((catIndex, subcatIndex, skillIndex) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            if (skills[catIndex].subcategories && skills[catIndex].subcategories[subcatIndex]) {
                skills[catIndex].subcategories[subcatIndex].skills.splice(skillIndex, 1);
            }
            return {
                ...prev,
                skills
            };
        });
    }, []);

// Conversion functions
    const convertSubcategoriesToFlat = useCallback((catIndex) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            const skillCategory = skills[catIndex];

            if (skillCategory.subcategories) {
                // Flatten all skills from subcategories
                const allSkills = [];
                skillCategory.subcategories.forEach(subcat => {
                    if (subcat.skills) {
                        allSkills.push(...subcat.skills);
                    }
                });

                // Remove duplicates (case-insensitive)
                const uniqueSkills = [];
                const seenSkills = new Set();
                allSkills.forEach(skill => {
                    const lowerSkill = skill.toLowerCase().trim();
                    if (lowerSkill && !seenSkills.has(lowerSkill)) {
                        seenSkills.add(lowerSkill);
                        uniqueSkills.push(skill.trim());
                    }
                });

                // Convert to flat structure
                skills[catIndex] = {
                    category: skillCategory.category,
                    skills: uniqueSkills
                };
            }

            return {
                ...prev,
                skills
            };
        });
    }, []);

    const convertFlatToSubcategories = useCallback((catIndex) => {
        setResumeData(prev => {
            const skills = [...(prev.skills || [])];
            const skillCategory = skills[catIndex];

            if (skillCategory.skills && !skillCategory.subcategories) {
                // Convert flat skills to subcategories structure
                skills[catIndex] = {
                    category: skillCategory.category,
                    subcategories: [
                        {
                            name: "General",
                            skills: [...skillCategory.skills]
                        }
                    ]
                };
            }

            return {
                ...prev,
                skills
            };
        });
    }, []);
    return {
        resumeData,
        setResumeData,
        // Basic info
        handleBasicInfoChange,
        handleWebsiteChange,
        addWebsite,
        removeWebsite,
        // Objective
        handleObjectiveChange,
        // Education
        handleEducationChange,
        handleDegreeChange,
        handleDegreeNameChange,
        addEducation,
        removeEducation,
        // Experience
        handleExperienceChange,
        handleTitleChange,
        handleHighlightChange,
        addExperience,
        removeExperience,
        addHighlight,
        removeHighlight,
        // Projects
        handleProjectChange,
        handleProjectHighlightChange,
        addProject,
        removeProject,
        addProjectHighlight,
        removeProjectHighlight,
        // Skills
        handleSkillCategoryChange,
        handleSkillChange,
        addSkillCategory,
        removeSkillCategory,
        addSkill,
        removeSkill,
        handleSkillSubcategoryNameChange,
        handleSkillInSubcategoryChange,
        addSkillSubcategory,
        removeSkillSubcategory,
        addSkillToSubcategory,
        removeSkillFromSubcategory,
        convertSubcategoriesToFlat,
        convertFlatToSubcategories,
        // Utilities
        exportToYaml,
        importFromYaml,
        resetToDefault
    };
};

// Hook for drag and drop functionality
export const useDragAndDrop = (resumeData, setResumeData) => {
    const [draggedItem, setDraggedItem] = useState(null);

    const handleDragStart = useCallback((e, type, sectionIndex, itemIndex = null) => {
        setDraggedItem({ type, sectionIndex, itemIndex });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);

        // Add a slight delay to allow the drag to start properly
        setTimeout(() => {
            if (e.target) {
                e.target.style.opacity = '0.6';
            }
        }, 0);
    }, []);

    const handleDragEnd = useCallback((e) => {
        if (e.target) {
            e.target.style.opacity = '1';
        }
        // Small delay to allow drop to complete before clearing
        setTimeout(() => {
            setDraggedItem(null);
        }, 50);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    }, []);

// Update the handleDrop function in useDragAndDrop hook to handle subcategories

    const handleDrop = useCallback((e, type, targetSectionIndex, targetItemIndex = null) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedItem || draggedItem.type !== type) return;

        const { sectionIndex: sourceSectionIndex, itemIndex: sourceItemIndex } = draggedItem;

        // Don't do anything if dropping on the same position
        if (sourceSectionIndex === targetSectionIndex && sourceItemIndex === targetItemIndex) {
            return;
        }

        const newData = { ...resumeData };

        if (type === 'experience') {
            if (sourceItemIndex !== null && targetItemIndex !== null) {
                // Reordering highlights within the same experience
                if (sourceSectionIndex === targetSectionIndex) {
                    const highlights = [...newData.experiences[sourceSectionIndex].highlights];
                    const [removed] = highlights.splice(sourceItemIndex, 1);
                    highlights.splice(targetItemIndex, 0, removed);
                    newData.experiences[sourceSectionIndex].highlights = highlights;
                }
            } else {
                // Reordering experiences
                const experiences = [...newData.experiences];
                const [removed] = experiences.splice(sourceSectionIndex, 1);
                experiences.splice(targetSectionIndex, 0, removed);
                newData.experiences = experiences;
            }
        } else if (type === 'project') {
            if (sourceItemIndex !== null && targetItemIndex !== null) {
                // Reordering project highlights
                if (sourceSectionIndex === targetSectionIndex) {
                    const highlights = [...newData.projects[sourceSectionIndex].highlights];
                    const [removed] = highlights.splice(sourceItemIndex, 1);
                    highlights.splice(targetItemIndex, 0, removed);
                    newData.projects[sourceSectionIndex].highlights = highlights;
                }
            } else {
                // Reordering projects
                const projects = [...newData.projects];
                const [removed] = projects.splice(sourceSectionIndex, 1);
                projects.splice(targetSectionIndex, 0, removed);
                newData.projects = projects;
            }
        } else if (type === 'education') {
            // Reordering education entries
            const education = [...newData.education];
            const [removed] = education.splice(sourceSectionIndex, 1);
            education.splice(targetSectionIndex, 0, removed);
            newData.education = education;
        } else if (type === 'skill') {
            if (sourceItemIndex !== null && targetItemIndex !== null) {
                // Reordering skills within category
                if (sourceSectionIndex === targetSectionIndex) {
                    const skillCategory = newData.skills[sourceSectionIndex];

                    // Handle subcategories structure
                    if (skillCategory.subcategories) {
                        // For now, we'll handle drag within the same subcategory only
                        // More complex cross-subcategory dragging would require additional logic
                        console.log('Drag and drop within subcategories not fully implemented yet');
                    } else if (skillCategory.skills) {
                        // Handle flat skills structure
                        const skills = [...skillCategory.skills];
                        const [removed] = skills.splice(sourceItemIndex, 1);
                        skills.splice(targetItemIndex, 0, removed);
                        newData.skills[sourceSectionIndex].skills = skills;
                    }
                }
            } else {
                // Reordering skill categories
                const skills = [...newData.skills];
                const [removed] = skills.splice(sourceSectionIndex, 1);
                skills.splice(targetSectionIndex, 0, removed);
                newData.skills = skills;
            }
        }

        setResumeData(newData);
    }, [draggedItem, resumeData, setResumeData]);

    return {
        draggedItem,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDrop
    };
};