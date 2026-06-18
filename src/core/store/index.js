import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  subscribeWithSelector,
} from 'zustand/middleware';

import { createAuthSlice } from './slices/authSlice';
import { createGamificationSlice } from './slices/gamificationSlice';
import { createLibrarySlice } from './slices/librarySlice';
import { createSocialSlice } from './slices/socialSlice';

/**
 * Root Store (useMainStore)
 * Combines all modular slices into a single global state.
 *
 * 🧭 State strategy (Fase 3 — Etapa 10). Three clearly separated tiers:
 *
 *   1. PERSISTED (survives app restarts) — durable user data only. Whitelisted
 *      explicitly in `partialize` below: library data (books, streak, totals,
 *      announcedMilestones) and gamification (totalClaps, unlockedBadges).
 *
 *   2. SESSION (in-memory, rebuilt on launch) — everything NOT in `partialize`:
 *      auth (user/tokens/loading), and all social/notification/chat/ranking
 *      state. These are re-fetched from Firestore listeners on login, so
 *      persisting them would only risk serving stale data.
 *
 *   3. DERIVED (never stored) — computed on read via pure selectors in
 *      `@core/store/selectors` (e.g. selectCountsByStatus, selectUnreadCount,
 *      book-by-status) or via `useMemo`/hooks in the UI. Storing derived values
 *      is avoided so they can't drift out of sync with their source.
 */
export const useMainStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...createAuthSlice(set, get),
        ...createLibrarySlice(set, get),
        ...createGamificationSlice(set, get),
        ...createSocialSlice(set, get),
      }),
      {
        name: 'bookrats-main-storage',
        storage: createJSONStorage(() => AsyncStorage),
        version: 2, // 🚀 Version Bump for Data Integrity

        // Lida com a migração silenciosa para usuários que já tinham o app instalado
        migrate: (persistedState, version) => {
          const { BOOK_STATUS } = require('../constants/bookStatus');

          if (version < 2) {
            // Deep copy to avoid mutation
            const state = { ...persistedState };
            if (state.books && Array.isArray(state.books)) {
              state.books = state.books.map(book => ({
                ...book,
                status: book.status || BOOK_STATUS.WANT_TO_READ, // Inject missing status
              }));
            }
            return state;
          }
          return persistedState;
        },

        // 🚀 Offline-First: Seleciona exatamente quais pedaços da memória vão para o disco (Cache)
        partialize: state => ({
          // --- Dados da Biblioteca (librarySlice) ---
          books: state.books,
          streak: state.streak,
          totalPagesRead: state.totalPagesRead,
          lastReadDate: state.lastReadDate,
          maxReadingSession: state.maxReadingSession,
          totalBooksCompleted: state.totalBooksCompleted,
          // Lifetime milestones already announced (so they never re-fire).
          announcedMilestones: state.announcedMilestones,

          // --- Dados de Gamificação (gamificationSlice) ---
          totalClaps: state.totalClaps,
          unlockedBadges: state.unlockedBadges,

          // ⚠️ Nota: authSlice (tokens/sessão) e socialSlice (chat/notificações efêmeras) NÃO são persistidos aqui.
        }),
      },
    ),
  ),
);
