import * as ExpoHaptics from 'expo-haptics';
import { useThemeStore } from '../store/useThemeStore';

/**
 * 📳 Centralized Haptics Utility
 * Wraps expo-haptics to natively respect the user's global haptics theme preference.
 */
export const impactAsync = async (style = ExpoHaptics.ImpactFeedbackStyle.Light) => {
  if (useThemeStore.getState().hapticsEnabled) {
    await ExpoHaptics.impactAsync(style);
  }
};

export const notificationAsync = async (type = ExpoHaptics.NotificationFeedbackType.Success) => {
  if (useThemeStore.getState().hapticsEnabled) {
    await ExpoHaptics.notificationAsync(type);
  }
};

export const selectionAsync = async () => {
  if (useThemeStore.getState().hapticsEnabled) {
    await ExpoHaptics.selectionAsync();
  }
};

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;
