import { getLocalDateString } from '@utils/streak';
import {
  doc,
  collection,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';

import {
  addBook as apiAddBook,
  updateBookProgress,
  markAsDNF as apiMarkAsDNF,
  updateBook as apiUpdateBook,
  addReadingLog,
  deleteBook,
} from '@core/api/books';
import { db, auth } from '@core/firebase/firebase';
import { createLogger } from '@core/observability';

import { usePopupStore } from '../../../store/usePopupStore';
import { useSocialStore } from '../../../store/useSocialStore';
import { BOOK_STATUS, VALID_STATUSES } from '../../constants/bookStatus';
import { MilestoneService } from '../../services/MilestoneService';

const log = createLogger('core.store.library');

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
  // Counts permission-denied repair attempts this session so a cold-start
  // auth/Firestore race can retry, but a genuine denial stops after a cap.
  repairAttempts: 0,
  // Lifetime achievements already announced to group chats ({ [id]: true }).
  announcedMilestones: {},

  fetchUserData: uid => {
    // Listen for user stats
    const userDocRef = doc(db, 'users', uid);
    const unsubUser = onSnapshot(
      userDocRef,
      docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          set({
            streak: data.current_streak || 0,
            totalPagesRead: data.total_pages_read || 0,
            lastReadDate: data.last_reading_date || null,
            maxReadingSession: data.max_reading_session || 0,
            lastReadingSession: data.last_reading_session || 0,
            totalBooksCompleted: data.total_books_completed || 0,
          });

          if (get().repairLocked) return;

          const summary = data.socialSummary || {};
          const dbTotal = Number(data.total_pages_read || 0);
          const dbStreak = Number(data.current_streak || 0);
          const sumTotal = Number(summary.totalPagesRead || 0);
          const sumStreak = Number(summary.currentStreak || 0);

          const isMissingSummary = !data.socialSummary;
          const needsRepair =
            isMissingSummary || sumTotal !== dbTotal || sumStreak !== dbStreak;

          if (needsRepair) {
            set({ repairLocked: true });

            // ⏳ Force an Auth token fetch BEFORE the write. On cold start the
            // Firestore channel can otherwise send the very first write before
            // the credential attaches, yielding a spurious permission-denied.
            const ensureAuthReady = auth?.currentUser
              ? auth.currentUser.getIdToken().catch(() => {})
              : Promise.resolve();

            ensureAuthReady
              .then(() =>
                updateDoc(userDocRef, {
                  total_pages_read: data.total_pages_read ?? 0,
                  current_streak: data.current_streak ?? 0,
                  socialSummary: {
                    totalPagesRead: dbTotal,
                    currentStreak: dbStreak,
                    lastBookTitle: summary.lastBookTitle || 'Recém chegado',
                    lastActive: data.last_reading_date || getLocalDateString(),
                    profilePic: data.profilePic || null,
                  },
                }),
              )
              .then(() => {
                // ✅ Release the lock and reset the retry counter on success so
                // future desyncs can still be repaired in this session.
                set({ repairLocked: false, repairAttempts: 0 });
              })
              .catch(err => {
                const isPermission =
                  err.code === 'permission-denied' ||
                  (err.message || '').includes(
                    'Missing or insufficient permissions',
                  );

                const attempts = (get().repairAttempts || 0) + 1;
                const MAX_REPAIR_ATTEMPTS = 5;
                const givingUp =
                  isPermission && attempts >= MAX_REPAIR_ATTEMPTS;

                // 🕓 On cold start the Firestore write can fire before the Auth
                // token finishes attaching, yielding a transient permission
                // error. Release the lock so the next snapshot (once the token
                // is ready) retries — but cap retries so a genuine denial does
                // not spam forever.
                if (givingUp) {
                  set({ repairAttempts: attempts }); // keep lock → stop retrying
                } else {
                  set({ repairLocked: false, repairAttempts: attempts });
                }

                log.exception(err, {
                  op: 'repairSocialSummary',
                  action: 'update',
                  resource: `users/${uid}`,
                  level: isPermission && !givingUp ? 'WARN' : 'ERROR',
                  message: givingUp
                    ? 'Social-summary repair giving up after retries'
                    : 'Social-summary repair failed',
                  context: {
                    uid,
                    attempt: attempts,
                    maxAttempts: MAX_REPAIR_ATTEMPTS,
                    coldStartRace: isPermission,
                    attempted: {
                      total_pages_read: data.total_pages_read ?? 0,
                      current_streak: data.current_streak ?? 0,
                      socialSummary: {
                        totalPagesRead: dbTotal,
                        currentStreak: dbStreak,
                      },
                    },
                  },
                });
              });
          }
        }
      },
      error => {
        log.exception(error, {
          op: 'fetchUserData.userStats',
          action: 'listen',
          resource: `users/${uid}`,
          context: { uid },
        });
      },
    );

    // Listen for books sub-collection
    const booksColRef = collection(db, 'users', uid, 'books');
    const unsubBooks = onSnapshot(
      booksColRef,
      querySnap => {
        const booksList = querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sortedBooks = booksList.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
        set({ books: sortedBooks, loadingBooks: false });
      },
      error => {
        log.exception(error, {
          op: 'fetchUserData.books',
          action: 'listen',
          resource: `users/${uid}/books`,
          context: { uid },
        });
        set({ loadingBooks: false });
      },
    );

    return () => {
      unsubUser();
      unsubBooks();
    };
  },

  addBook: async (
    title,
    totalPages,
    id = null,
    description = '',
    extraMetadata = {},
    status,
  ) => {
    const { user, books } = get();
    if (!user) return;

    // 🛡️ Strict Status Validation (Etapa 2)
    if (!status || !VALID_STATUSES.includes(status)) {
      log.error('Aborted addBook: invalid or missing status', {
        op: 'addBook',
        code: 'BR_VALIDATION',
        category: 'VALIDATION',
        context: { status, title },
      });
      return;
    }

    if (id && books.some(b => b.id === id)) {
      log.warn('Aborted addBook: duplicate book id', {
        op: 'addBook',
        code: 'BR_VALIDATION',
        category: 'VALIDATION',
        context: { bookId: id },
      });
      return;
    }

    try {
      await apiAddBook(
        user.uid,
        title,
        totalPages,
        id,
        description,
        extraMetadata,
        status,
      );
    } catch (error) {
      usePopupStore.getState().showPopup({
        title: 'Erro ao Adicionar',
        message: error.message,
        type: 'error',
      });
    }
  },

  updateProgress: async (bookId, newPage, timeSeconds) => {
    const { user, streak, lastReadDate, totalPagesRead, books } = get();
    if (!user) return;

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    try {
      const res = await updateBookProgress(
        user.uid,
        book,
        newPage,
        timeSeconds,
        {
          streak,
          lastReadDate,
          totalPagesRead,
          maxReadingSession: get().maxReadingSession,
          totalBooksCompleted: get().totalBooksCompleted,
        },
      );

      // 🏆 Milestone announcements (replaces the old per-update chat spam).
      // Only fires on real, lifetime landmarks + per-book completion.
      try {
        const groups = useSocialStore.getState().groups || [];
        if (groups.length > 0 && get().sendMessage) {
          const userName = user.displayName || user.email.split('@')[0];
          const announced = get().announcedMilestones || {};

          const { messages, newlyAnnounced } = MilestoneService.detect(
            {
              sessionSeconds: res.sessionSeconds,
              sessionPages: res.pagesReadToday,
              totalPagesRead: res.newTotalPagesRead,
              totalBooksCompleted: res.newTotalBooksCompleted,
              streak: res.newStreak,
            },
            announced,
            userName,
          );

          const chatMessages = [...messages];

          // Per-book completion message (not deduped — fires each completion).
          if (res.justCompleted) {
            const bookSeconds =
              (book.logs || []).reduce(
                (sum, log) => sum + (log.timeSeconds || 0),
                0,
              ) + (res.sessionSeconds || 0);
            chatMessages.push(
              MilestoneService.buildCompletionMessage(
                userName,
                book.title,
                bookSeconds,
              ),
            );
          }

          if (chatMessages.length > 0) {
            for (const group of groups) {
              for (const text of chatMessages) {
                await get().sendMessage(group.id, {
                  text,
                  type: 'system_notification',
                });
              }
            }
          }

          // Persist newly-reached lifetime milestones so they never re-fire.
          if (newlyAnnounced.length > 0) {
            const updated = { ...announced };
            newlyAnnounced.forEach(id => {
              updated[id] = true;
            });
            set({ announcedMilestones: updated });
          }
        }
      } catch (e) {
        log.exception(e, {
          op: 'updateProgress.milestones',
          action: 'write',
          level: 'WARN',
          message: 'Could not send milestone notification',
          context: { bookId },
        });
      }
    } catch (error) {
      log.exception(error, {
        op: 'updateProgress',
        action: 'update',
        resource: `users/${user.uid}/books/${bookId}`,
        context: { bookId, newPage },
      });
      usePopupStore.getState().showPopup({
        title: 'Erro ao Salvar',
        message: error.message,
        type: 'error',
      });
    }
  },

  markAsDNF: async bookId => {
    const { user } = get();
    if (!user) return;
    try {
      await apiMarkAsDNF(user.uid, bookId, BOOK_STATUS.DROPPED);
    } catch (error) {
      log.exception(error, {
        op: 'markAsDNF',
        action: 'update',
        resource: `users/${user.uid}/books/${bookId}`,
        context: { bookId },
      });
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
        log.error('Aborted updateBook: invalid status', {
          op: 'updateBook',
          code: 'BR_VALIDATION',
          category: 'VALIDATION',
          context: { bookId, status: finalUpdates.status },
        });
        return;
      }

      if (
        finalUpdates.status === BOOK_STATUS.READ &&
        book.status !== BOOK_STATUS.READ
      ) {
        // Auto-fill progress if totalPages is known
        if (book.totalPages > 0) {
          finalUpdates.currentPage = book.totalPages;
          pageDelta = book.totalPages - book.currentPage;
        }
        finalUpdates.completedAt = new Date().toISOString();
      }
    }

    const previousBooks = [...books];
    const updatedBooks = books.map(b =>
      b.id === bookId ? { ...b, ...finalUpdates } : b,
    );

    // 1. Optimistic Update (UI reacts instantly)
    set({ books: updatedBooks });

    // 2. Background Sync
    try {
      await apiUpdateBook(user.uid, bookId, {
        ...finalUpdates,
        updatedAt: serverTimestamp(),
      });

      // 📈 Update User Stats if pages changed (handled in background)
      if (pageDelta !== 0 || finalUpdates.status !== undefined) {
        const userRef = doc(db, 'users', user.uid);

        const wasRead = book.status === BOOK_STATUS.READ;
        const isRead = finalUpdates.status === BOOK_STATUS.READ;
        const completedIncrement =
          isRead && !wasRead ? 1 : !isRead && wasRead ? -1 : 0;

        await updateDoc(userRef, {
          total_pages_read: increment(pageDelta),
          total_books_completed: increment(completedIncrement),
          'socialSummary.totalPagesRead': increment(pageDelta),
          'socialSummary.lastActive': getLocalDateString(),
        });

        // 🌟 Add Global Reading Log if progress increased
        if (pageDelta > 0) {
          await addReadingLog(user.uid, bookId, pageDelta);
        }
      }
    } catch (error) {
      // 3. Rollback Mechanism on failure
      log.exception(error, {
        op: 'updateBook',
        action: 'update',
        resource: `users/${user.uid}/books/${bookId}`,
        message: 'Book update failed — rolling back optimistic state',
        context: { bookId, pageDelta, rolledBack: true },
      });
      set({ books: previousBooks });

      usePopupStore.getState().showPopup({
        title: 'Erro de Sincronização',
        message:
          'Não foi possível salvar as alterações na nuvem. O estado local foi revertido.',
        type: 'error',
      });
    }
  },

  updateBookStatus: async (bookId, status) => {
    return get().updateBook(bookId, { status });
  },

  removeBook: async bookId => {
    const { user, books } = get();
    if (!user) return;

    const previousBooks = [...books];
    set({ books: books.filter(b => b.id !== bookId) });

    try {
      await deleteBook(user.uid, bookId);
    } catch (error) {
      set({ books: previousBooks });
      usePopupStore.getState().showPopup({
        title: 'Erro ao Excluir',
        message: 'Não foi possível excluir o livro da sua biblioteca.',
        type: 'error',
      });
    }
  },
});

/**
 * 🎯 Zustand Memoized Selectors (Etapa 2)
 * Centralizes filtering logic for performance and clean UI code.
 * 🛡️ Defensive fallbacks added to prevent undefined crashes during hydration.
 */
export const selectReadingBooks = state =>
  (state.books || []).filter(b => b.status === BOOK_STATUS.READING);

export const selectReadBooks = state =>
  (state.books || []).filter(b => b.status === BOOK_STATUS.READ);

export const selectWishlistBooks = state =>
  (state.books || []).filter(
    b =>
      b.status === BOOK_STATUS.WANT_TO_READ ||
      b.status === BOOK_STATUS.WISH_LIST,
  );

export const selectBooksByStatus = status => state =>
  (state.books || []).filter(b => b.status === status);
