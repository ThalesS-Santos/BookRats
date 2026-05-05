import { usePopupStore } from '../../../store/usePopupStore';
import { addBook as apiAddBook, updateBookProgress, markAsDNF as apiMarkAsDNF, updateBookStatus as apiUpdateBookStatus } from '@core/api/books';
import { db } from '@core/firebase/firebase';
import { doc, collection, onSnapshot, updateDoc } from 'firebase/firestore';
import { BOOK_STATUS, VALID_STATUSES } from '../../constants/bookStatus';

/**
 * Library Slice handles all book-related logic.
 * 
 * @param {Function} set
 * @param {Function} get
 */
export const createLibrarySlice = (set, get) => ({
  books: [],
  loadingBooks: true,
  streak: 0,
  totalPagesRead: 0,
  lastReadDate: null,
  maxReadingSession: 0,
  lastReadingSession: 0,
  totalBooksCompleted: 0,
  repairLocked: false,

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

        if (get().repairLocked) return;

        const summary = data.socialSummary || {};
        const dbTotal = Number(data.total_pages_read || 0);
        const dbStreak = Number(data.current_streak || 0);
        const sumTotal = Number(summary.totalPagesRead || 0);
        const sumStreak = Number(summary.currentStreak || 0);

        const isMissingSummary = !data.socialSummary;
        const needsRepair = isMissingSummary || 
                            sumTotal !== dbTotal || 
                            sumStreak !== dbStreak;

        if (needsRepair) {
          set({ repairLocked: true }); 
          
          updateDoc(userDocRef, {
            total_pages_read: data.total_pages_read ?? 0,
            current_streak: data.current_streak ?? 0,
            socialSummary: {
              totalPagesRead: dbTotal,
              currentStreak: dbStreak,
              lastBookTitle: summary.lastBookTitle || "Recém chegado",
              lastActive: data.last_reading_date || new Date().toISOString().split('T')[0],
              profilePic: data.profilePic || null
            }
          }).then(() => {}).catch(err => {
            console.error("🩺 Repair error:", err);
            set({ repairLocked: false });
          });
        }
      }
    });

    // Listen for books sub-collection
    const booksColRef = collection(db, 'users', uid, 'books');
    const unsubBooks = onSnapshot(booksColRef, (querySnap) => {
      const booksList = querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sortedBooks = booksList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      set({ books: sortedBooks, loadingBooks: false });
    }, (error) => {
      console.error("Error fetching books:", error);
      set({ loadingBooks: false });
    });

    return () => {
      unsubUser();
      unsubBooks();
    };
  },

  addBook: async (title, totalPages, id = null, description = '', extraMetadata = {}, status = BOOK_STATUS.WANT_TO_READ) => {
    const { user, books } = get();
    if (!user) return;

    // 🛡️ Status Validation (Etapa 2)
    if (!VALID_STATUSES.includes(status)) {
      console.warn(`[Library] Invalid status provided: ${status}. Defaulting to WANT_TO_READ.`);
      status = BOOK_STATUS.WANT_TO_READ;
    }

    if (id && books.some(b => b.id === id)) {
      console.warn(`[Library Integrity] Duplicate ID detected: ${id}. Skipping.`);
      return;
    }

    try {
      await apiAddBook(user.uid, title, totalPages, id, description, extraMetadata, status);
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
        const { useSocialStore } = require('../../../store/useSocialStore');
        const groups = useSocialStore.getState().groups || [];
        const userName = user.displayName || user.email.split('@')[0];

        for (const group of groups) {
          if (get().sendMessage) {
            await get().sendMessage(group.id, {
              text: `🔥 @${userName} acaba de ler ${res.pagesReadToday} páginas de "${book.title}"!`,
              type: 'system_notification',
              pagesRead: res.pagesReadToday,
              bookTitle: book.title
            });
          }
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
      await apiMarkAsDNF(user.uid, bookId, BOOK_STATUS.DROPPED);
    } catch (error) {
      console.error(error.message);
    }
  },

  updateBook: async (bookId, updates) => {
    const { user, books } = get();
    if (!user) return;

    const previousBooks = [...books];
    const updatedBooks = books.map(b => b.id === bookId ? { ...b, ...updates } : b);
    set({ books: updatedBooks });

    try {
      const { updateBook: apiUpdateBook } = require('@core/api/books');
      await apiUpdateBook(user.uid, bookId, updates);
    } catch (error) {
      console.error(`[Library] Failed to update book ${bookId}:`, error.message);
      set({ books: previousBooks });
      usePopupStore.getState().showPopup({
        title: 'Erro ao Salvar',
        message: 'Não foi possível salvar as alterações.',
        type: 'error'
      });
    }
  },

  updateBookStatus: async (bookId, status) => {
    // 🛡️ Pre-validation
    if (!VALID_STATUSES.includes(status)) return;
    return get().updateBook(bookId, { status });
  },
});
