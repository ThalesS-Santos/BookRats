import { impactAsync, ImpactFeedbackStyle } from '../utils/haptics';
import { useThemeStore } from '../store/useThemeStore';
import * as ExpoHaptics from 'expo-haptics';

describe('Infrastructure & Mock Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Haptics Mocking', () => {
    it('should call ExpoHaptics.impactAsync when haptics are enabled', async () => {
      // Ensure haptics are enabled in the store
      useThemeStore.setState({ hapticsEnabled: true });
      
      await impactAsync(ImpactFeedbackStyle.Medium);
      
      expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
    });

    it('should NOT call ExpoHaptics.impactAsync when haptics are disabled', async () => {
      // Disable haptics
      useThemeStore.setState({ hapticsEnabled: false });
      
      await impactAsync(ImpactFeedbackStyle.Medium);
      
      expect(ExpoHaptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('Zustand Persistence (AsyncStorage Mock)', () => {
    it('should update theme and maintain value in store', () => {
      const initialTheme = useThemeStore.getState().isDarkMode;
      const targetTheme = !initialTheme;
      
      useThemeStore.getState().toggleTheme();
      
      expect(useThemeStore.getState().isDarkMode).toBe(targetTheme);
    });

    it('should maintain haptics preference change', () => {
      useThemeStore.setState({ hapticsEnabled: true });
      expect(useThemeStore.getState().hapticsEnabled).toBe(true);
      
      // In a real env, this would persist to AsyncStorage
      // In tests, the mock ensures it doesn't crash and stays in memory for the session
      useThemeStore.setState({ hapticsEnabled: false });
      expect(useThemeStore.getState().hapticsEnabled).toBe(false);
    });
  });
});
