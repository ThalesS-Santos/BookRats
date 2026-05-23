import React from 'react';

import { render, fireEvent, act } from '@testing-library/react-native';

import FriendActionButton from '../../src/ui/components/molecules/FriendActionButton';

// Mock dependencies
const mockSendFriendRequest = jest.fn(() => Promise.resolve());
let mockFriends = [];
let mockSentRequests = [];

jest.mock('@core/store', () => ({
  useMainStore: () => ({
    sendFriendRequest: mockSendFriendRequest,
    friends: mockFriends,
    sentRequests: mockSentRequests,
  }),
}));

jest.mock('../../src/store/useThemeStore', () => ({
  useThemeStore: () => ({ isDarkMode: false }),
}));

jest.mock('../../src/utils/haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
}));

describe('FriendActionButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriends = [];
    mockSentRequests = [];
  });

  it('renders "Amigos" state correctly when target is a friend', () => {
    mockFriends = [{ id: 'target1' }];
    const { getByText } = render(
      <FriendActionButton targetUserId="target1" initialStatus="none" />,
    );

    expect(getByText('Amigos')).toBeTruthy();
  });

  it('renders "Pendente" state correctly when request has been sent', () => {
    mockSentRequests = [{ receiverId: 'target1', status: 'pending' }];
    const { getByText } = render(
      <FriendActionButton targetUserId="target1" initialStatus="none" />,
    );

    expect(getByText('Pendente')).toBeTruthy();
  });

  it('renders "Adicionar" button when status is none', () => {
    const { getByText } = render(
      <FriendActionButton targetUserId="target1" initialStatus="none" />,
    );

    expect(getByText('Adicionar')).toBeTruthy();
  });

  it('triggers sendFriendRequest when "Adicionar" button is clicked', async () => {
    const { getByText } = render(
      <FriendActionButton targetUserId="target1" initialStatus="none" />,
    );

    const addBtn = getByText('Adicionar');

    await act(async () => {
      fireEvent.press(addBtn);
    });

    expect(mockSendFriendRequest).toHaveBeenCalledWith('target1');
  });

  it('catches and logs errors gracefully during add action exception', async () => {
    mockSendFriendRequest.mockRejectedValueOnce(new Error('Send failed'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { getByText } = render(
      <FriendActionButton targetUserId="target1" initialStatus="none" />,
    );

    const addBtn = getByText('Adicionar');

    await act(async () => {
      fireEvent.press(addBtn);
    });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
