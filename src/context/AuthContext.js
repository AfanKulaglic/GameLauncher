import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { auth, db } from "../lib/firebase";
import { ref, set, get, serverTimestamp } from "firebase/database";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

// Sync user profile to Firebase RTDB
async function syncUserToFirebase(userData) {
  if (!userData?.id) return;
  try {
    const displayName = userData.displayName || "Player";
    const email = userData.email || "";
    const userRef = ref(db, `users/${userData.id}`);
    const existing = await get(userRef);
    const existingData = existing.exists() ? existing.val() : null;

    await set(userRef, {
      displayName,
      displayNameLower: displayName.toLowerCase(),
      email,
      emailLower: email.toLowerCase(),
      avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${userData.id}`,
      createdAt: existingData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Set online presence
    const presRef = ref(db, `presence/${userData.id}`);
    await set(presRef, { online: true, lastSeen: serverTimestamp() });
  } catch (e) {
    console.warn("Firebase sync error:", e);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const extra = Constants.expoConfig?.extra || {};
  const googleConfig = {
    expoClientId:
      process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ||
      extra.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || extra.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      extra.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || extra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  };

  const platformClientId = Platform.select({
    ios: googleConfig.iosClientId,
    android: googleConfig.androidClientId,
    web: googleConfig.webClientId,
    default: googleConfig.expoClientId,
  });
  const googleEnabled = Boolean(platformClientId);

  const [request, response, promptAsync] = Google.useAuthRequest(googleConfig);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const mapped = {
          id: firebaseUser.uid,
          displayName: firebaseUser.displayName || "Player",
          email: firebaseUser.email || "",
        };
        setUser(mapped);
        syncUserToFirebase(mapped);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type !== "success") return;
      const idToken = response.authentication?.idToken;
      const accessToken = response.authentication?.accessToken;
      if (!idToken && !accessToken) return;

      try {
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        const result = await signInWithCredential(auth, credential);
        const firebaseUser = result.user;
        const mapped = {
          id: firebaseUser.uid,
          displayName: firebaseUser.displayName || "Player",
          email: firebaseUser.email || "",
        };
        setUser(mapped);
        syncUserToFirebase(mapped);
      } catch (e) {
        console.warn("Google sign-in error:", e);
      }
    };

    handleGoogleResponse();
  }, [response]);

  const register = async ({ displayName, email, password }) => {
    const created = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName?.trim()) {
      await updateProfile(created.user, { displayName: displayName.trim() });
    }
    const mapped = {
      id: created.user.uid,
      displayName: created.user.displayName || displayName?.trim() || "Player",
      email: created.user.email || email,
    };
    await syncUserToFirebase(mapped);
    setUser(mapped);
    return mapped;
  };

  const login = async ({ email, password }) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;
    const mapped = {
      id: firebaseUser.uid,
      displayName: firebaseUser.displayName || "Player",
      email: firebaseUser.email || email,
    };
    await syncUserToFirebase(mapped);
    setUser(mapped);
    return mapped;
  };

  const loginWithGoogle = async () => {
    if (!request || !googleEnabled) {
      throw new Error("Google sign-in is not configured for this platform.");
    }
    await promptAsync();
  };

  const logout = async () => {
    // Set offline presence
    if (user?.id) {
      try {
        const presRef = ref(db, `presence/${user.id}`);
        await set(presRef, { online: false, lastSeen: serverTimestamp() });
      } catch (e) {
        console.warn("Presence update error:", e);
      }
    }

    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out error:", e);
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout, loginWithGoogle, googleEnabled }),
    [user, loading, googleEnabled]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
