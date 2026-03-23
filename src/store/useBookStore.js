import { create } from 'zustand';
import { auth, db, googleProvider } from '../services/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  arrayUnion,
  addDoc,
  orderBy
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithCredential,
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
  users: [],
  messages: [],
  chatError: null,
  rankingError: null,

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

  signInWithGoogle: async (idToken) => {
    try {
      set({ loading: true, authError: null });
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
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

      // Automated Group Notification
      const userName = user.displayName || user.email.split('@')[0];
      await get().sendMessage('squad-geral', {
        text: `🔥 @${userName} acaba de ler ${pagesReadToday} páginas de "${book.title}"!`,
        type: 'system_notification',
        pagesRead: pagesReadToday,
        bookTitle: book.title
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

  // Social & Presence Actions
  updatePresence: async (isOnline) => {
    const { user } = get();
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isOnline,
        lastActive: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating presence:", error);
    }
  },

  updateReadingStatus: async (bookTitle) => {
    const { user } = get();
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        currentReadingBook: bookTitle || null
      });
    } catch (error) {
      console.error("Error updating reading status:", error);
    }
  },

  subscribeToGroupMessages: (groupId = 'squad-geral') => {
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));
    
    set({ chatError: null }); // Reset
    const unsub = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ messages: messagesList, chatError: null });
    }, (error) => {
      set({ chatError: error.message });
      console.log("Firestore (Group Messages):", error.message);
    });

    return unsub;
  },

  subscribeToUsers: () => {
    const usersRef = collection(db, 'users');
    set({ rankingError: null }); // Reset
    const unsub = onSnapshot(usersRef, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ users: usersList, rankingError: null });
    }, (error) => {
      set({ rankingError: error.message });
      console.log("Firestore (Users):", error.message);
    });

    return unsub;
  },

  sendMessage: async (groupId = 'squad-geral', messageData) => {
    const { user } = get();
    if (!user) return;

    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      const senderName = user.displayName || user.email.split('@')[0];
      
      const isString = typeof messageData === 'string';
      const text = isString ? messageData : messageData.text;
      const type = isString ? 'text' : (messageData.type || 'text');

      await addDoc(messagesRef, {
        text,
        senderId: user.uid,
        senderName: senderName,
        timestamp: serverTimestamp(),
        type,
        ...(isString ? {} : messageData)
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  },
}));
