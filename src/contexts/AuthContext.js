import React, { createContext, useContext, useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  async function signup(email, password, openaiApiKey = "", location = "") {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Store configuration in Firestore with location
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        openaiApiKey,
        location, // Add location field
        createdAt: new Date().toISOString(),
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
      return docSnap.data();
    } else {
      return null;
    }
  }

  async function updateUserSettings(settings) {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
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
    updateUserSettings
  };

  return (
      <AuthContext.Provider value={value}>
        {!loading && children}
      </AuthContext.Provider>
  );
}