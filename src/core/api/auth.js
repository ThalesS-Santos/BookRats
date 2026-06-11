import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithCredential,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

import { auth, db } from '@core/firebase/firebase';
import { createLogger } from '@core/observability';

const log = createLogger('core.api.auth');

export const signUp = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const username = email.split('@')[0];

    // Initialize user document in Firestore. socialSummary is seeded here so a
    // brand-new account never triggers the client-side self-repair (which would
    // otherwise hit the ranking-protected update rule on first load).
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      username,
      username_lowercase: username.toLowerCase(),
      total_pages_read: 0,
      current_streak: 0,
      total_books_completed: 0,
      last_reading_date: null,
      socialSummary: {
        totalPagesRead: 0,
        currentStreak: 0,
        lastBookTitle: 'Recém chegado',
        lastActive: null,
        profilePic: null,
      },
      createdAt: serverTimestamp(),
    });

    return userCredential.user;
  } catch (error) {
    throw log.failure(error, {
      op: 'signUp',
      action: 'create',
      resource: 'auth/email',
      context: { email },
    });
  }
};

export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    return userCredential.user;
  } catch (error) {
    throw log.failure(error, {
      op: 'signIn',
      action: 'authenticate',
      resource: 'auth/email',
      context: { email },
    });
  }
};

export const signInWithGoogle = async idToken => {
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
        total_books_completed: 0,
        last_reading_date: null,
        socialSummary: {
          totalPagesRead: 0,
          currentStreak: 0,
          lastBookTitle: 'Recém chegado',
          lastActive: null,
          profilePic: user.photoURL || null,
        },
        createdAt: serverTimestamp(),
      });
    }
    return user;
  } catch (error) {
    throw log.failure(error, {
      op: 'signInWithGoogle',
      action: 'authenticate',
      resource: 'auth/google',
    });
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw log.failure(error, { op: 'signOut', action: 'authenticate' });
  }
};

export const updatePresence = async (uid, isOnline) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(
      userRef,
      {
        isOnline,
        lastActive: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    log.exception(error, {
      op: 'updatePresence',
      action: 'write',
      resource: `users/${uid}`,
      context: { uid, isOnline },
    });
  }
};

export const updateReadingStatus = async (uid, bookTitle) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(
      userRef,
      {
        currentReadingBook: bookTitle || null,
      },
      { merge: true },
    );
  } catch (error) {
    log.exception(error, {
      op: 'updateReadingStatus',
      action: 'write',
      resource: `users/${uid}`,
      context: { uid, bookTitle },
    });
  }
};
