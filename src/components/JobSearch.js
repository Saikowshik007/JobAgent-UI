// src/components/JobSearch.js
import React, { useState } from "react";

function JobSearch({ onSearchComplete, userSettings, userId }) {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [filters, setFilters] = useState({
    experience_level: [],
    job_type: [],
    date_posted: "Past month",
    workplace_type: [],
    easy_apply: false
  });
  const [maxJobs, setMaxJobs] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const experienceLevels = ["Internship", "Entry level", "Associate", "Mid-Senior level", "Director", "Executive"];
  const jobTypes = ["Full-time", "Part-time", "Contract", "Temporary", "Volunteer", "Internship"];
  const dateOptions = ["Past 24 hours", "Past week", "Past month", "Any time"];
  const workplaceTypes = ["On-site", "Remote", "Hybrid"];

  const handleExperienceChange = (level) => {
    setFilters(prev => {
      const newLevels = prev.experience_level.includes(level)
        ? prev.experience_level.filter(l => l !== level)
        : [...prev.experience_level, level];

      return { ...prev, experience_level: newLevels };
    });
  };

  const handleJobTypeChange = (type) => {
    setFilters(prev => {
      const newTypes = prev.job_type.includes(type)
        ? prev.job_type.filter(t => t !== type)
        : [...prev.job_type, type];

      return { ...prev, job_type: newTypes };
    });
  };

  const handleWorkplaceChange = (type) => {
    setFilters(prev => {
      const newTypes = prev.workplace_type.includes(type)
        ? prev.workplace_type.filter(t => t !== type)
        : [...prev.workplace_type, type];

      return { ...prev, workplace_type: newTypes };
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!keywords.trim()) {
      setError("Please enter job keywords");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:8000/api/jobs/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": userId // Added user authentication
        },
        body: JSON.stringify({
          keywords,
          location,
          filters,
          max_jobs: maxJobs,
          headless: true // Default to headless mode
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      onSearchComplete(data.jobs || []);
    } catch (err) {
      setError("Search failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Search Jobs</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleSearch}>
        <div className="space-y-4">
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">
              Keywords
            </label>
            <input
              type="text"
              id="keywords"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g. Python Developer"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              type="text"
              id="location"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g. San Francisco, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Experience Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {experienceLevels.map((level) => (
                <div key={level} className="flex items-center">
                  <input
                    id={`experience-${level}`}
                    name="experience_level"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={filters.experience_level.includes(level)}
                    onChange={() => handleExperienceChange(level)}
                  />
                  <label htmlFor={`experience-${level}`} className="ml-2 text-sm text-gray-700">
                    {level}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {jobTypes.map((type) => (
                <div key={type} className="flex items-center">
                  <input
                    id={`jobtype-${type}`}
                    name="job_type"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={filters.job_type.includes(type)}
                    onChange={() => handleJobTypeChange(type)}
                  />
                  <label htmlFor={`jobtype-${type}`} className="ml-2 text-sm text-gray-700">
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="date-posted" className="block text-sm font-medium text-gray-700">
              Date Posted
            </label>
            <select
              id="date-posted"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={filters.date_posted}
              onChange={(e) => setFilters({ ...filters, date_posted: e.target.value })}
            >
              {dateOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workplace Type
            </label>
            <div className="flex space-x-4">
              {workplaceTypes.map((type) => (
                <div key={type} className="flex items-center">
                  <input
                    id={`workplace-${type}`}
                    name="workplace_type"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={filters.workplace_type.includes(type)}
                    onChange={() => handleWorkplaceChange(type)}
                  />
                  <label htmlFor={`workplace-${type}`} className="ml-2 text-sm text-gray-700">
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="easy-apply"
              name="easy_apply"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              checked={filters.easy_apply}
              onChange={(e) => setFilters({ ...filters, easy_apply: e.target.checked })}
            />
            <label htmlFor="easy-apply" className="ml-2 text-sm text-gray-700">
              LinkedIn Easy Apply Only
            </label>
          </div>

          <div>
            <label htmlFor="max-jobs" className="block text-sm font-medium text-gray-700">
              Max Jobs to Search
            </label>
            <input
              type="number"
              id="max-jobs"
              min="5"
              max="100"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={maxJobs}
              onChange={(e) => setMaxJobs(parseInt(e.target.value))}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                Searching...
              </>
            ) : (
              "Search LinkedIn"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default JobSearch;