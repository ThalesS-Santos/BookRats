import React from 'react';

import { render, fireEvent, act } from '@testing-library/react-native';

import FriendRequestCard from '../../src/ui/components/molecules/FriendRequestCard';

// Mock dependencies
const mockAcceptFriend = jest.fn(() => Promise.resolve());
const mockDeclineFriend = jest.fn(() => Promise.resolve());

jest.mock('@core/store', () => ({
  useMainStore: () => ({
    acceptFriend: mockAcceptFriend,
    declineFriend: mockDeclineFriend,
  }),
}));

jest.mock('../../src/utils/haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
  NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
}));

describe('FriendRequestCard Component', () => {
  const mockRequest = {
    id: 'req1',
    sender: {
      username: 'senderOne',
      displayName: 'Sender One',
      profilePic: 'https://avatar.com/1',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders request details correctly', () => {
    const { getByText } = render(<FriendRequestCard request={mockRequest} />);

    expect(getByText('Sender One')).toBeTruthy();
    expect(getByText('@senderOne')).toBeTruthy();
  });

  it('handles empty/partial sender data gracefully', () => {
    const requestNoProfile = {
      id: 'req1',
      sender: {
        email: 'test@bookrats.com',
      },
    };
    const { getByText } = render(
      <FriendRequestCard request={requestNoProfile} />,
    );
    expect(getByText('test')).toBeTruthy();
  });

  it('triggers acceptFriend action and loading state on accept click', async () => {
    const { getByTestId } = render(<FriendRequestCard request={mockRequest} />);

    const acceptBtn = getByTestId('accept-btn');

    await act(async () => {
      fireEvent.press(acceptBtn);
    });

    expect(mockAcceptFriend).toHaveBeenCalledWith('req1');
  });

  it('triggers declineFriend action and loading state on decline click', async () => {
    const { getByTestId } = render(<FriendRequestCard request={mockRequest} />);

    const declineBtn = getByTestId('decline-btn');

    await act(async () => {
      fireEvent.press(declineBtn);
    });

    expect(mockDeclineFriend).toHaveBeenCalledWith('req1');
  });

  it('catches and logs errors gracefully during action processing', async () => {
    mockAcceptFriend.mockRejectedValueOnce(new Error('Accept failed'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { getByTestId } = render(<FriendRequestCard request={mockRequest} />);
    const acceptBtn = getByTestId('accept-btn');

    await act(async () => {
      fireEvent.press(acceptBtn);
    });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
