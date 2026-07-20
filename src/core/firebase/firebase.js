import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

// TODO: Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app;
let auth;
let db;

// Strict check for React Native / Expo Fast Refresh
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
  // ⚡ React Native transport fix: o SDK JS usa WebChannel/streaming por padrão,
  // que a stack de rede do RN não suporta bem — isso faz os listeners (onSnapshot)
  // demorarem MUITO para disparar a primeira vez e as escritas (setDoc) custarem a
  // propagar. Forçar long-polling usa HTTP simples e resolve a latência no RN/Expo.
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

let analytics;
isSupported().then(yes => {
  if (yes) analytics = getAnalytics(app);
});

export { app, auth, db, analytics };
export const googleProvider = new GoogleAuthProvider();
