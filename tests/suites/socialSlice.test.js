import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';

import {
  subscribeToNotifications,
  markNotificationAsRead,
  subscribeToReceivedRequests,
  subscribeToSentRequests,
  subscribeToFriends,
  acceptFriendRequest,
  rejectFriendRequest,
  sendFriendRequest,
  getUsersByIds,
} from '@core/api/social';
import { db } from '@core/firebase/firebase';
import { NotificationService } from '@core/services/NotificationService';
import { selectUnreadCount } from '@core/store/selectors';
import { createSocialSlice } from '@core/store/slices/socialSlice';

import { usePopupStore } from '../../src/store/usePopupStore';

// Mock dependencies
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(),
  addDoc: jest.fn(),
}));

jest.mock('@core/firebase/firebase', () => ({
  db: {},
}));

jest.mock('@core/api/social', () => ({
  subscribeToNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  subscribeToReceivedRequests: jest.fn(),
  subscribeToSentRequests: jest.fn(),
  subscribeToFriends: jest.fn(),
  acceptFriendRequest: jest.fn(),
  rejectFriendRequest: jest.fn(),
  sendFriendRequest: jest.fn(),
  getUsersByIds: jest.fn(),
}));

jest.mock('@core/services/NotificationService', () => ({
  NotificationService: {
    markAllAsRead: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../src/store/usePopupStore', () => ({
  usePopupStore: {
    getState: jest.fn().mockReturnValue({
      showPopup: jest.fn(),
    }),
  },
}));

describe('Social Slice', () => {
  let state;
  let setMock;
  let getMock;

  beforeEach(() => {
    jest.clearAllMocks();

    state = {};
    setMock = jest.fn(newState => {
      state = {
        ...state,
        ...(typeof newState === 'function' ? newState(state) : newState),
      };
    });

    getMock = jest.fn(() => state);

    const slice = createSocialSlice(setMock, getMock);
    state = {
      ...slice,
      notifications: [],
      user: {
        uid: 'user1',
        displayName: 'Thales',
        photoURL: 'https://pic.com',
      },
      friends: [],
      receivedRequests: [],
      sentRequests: [],
      totalPagesRead: 150,
      totalClaps: 5,
      hasInfluencerBadge: false,
      calculateInfluencerBadge: jest.fn(),
    };
  });

  describe('startNotificationsListener', () => {
    it('should return empty fn if no uid', () => {
      const unsub = state.startNotificationsListener(null);
      expect(typeof unsub).toBe('function');
      expect(subscribeToNotifications).not.toHaveBeenCalled();
    });

    it('should calculate badge on start and subscribe', () => {
      subscribeToNotifications.mockImplementation((uid, callback) => {
        callback([
          { id: 'n1', read: false },
          { id: 'n2', read: true },
        ]);
        return jest.fn();
      });

      state.startNotificationsListener('user1');

      expect(state.calculateInfluencerBadge).toHaveBeenCalledWith('user1');
      // unreadCount is no longer stored — only the notifications list is set,
      // and the count is derived from it (selectUnreadCount).
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          notifications: [
            { id: 'n1', read: false },
            { id: 'n2', read: true },
          ],
        }),
      );
      expect(selectUnreadCount(state)).toBe(1);
    });

    it('should call badge calculation again if unread > 0 and badge not held', () => {
      subscribeToNotifications.mockImplementation((uid, callback) => {
        callback([{ id: 'n1', read: false }]);
        return jest.fn();
      });

      state.startNotificationsListener('user1');
      expect(state.calculateInfluencerBadge).toHaveBeenCalledTimes(2);
    });
  });

  describe('startSocialListeners', () => {
    it('should return empty fn if no uid', () => {
      const unsub = state.startSocialListeners(null);
      expect(typeof unsub).toBe('function');
      expect(subscribeToReceivedRequests).not.toHaveBeenCalled();
    });

    it('should enrich pending received requests with sender profiles', async () => {
      const mockUnsubRecv = jest.fn();
      const mockUnsubSent = jest.fn();
      const mockUnsubFriends = jest.fn();

      subscribeToReceivedRequests.mockImplementation((uid, callback) => {
        callback([
          { id: 'req1', senderId: 'sender1', status: 'pending' },
          { id: 'req2', senderId: 'sender2', status: 'accepted' },
        ]);
        return mockUnsubRecv;
      });

      subscribeToSentRequests.mockImplementation((uid, callback) => {
        callback([{ id: 'sent1', status: 'pending' }]);
        return mockUnsubSent;
      });

      subscribeToFriends.mockImplementation((uid, callback) => {
        callback(['friend1']);
        return mockUnsubFriends;
      });

      getUsersByIds.mockImplementation(async ids => {
        return ids.map(id => ({
          id,
          username: id === 'sender1' ? 'senderOne' : 'friendOne',
        }));
      });

      const unsub = state.startSocialListeners('user1');

      // Wait for any async/promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(getUsersByIds).toHaveBeenCalledWith(['sender1']);
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          receivedRequests: [
            {
              id: 'req1',
              senderId: 'sender1',
              status: 'pending',
              sender: { id: 'sender1', username: 'senderOne' },
            },
          ],
        }),
      );

      expect(setMock).toHaveBeenCalledWith({
        sentRequests: [{ id: 'sent1', status: 'pending' }],
      });

      expect(getUsersByIds).toHaveBeenCalledWith(['friend1']);
      expect(setMock).toHaveBeenCalledWith({
        friends: [{ id: 'friend1', username: 'friendOne' }],
      });

      unsub();
      expect(mockUnsubRecv).toHaveBeenCalled();
      expect(mockUnsubSent).toHaveBeenCalled();
      expect(mockUnsubFriends).toHaveBeenCalled();
    });

    it('should empty friends list if friendIds is empty', async () => {
      subscribeToReceivedRequests.mockReturnValue(jest.fn());
      subscribeToSentRequests.mockReturnValue(jest.fn());
      subscribeToFriends.mockImplementation((uid, callback) => {
        callback([]);
        return jest.fn();
      });

      state.startSocialListeners('user1');
      expect(setMock).toHaveBeenCalledWith({ friends: [] });
    });
  });

  describe('acceptFriend', () => {
    it('should do nothing if no user in store', async () => {
      state.user = null;
      await state.acceptFriend('req1');
      expect(acceptFriendRequest).not.toHaveBeenCalled();
    });

    it('should call accept api and manage loading', async () => {
      await state.acceptFriend('req1');
      expect(setMock).toHaveBeenCalledWith({ socialLoading: true });
      expect(acceptFriendRequest).toHaveBeenCalledWith(
        'req1',
        'user1',
        'Thales',
        'https://pic.com',
      );
      expect(setMock).toHaveBeenCalledWith({ socialLoading: false });
    });

    it('should handle missing displayName with email prefix', async () => {
      state.user = { uid: 'user1', email: 'thales@bookrats.com' };
      await state.acceptFriend('req1');
      expect(acceptFriendRequest).toHaveBeenCalledWith(
        'req1',
        'user1',
        'thales',
        undefined,
      );
    });

    it('should log error on exception', async () => {
      acceptFriendRequest.mockRejectedValueOnce(new Error('fail'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      await state.acceptFriend('req1');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('declineFriend', () => {
    it('should call reject API and manage loading', async () => {
      await state.declineFriend('req1');
      expect(setMock).toHaveBeenCalledWith({ socialLoading: true });
      expect(rejectFriendRequest).toHaveBeenCalledWith('req1');
      expect(setMock).toHaveBeenCalledWith({ socialLoading: false });
    });

    it('should log error on exception', async () => {
      rejectFriendRequest.mockRejectedValueOnce(new Error('fail'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      await state.declineFriend('req1');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('sendFriendRequest', () => {
    it('should do nothing if no user in store', async () => {
      state.user = null;
      await state.sendFriendRequest('target1');
      expect(sendFriendRequest).not.toHaveBeenCalled();
    });

    it('should call sendFriendRequest API', async () => {
      await state.sendFriendRequest('target1');
      expect(sendFriendRequest).toHaveBeenCalledWith('user1', 'target1');
    });

    it('should log error on exception', async () => {
      sendFriendRequest.mockRejectedValueOnce(new Error('fail'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      await state.sendFriendRequest('target1');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      state.notifications = [
        { id: 'n1', read: false },
        { id: 'n2', read: false },
      ];

      await state.markAsRead('user1', 'n1');

      expect(markNotificationAsRead).toHaveBeenCalledWith('user1', 'n1');
      const updateFn = setMock.mock.calls[0][0];
      const newState = updateFn(state);
      expect(newState.notifications[0].read).toBe(true);
      expect(selectUnreadCount(newState)).toBe(1);
    });
  });

  describe('markAllAsRead', () => {
    it('should return if notifications list is empty', async () => {
      state.notifications = [];
      await state.markAllAsRead('user1');
      expect(NotificationService.markAllAsRead).not.toHaveBeenCalled();
    });

    it('should mark all unread as read', async () => {
      state.notifications = [
        { id: 'n1', read: false },
        { id: 'n2', read: false },
      ];

      await state.markAllAsRead('user1');

      expect(NotificationService.markAllAsRead).toHaveBeenCalledWith('user1');

      const updateFn = setMock.mock.calls[0][0];
      const newState = updateFn(state);
      expect(selectUnreadCount(newState)).toBe(0);
      expect(newState.notifications[0].read).toBe(true);
      expect(newState.notifications[1].read).toBe(true);
    });
  });

  describe('Group logic', () => {
    it('subscribeToGroupMessages should load messages', () => {
      onSnapshot.mockImplementation((q, callback) => {
        callback({ docs: [{ id: 'm1', data: () => ({ text: 'Hi' }) }] });
        return jest.fn();
      });

      state.subscribeToGroupMessages('group1');
      expect(setMock).toHaveBeenCalledWith({ chatError: null });
      expect(setMock).toHaveBeenCalledWith({
        messages: [{ id: 'm1', text: 'Hi' }],
        chatError: null,
      });
    });

    it('subscribeToGroupMessages should bound the listener with a limit (scalability)', () => {
      onSnapshot.mockImplementation((q, callback) => {
        callback({ docs: [] });
        return jest.fn();
      });

      state.subscribeToGroupMessages('group1');

      // O chat NÃO pode carregar a coleção inteira — precisa de limit().
      expect(limit).toHaveBeenCalledWith(50);
    });

    it('subscribeToGroupMessages should handle error', () => {
      onSnapshot.mockImplementation((q, callback, errCb) => {
        errCb(new Error('Auth failed'));
        return jest.fn();
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      state.subscribeToGroupMessages('group1');
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({ chatError: expect.any(String) }),
      );
      errorSpy.mockRestore();
    });

    it('sendMessage should send text message', async () => {
      await state.sendMessage('group1', 'Hello');
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          text: 'Hello',
          type: 'text',
          senderName: 'Thales',
        }),
      );
    });

    it('sendMessage should return if no user', async () => {
      state.user = null;
      await state.sendMessage('group1', 'Hello');
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('sendMessage should send object message', async () => {
      await state.sendMessage('group1', {
        text: 'Notification',
        type: 'system',
      });
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          text: 'Notification',
          type: 'system',
        }),
      );
    });

    it('sendMessage should use email prefix if displayName is missing', async () => {
      state.user = { uid: 'u1', email: 'no-name@test.com', displayName: null };
      await state.sendMessage('group1', 'Hello');
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          senderName: 'no-name',
        }),
      );
    });

    it('sendMessage should default to type text if not provided in object', async () => {
      await state.sendMessage('group1', { text: 'Hello' });
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          type: 'text',
        }),
      );
    });

    it('sendMessage should show popup on error', async () => {
      addDoc.mockRejectedValueOnce(new Error('Add fail'));
      const showPopupMock = usePopupStore.getState().showPopup;

      await state.sendMessage('group1', 'Hello');
      expect(showPopupMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      );
    });
  });

  describe('Social Slice Edge Cases', () => {
    it('startNotificationsListener should skip badge calc if function is missing', () => {
      state.calculateInfluencerBadge = null;
      subscribeToNotifications.mockImplementation((uid, cb) => {
        cb([{ id: 'n1', read: false }]);
        return jest.fn();
      });

      expect(() => state.startNotificationsListener('u1')).not.toThrow();
    });

    it('startNotificationsListener should not call badge calc if badge already held', () => {
      state.hasInfluencerBadge = true;
      subscribeToNotifications.mockImplementation((uid, cb) => {
        cb([{ id: 'n1', read: false }]);
        return jest.fn();
      });

      state.startNotificationsListener('u1');
      expect(state.calculateInfluencerBadge).toHaveBeenCalledTimes(1);
    });
  });
});
