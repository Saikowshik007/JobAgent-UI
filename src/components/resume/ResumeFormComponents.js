// src/components/resume/ResumeFormComponents.js - Reusable form components
import React, { useState } from 'react';

// Drag Handle Component
export const DragHandle = () => (
    <div className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing transition-colors duration-150">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
        </svg>
    </div>
);

// Delete Button Component
export const DeleteButton = ({ onClick, size = "md" }) => {
    const sizeClasses = {
        sm: "w-6 h-6 ml-2",
        md: "w-8 h-8 ml-3"
    };

    const iconClasses = {
        sm: "h-4 w-4",
        md: "h-5 w-5"
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center justify-center ${sizeClasses[size]} text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full`}
            title="Remove"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    );
};

// Draggable Item Component
export const DraggableItem = ({
                                  children,
                                  onDragStart,
                                  onDragEnd,
                                  onDragOver,
                                  onDrop,
                                  isDragging,
                                  className = "",
                                  enableDrag = true,
                                  dragOverClassName = "border-2 border-indigo-400 border-dashed bg-indigo-50"
                              }) => {
    const [isDraggedOver, setIsDraggedOver] = useState(false);

    if (!enableDrag) {
        return <div className={className}>{children}</div>;
    }

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggedOver(true);
        if (onDragOver) onDragOver(e);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set to false if we're actually leaving the element, not a child
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDraggedOver(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggedOver(false);
        if (onDrop) onDrop(e);
    };

    const handleDragStart = (e) => {
        e.stopPropagation();
        if (onDragStart) onDragStart(e);
    };

    const handleDragEnd = (e) => {
        e.stopPropagation();
        setIsDraggedOver(false);
        if (onDragEnd) onDragEnd(e);
    };

    return (
        <div
            draggable={enableDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`${className} ${
                isDragging ? 'opacity-60 scale-105 rotate-1 shadow-lg z-10' : ''
            } ${
                isDraggedOver ? dragOverClassName : ''
            } transition-all duration-200 ease-in-out transform`}
            style={{
                cursor: enableDrag ? 'grab' : 'default',
                ...(isDragging ? { transform: 'scale(1.05) rotate(1deg)', zIndex: 1000 } : {})
            }}
        >
            {children}
        </div>
    );
};

// Basic Information Form Component
export const BasicInfoForm = ({
                                  basicData,
                                  onBasicInfoChange,
                                  onWebsiteChange,
                                  onAddWebsite,
                                  onRemoveWebsite,
                                  size = "lg" // "sm" for settings, "lg" for modal
                              }) => {
    const inputClasses = size === "lg"
        ? "mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm text-base border-gray-300 rounded-lg p-4"
        : "mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md";

    const labelClasses = size === "lg"
        ? "block text-base font-medium text-gray-700 mb-3"
        : "block text-sm font-medium text-gray-700";

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                <div>
                    <label htmlFor="name" className={labelClasses}>
                        Full Name
                    </label>
                    <input
                        type="text"
                        name="name"
                        id="name"
                        className={inputClasses}
                        value={basicData?.name || ""}
                        onChange={onBasicInfoChange}
                    />
                </div>
                <div>
                    <label htmlFor="address" className={labelClasses}>
                        Location
                    </label>
                    <input
                        type="text"
                        name="address"
                        id="address"
                        className={inputClasses}
                        value={basicData?.address || ""}
                        onChange={onBasicInfoChange}
                        placeholder="City, State"
                    />
                </div>
                <div>
                    <label htmlFor="email" className={labelClasses}>
                        Contact Email
                    </label>
                    <input
                        type="email"
                        name="email"
                        id="contact-email"
                        className={inputClasses}
                        value={basicData?.email || ""}
                        onChange={onBasicInfoChange}
                    />
                </div>
                <div>
                    <label htmlFor="phone" className={labelClasses}>
                        Phone Number
                    </label>
                    <input
                        type="text"
                        name="phone"
                        id="phone"
                        className={inputClasses}
                        value={basicData?.phone || ""}
                        onChange={onBasicInfoChange}
                    />
                </div>
            </div>

            {/* Websites */}
            <div>
                <label className={labelClasses}>
                    Websites/Profiles
                </label>
                {(basicData?.websites || []).map((website, index) => (
                    <div key={index} className={`flex items-center ${size === "lg" ? "mt-4" : "mt-2"}`}>
                        <input
                            type="text"
                            className={inputClasses}
                            value={website}
                            onChange={(e) => onWebsiteChange(index, e.target.value)}
                            placeholder="https://yourwebsite.com"
                        />
                        {(basicData?.websites || []).length > 1 && (
                            <DeleteButton onClick={() => onRemoveWebsite(index)} size={size === "lg" ? "md" : "sm"} />
                        )}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={onAddWebsite}
                    className={`${size === "lg" ? "mt-4 px-5 py-3 text-base" : "mt-2 px-3 py-1 text-sm"} inline-flex items-center border border-transparent leading-4 font-medium rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                    + Add Website
                </button>
            </div>
        </div>
    );
};

