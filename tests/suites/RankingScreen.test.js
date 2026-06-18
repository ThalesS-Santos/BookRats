import React from 'react';

import { useIsFocused } from '@react-navigation/native';
import { render, fireEvent } from '@testing-library/react-native';

import { useMainStore } from '../../src/core/store';
import { useSocialStore } from '../../src/store/useSocialStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import RankingScreen from '../../src/ui/screens/RankingScreen';

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('../../src/core/store');
jest.mock('../../src/store/useThemeStore');
jest.mock('../../src/store/useSocialStore');

jest.mock('../../src/core/services/UserNormalizationService', () => ({
  UserNormalizationService: {
    normalizeDisplayName: user =>
      user.displayName || user.username || user.email || 'User',
    normalizeUserAvatar: () => null,
  },
}));

jest.mock('../../src/ui/components', () => {
  const { View } = require('react-native');
  return {
    FastAvatar: () => <View testID="fast-avatar" />,
    Skeleton: () => <View testID="skeleton" />,
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_NAVIGATION = { navigate: jest.fn() };

const USER = { uid: 'u1', displayName: 'Tester', email: 'tester@test.com' };

const GLOBAL_USERS = [
  { id: 'x9', displayName: 'Stranger', total_pages_read: 999 },
  { id: 'u1', displayName: 'Tester', total_pages_read: 100 },
];

const FRIENDS = [
  { id: 'f1', displayName: 'Alice', total_pages_read: 300 },
  { id: 'f2', displayName: 'Bob', total_pages_read: 50 },
];

const makeMainState = () => ({
  user: USER,
  totalPagesRead: 100,
  totalClaps: 0,
  maxReadingSession: 0,
  lastReadingSession: 0,
  totalBooksCompleted: 0,
});

const makeSocialState = (overrides = {}) => ({
  rankingList: GLOBAL_USERS,
  loadingRanking: false,
  friends: FRIENDS,
  subscribeToRanking: jest.fn(),
  unsubscribeFromRanking: jest.fn(),
  ...overrides,
});

// Selector-aware mocks: apply the (possibly useShallow-wrapped) selector to the
// state object, exactly as the real Zustand hook would during render.
const wireStores = ({ social } = {}) => {
  const mainState = makeMainState();
  const socialState = social || makeSocialState();

  useMainStore.mockImplementation(selector =>
    typeof selector === 'function' ? selector(mainState) : mainState,
  );
  useSocialStore.mockImplementation(selector =>
    typeof selector === 'function' ? selector(socialState) : socialState,
  );
  return { mainState, socialState };
};

describe('RankingScreen — scope toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsFocused.mockReturnValue(true);
    useThemeStore.mockReturnValue({ isDarkMode: false });
  });

  it('subscribes to the real-time global ranking on mount', () => {
    const { socialState } = wireStores();
    render(<RankingScreen navigation={MOCK_NAVIGATION} />);
    expect(socialState.subscribeToRanking).toHaveBeenCalled();
  });

  it('shows the global ranking by default', () => {
    wireStores();
    const { getByText, queryByText } = render(
      <RankingScreen navigation={MOCK_NAVIGATION} />,
    );
    // A global-only stranger is visible in global scope.
    expect(getByText('Stranger')).toBeTruthy();
    // Friends-only users are not shown in global scope.
    expect(queryByText('Alice')).toBeNull();
  });

  it('switches to the friends ranking without crashing (no infinite loop)', () => {
    wireStores();
    const { getByTestId, getByText, queryByText } = render(
      <RankingScreen navigation={MOCK_NAVIGATION} />,
    );

    fireEvent.press(getByTestId('ranking-scope-amigos'));

    // Friends + the current user (flagged "(Você)") now render; the global-only
    // stranger is gone. Reaching this assertion at all means the render settled.
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    expect(getByText('Tester (Você)')).toBeTruthy();
    expect(queryByText('Stranger')).toBeNull();
  });

  it('orders the friends ranking by pages read, descending', () => {
    wireStores();
    const { getByTestId, getAllByText } = render(
      <RankingScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByTestId('ranking-scope-amigos'));

    // Alice 300 > Tester 100 > Bob 50 → page numbers appear in that order.
    const pageCells = getAllByText(/^(300|100|50)$/).map(n => n.props.children);
    expect(pageCells).toEqual([300, 100, 50]);
  });

  it('shows an invite hint in friends scope when the user has no friends', () => {
    wireStores({ social: makeSocialState({ friends: [] }) });
    const { getByTestId, getByText } = render(
      <RankingScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByTestId('ranking-scope-amigos'));
    expect(getByText(/ainda não adicionou amigos/i)).toBeTruthy();
  });
});
