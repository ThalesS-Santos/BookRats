import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAuthSlice } from './slices/authSlice';
import { createLibrarySlice } from './slices/librarySlice';
import { createGamificationSlice } from './slices/gamificationSlice';
import { createSocialSlice } from './slices/socialSlice';

/**
 * Root Store (useMainStore)
 * Combines all modular slices into a single global state.
 */
export const useMainStore = create(
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
      version: 1, // Versionamento do cache (aumente se mudar o schema estrutural no futuro)
      
      // Lida com a migração silenciosa para usuários que já tinham o app instalado (version 0)
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Nenhuma mudança estrutural destrutiva foi feita, apenas retornamos o estado salvo
          return persistedState;
        }
        return persistedState;
      },
      
      // 🚀 Offline-First: Seleciona exatamente quais pedaços da memória vão para o disco (Cache)
      partialize: (state) => ({
        // --- Dados da Biblioteca (librarySlice) ---
        books: state.books,
        streak: state.streak,
        totalPagesRead: state.totalPagesRead,
        lastReadDate: state.lastReadDate,
        maxReadingSession: state.maxReadingSession,
        totalBooksCompleted: state.totalBooksCompleted,
        
        // --- Dados de Gamificação (gamificationSlice) ---
        totalClaps: state.totalClaps,
        unlockedBadges: state.unlockedBadges,

        // ⚠️ Nota: authSlice (tokens/sessão) e socialSlice (chat/notificações efêmeras) NÃO são persistidos aqui.
      }),
    }
  )
);
