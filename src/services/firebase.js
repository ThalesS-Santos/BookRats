import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCQpuhJEdLYQg93DZP05aYv_fphJ8YoxcU",
  authDomain: "bookrats-ef02b.firebaseapp.com",
  projectId: "bookrats-ef02b",
  storageBucket: "bookrats-ef02b.firebasestorage.app",
  messagingSenderId: "938992066464",
  appId: "1:938992066464:web:fe5bf0d2d4cba104cf4ec5",
  measurementId: "G-E845C65R6V"
};

let app;
let auth;
let db;

// Strict check for React Native / Expo Fast Refresh
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
  db = initializeFirestore(app, {}); // Use initializeFirestore for the first run
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };
export const googleProvider = new GoogleAuthProvider();
