import { auth, db } from '../services/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithCredential,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const signUp = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const username = email.split('@')[0];
    
    // Initialize user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      username,
      username_lowercase: username.toLowerCase(),
      total_pages_read: 0,
      current_streak: 0,
      last_reading_date: null,
      createdAt: serverTimestamp()
    });
    
    return userCredential.user;
  } catch (error) {
    console.error("Sign up error:", error);
    throw new Error(error.message);
  }
};

export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Sign in error:", error);
    throw new Error(error.message);
  }
};

export const signInWithGoogle = async (idToken) => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const user = result.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const username = user.displayName || user.email.split('@')[0];
      await setDoc(userDocRef, {
        email: user.email,
        username,
        username_lowercase: username.toLowerCase(),
        total_pages_read: 0,
        current_streak: 0,
        last_reading_date: null,
        createdAt: serverTimestamp()
      });
    }
    return user;
  } catch (error) {
    console.error("Google sign in error:", error);
    throw new Error(error.message);
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw new Error(error.message);
  }
};

export const updatePresence = async (uid, isOnline) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isOnline,
      lastActive: serverTimestamp()
    });
  } catch (error) {
    console.error("Presence update error:", error);
  }
};

export const updateReadingStatus = async (uid, bookTitle) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      currentReadingBook: bookTitle || null
    });
  } catch (error) {
    console.error("Reading status update error:", error);
  }
};