// Professional Summary Component
export const ProfessionalSummaryForm = ({
                                            objective,
                                            onObjectiveChange,
                                            includeObjective,
                                            onIncludeObjectiveChange,
                                            size = "lg",
                                            showToggle = false
                                        }) => {
    const inputClasses = size === "lg"
        ? "shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full text-base border border-gray-300 rounded-lg p-4"
        : "shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md";

    return (
        <div className="space-y-6">
            {showToggle && (
                <div className="flex justify-between items-center">
                    <h4 className={size === "lg" ? "text-2xl font-medium text-gray-900" : "text-md font-medium text-gray-800"}>
                        Professional Summary
                    </h4>
                    <div className="flex items-center">
                        <label className="inline-flex items-center">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                checked={includeObjective}
                                onChange={onIncludeObjectiveChange}
                            />
                            <span className={`ml-2 ${size === "lg" ? "text-base" : "text-sm"} font-medium text-gray-700`}>
                Include in resume
              </span>
                        </label>
                    </div>
                </div>
            )}

            <div className={(!showToggle || includeObjective) ? '' : 'opacity-50'}>
                <label className={`block ${size === "lg" ? "text-base" : "text-sm"} font-medium text-gray-700 mb-4`}>
                    Professional Summary/Objective {!showToggle && "(Optional)"}
                </label>
                {size === "lg" && (
                    <p className="text-base text-gray-500 mb-4">
                        Write a brief 2-3 sentence summary of your professional background, key skills, and career goals.
                        This should be tailored to the specific job you're applying for.
                    </p>
                )}
                <textarea
                    rows={size === "lg" ? 10 : 4}
                    disabled={showToggle && !includeObjective}
                    className={`${inputClasses} ${showToggle && !includeObjective ? 'disabled:bg-gray-100 disabled:cursor-not-allowed' : ''}`}
                    placeholder={size === "lg" ?
                        "Example: Experienced software engineer with 5+ years in full-stack development seeking to leverage expertise in React and Node.js to contribute to innovative web applications at a fast-growing technology company." :
                        "Write a brief summary of your professional background and goals"
                    }
                    value={(!showToggle || includeObjective) ? (objective || "") : ""}
                    onChange={onObjectiveChange}
                />
                {size === "lg" && (
                    <div className="mt-3 text-base text-gray-500">
                        Characters: {(!showToggle || includeObjective) ? (objective || "").length : 0} / 500 (recommended max)
                    </div>
                )}
            </div>

            {size === "lg" && (
                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-4 text-lg">💡 Tips for a Strong Professional Summary:</h5>
                    <ul className="text-base text-gray-700 space-y-2">
                        <li>• Keep it concise (2-3 sentences)</li>
                        <li>• Include your years of experience</li>
                        <li>• Mention 2-3 key skills relevant to the job</li>
                        <li>• State what type of role you're seeking</li>
                        <li>• Tailor it to the specific company/position</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

// Highlight Item Component (for experiences and projects)
export const HighlightItem = ({
                                  highlight,
                                  onChange,
                                  onRemove,
                                  canRemove,
                                  placeholder,
                                  size = "lg",
                                  enableDrag = false,
                                  onDragStart,
                                  onDragEnd,
                                  onDragOver,
                                  onDrop,
                                  isDragging
                              }) => {
    const textareaClasses = size === "lg"
        ? "shadow-sm focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full text-base border border-gray-300 rounded-lg p-4"
        : "shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md";

    const containerClasses = size === "lg"
        ? "mt-4 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
        : "mt-2";

    const content = (
        <div className={`flex items-start ${enableDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}>
            {enableDrag && (
                <div
                    className={`${size === "lg" ? "mr-3 mt-2" : "mr-2"} flex-shrink-0`}
                    onMouseDown={(e) => e.stopPropagation()} // Prevent text selection issues
                >
                    <DragHandle />
                </div>
            )}
            <textarea
                rows={size === "lg" ? 4 : 2}
                className={textareaClasses}
                value={highlight}
                onChange={onChange}
                placeholder={placeholder}
                onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking in textarea
                onFocus={(e) => e.stopPropagation()} // Prevent drag when focusing textarea
            />
            {canRemove && (
                <div className="flex-shrink-0">
                    <DeleteButton onClick={onRemove} size={size === "lg" ? "md" : "sm"} />
                </div>
            )}
        </div>
    );

    if (enableDrag) {
        return (
            <DraggableItem
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
                isDragging={isDragging}
                className={containerClasses}
                enableDrag={true}
                dragOverClassName="border-2 border-green-400 border-dashed bg-green-50"
            >
                {content}
            </DraggableItem>
        );
    }

    return <div className={containerClasses}>{content}</div>;
};

// Add Button Component
export const AddButton = ({ onClick, children, size = "lg" }) => {
    const buttonClasses = size === "lg"
        ? "mt-4 inline-flex items-center px-5 py-3 border border-transparent text-base leading-4 font-medium rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        : "mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500";

    return (
        <button type="button" onClick={onClick} className={buttonClasses}>
            {children}
        </button>
    );
};

// Section Header Component
export const SectionHeader = ({ title, onAdd, addButtonText, size = "lg", showDragTip = false }) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className={size === "lg" ? "text-2xl font-medium text-gray-900" : "text-md font-medium text-gray-800"}>
                    {title}
                </h4>
                {onAdd && (
                    <AddButton onClick={onAdd} size={size}>
                        {addButtonText}
                    </AddButton>
                )}
            </div>
            {showDragTip && size === "lg" && (
                <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                    💡 Tip: Drag the grip handle (⋮⋮) to reorder items
                </div>
            )}
        </div>
    );
};