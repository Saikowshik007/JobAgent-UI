// src/components/Settings.js
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "./Navbar";

function Settings() {
  const { currentUser, getUserSettings, updateUserSettings } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    linkedinEmail: "",
    linkedinPassword: "",
    openaiApiKey: "",
    settings: {
      selenium: {
        headless: true
      },
      cache: {
        job_cache_size: 1000,
        search_cache_size: 100
      }
    }
  });

  useEffect(() => {
    async function loadUserSettings() {
      try {
        const settings = await getUserSettings();
        if (settings) {
          setFormData({
            linkedinEmail: settings.linkedinEmail || "",
            linkedinPassword: settings.linkedinPassword || "",
            openaiApiKey: settings.openaiApiKey || "",
            settings: {
              selenium: {
                headless: settings.settings?.selenium?.headless ?? true
              },
              cache: {
                job_cache_size: settings.settings?.cache?.job_cache_size ?? 1000,
                search_cache_size: settings.settings?.cache?.search_cache_size ?? 100
              }
            }
          });
        }
      } catch (err) {
        setError("Failed to load settings: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUserSettings();
  }, [getUserSettings]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "headless") {
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
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      await updateUserSettings({
        linkedinEmail: formData.linkedinEmail,
        linkedinPassword: formData.linkedinPassword,
        openaiApiKey: formData.openaiApiKey,
        settings: formData.settings
      });

      setSuccess("Settings updated successfully!");
    } catch (err) {
      setError("Failed to update settings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.linkedinEmail) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-2xl font-bold text-gray-900">User Settings</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Update your JobTrak configuration and credentials.
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

          <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">LinkedIn Credentials</h3>

                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="linkedinEmail" className="block text-sm font-medium text-gray-700">
                      LinkedIn Email
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        name="linkedinEmail"
                        id="linkedinEmail"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={formData.linkedinEmail}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="linkedinPassword" className="block text-sm font-medium text-gray-700">
                      LinkedIn Password
                    </label>
                    <div className="mt-1">
                      <input
                        type="password"
                        name="linkedinPassword"
                        id="linkedinPassword"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={formData.linkedinPassword}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">API Keys</h3>

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
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Used for AI-powered features like resume generation.
                    </p>
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

            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {loading ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Settings;
