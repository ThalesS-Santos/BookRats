import React from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, fireEvent, act } from '@testing-library/react-native';
import { View, Button } from 'react-native';

import { useThemeStore } from '../../src/store/useThemeStore';

// Helper to wait for Zustand and AsyncStorage to settle
const waitSettled = () => new Promise(resolve => setTimeout(resolve, 10));

describe('Theme Persistence Audit', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    // Reset store state to default before each test
    act(() => {
      useThemeStore.setState({ isDarkMode: false, hapticsEnabled: true });
    });
  });

  describe('Scenario 1: State Mutation & Persistence (The Handshake)', () => {
    it('should verify the handshake between Zustand and Disk when toggling theme', async () => {
      // 1. Check initial state
      expect(useThemeStore.getState().isDarkMode).toBe(false);

      // 2. Call toggleTheme
      await act(async () => {
        useThemeStore.getState().toggleTheme();
      });

      // 3. Verify store state
      expect(useThemeStore.getState().isDarkMode).toBe(true);

      // 4. Verify AsyncStorage.setItem was called
      // The storage operation might be async in Zustand middleware
      await waitSettled();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'bookrats-theme-storage',
        expect.stringContaining('"isDarkMode":true'),
      );
    });

    it('should verify the handshake for hapticsEnabled toggle', async () => {
      await act(async () => {
        useThemeStore.getState().toggleHaptics();
      });

      await waitSettled();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'bookrats-theme-storage',
        expect.stringContaining('"hapticsEnabled":false'),
      );
    });
  });

  describe('Scenario 2: Hydration & Recovery (The Hydration)', () => {
    it('should automatically recover dark mode state from mocked storage', async () => {
      // 1. Manually populate AsyncStorage with a 'dark' state
      const mockState = {
        state: { isDarkMode: true, hapticsEnabled: false },
        version: 0,
      };
      await AsyncStorage.setItem(
        'bookrats-theme-storage',
        JSON.stringify(mockState),
      );

      // 2. Force the store to re-hydrate
      await act(async () => {
        await useThemeStore.persist.rehydrate();
      });

      // 3. Assert values are recovered correctly
      expect(useThemeStore.getState().isDarkMode).toBe(true);
      expect(useThemeStore.getState().hapticsEnabled).toBe(false);
    });
  });

  describe('Scenario 3: Error Resilience (Safety Fallback)', () => {
    it('should revert to default false state if AsyncStorage.getItem fails', async () => {
      // 1. Mock AsyncStorage.getItem to throw an error
      const mockError = new Error('AsyncStorage Failure');
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(mockError);

      // 2. Clear current in-memory state to ensure we rely on hydration
      act(() => {
        useThemeStore.setState({ isDarkMode: true }); // Set to non-default
      });

      // 3. Trigger re-hydration
      await act(async () => {
        await useThemeStore.persist.rehydrate();
      });

      // 4. Verify fallback to default (which is false for isDarkMode)
      // Note: Zustand persist might catch the error and keep the current state
      // or fallback to initial depending on implementation.
      // According to requirement: "reverts to the default false state".

      expect(useThemeStore.getState().isDarkMode).toBe(false);
    });
  });

  describe('Scenario 4: UI Integration (Minimalist Approach)', () => {
    const ThemeTestComponent = () => {
      const { isDarkMode, toggleTheme } = useThemeStore();
      return (
        <View
          testID="theme-container"
          style={{ backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }}>
          <Button
            title="Toggle Theme"
            onPress={toggleTheme}
            testID="toggle-button"
          />
        </View>
      );
    };

    it('should update component background color immediately on toggle', async () => {
      const { getByTestId } = render(<ThemeTestComponent />);
      const container = getByTestId('theme-container');
      const button = getByTestId('toggle-button');

      // Initial state: Light (#FFFFFF)
      expect(container.props.style.backgroundColor).toBe('#FFFFFF');

      // Click toggle
      await act(async () => {
        fireEvent.press(button);
      });

      // Updated state: Dark (#000000)
      expect(container.props.style.backgroundColor).toBe('#000000');
    });
  });
});
