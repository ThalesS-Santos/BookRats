import { usePopupStore } from '../../../store/usePopupStore';
import { addBook as apiAddBook, updateBookProgress, markAsDNF as apiMarkAsDNF, updateBookStatus as apiUpdateBookStatus } from '@core/api/books';
import { db } from '@core/firebase/firebase';
import { doc, collection, onSnapshot, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { BOOK_STATUS, VALID_STATUSES } from '../../constants/bookStatus';
import { getLocalDateString } from '@utils/streak';
import { Logger } from '../../services/Logger';

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
              lastActive: data.last_reading_date || getLocalDateString(),
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
      Logger.warn(`[Library Integrity] Duplicate ID detected: ${id}. Skipping.`);
      return;
    }

    // 🛡️ Strict Status Validation
    if (!status || !VALID_STATUSES.includes(status)) {
      Logger.warn(`[Library] Invalid or missing status: ${status}. Defaulting to WANT_TO_READ.`);
      status = BOOK_STATUS.WANT_TO_READ;
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

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    // 🚀 Automatic State Transitions Logic
    let finalUpdates = { ...updates };
    let pageDelta = 0;

    if (finalUpdates.currentPage !== undefined) {
      pageDelta = finalUpdates.currentPage - book.currentPage;
      
      // 1. If currentPage >= totalPages -> Set Status to READ
      if (finalUpdates.currentPage >= book.totalPages) {
        finalUpdates.status = BOOK_STATUS.READ;
      }
      // 2. If it was READ but now current < total -> Revert to READING
      else if (book.status === BOOK_STATUS.READ) {
        finalUpdates.status = BOOK_STATUS.READING;
      }
    }

    // 3. If status is manually set to READ -> Jump progress to 100%
    if (finalUpdates.status !== undefined) {
      if (!VALID_STATUSES.includes(finalUpdates.status)) {
        Logger.error(`[Library] Aborted update: Invalid status "${finalUpdates.status}" for book ${bookId}`);
        return;
      }

      if (finalUpdates.status === BOOK_STATUS.READ && book.status !== BOOK_STATUS.READ) {
        // Auto-fill progress if totalPages is known
        if (book.totalPages > 0) {
          finalUpdates.currentPage = book.totalPages;
          pageDelta = book.totalPages - book.currentPage;
        }
        finalUpdates.completedAt = new Date().toISOString();
      }
    }

    const previousBooks = [...books];
    const updatedBooks = books.map(b => b.id === bookId ? { ...b, ...finalUpdates } : b);
    
    // 1. Optimistic Update (UI reacts instantly)
    set({ books: updatedBooks });

    // 2. Background Sync
    try {
      const { updateBook: apiUpdateBook } = require('@core/api/books');
      await apiUpdateBook(user.uid, bookId, {
        ...finalUpdates,
        updatedAt: serverTimestamp()
      });

      // 📈 Update User Stats if pages changed (handled in background)
      if (pageDelta !== 0 || finalUpdates.status !== undefined) {
        const { db } = require('@core/firebase/firebase');
        const { doc, updateDoc, increment } = require('firebase/firestore');
        const userRef = doc(db, 'users', user.uid);
        
        const wasRead = book.status === BOOK_STATUS.READ;
        const isRead = finalUpdates.status === BOOK_STATUS.READ;
        const completedIncrement = (isRead && !wasRead) ? 1 : (!isRead && wasRead) ? -1 : 0;

        await updateDoc(userRef, {
          total_pages_read: increment(pageDelta),
          total_books_completed: increment(completedIncrement),
          'socialSummary.totalPagesRead': increment(pageDelta),
          'socialSummary.lastActive': getLocalDateString()
        });

        // 🌟 Add Global Reading Log if progress increased
        if (pageDelta > 0) {
          const { addReadingLog } = require('@core/api/books');
          await addReadingLog(user.uid, bookId, pageDelta);
        }
      }
    } catch (error) {
      // 3. Rollback Mechanism on failure
      Logger.error(`[Library Sync] Failed to update book ${bookId}. Rolling back.`, error);
      set({ books: previousBooks });
      
      usePopupStore.getState().showPopup({
        title: 'Erro de Sincronização',
        message: 'Não foi possível salvar as alterações na nuvem. O estado local foi revertido.',
        type: 'error'
      });
    }
  },

  updateBookStatus: async (bookId, status) => {
    // 🛡️ Pre-validation
    if (!VALID_STATUSES.includes(status)) return;
    return get().updateBook(bookId, { status });
  },

  removeBook: async (bookId) => {
    const { user, books } = get();
    if (!user) return;

    const previousBooks = [...books];
    set({ books: books.filter(b => b.id !== bookId) });

    try {
      const { deleteBook } = require('@core/api/books');
      await deleteBook(user.uid, bookId);
    } catch (error) {
      set({ books: previousBooks });
      usePopupStore.getState().showPopup({
        title: 'Erro ao Excluir',
        message: 'Não foi possível excluir o livro da sua biblioteca.',
        type: 'error'
      });
    }
  },
});
