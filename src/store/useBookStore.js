import { create } from 'zustand';
import { auth, db } from '../services/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';

// Helper for streak logic
const calculateStreak = (lastDateStr, newDateStr, currentStreak) => {
  if (!lastDateStr) return 1;
  const lastDate = new Date(lastDateStr);
  const newDate = new Date(newDateStr);

  const diffTime = Math.abs(newDate.setHours(0, 0, 0, 0) - lastDate.setHours(0, 0, 0, 0));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return currentStreak + 1;
  if (diffDays === 0) return currentStreak;
  return 1;
};

export const useBookStore = create((set, get) => ({
  books: [],
  user: null,
  loading: true,
  streak: 0,
  totalPagesRead: 0,
  lastReadDate: null,
  authError: null,

  // Auth Actions
  setAuthUser: (user) => {
    set({ user, loading: false });
    if (user) {
      get().fetchUserData(user.uid);
    } else {
      set({ books: [], streak: 0, totalPagesRead: 0, lastReadDate: null });
    }
  },

  signUp: async (email, password) => {
    try {
      set({ loading: true, authError: null });
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Initialize user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        total_pages_read: 0,
        current_streak: 0,
        last_reading_date: null,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      set({ authError: error.message, loading: false });
    }
  },

  signIn: async (email, password) => {
    try {
      set({ loading: true, authError: null });
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      set({ authError: error.message, loading: false });
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ loading: true, authError: null });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user document exists, if not, create it
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          total_pages_read: 0,
          current_streak: 0,
          last_reading_date: null,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      set({ authError: error.message, loading: false });
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  },

  // Firestore Sync
  fetchUserData: (uid) => {
    // Listen for user stats
    const userDocRef = doc(db, 'users', uid);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        set({
          streak: data.current_streak || 0,
          totalPagesRead: data.total_pages_read || 0,
          lastReadDate: data.last_reading_date || null
        });
      }
    });

    // Listen for books sub-collection
    const booksColRef = collection(db, 'users', uid, 'books');
    const unsubBooks = onSnapshot(booksColRef, (querySnap) => {
      const booksList = querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
      set({ books: booksList });
    });

    return () => {
      unsubUser();
      unsubBooks();
    };
  },

  addBook: async (title, totalPages) => {
    const { user } = get();
    if (!user) return;

    try {
      const bookRef = doc(collection(db, 'users', user.uid, 'books'));
      await setDoc(bookRef, {
        title,
        totalPages: parseInt(totalPages, 10),
        currentPage: 0,
        status: 'reading',
        logs: [],
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding book:", error);
    }
  },

  updateProgress: async (bookId, newPage, timeSeconds) => {
    const { user, streak, lastReadDate, totalPagesRead, books } = get();
    if (!user) return;

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newStreak = calculateStreak(lastReadDate, todayStr, streak);
    const pagesReadToday = Math.max(0, newPage - book.currentPage);
    const isCompleted = newPage >= book.totalPages;

    try {
      // Update book progress
      const bookRef = doc(db, 'users', user.uid, 'books', bookId);
      await updateDoc(bookRef, {
        currentPage: newPage,
        status: isCompleted ? 'completed' : book.status,
        logs: arrayUnion({
          date: todayStr,
          pagesRead: pagesReadToday,
          timeSeconds,
          pagesPerHour: timeSeconds > 0 ? Math.round((pagesReadToday / timeSeconds) * 3600) : 0
        })
      });

      // Update user stats
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        total_pages_read: totalPagesRead + pagesReadToday,
        current_streak: newStreak,
        last_reading_date: todayStr
      });
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  },

  markAsDNF: async (bookId) => {
    const { user } = get();
    if (!user) return;

    try {
      const bookRef = doc(db, 'users', user.uid, 'books', bookId);
      await updateDoc(bookRef, { status: 'dnf' });
    } catch (error) {
      console.error("Error marking as DNF:", error);
    }
  },
}));
