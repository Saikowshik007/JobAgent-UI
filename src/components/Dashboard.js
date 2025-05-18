// Updated Dashboard.js with improved authentication checking
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
  const [systemStatus, setSystemStatus] = useState(null);

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

        const statusResponse = await fetch("http://localhost:8000/api/status", {
          headers: {
            "x_user_id": currentUser.uid // Log to verify this header is being set
          }
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setSystemStatus(statusData);
        }

        // Fetch jobs from JobTrak API - log to verify header
        console.log("Fetching jobs with user ID:", currentUser.uid);
        const response = await fetch("http://localhost:8000/api/jobs?limit=100&offset=0", {
          headers: {
            "x_user_id": currentUser.uid
          }
        });

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

    // Make sure currentUser is fully loaded before making requests
    if (currentUser.uid) {
      fetchData();
    } else {
      setError("User authentication not complete. Please wait or refresh.");
    }
  }, [currentUser, navigate, getUserSettings]);

  const handleSearchComplete = (newJobs) => {
    setJobs(prevJobs => {
      // Add only jobs that don't already exist in the list
      const existingJobIds = new Set(prevJobs.map(job => job.id));
      const uniqueNewJobs = newJobs.filter(job => !existingJobIds.has(job.id));
      return [...uniqueNewJobs, ...prevJobs];
    });
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

        {systemStatus && systemStatus.status !== "online" && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 mb-4 rounded" role="alert">
            <span className="font-bold">System Status: </span>
            <span className="block sm:inline">{systemStatus.message || "The system is experiencing issues."}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <JobSearch
              onSearchComplete={handleSearchComplete}
              userSettings={userSettings}
              userId={currentUser.uid}
            />
          </div>

          <div className="lg:col-span-2">
            <JobList jobs={jobs} userId={currentUser.uid} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;