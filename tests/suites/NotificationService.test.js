import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

import { NotificationService } from '../../src/core/services/NotificationService';

jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return {
    ...actual,
    collection: jest.fn(),
    addDoc: jest.fn(),
    serverTimestamp: jest.fn(() => 'mock-timestamp'),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
    writeBatch: jest.fn(),
  };
});

jest.mock('../../src/core/firebase/firebase', () => ({
  db: {},
}));

describe('NotificationService', () => {
  const originalError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('sendNotification', () => {
    it('should return early if targetUserId is falsy or matches senderId', async () => {
      await NotificationService.sendNotification(null, { senderId: 'u1' });
      await NotificationService.sendNotification('u1', { senderId: 'u1' });

      expect(collection).not.toHaveBeenCalled();
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('should successfully send a notification', async () => {
      const mockRef = { id: 'ref1' };
      collection.mockReturnValueOnce(mockRef);
      addDoc.mockResolvedValueOnce({ id: 'doc1' });

      const payload = {
        type: 'CLAP_ECHO',
        senderId: 'u1',
        senderName: 'Sender Name',
        senderAvatar: 'https://avatar.com/1',
        relatedId: 'echo1',
        message: 'clapped your echo',
      };

      await NotificationService.sendNotification('u2', payload);

      expect(collection).toHaveBeenCalledWith(
        {},
        'users',
        'u2',
        'notifications',
      );
      expect(addDoc).toHaveBeenCalledWith(
        mockRef,
        expect.objectContaining({
          type: 'CLAP_ECHO',
          senderId: 'u1',
          senderName: 'Sender Name',
          senderAvatar: 'https://avatar.com/1',
          relatedId: 'echo1',
          message: 'clapped your echo',
          read: false,
          timestamp: 'mock-timestamp',
        }),
      );
    });

    it('should send notification with null senderAvatar if not provided', async () => {
      const mockRef = { id: 'ref1' };
      collection.mockReturnValueOnce(mockRef);
      addDoc.mockResolvedValueOnce({ id: 'doc1' });

      const payload = {
        type: 'CLAP_ECHO',
        senderId: 'u1',
        senderName: 'Sender Name',
        senderAvatar: undefined,
        relatedId: 'echo1',
        message: 'clapped your echo',
      };

      await NotificationService.sendNotification('u2', payload);

      expect(addDoc).toHaveBeenCalledWith(
        mockRef,
        expect.objectContaining({
          senderAvatar: null,
        }),
      );
    });

    it('should log an error if addDoc fails (and not throw)', async () => {
      collection.mockReturnValueOnce({ id: 'ref1' });
      const error = new Error('Firestore write failed');
      addDoc.mockRejectedValueOnce(error);

      await expect(
        NotificationService.sendNotification('u2', {
          type: 'CLAP_ECHO',
          senderId: 'u1',
        }),
      ).resolves.not.toThrow();

      // The structured logger routes the failure to console.error.
      expect(console.error).toHaveBeenCalled();
      const logged = String(console.error.mock.calls[0][0]);
      expect(logged).toContain('sendNotification');
      expect(logged).toContain('Firestore write failed');
    });
  });

  describe('markAllAsRead', () => {
    it('should return early if userId is falsy', async () => {
      await NotificationService.markAllAsRead(null);
      expect(collection).not.toHaveBeenCalled();
    });

    it('should return early if snapshot is empty', async () => {
      collection.mockReturnValueOnce({ id: 'ref1' });
      getDocs.mockResolvedValueOnce({ empty: true });

      await NotificationService.markAllAsRead('u1');

      expect(writeBatch).not.toHaveBeenCalled();
    });

    it('should successfully update unread notifications in batch', async () => {
      collection.mockReturnValueOnce({ id: 'ref1' });

      const mockDocs = [
        { id: 'n1', ref: { id: 'ref-n1' } },
        { id: 'n2', ref: { id: 'ref-n2' } },
      ];
      getDocs.mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn(() => Promise.resolve()),
      };
      writeBatch.mockReturnValueOnce(mockBatch);

      await NotificationService.markAllAsRead('u1');

      expect(collection).toHaveBeenCalledWith(
        {},
        'users',
        'u1',
        'notifications',
      );
      expect(writeBatch).toHaveBeenCalled();
      expect(mockBatch.update).toHaveBeenCalledWith(mockDocs[0].ref, {
        read: true,
      });
      expect(mockBatch.update).toHaveBeenCalledWith(mockDocs[1].ref, {
        read: true,
      });
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should log an error if markAllAsRead fails', async () => {
      collection.mockReturnValueOnce({ id: 'ref1' });
      const error = new Error('Batch failed');
      getDocs.mockRejectedValueOnce(error);

      await NotificationService.markAllAsRead('u1');

      expect(console.error).toHaveBeenCalled();
      const logged = String(console.error.mock.calls[0][0]);
      expect(logged).toContain('markAllAsRead');
      expect(logged).toContain('Batch failed');
    });
  });
});
