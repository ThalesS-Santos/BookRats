import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useThemeStore = create(
  persist(
    (set) => ({
      isDarkMode: false,
      hapticsEnabled: true,
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      toggleHaptics: () => set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),
      setHapticsEnabled: (value) => set({ hapticsEnabled: value }),
      setDarkMode: (value) => set({ isDarkMode: value }),
    }),
    {
      name: 'bookrats-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          // If hydration fails, we ensure the store remains in a safe default state
          useThemeStore.setState({ isDarkMode: false, hapticsEnabled: true });
        }
      },
    }
  )
);
