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
import { usePopupStore } from './usePopupStore';

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
  maxReadingSession: 0,
  lastReadingSession: 0,
  totalBooksCompleted: 0,

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
      usePopupStore.getState().showPopup({
        title: 'Erro no Cadastro',
        message: error.message,
        type: 'error'
      });
    }
  },

  signIn: async (email, password) => {
    try {
      set({ loading: true, authError: null });
      await apiSignIn(email, password);
    } catch (error) {
      set({ authError: error.message, loading: false });
      usePopupStore.getState().showPopup({
        title: 'Erro no Login',
        message: error.message,
        type: 'error'
      });
    }
  },

  signInWithGoogle: async (idToken) => {
    try {
      set({ loading: true, authError: null });
      await apiSignInWithGoogle(idToken);
    } catch (error) {
      set({ authError: error.message, loading: false });
      usePopupStore.getState().showPopup({
        title: 'Erro no Google',
        message: error.message,
        type: 'error'
      });
    }
  },

  signOut: async () => {
    try {
      const uid = get().user?.uid;
      if (uid) {
        await get().updatePresence(false, uid);
      }
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
          lastReadDate: data.last_reading_date || null,
          maxReadingSession: data.max_reading_session || 0,
          lastReadingSession: data.last_reading_session || 0,
          totalBooksCompleted: data.total_books_completed || 0
        });
      }
    });

    // Listen for books sub-collection
    const booksColRef = collection(db, 'users', uid, 'books');
    const unsubBooks = onSnapshot(booksColRef, (querySnap) => {
      const booksList = querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordena livros por data de criação / mais recentes primeiro
      const sortedBooks = booksList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      set({ books: sortedBooks, loading: false });
    }, (error) => {
      console.error("Error fetching books:", error);
      set({ loading: false });
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
      usePopupStore.getState().showPopup({
        title: 'Erro ao Adicionar',
        message: error.message,
        type: 'error'
      });
    }
  },

  updateProgress: async (bookId, newPage, timeSeconds) => {
    const { user, streak, lastReadDate, totalPagesRead, books } = get();
    if (!user) return;

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    try {
      const res = await updateBookProgress(user.uid, book, newPage, timeSeconds, { 
        streak, 
        lastReadDate, 
        totalPagesRead,
        maxReadingSession: get().maxReadingSession,
        totalBooksCompleted: get().totalBooksCompleted
      });
      
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
      usePopupStore.getState().showPopup({
        title: 'Erro ao Salvar',
        message: error.message,
        type: 'error'
      });
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
  updatePresence: async (isOnline, overrideUid = null) => {
    const targetUid = overrideUid || get().user?.uid;
    if (!targetUid) return;
    try {
      await apiUpdatePresence(targetUid, isOnline);
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
      set({ chatError: "Erro ao carregar mensagens. Verifique se você é membro deste grupo e as regras do Firestore." });
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
      usePopupStore.getState().showPopup({
        title: 'Erro no Chat',
        message: error.message,
        type: 'error'
      });
    }
  },
}));
