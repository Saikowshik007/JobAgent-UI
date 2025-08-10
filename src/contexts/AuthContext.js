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

      // Store configuration in Firestore with model in settings
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        openaiApiKey,
        createdAt: new Date().toISOString(),
        settings: {
          model, // Store model in settings, not at root
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

    try {
      const docRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        console.log('Raw Firebase user data:', data); // Debug log

        // Ensure all required fields exist with defaults
        // Model should come from settings.model, with fallback to root level for compatibility
        const model = data.settings?.model || data.model || "gpt-4o";

        const settings = {
          ...data,
          openaiApiKey: data.openaiApiKey || "",
          model: model, // Expose model at root level for compatibility
          settings: {
            model: model, // Ensure model is in settings too
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

        console.log('Processed user settings:', {
          ...settings,
          openaiApiKey: settings.openaiApiKey ? `${settings.openaiApiKey.substring(0, 10)}...` : 'NOT SET',
          modelFromSettings: data.settings?.model,
          modelFromRoot: data.model,
          finalModel: model
        }); // Debug log

        return settings;
      } else {
        console.log('No user document found in Firestore');
        return null;
      }
    } catch (error) {
      console.error('Error loading user settings from Firebase:', error);
      return null;
    }
  }

  async function updateUserSettings(settings) {
    if (!currentUser) return;

    try {
      const userRef = doc(db, "users", currentUser.uid);

      // Ensure we include the model field in updates
      const updateData = {
        ...settings,
        updatedAt: new Date().toISOString()
      };

      console.log('Saving user settings to Firebase:', {
        ...updateData,
        openaiApiKey: updateData.openaiApiKey ? `${updateData.openaiApiKey.substring(0, 10)}...` : 'NOT SET',
        modelInSettings: updateData.settings?.model
      }); // Debug log

      await setDoc(userRef, updateData, { merge: true });

      console.log('User settings saved successfully to Firebase');
    } catch (error) {
      console.error('Error saving user settings to Firebase:', error);
      throw error;
    }
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

    // Use model from settings.model (primary) or fall back to root level
    const model = settings.settings?.model || settings.model || "gpt-4o";

    const apiSettings = {
      userId: currentUser.uid,
      openaiApiKey: settings.openaiApiKey || "",
      model: model, // Use the correct model from settings
      resumeData: null, // Will be populated when needed
      includeObjective: settings.settings?.resume?.include_objective ?? true,
      preferences: settings.preferences || {},
      features: settings.features || {}
    };

    // Debug log to help troubleshoot
    console.log('getUserSettingsForApi result:', {
      ...apiSettings,
      openaiApiKey: apiSettings.openaiApiKey ? `${apiSettings.openaiApiKey.substring(0, 10)}...` : 'NOT SET',
      modelSource: settings.settings?.model ? 'settings.model' : (settings.model ? 'root.model' : 'default')
    });

    return apiSettings;
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