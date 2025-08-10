import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Updated signup function to match the new user model structure
  async function signup(email, password, openaiApiKey = "", model = "gpt-4o") {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Store configuration in Firestore matching the user model structure
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        openaiApiKey,
        model, // Add model field
        createdAt: new Date().toISOString(),
        settings: {
          selenium: {
            headless: true
          },
          cache: {
            job_cache_size: 1000,
            search_cache_size: 100
          },
          resume: {
            include_objective: true // Default to true
          }
        },
        // Add user preferences and features as per the Python user model
        preferences: {},
        features: {
          advanced_parsing: true,
          batch_operations: true,
          simplify_integration: true,
          custom_templates: true
        },
        metadata: {}
      });

      return userCredential.user;
    } catch (error) {
      throw error;
    }
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  async function getUserSettings() {
    if (!currentUser) return null;
    const docRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Ensure all required fields exist with defaults
      return {
        ...data,
        openaiApiKey: data.openaiApiKey || "",
        model: data.model || "gpt-4o", // Ensure model field exists
        settings: {
          selenium: {
            headless: data.settings?.selenium?.headless ?? true
          },
          cache: {
            job_cache_size: data.settings?.cache?.job_cache_size ?? 1000,
            search_cache_size: data.settings?.cache?.search_cache_size ?? 100
          },
          resume: {
            include_objective: data.settings?.resume?.include_objective ?? true
          }
        },
        preferences: data.preferences || {},
        features: data.features || {
          advanced_parsing: true,
          batch_operations: true,
          simplify_integration: true,
          custom_templates: true
        },
        metadata: data.metadata || {}
      };
    } else {
      return null;
    }
  }

  async function updateUserSettings(settings) {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);

    // Ensure we include the model field in updates
    const updateData = {
      ...settings,
      updatedAt: new Date().toISOString()
    };

    await setDoc(userRef, updateData, { merge: true });
  }

  // Helper function to get user data in the format expected by the API
  function getUserApiData() {
    if (!currentUser) return null;

    return {
      id: currentUser.uid,
      email: currentUser.email
    };
  }

  // Helper function to create user settings object for API calls
  async function getUserSettingsForApi() {
    const settings = await getUserSettings();
    if (!settings) return null;

    return {
      userId: currentUser.uid,
      openaiApiKey: settings.openaiApiKey || "",
      model: settings.model || "gpt-4o",
      resumeData: null, // Will be populated when needed
      includeObjective: settings.settings?.resume?.include_objective ?? true,
      preferences: settings.preferences || {},
      features: settings.features || {}
    };
  }

  // Helper function to check if user has a specific feature
  async function hasFeature(featureName) {
    const settings = await getUserSettings();
    return settings?.features?.[featureName] ?? false;
  }

  // Helper function to get user preference
  async function getUserPreference(key, defaultValue = null) {
    const settings = await getUserSettings();
    return settings?.preferences?.[key] ?? defaultValue;
  }

  // Helper function to set user preference
  async function setUserPreference(key, value) {
    const settings = await getUserSettings();
    if (settings) {
      const updatedPreferences = {
        ...settings.preferences,
        [key]: value
      };

      await updateUserSettings({
        preferences: updatedPreferences
      });
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    getUserSettings,
    updateUserSettings,
    getUserApiData,
    getUserSettingsForApi,
    hasFeature,
    getUserPreference,
    setUserPreference
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}