import * as ExpoHaptics from 'expo-haptics';

import { useThemeStore } from '../../src/store/useThemeStore';
import * as Haptics from '../../src/utils/haptics';

jest.mock('expo-haptics');
jest.mock('../../src/store/useThemeStore');

describe('Haptics Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls impactAsync when haptics are enabled', async () => {
    useThemeStore.getState.mockReturnValue({ hapticsEnabled: true });
    await Haptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy);
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
      ExpoHaptics.ImpactFeedbackStyle.Heavy,
    );
  });

  it('does not call impactAsync when haptics are disabled', async () => {
    useThemeStore.getState.mockReturnValue({ hapticsEnabled: false });
    await Haptics.impactAsync();
    expect(ExpoHaptics.impactAsync).not.toHaveBeenCalled();
  });

  it('calls notificationAsync when haptics are enabled', async () => {
    useThemeStore.getState.mockReturnValue({ hapticsEnabled: true });
    await Haptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
    expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
      ExpoHaptics.NotificationFeedbackType.Error,
    );
  });

  it('does not call notificationAsync when haptics are disabled', async () => {
    useThemeStore.getState.mockReturnValue({ hapticsEnabled: false });
    await Haptics.notificationAsync();
    expect(ExpoHaptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('calls selectionAsync when haptics are enabled', async () => {
    useThemeStore.getState.mockReturnValue({ hapticsEnabled: true });
    await Haptics.selectionAsync();
    expect(ExpoHaptics.selectionAsync).toHaveBeenCalled();
  });

  it('does not call selectionAsync when haptics are disabled', async () => {
    useThemeStore.getState.mockReturnValue({ hapticsEnabled: false });
    await Haptics.selectionAsync();
    expect(ExpoHaptics.selectionAsync).not.toHaveBeenCalled();
  });
});
