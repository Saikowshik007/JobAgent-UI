// src/components/Navbar.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Navbar() {
  const [error, setError] = useState("");
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      setError("");
      await logout();
      navigate("/login");
    } catch {
      setError("Failed to log out");
    }
  }

  return (
    <nav className="bg-indigo-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/dashboard" className="text-white font-bold text-xl">
                JobAgent
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/dashboard"
                  className="text-white hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/settings"
                  className="text-white hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Settings
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                <div className="text-sm text-white mr-4">
                  {currentUser && currentUser.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-indigo-700 p-1 rounded-full text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-800 focus:ring-white"
                >
                  <span className="px-2 py-1 text-sm">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mt-4 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
    </nav>
  );
}

export default Navbar;