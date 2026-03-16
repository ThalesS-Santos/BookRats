import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with Persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore (Defaults to memory cache on React Native)
export const db = getFirestore(app);
