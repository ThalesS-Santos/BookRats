import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

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

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with Offline Persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager() // Correct for web/hybrid, works for RN
  })
});
