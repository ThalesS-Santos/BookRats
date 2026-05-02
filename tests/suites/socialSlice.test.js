import { createSocialSlice } from '@core/store/slices/socialSlice';
import { subscribeToNotifications, markNotificationAsRead } from '@core/api/social';
import { db } from '@core/firebase/firebase';
import { collection, onSnapshot, query, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { usePopupStore } from '../../src/store/usePopupStore';

// Mock dependencies
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(),
  addDoc: jest.fn(),
}));

jest.mock('@core/firebase/firebase', () => ({
  db: {}
}));

jest.mock('@core/api/social', () => ({
  subscribeToNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
}));

jest.mock('../../src/store/usePopupStore', () => ({
  usePopupStore: {
    getState: jest.fn().mockReturnValue({
      showPopup: jest.fn()
    })
  }
}));

describe('Social Slice', () => {
  let state;
  let setMock;
  let getMock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    state = {};
    setMock = jest.fn((newState) => {
      state = { ...state, ...(typeof newState === 'function' ? newState(state) : newState) };
    });
    
    getMock = jest.fn(() => state);
    
    const slice = createSocialSlice(setMock, getMock);
    state = { 
      ...slice, 
      notifications: [],
      unreadCount: 0,
      user: { uid: 'user1', displayName: 'Thales' },
      hasInfluencerBadge: false,
      calculateInfluencerBadge: jest.fn()
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
        callback([{ id: 'n1', read: false }, { id: 'n2', read: true }]);
        return jest.fn();
      });

      state.startNotificationsListener('user1');
      
      expect(state.calculateInfluencerBadge).toHaveBeenCalledWith('user1');
      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ unreadCount: 1 }));
    });
    
    it('should call badge calculation again if unread > 0 and badge not held', () => {
      subscribeToNotifications.mockImplementation((uid, callback) => {
        callback([{ id: 'n1', read: false }]);
        return jest.fn();
      });

      state.startNotificationsListener('user1');
      // Called once on start, once after callback
      expect(state.calculateInfluencerBadge).toHaveBeenCalledTimes(2);
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      state.notifications = [{ id: 'n1', read: false }, { id: 'n2', read: false }];
      
      await state.markAsRead('user1', 'n1');
      
      expect(markNotificationAsRead).toHaveBeenCalledWith('user1', 'n1');
      // Zustand set logic is passed as a function, let's execute it manually since we mocked setMock
      const updateFn = setMock.mock.calls[0][0];
      const newState = updateFn(state);
      expect(newState.notifications[0].read).toBe(true);
      expect(newState.unreadCount).toBe(1);
    });
  });

  describe('markAllAsRead', () => {
    it('should return if no unread notifications', async () => {
      state.notifications = [{ id: 'n1', read: true }];
      await state.markAllAsRead('user1');
      expect(markNotificationAsRead).not.toHaveBeenCalled();
    });

    it('should mark all unread as read', async () => {
      state.notifications = [{ id: 'n1', read: false }, { id: 'n2', read: false }];
      
      await state.markAllAsRead('user1');
      
      expect(markNotificationAsRead).toHaveBeenCalledTimes(2);
      
      const updateFn = setMock.mock.calls[0][0];
      const newState = updateFn(state);
      expect(newState.unreadCount).toBe(0);
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
      expect(setMock).toHaveBeenCalledWith({ messages: [{ id: 'm1', text: 'Hi' }], chatError: null });
    });

    it('subscribeToGroupMessages should handle error', () => {
      onSnapshot.mockImplementation((q, callback, errCb) => {
        errCb(new Error('Auth failed'));
        return jest.fn();
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      state.subscribeToGroupMessages('group1');
      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ chatError: expect.any(String) }));
      errorSpy.mockRestore();
    });

    it('subscribeToUsers should load users', () => {
      onSnapshot.mockImplementation((q, callback) => {
        callback({ docs: [{ id: 'u1', data: () => ({ name: 'John' }) }] });
        return jest.fn();
      });

      state.subscribeToUsers();
      expect(setMock).toHaveBeenCalledWith({ users: [{ id: 'u1', name: 'John' }], rankingError: null });
    });

    it('subscribeToUsers should handle error', () => {
      onSnapshot.mockImplementation((q, callback, errCb) => {
        errCb(new Error('Users fail'));
        return jest.fn();
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      state.subscribeToUsers();
      expect(setMock).toHaveBeenCalledWith({ rankingError: 'Users fail' });
      errorSpy.mockRestore();
    });

    it('sendMessage should send text message', async () => {
      await state.sendMessage('group1', 'Hello');
      expect(addDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
        text: 'Hello',
        type: 'text',
        senderName: 'Thales'
      }));
    });

    it('sendMessage should return if no user', async () => {
      state.user = null;
      await state.sendMessage('group1', 'Hello');
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('sendMessage should send object message', async () => {
      await state.sendMessage('group1', { text: 'Notification', type: 'system' });
      expect(addDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
        text: 'Notification',
        type: 'system'
      }));
    });

    it('sendMessage should use email prefix if displayName is missing', async () => {
      state.user = { uid: 'u1', email: 'no-name@test.com', displayName: null };
      await state.sendMessage('group1', 'Hello');
      expect(addDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
        senderName: 'no-name'
      }));
    });

    it('sendMessage should default to type text if not provided in object', async () => {
      await state.sendMessage('group1', { text: 'Hello' });
      expect(addDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
        type: 'text'
      }));
    });

    it('sendMessage should show popup on error', async () => {
      addDoc.mockRejectedValueOnce(new Error('Add fail'));
      const showPopupMock = usePopupStore.getState().showPopup;

      await state.sendMessage('group1', 'Hello');
      expect(showPopupMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
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
      // Only called once at the start, not inside the callback because hasInfluencerBadge is true
      expect(state.calculateInfluencerBadge).toHaveBeenCalledTimes(1);
    });
  });
});
