import * as ExpoHaptics from 'expo-haptics';

import { useThemeStore } from '../store/useThemeStore';

/**
 * 📳 Centralized Haptics Utility
 * Wraps expo-haptics to natively respect the user's global haptics theme preference.
 */
export const impactAsync = async (
  style = ExpoHaptics.ImpactFeedbackStyle.Light,
) => {
  try {
    if (useThemeStore.getState().hapticsEnabled) {
      await ExpoHaptics.impactAsync(style);
    }
  } catch (e) {
    console.warn('Haptics impactAsync failed', e);
  }
};

export const notificationAsync = async (
  type = ExpoHaptics.NotificationFeedbackType.Success,
) => {
  try {
    if (useThemeStore.getState().hapticsEnabled) {
      await ExpoHaptics.notificationAsync(type);
    }
  } catch (e) {
    console.warn('Haptics notificationAsync failed', e);
  }
};

export const selectionAsync = async () => {
  try {
    if (useThemeStore.getState().hapticsEnabled) {
      await ExpoHaptics.selectionAsync();
    }
  } catch (e) {
    console.warn('Haptics selectionAsync failed', e);
  }
};

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;
