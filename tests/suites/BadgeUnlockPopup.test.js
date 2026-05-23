import React from 'react';

import { render, fireEvent, act } from '@testing-library/react-native';

import { useMainStore } from '@core/store';

import BadgeUnlockPopup from '../../src/ui/components/molecules/BadgeUnlockPopup';

// Mock dependencies
const mockClearUnlockedBadges = jest.fn();

jest.mock('@core/store', () => ({
  useMainStore: jest.fn(selector => {
    const mockState = {
      lastUnlockedBadges: [
        {
          id: 'badge1',
          title: 'Primeira Leitura',
          icon: 'book',
          mission: 'Leia sua primeira página.',
        },
      ],
      clearUnlockedBadges: mockClearUnlockedBadges,
    };
    return selector(mockState);
  }),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      call: () => {},
      View: View,
      Text: View,
      Image: View,
      ScrollView: View,
      FlatList: View,
    },
    useSharedValue: v => ({ value: v }),
    useDerivedValue: fn => ({ value: fn() }),
    useAnimatedStyle: fn => fn(),
    useAnimatedProps: fn => fn(),
    withSpring: (toValue, config, callback) => {
      if (callback) {
        callback();
      }
      return toValue;
    },
    runOnJS: fn => fn,
  };
});

describe('BadgeUnlockPopup Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when there is no unlocked badge', () => {
    useMainStore.mockImplementationOnce(selector => {
      return selector({
        lastUnlockedBadges: [],
        clearUnlockedBadges: mockClearUnlockedBadges,
      });
    });

    const { toJSON } = render(<BadgeUnlockPopup />);
    expect(toJSON()).toBeNull();
  });

  it('renders achievement card correctly when a badge is unlocked', () => {
    const { getByText } = render(<BadgeUnlockPopup />);

    expect(getByText('Nova Conquista!')).toBeTruthy();
    expect(getByText('Primeira Leitura')).toBeTruthy();
    expect(
      getByText('Parabéns! Você desbloqueou uma nova medalha.'),
    ).toBeTruthy();
  });

  it('triggers hidePopup and calls clearUnlockedBadges when close button is clicked', () => {
    const { getByTestId } = render(<BadgeUnlockPopup />);

    const closeBtn = getByTestId('close-btn');

    act(() => {
      fireEvent.press(closeBtn);
    });

    expect(mockClearUnlockedBadges).toHaveBeenCalled();
  });

  it('auto-hides popup after 4 seconds and triggers clearUnlockedBadges', () => {
    render(<BadgeUnlockPopup />);

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(mockClearUnlockedBadges).toHaveBeenCalled();
  });
});
