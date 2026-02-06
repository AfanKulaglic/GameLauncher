import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC_RP7zQrnk2_-tBDH94snVqOmPtvv7OqM",
  authDomain: "focus-league-77c5c.firebaseapp.com",
  databaseURL: "https://focus-league-77c5c-default-rtdb.firebaseio.com",
  projectId: "focus-league-77c5c",
  storageBucket: "focus-league-77c5c.firebasestorage.app",
  messagingSenderId: "573898769383",
  appId: "1:573898769383:web:514f6da29ebdd295d23342",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getDatabase(app);
