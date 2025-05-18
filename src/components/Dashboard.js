import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import JobSearch from "./JobSearch";
import JobList from "./JobList";
import Navbar from "./Navbar";

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { currentUser, getUserSettings } = useAuth();
  const navigate = useNavigate();
  const [userSettings, setUserSettings] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    async function fetchData() {
      try {
        // Fetch user settings from Firebase
        const settings = await getUserSettings();
        setUserSettings(settings);

        // Fetch jobs from JobTrak API
        const response = await fetch("http://localhost:8000/api/jobs?limit=20&offset=0");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setJobs(data.jobs || []);
      } catch (err) {
        setError("Failed to fetch data: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentUser, navigate, getUserSettings]);

  const handleSearchComplete = (newJobs) => {
    setJobs(prevJobs => [...newJobs, ...prevJobs]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <JobSearch onSearchComplete={handleSearchComplete} userSettings={userSettings} />
          </div>

          <div className="lg:col-span-2">
            <JobList jobs={jobs} />
          </div>
        </div>
      </main>
    </div>
  );
}
export default Dashboard;