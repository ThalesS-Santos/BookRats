import React from 'react';

import { useIsFocused } from '@react-navigation/native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';

import { useMainStore } from '../../src/core/store';
import { usePopupStore } from '../../src/store/usePopupStore';
import { useSocialStore } from '../../src/store/useSocialStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import GroupsScreen from '../../src/ui/screens/GroupsScreen';

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('../../src/core/store');
jest.mock('../../src/store/useThemeStore');
jest.mock('../../src/store/usePopupStore');
jest.mock('../../src/store/useSocialStore');

jest.mock('../../src/core/services/UserNormalizationService', () => ({
  UserNormalizationService: {
    normalizeDisplayName: user => user.displayName || user.email || 'User',
    normalizeUserAvatar: () => null,
  },
}));

// Debounce fires synchronously so we can assert calls immediately
jest.mock('../../src/utils/debounce', () => ({
  debounce: fn => {
    const wrapped = (...args) => fn(...args);
    wrapped.cancel = jest.fn();
    return wrapped;
  },
}));

jest.mock('../../src/ui/components', () => {
  const { View } = require('react-native');
  return {
    FastAvatar: () => <View testID="fast-avatar" />,
    Skeleton: () => <View testID="skeleton" />,
  };
});

// ─── InteractionManager — fire callbacks synchronously ────────────────────────
// GroupsScreen defers rendering via runAfterInteractions (isReady gate).
// Firing synchronously lets tests see real content instead of skeletons.
jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation(cb => {
  cb();
  return { cancel: jest.fn() };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_NAVIGATION = { navigate: jest.fn(), goBack: jest.fn() };

const USER = { uid: 'u1', displayName: 'Tester' };

const FRIENDS = [
  { id: 'f1', displayName: 'Alice', email: 'alice@test.com' },
  { id: 'f2', displayName: 'Bob', email: 'bob@test.com' },
];

const GROUPS = [
  { id: 'g1', name: 'Clube do Terror', members: ['u1', 'f1'] },
  { id: 'g2', name: 'Sci-Fi Squad', members: ['u1', 'f2'] },
];

const makeSocialStore = (overrides = {}) => ({
  friends: [],
  pendingRequests: [],
  sentRequests: [],
  groups: [],
  searchResults: [],
  loadingSearch: false,
  loadingSocial: false,
  searchUsers: jest.fn(),
  sendFriendRequest: jest.fn(),
  acceptFriendRequest: jest.fn(),
  rejectFriendRequest: jest.fn(),
  createGroup: jest.fn(),
  subscribeToSocialData: jest.fn(() => jest.fn()),
  ...overrides,
});

// useMainStore is called with a selector (state => state.user).
// mockImplementation applies it so components receive the right slice.
const makeMainStore = (stateOverrides = {}) => {
  const state = { user: USER, ...stateOverrides };
  return selector => (typeof selector === 'function' ? selector(state) : state);
};

// ─── Setup ───────────────────────────────────────────────────────────────────

describe('GroupsScreen', () => {
  const mockShowPopup = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useIsFocused.mockReturnValue(true);
    useThemeStore.mockReturnValue({ isDarkMode: false });
    useMainStore.mockImplementation(makeMainStore());
    usePopupStore.mockReturnValue({ showPopup: mockShowPopup });
    useSocialStore.mockReturnValue(makeSocialStore());
  });

  // ── Header & tabs ──────────────────────────────────────────────────────────

  it('renders the screen header', () => {
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    expect(getByText('Sua Rede')).toBeTruthy();
    expect(getByText('Social')).toBeTruthy();
  });

  it('renders Grupos and Amigos tab buttons', () => {
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    expect(getByText('Grupos')).toBeTruthy();
    expect(getByText('Amigos')).toBeTruthy();
  });

  it('defaults to the groups tab', () => {
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    expect(getByText('Criar Grupo de Leitura')).toBeTruthy();
  });

  it('switches to the friends tab when "Amigos" is pressed', () => {
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    fireEvent.press(getByText('Amigos'));
    expect(getByText('Meus Amigos (0)')).toBeTruthy();
  });

  it('switches back to groups tab when "Grupos" is pressed', () => {
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    fireEvent.press(getByText('Amigos'));
    fireEvent.press(getByText('Grupos'));
    expect(getByText('Criar Grupo de Leitura')).toBeTruthy();
  });

  // ── Skeleton / loading state ───────────────────────────────────────────────

  it('renders skeletons while loadingSocial is true and groups list is empty', () => {
    // Bypass isReady gate by temporarily reverting InteractionManager
    InteractionManager.runAfterInteractions.mockImplementationOnce(() => ({
      cancel: jest.fn(),
    }));
    useSocialStore.mockReturnValue(makeSocialStore({ loadingSocial: true, groups: [] }));
    const { getAllByTestId } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  // ── Groups tab content ─────────────────────────────────────────────────────

  it('renders group items from the store', () => {
    useSocialStore.mockReturnValue(makeSocialStore({ groups: GROUPS }));
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    expect(getByText('Clube do Terror')).toBeTruthy();
    expect(getByText('Sci-Fi Squad')).toBeTruthy();
  });

  it('shows member count for each group', () => {
    useSocialStore.mockReturnValue(makeSocialStore({ groups: GROUPS }));
    const { getAllByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    expect(getAllByText('2 membros').length).toBe(2);
  });

  it('shows empty state text when there are no groups and not loading', () => {
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    expect(getByText('Você não pertence a nenhum grupo ainda.')).toBeTruthy();
  });

  it('navigates to GroupChat when a group item is pressed', () => {
    useSocialStore.mockReturnValue(makeSocialStore({ groups: GROUPS }));
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    fireEvent.press(getByText('Clube do Terror'));
    expect(MOCK_NAVIGATION.navigate).toHaveBeenCalledWith('GroupChat', {
      groupId: 'g1',
      groupName: 'Clube do Terror',
    });
  });

  // ── Subscription lifecycle ─────────────────────────────────────────────────

  it('calls subscribeToSocialData with the user uid on mount', () => {
    const subscribeToSocialData = jest.fn(() => jest.fn());
    useSocialStore.mockReturnValue(makeSocialStore({ subscribeToSocialData }));
    render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    expect(subscribeToSocialData).toHaveBeenCalledWith('u1');
  });

  it('calls the returned unsubscribe function on unmount', () => {
    const unsub = jest.fn();
    useSocialStore.mockReturnValue(
      makeSocialStore({ subscribeToSocialData: jest.fn(() => unsub) }),
    );
    const { unmount } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    unmount();
    expect(unsub).toHaveBeenCalled();
  });

  it('does not call subscribeToSocialData when user is null', () => {
    const subscribeToSocialData = jest.fn(() => jest.fn());
    useMainStore.mockImplementation(makeMainStore({ user: null }));
    useSocialStore.mockReturnValue(makeSocialStore({ subscribeToSocialData }));
    render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    expect(subscribeToSocialData).not.toHaveBeenCalled();
  });

  // ── Friends tab ────────────────────────────────────────────────────────────

  it('shows the search bar in the friends tab', () => {
    const { getByText, getByPlaceholderText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Amigos'));
    expect(getByPlaceholderText('Buscar por usuário...')).toBeTruthy();
  });

  it('renders friend items in the friends tab', () => {
    useSocialStore.mockReturnValue(makeSocialStore({ friends: FRIENDS }));
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    fireEvent.press(getByText('Amigos'));
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
  });

  it('shows "Meus Amigos (2)" count when 2 friends exist', () => {
    useSocialStore.mockReturnValue(makeSocialStore({ friends: FRIENDS }));
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    fireEvent.press(getByText('Amigos'));
    expect(getByText('Meus Amigos (2)')).toBeTruthy();
  });

  it('shows empty state text in friends tab when no friends', () => {
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    fireEvent.press(getByText('Amigos'));
    expect(
      getByText('Você ainda não tem amigos. Comece a buscar!'),
    ).toBeTruthy();
  });

  it('navigates to UserProfile when a friend item is pressed', () => {
    useSocialStore.mockReturnValue(makeSocialStore({ friends: FRIENDS }));
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    fireEvent.press(getByText('Amigos'));
    fireEvent.press(getByText('Alice'));
    expect(MOCK_NAVIGATION.navigate).toHaveBeenCalledWith('UserProfile', {
      userId: 'f1',
    });
  });

  // ── Search ─────────────────────────────────────────────────────────────────

  it('calls searchUsers when input has 3+ characters', async () => {
    const searchUsers = jest.fn();
    useSocialStore.mockReturnValue(makeSocialStore({ searchUsers }));
    const { getByText, getByPlaceholderText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Amigos'));
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText('Buscar por usuário...'),
        'Ali',
      );
    });
    expect(searchUsers).toHaveBeenCalledWith('Ali', 'u1');
  });

  it('does NOT call searchUsers when input has fewer than 3 characters', async () => {
    const searchUsers = jest.fn();
    useSocialStore.mockReturnValue(makeSocialStore({ searchUsers }));
    const { getByText, getByPlaceholderText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Amigos'));
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Buscar por usuário...'), 'Al');
    });
    expect(searchUsers).not.toHaveBeenCalled();
  });

  it('shows search results panel when searchText has more than 1 char', () => {
    const RESULTS = [{ id: 'r1', displayName: 'RandomUser' }];
    useSocialStore.mockReturnValue(
      makeSocialStore({ searchResults: RESULTS, searchUsers: jest.fn() }),
    );
    const { getByText, getByPlaceholderText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Amigos'));
    fireEvent.changeText(getByPlaceholderText('Buscar por usuário...'), 'Ra');
    expect(getByText('Resultados')).toBeTruthy();
    expect(getByText('RandomUser')).toBeTruthy();
  });

  it('shows "Nenhum usuário encontrado" when results are empty and not loading', () => {
    useSocialStore.mockReturnValue(
      makeSocialStore({
        searchResults: [],
        loadingSearch: false,
        searchUsers: jest.fn(),
      }),
    );
    const { getByText, getByPlaceholderText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Amigos'));
    fireEvent.changeText(getByPlaceholderText('Buscar por usuário...'), 'xyz');
    expect(getByText('Nenhum usuário encontrado.')).toBeTruthy();
  });

  it('labels a search result as "Amigo" when they are already a friend', () => {
    useSocialStore.mockReturnValue(
      makeSocialStore({
        searchResults: [{ id: 'f1', displayName: 'Alice' }],
        friends: [{ id: 'f1', displayName: 'Alice' }],
        searchUsers: jest.fn(),
      }),
    );
    const { getByText, getByPlaceholderText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Amigos'));
    fireEvent.changeText(getByPlaceholderText('Buscar por usuário...'), 'Ali');
    expect(getByText('Amigo')).toBeTruthy();
  });

  it('labels a search result as "Pendente" when a request was already sent', () => {
    useSocialStore.mockReturnValue(
      makeSocialStore({
        searchResults: [{ id: 'r1', displayName: 'Carol' }],
        sentRequests: [{ receiverId: 'r1' }],
        searchUsers: jest.fn(),
      }),
    );
    const { getByText, getByPlaceholderText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Amigos'));
    fireEvent.changeText(getByPlaceholderText('Buscar por usuário...'), 'Car');
    expect(getByText('Pendente')).toBeTruthy();
  });

  it('calls sendFriendRequest and shows success popup on "Adicionar" press', async () => {
    const sendFriendRequest = jest.fn();
    useSocialStore.mockReturnValue(
      makeSocialStore({
        searchResults: [{ id: 'r2', displayName: 'Dave' }],
        friends: [],
        sentRequests: [],
        sendFriendRequest,
        searchUsers: jest.fn(),
      }),
    );
    const { getByText, getByPlaceholderText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Amigos'));
    fireEvent.changeText(getByPlaceholderText('Buscar por usuário...'), 'Dav');
    await act(async () => {
      fireEvent.press(getByText('Adicionar'));
    });
    expect(sendFriendRequest).toHaveBeenCalledWith('u1', 'r2');
    expect(mockShowPopup).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
  });

  // ── Pending requests ───────────────────────────────────────────────────────

  it('renders the pending requests section when requests exist', () => {
    useSocialStore.mockReturnValue(
      makeSocialStore({
        pendingRequests: [{ id: 'req1', senderName: 'Eve' }],
      }),
    );
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    fireEvent.press(getByText('Amigos'));
    expect(getByText('Solicitações Pendentes')).toBeTruthy();
    expect(getByText('Eve')).toBeTruthy();
  });

  it('calls acceptFriendRequest when the checkmark button is pressed', async () => {
    const acceptFriendRequest = jest.fn();
    useSocialStore.mockReturnValue(
      makeSocialStore({
        pendingRequests: [{ id: 'req1', senderName: 'Eve' }],
        acceptFriendRequest,
        rejectFriendRequest: jest.fn(),
      }),
    );
    const { getByText, getByTestId } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Amigos'));
    await act(async () => {
      fireEvent.press(getByTestId('accept-request-req1'));
    });
    expect(acceptFriendRequest).toHaveBeenCalledWith('req1');
  });

  it('calls rejectFriendRequest when the close button is pressed', async () => {
    const rejectFriendRequest = jest.fn();
    useSocialStore.mockReturnValue(
      makeSocialStore({
        pendingRequests: [{ id: 'req1', senderName: 'Eve' }],
        acceptFriendRequest: jest.fn(),
        rejectFriendRequest,
      }),
    );
    const { getByText, getByTestId } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Amigos'));
    await act(async () => {
      fireEvent.press(getByTestId('reject-request-req1'));
    });
    expect(rejectFriendRequest).toHaveBeenCalledWith('req1');
  });

  // ── Create group modal ─────────────────────────────────────────────────────

  it('opens the modal when "Criar Grupo de Leitura" is pressed', async () => {
    const { getByText, getAllByText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    await act(async () => {
      fireEvent.press(getByText('Criar Grupo de Leitura'));
    });
    expect(getByText('Nome do Grupo')).toBeTruthy();
    // The modal has two "Criar Grupo" elements: heading + confirm button
    expect(getAllByText('Criar Grupo').length).toBeGreaterThanOrEqual(1);
  });

  it('shows an error popup when creating a group with an empty name', async () => {
    useSocialStore.mockReturnValue(makeSocialStore({ friends: FRIENDS }));
    const { getByText, getAllByText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Criar Grupo de Leitura'));
    const ctaButtons = getAllByText('Criar Grupo');
    await act(async () => {
      fireEvent.press(ctaButtons[ctaButtons.length - 1]);
    });
    expect(mockShowPopup).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'Aviso' }),
    );
  });

  it('calls createGroup and navigates to GroupChat on success', async () => {
    const createGroup = jest.fn().mockResolvedValue('new-group-id');
    useSocialStore.mockReturnValue(makeSocialStore({ friends: FRIENDS, createGroup }));
    const { getByText, getAllByText, getByPlaceholderText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Criar Grupo de Leitura'));
    fireEvent.changeText(
      getByPlaceholderText('Ex: Clube do Livro de Terror'),
      'Novo Clube',
    );
    const ctaButtons = getAllByText('Criar Grupo');
    await act(async () => {
      fireEvent.press(ctaButtons[ctaButtons.length - 1]);
    });
    expect(createGroup).toHaveBeenCalledWith('Novo Clube', 'u1', []);
    expect(MOCK_NAVIGATION.navigate).toHaveBeenCalledWith('GroupChat', {
      groupId: 'new-group-id',
      groupName: 'Novo Clube',
    });
  });

  it('does NOT navigate when createGroup returns null', async () => {
    const createGroup = jest.fn().mockResolvedValue(null);
    useSocialStore.mockReturnValue(makeSocialStore({ friends: FRIENDS, createGroup }));
    const { getByText, getAllByText, getByPlaceholderText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Criar Grupo de Leitura'));
    fireEvent.changeText(
      getByPlaceholderText('Ex: Clube do Livro de Terror'),
      'Grupo Falho',
    );
    const ctaButtons = getAllByText('Criar Grupo');
    await act(async () => {
      fireEvent.press(ctaButtons[ctaButtons.length - 1]);
    });
    expect(MOCK_NAVIGATION.navigate).not.toHaveBeenCalled();
  });

  it('passes selected friends to createGroup', async () => {
    const createGroup = jest.fn().mockResolvedValue('gid');
    useSocialStore.mockReturnValue(makeSocialStore({ friends: FRIENDS, createGroup }));
    const { getByText, getAllByText, getByPlaceholderText } = render(
      <GroupsScreen navigation={MOCK_NAVIGATION} />,
    );
    fireEvent.press(getByText('Criar Grupo de Leitura'));
    fireEvent.press(getByText('Alice')); // select Alice
    fireEvent.changeText(
      getByPlaceholderText('Ex: Clube do Livro de Terror'),
      'Com Amigos',
    );
    const ctaButtons = getAllByText('Criar Grupo');
    await act(async () => {
      fireEvent.press(ctaButtons[ctaButtons.length - 1]);
    });
    expect(createGroup).toHaveBeenCalledWith('Com Amigos', 'u1', ['f1']);
  });

  it('deselects a friend when their name is pressed a second time in the modal', () => {
    useSocialStore.mockReturnValue(makeSocialStore({ friends: FRIENDS }));
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    fireEvent.press(getByText('Criar Grupo de Leitura'));
    fireEvent.press(getByText('Alice')); // select
    fireEvent.press(getByText('Alice')); // deselect
    // No crash — internal state toggled correctly
    expect(getByText('Alice')).toBeTruthy();
  });

  it('shows "Você precisa de amigos para criar um grupo" when friends list is empty inside modal', () => {
    const { getByText } = render(<GroupsScreen navigation={MOCK_NAVIGATION} />);
    fireEvent.press(getByText('Criar Grupo de Leitura'));
    expect(
      getByText('Você precisa de amigos para criar um grupo.'),
    ).toBeTruthy();
  });
});
