import { useThemeStore } from '../../src/store/useThemeStore';
import { persist } from 'zustand/middleware';

jest.mock('zustand/middleware', () => ({
  persist: jest.fn((config, options) => {
    // Capture the options to expose onRehydrateStorage
    global.themeStoreOptions = options;
    return (set, get, api) => config(set, get, api);
  }),
  createJSONStorage: jest.fn((fn) => fn && fn()),
}));

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ isDarkMode: false, hapticsEnabled: true });
  });

  it('toggles theme', () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().isDarkMode).toBe(true);
  });

  it('toggles haptics', () => {
    useThemeStore.getState().toggleHaptics();
    expect(useThemeStore.getState().hapticsEnabled).toBe(false);
  });

  it('sets haptics enabled directly', () => {
    useThemeStore.getState().setHapticsEnabled(false);
    expect(useThemeStore.getState().hapticsEnabled).toBe(false);
  });

  it('sets dark mode directly', () => {
    useThemeStore.getState().setDarkMode(true);
    expect(useThemeStore.getState().isDarkMode).toBe(true);
  });

  it('handles hydration error branch', () => {
    // This is a bit of a hack to reach line 18-23 in useThemeStore.js
    // We need to re-import or use the captured options
    // Actually, the mock above will run when useThemeStore is imported
    
    if (global.themeStoreOptions && global.themeStoreOptions.onRehydrateStorage) {
      const onRehydrate = global.themeStoreOptions.onRehydrateStorage();
      useThemeStore.setState({ isDarkMode: true, hapticsEnabled: false });
      
      onRehydrate(null, new Error('Hydration Error'));
      
      expect(useThemeStore.getState().isDarkMode).toBe(false);
      expect(useThemeStore.getState().hapticsEnabled).toBe(true);
    }
  });
});
