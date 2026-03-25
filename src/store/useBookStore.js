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
import { signUp as apiSignUp, signIn as apiSignIn, signInWithGoogle as apiSignInWithGoogle, signOut as apiSignOut, updatePresence as apiUpdatePresence, updateReadingStatus as apiUpdateReadingStatus } from '../api/auth';
import { addBook as apiAddBook, updateBookProgress, markAsDNF as apiMarkAsDNF } from '../api/books';

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
      await apiSignUp(email, password);
    } catch (error) {
      set({ authError: error.message, loading: false });
    }
  },

  signIn: async (email, password) => {
    try {
      set({ loading: true, authError: null });
      await apiSignIn(email, password);
    } catch (error) {
      set({ authError: error.message, loading: false });
    }
  },

  signInWithGoogle: async (idToken) => {
    try {
      set({ loading: true, authError: null });
      await apiSignInWithGoogle(idToken);
    } catch (error) {
      set({ authError: error.message, loading: false });
    }
  },

  signOut: async () => {
    try {
      await apiSignOut();
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
      await apiAddBook(user.uid, title, totalPages);
    } catch (error) {
      console.error(error.message);
    }
  },

  updateProgress: async (bookId, newPage, timeSeconds) => {
    const { user, streak, lastReadDate, totalPagesRead, books } = get();
    if (!user) return;

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    try {
      const res = await updateBookProgress(user.uid, book, newPage, timeSeconds, { streak, lastReadDate, totalPagesRead });
      
      // Automated Group Notification
      try {
        const { useSocialStore } = require('./useSocialStore');
        const groups = useSocialStore.getState().groups || [];
        const userName = user.displayName || user.email.split('@')[0];

        for (const group of groups) {
          await get().sendMessage(group.id, {
            text: `🔥 @${userName} acaba de ler ${res.pagesReadToday} páginas de "${book.title}"!`,
            type: 'system_notification',
            pagesRead: res.pagesReadToday,
            bookTitle: book.title
          });
        }
      } catch (e) {
        console.warn("Could not send group notification:", e.message);
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  },

  markAsDNF: async (bookId) => {
    const { user } = get();
    if (!user) return;
    try {
      await apiMarkAsDNF(user.uid, bookId);
    } catch (error) {
      console.error(error.message);
    }
  },

  // Social & Presence Actions
  updatePresence: async (isOnline) => {
    const { user } = get();
    if (!user) return;
    try {
      await apiUpdatePresence(user.uid, isOnline);
    } catch (error) {
      console.error("Error updating presence:", error);
    }
  },

  updateReadingStatus: async (bookTitle) => {
    const { user } = get();
    if (!user) return;
    try {
      await apiUpdateReadingStatus(user.uid, bookTitle);
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
