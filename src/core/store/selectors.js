import { BOOK_STATUS } from '../constants/bookStatus';

/**
 * 🎯 Centralized, pure Zustand selectors (Fase 3 — Etapa 13).
 *
 * Single source of truth for derived reads. Each selector is a pure function of
 * `state` (no side effects, no new closures over external mutable data), so the
 * UI can subscribe predictably. Selectors that return arrays/objects are stable
 * per-input but allocate a new reference each call — ALWAYS consume those with
 * `useShallow` (or `useMemo`) to avoid the infinite re-render trap in Zustand v5.
 *
 * 🛡️ Defensive `state.books || []` fallbacks guard the hydration window where the
 * persisted slice has not rehydrated yet.
 */

// --- Library: books by status -------------------------------------------------

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

/**
 * Curried selector: `selectBooksByStatus(status)(state)`.
 * Kept curried for call sites that filter by a dynamic status value.
 */
export const selectBooksByStatus = status => state =>
  (state.books || []).filter(b => b.status === status);

// --- Library: counts ----------------------------------------------------------

/**
 * selectCountsByStatus
 * Single source for the library filter badges. Returns the count map the Home
 * filter bar consumes. Consume with `useShallow` — the object reference changes
 * every call but its values are shallow-comparable.
 */
export const selectCountsByStatus = state => {
  const books = state.books || [];
  let reading = 0;
  let wantToRead = 0;
  let read = 0;
  let wishlist = 0;

  for (const b of books) {
    switch (b.status) {
      case BOOK_STATUS.READING:
        reading += 1;
        break;
      case BOOK_STATUS.WANT_TO_READ:
        wantToRead += 1;
        wishlist += 1;
        break;
      case BOOK_STATUS.WISH_LIST:
        wishlist += 1;
        break;
      default:
        break;
    }
    if (b.status === BOOK_STATUS.READ) read += 1;
  }

  return {
    [BOOK_STATUS.READING]: reading,
    [BOOK_STATUS.WANT_TO_READ]: wantToRead,
    [BOOK_STATUS.READ]: read,
    shopping: wishlist,
  };
};

// --- Notifications ------------------------------------------------------------

/**
 * selectUnreadCount — number of unread notifications.
 *
 * Derived on read from `notifications` instead of being stored as a separate
 * field, so the count can never drift out of sync with the list (Etapa 10).
 */
export const selectUnreadCount = state =>
  (state.notifications || []).filter(n => !n.read).length;

// --- Ranking: friends scope ---------------------------------------------------

/**
 * buildFriendsRanking — PURE helper, NOT a live Zustand selector.
 *
 * Combines the current user with their friends into one ranked list (by pages
 * read, desc). It returns a freshly-built/sorted array on every call, so it MUST
 * be memoized by the caller (e.g. wrapped in `useMemo`). Subscribing a component
 * to this directly via `useStore(selector)` would hand Zustand a new reference
 * each render and trigger an infinite re-render loop — the exact bug that used to
 * crash the friends ranking with cascading NavigationContainer errors.
 *
 * @param {object|null} user    Current auth user.
 * @param {Array}       friends Friends already mirrored into the social store.
 * @param {object}      myStats Current user's reading stats from the main store.
 * @returns {Array} ranked list including the current user (flagged `isMe`).
 */
export const buildFriendsRanking = (user, friends = [], myStats = {}) => {
  if (!user) return [];

  const me = {
    id: user.uid,
    isMe: true,
    isOnline: true,
    displayName: user.displayName,
    username: user.username || user.email?.split('@')[0],
    photoURL: user.photoURL,
    profilePic: user.photoURL || user.profilePic,
    total_pages_read: myStats.totalPagesRead || 0,
    total_claps_received: myStats.totalClaps || 0,
    max_reading_session: myStats.maxReadingSession || 0,
    last_reading_session: myStats.lastReadingSession || 0,
    total_books_completed: myStats.totalBooksCompleted || 0,
    currentReadingBook: myStats.currentReadingBook,
  };

  return [me, ...(friends || [])].sort(
    (a, b) => (b.total_pages_read || 0) - (a.total_pages_read || 0),
  );
};
