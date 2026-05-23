import React from 'react';

import { render, fireEvent } from '@testing-library/react-native';

import { useMainStore } from '@core/store';

import GlobalRanking from '../../src/ui/components/organisms/GlobalRanking';

const mockFetchRanking = jest.fn();
const mockFetchNextRankingPage = jest.fn();
const mockSelectFilteredRanking = jest.fn();

// Mock store
jest.mock('@core/store', () => ({
  useMainStore: jest.fn(),
}));

describe('GlobalRanking Component', () => {
  const mockGlobalUsers = [
    {
      id: 'u1',
      displayName: 'Winner',
      username: 'winner',
      total_pages_read: 1000,
      total_claps_received: 50,
    },
    {
      id: 'u2',
      displayName: 'Second Place',
      username: 'second',
      total_pages_read: 800,
      total_claps_received: 40,
    },
    {
      id: 'u3',
      displayName: 'Third Place',
      username: 'third',
      total_pages_read: 600,
      total_claps_received: 30,
    },
    {
      id: 'my-uid',
      displayName: 'Me',
      username: 'me',
      total_pages_read: 400,
      total_claps_received: 20,
    },
    {
      id: 'u5',
      displayName: 'Fifth Place',
      username: 'fifth',
      total_pages_read: 200,
      total_claps_received: 10,
    },
  ];

  const mockAmigosUsers = [
    {
      id: 'my-uid',
      displayName: 'Me',
      username: 'me',
      total_pages_read: 400,
      total_claps_received: 20,
    },
    {
      id: 'u2',
      displayName: 'Second Place',
      username: 'second',
      total_pages_read: 800,
      total_claps_received: 40,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default selector implementation returns global users
    mockSelectFilteredRanking.mockImplementation(scope => state => {
      return scope === 'amigos' ? mockAmigosUsers : mockGlobalUsers;
    });

    // Set default hook mock implementation
    useMainStore.mockImplementation(selector => {
      if (selector && typeof selector === 'function') {
        return selector({});
      }
      return {
        fetchRanking: mockFetchRanking,
        fetchNextRankingPage: mockFetchNextRankingPage,
        rankingLoading: false,
        loadingMoreRanking: false,
        hasMoreRanking: true,
        user: { uid: 'my-uid' },
        selectFilteredRanking: mockSelectFilteredRanking,
      };
    });
  });

  it('renders ranking list correctly with positions, medals, pages and claps', () => {
    const { getByText, queryByText } = render(<GlobalRanking />);

    // Medals for top 3
    expect(getByText('🥇')).toBeTruthy();
    expect(getByText('🥈')).toBeTruthy();
    expect(getByText('🥉')).toBeTruthy();

    // Position numbers for others
    expect(getByText('4')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();

    // Usernames and names
    expect(getByText('Winner')).toBeTruthy();
    expect(getByText('@winner')).toBeTruthy();
    expect(getByText('Me')).toBeTruthy();
    expect(getByText('@me')).toBeTruthy();

    // Stats
    expect(getByText('1000')).toBeTruthy();
    expect(getByText('50')).toBeTruthy();
  });

  it('allows switching scopes between Global and Amigos', () => {
    const { getByText, queryByText } = render(<GlobalRanking />);

    // Switch to Amigos
    const amigosButton = getByText('Amigos');
    fireEvent.press(amigosButton);

    // Should call selectFilteredRanking with 'amigos'
    expect(mockSelectFilteredRanking).toHaveBeenCalledWith('amigos');

    // Winner (who is only global) should not be displayed in amigos
    expect(queryByText('Winner')).toBeNull();
    // Me should still be displayed
    expect(getByText('Me')).toBeTruthy();

    // Switch back to Global
    const globalButton = getByText('Global');
    fireEvent.press(globalButton);

    expect(mockSelectFilteredRanking).toHaveBeenCalledWith('global');
    expect(getByText('Winner')).toBeTruthy();
  });

  it('calls fetchRanking on mount and on list refresh', () => {
    const { getByTestId } = render(<GlobalRanking />);

    expect(mockFetchRanking).toHaveBeenCalledTimes(1);

    const flatList = getByTestId('ranking-list');
    flatList.props.onRefresh();

    expect(mockFetchRanking).toHaveBeenCalledTimes(2);
  });

  it('calls fetchNextRankingPage on end reached in global scope', () => {
    const { getByTestId, getByText } = render(<GlobalRanking />);

    const flatList = getByTestId('ranking-list');
    flatList.props.onEndReached();

    expect(mockFetchNextRankingPage).toHaveBeenCalledTimes(1);

    // Switch to Amigos and verify it does NOT trigger fetchNextRankingPage
    mockFetchNextRankingPage.mockClear();
    const amigosButton = getByText('Amigos');
    fireEvent.press(amigosButton);

    flatList.props.onEndReached();
    expect(mockFetchNextRankingPage).not.toHaveBeenCalled();
  });

  it('renders loading footer when loadingMoreRanking is true', () => {
    // Override store hook values to simulate loading more
    useMainStore.mockImplementation(selector => {
      if (selector && typeof selector === 'function') {
        return selector({});
      }
      return {
        fetchRanking: mockFetchRanking,
        fetchNextRankingPage: mockFetchNextRankingPage,
        rankingLoading: false,
        loadingMoreRanking: true,
        hasMoreRanking: true,
        user: { uid: 'my-uid' },
        selectFilteredRanking: mockSelectFilteredRanking,
      };
    });

    const { getByTestId } = render(<GlobalRanking />);
    const flatList = getByTestId('ranking-list');
    const footer = flatList.props.ListFooterComponent();

    // Verify it renders ActivityIndicator
    const footerRender = render(footer);
    const activityIndicator = footerRender.UNSAFE_getByType(
      require('react-native').ActivityIndicator,
    );
    expect(activityIndicator).toBeTruthy();
  });

  it('renders empty global ranking message when list is empty', () => {
    mockSelectFilteredRanking.mockImplementation(() => () => []);

    const { getByText } = render(<GlobalRanking />);
    expect(
      getByText(
        'O ranking está sendo calculado. Junte-se à elite dos leitores!',
      ),
    ).toBeTruthy();
  });

  it('renders empty amigos ranking message when list is empty', () => {
    mockSelectFilteredRanking.mockImplementation(() => () => []);

    const { getByText } = render(<GlobalRanking />);

    // Switch to Amigos
    const amigosButton = getByText('Amigos');
    fireEvent.press(amigosButton);

    expect(getByText('Sua rede está crescendo!')).toBeTruthy();
    expect(
      getByText(
        'Você ainda não possui amigos adicionados. Que tal convidar alguém para ler junto?',
      ),
    ).toBeTruthy();
    expect(getByText('Descobrir Leitores')).toBeTruthy();
  });
});
