import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  arrayRemove,
  arrayUnion,
  orderBy,
  limit,
  startAfter,
  documentId,
  collectionGroup,
  increment,
  runTransaction,
} from 'firebase/firestore';

import {
  getPaginatedRanking,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  createGroup,
  subscribeToSentRequests,
  subscribeToReceivedRequests,
  subscribeToGroups,
  getUserDetails,
  getUsersByIds,
  removeFriendship,
  leaveGroup,
  getGroupDetails,
  updateGroupDetails,
  addGroupMember,
  removeGroupMember,
  getPublicEchoes,
  addRatClap,
  replyToEcho,
  getEchoReplies,
  createNotification,
  subscribeToNotifications,
  markNotificationAsRead,
  updateUserInfluencerStatus,
} from '@core/api/social';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(),
  arrayRemove: jest.fn(),
  arrayUnion: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  documentId: jest.fn(),
  collectionGroup: jest.fn(),
  increment: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock('@core/firebase/firebase', () => ({
  db: {},
}));

describe('Social API Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    doc.mockReturnValue({ id: 'mock-id' }); // default for all doc() calls unless overridden
    updateDoc.mockResolvedValue();
    getDoc.mockResolvedValue({ exists: () => false });
  });

  describe('getPaginatedRanking', () => {
    it('should get paginated ranking without lastVisibleDoc', async () => {
      getDocs.mockResolvedValueOnce({
        docs: [{ id: 'u1', data: () => ({ name: 'User 1' }) }],
      });
      const res = await getPaginatedRanking();
      expect(res.users).toEqual([{ id: 'u1', name: 'User 1' }]);
    });

    it('should get paginated ranking with lastVisibleDoc', async () => {
      getDocs.mockResolvedValueOnce({ docs: [] });
      await getPaginatedRanking('docId');
      expect(startAfter).toHaveBeenCalledWith('docId');
    });

    it('should map error and throw', async () => {
      getDocs.mockRejectedValueOnce(new Error('Firebase error'));
      await expect(getPaginatedRanking()).rejects.toThrow();
    });
  });

  describe('searchUsers', () => {
    it('should return empty if no queryText', async () => {
      expect(await searchUsers()).toEqual([]);
    });

    it('should search users', async () => {
      getDocs.mockResolvedValueOnce({ docs: [{ id: 'u1', data: () => ({}) }] });
      await searchUsers('Tha');
      expect(where).toHaveBeenCalledWith('username_lowercase', '>=', 'tha');
    });

    it('should throw on error', async () => {
      getDocs.mockRejectedValueOnce(new Error('Firebase error'));
      await expect(searchUsers('Tha')).rejects.toThrow();
    });
  });

  describe('friendships', () => {
    it('sendFriendRequest should skip if already exists', async () => {
      getDocs.mockResolvedValueOnce({ empty: false });
      await sendFriendRequest('u1', 'u2');
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('sendFriendRequest should addDoc if empty', async () => {
      getDocs.mockResolvedValueOnce({ empty: true });
      await sendFriendRequest('u1', 'u2');
      expect(addDoc).toHaveBeenCalled();
    });

    it('sendFriendRequest should throw error', async () => {
      getDocs.mockRejectedValueOnce(new Error('Firebase error'));
      await expect(sendFriendRequest('u1', 'u2')).rejects.toThrow();
    });

    it('acceptFriendRequest should update doc', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ senderId: 'u2' }),
      });
      await acceptFriendRequest('req1', 'u1', 'Thales', null);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('acceptFriendRequest should throw error', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ senderId: 'u2' }),
      });
      updateDoc.mockRejectedValueOnce(new Error('Err'));
      await expect(
        acceptFriendRequest('req1', 'u1', 'Thales', null),
      ).rejects.toThrow();
    });

    it('rejectFriendRequest should update doc', async () => {
      await rejectFriendRequest('req1');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('rejectFriendRequest should throw error', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Err'));
      await expect(rejectFriendRequest('req1')).rejects.toThrow();
    });

    it('removeFriendship should get both queries and delete docs', async () => {
      getDocs
        .mockResolvedValueOnce({ docs: [{ ref: 'ref1' }] })
        .mockResolvedValueOnce({ docs: [] });
      await removeFriendship('u1', 'u2');
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('removeFriendship should throw error', async () => {
      getDocs.mockRejectedValueOnce(new Error('Err'));
      await expect(removeFriendship('u1', 'u2')).rejects.toThrow();
    });
  });

  describe('groups', () => {
    it('createGroup should add doc', async () => {
      addDoc.mockResolvedValueOnce({ id: 'g1' });
      expect(await createGroup('G1', 'u1', ['u2'])).toBe('g1');
    });

    it('createGroup should catch error', async () => {
      addDoc.mockRejectedValueOnce(new Error('Err'));
      await expect(createGroup('G1', 'u1', [])).rejects.toThrow();
    });

    it('leaveGroup should update doc', async () => {
      await leaveGroup('g1', 'u1');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('leaveGroup should catch error', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Err'));
      await expect(leaveGroup('g1', 'u1')).rejects.toThrow();
    });

    it('getGroupDetails should return null if not exists', async () => {
      getDoc.mockResolvedValueOnce({ exists: () => false });
      expect(await getGroupDetails('g1')).toBeNull();
    });

    it('getGroupDetails should return data', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ members: ['u1'] }),
      });
      getDocs.mockResolvedValueOnce({ docs: [{ id: 'u1', data: () => ({}) }] });
      const details = await getGroupDetails('g1');
      expect(details.id).toBe('g1');
    });

    it('getGroupDetails should handle missing members field in doc', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Group No Members' }),
      });
      const details = await getGroupDetails('g1');
      expect(details.members).toEqual([]);
    });

    it('getGroupDetails should catch error', async () => {
      getDoc.mockRejectedValueOnce(new Error('Err'));
      await expect(getGroupDetails('g1')).rejects.toThrow();
    });

    it('updateGroupDetails should update doc', async () => {
      await updateGroupDetails('g1', 'N', 'D');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('updateGroupDetails should catch error', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Err'));
      await expect(updateGroupDetails('g1', 'N', 'D')).rejects.toThrow();
    });

    it('addGroupMember should update doc', async () => {
      await addGroupMember('g1', 'u1');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('addGroupMember should catch error', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Err'));
      await expect(addGroupMember('g1', 'u1')).rejects.toThrow();
    });

    it('removeGroupMember should update doc', async () => {
      await removeGroupMember('g1', 'u1');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('removeGroupMember should catch error', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Err'));
      await expect(removeGroupMember('g1', 'u1')).rejects.toThrow();
    });
  });

  describe('getUsersByIds', () => {
    it('should return empty array if uids empty', async () => {
      expect(await getUsersByIds([])).toEqual([]);
    });

    it('should chunk requests and return merged array', async () => {
      const uids = new Array(35).fill('u1');
      getDocs.mockResolvedValue({ docs: [{ id: 'uid', data: () => ({}) }] });
      const result = await getUsersByIds(uids);
      expect(result).toHaveLength(2);
    });

    it('should throw on error', async () => {
      getDocs.mockRejectedValueOnce(new Error('Err'));
      await expect(getUsersByIds(['u1'])).rejects.toThrow();
    });
  });

  describe('subscriptions', () => {
    it('subscribeToSentRequests should call onSnapshot and trigger callback', () => {
      onSnapshot.mockImplementationOnce((q, cb) =>
        cb({ docs: [{ id: 'd1', data: () => ({}) }] }),
      );
      const cb = jest.fn();
      subscribeToSentRequests('u1', cb);
      expect(cb).toHaveBeenCalled();
    });

    it('subscribeToReceivedRequests should call onSnapshot and trigger callback', () => {
      onSnapshot.mockImplementationOnce((q, cb) =>
        cb({ docs: [{ id: 'd1', data: () => ({}) }] }),
      );
      const cb = jest.fn();
      subscribeToReceivedRequests('u1', cb);
      expect(cb).toHaveBeenCalled();
    });

    it('subscribeToGroups should call onSnapshot and trigger callback', () => {
      onSnapshot.mockImplementationOnce((q, cb) =>
        cb({ docs: [{ id: 'd1', data: () => ({}) }] }),
      );
      const cb = jest.fn();
      subscribeToGroups('u1', cb);
      expect(cb).toHaveBeenCalled();
    });

    it('subscribeToNotifications should call onSnapshot and trigger callback', () => {
      onSnapshot.mockImplementationOnce((q, cb) =>
        cb({ docs: [{ id: 'd1', data: () => ({}) }] }),
      );
      const cb = jest.fn();
      subscribeToNotifications('u1', cb);
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('Echoes and Annotations', () => {
    it('getPublicEchoes should return empty if no bookId', async () => {
      expect(await getPublicEchoes(null)).toEqual([]);
    });

    it('getPublicEchoes should fetch, filter and sort (handling equal claps)', async () => {
      // Testing the sort branch where claps are equal, it sorts by timestamp
      const mockDocs = [
        {
          id: 'e1',
          ref: { parent: { parent: { id: 'u1' } } },
          data: () => ({
            reactions: { claps: 10 },
            timestamp: { seconds: 1 },
            pageLocation: 10,
          }),
        },
        {
          id: 'e2',
          ref: { parent: { parent: { id: 'u2' } } },
          data: () => ({
            reactions: { claps: 10 },
            timestamp: { seconds: 2 },
            pageLocation: 20,
          }),
        },
      ];
      getDocs.mockResolvedValueOnce({ docs: mockDocs });

      const echoes = await getPublicEchoes('b1', 25, 'myuid');
      expect(echoes[0].id).toBe('e2'); // e2 has newer timestamp
      expect(echoes[1].id).toBe('e1');
    });

    it('getPublicEchoes should handle missing fields in sort and skip filtering if userCurrentPage is null', async () => {
      const mockDocs = [
        {
          id: 'e1',
          ref: { parent: { parent: { id: 'u1' } } },
          data: () => ({ reactions: null }),
        }, // Null reactions
        {
          id: 'e2',
          ref: { parent: { parent: { id: 'u2' } } },
          data: () => ({ reactions: { claps: 5 } }),
        },
        {
          id: 'e3',
          ref: { parent: { parent: { id: 'u3' } } },
          data: () => ({ reactions: { claps: null } }),
        }, // Null claps
      ];
      getDocs.mockResolvedValueOnce({ docs: mockDocs });

      const echoes = await getPublicEchoes('b1', null, 'myuid');
      expect(echoes[0].id).toBe('e2'); // 5 claps
      expect(echoes).toHaveLength(3);
    });

    it('getPublicEchoes should sort by timestamp if claps are equal and handle missing timestamps', async () => {
      const mockDocs = [
        {
          id: 'e1',
          ref: { parent: { parent: { id: 'u1' } } },
          data: () => ({ reactions: { claps: 10 }, timestamp: null }),
        },
        {
          id: 'e2',
          ref: { parent: { parent: { id: 'u2' } } },
          data: () => ({
            reactions: { claps: 10 },
            timestamp: { seconds: 100 },
          }),
        },
      ];
      getDocs.mockResolvedValueOnce({ docs: mockDocs });
      const echoes = await getPublicEchoes('b1', null, 'myuid');
      expect(echoes[0].id).toBe('e2'); // 100 > 0
    });

    it('getPublicEchoes should catch error and return empty array', async () => {
      getDocs.mockRejectedValueOnce(new Error('Index needed'));
      expect(await getPublicEchoes('b1', 25, 'myuid')).toEqual([]);
    });

    it('addRatClap should update doc and create notif', async () => {
      await addRatClap('u1', 'b1', 'e1', 'u2', 'Thales');
      expect(updateDoc).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalled();
    });

    it('addRatClap should skip notification if user claps for their own echo', async () => {
      await addRatClap('u1', 'b1', 'e1', 'u1', 'Thales');
      expect(updateDoc).toHaveBeenCalled();
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('addRatClap should catch error', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Err'));
      await expect(
        addRatClap('u1', 'b1', 'e1', 'u2', 'Thales'),
      ).rejects.toThrow();
    });

    it('replyToEcho should run transaction and create notification', async () => {
      const parentDocMock = {
        exists: () => true,
        data: () => ({ pageLocation: 10 }),
      };
      const transactionMock = {
        get: jest.fn().mockResolvedValue(parentDocMock),
        set: jest.fn(),
        update: jest.fn(),
      };
      runTransaction.mockImplementationOnce(async (db, cb) =>
        cb(transactionMock),
      );

      const id = await replyToEcho(
        'u1',
        'b1',
        'e1',
        'hello',
        { displayName: 'User' },
        'u2',
      );
      expect(transactionMock.set).toHaveBeenCalled();
      expect(transactionMock.update).toHaveBeenCalled();
      expect(id).toBe('mock-id');
      expect(addDoc).toHaveBeenCalled(); // createNotification
    });

    it('replyToEcho should handle missing parent pageLocation and missing user metadata', async () => {
      const parentDocMock = { exists: () => true, data: () => ({}) };
      const transactionMock = {
        get: jest.fn().mockResolvedValue(parentDocMock),
        set: jest.fn(),
        update: jest.fn(),
      };
      runTransaction.mockImplementationOnce(async (db, cb) =>
        cb(transactionMock),
      );

      await replyToEcho('u1', 'b1', 'e1', 'hello', {}, 'u1');
      expect(transactionMock.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pageLocation: null,
          userMetadata: { displayName: 'Leitor', photoURL: null },
        }),
      );
      expect(addDoc).not.toHaveBeenCalled(); // No notification for self-reply
    });

    it('replyToEcho should throw inside transaction if parent missing', async () => {
      const parentDocMock = { exists: () => false };
      const transactionMock = {
        get: jest.fn().mockResolvedValue(parentDocMock),
      };
      runTransaction.mockImplementationOnce(async (db, cb) =>
        cb(transactionMock),
      );

      await expect(
        replyToEcho('u1', 'b1', 'e1', 'hello', {}, 'u2'),
      ).rejects.toThrow();
    });

    it('replyToEcho should catch error', async () => {
      runTransaction.mockRejectedValueOnce(new Error('Err'));
      await expect(
        replyToEcho('u1', 'b1', 'e1', 'hello', {}, 'u2'),
      ).rejects.toThrow();
    });

    it('getEchoReplies should fetch and sort replies (equal claps)', async () => {
      getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'r1',
            data: () => ({
              reactions: { claps: 2 },
              timestamp: { seconds: 1 },
            }),
          },
          {
            id: 'r2',
            data: () => ({
              reactions: { claps: 2 },
              timestamp: { seconds: 2 },
            }),
          },
        ],
      });
      const replies = await getEchoReplies('u1', 'b1', 'e1');
      expect(replies[0].id).toBe('r2');
      expect(replies[1].id).toBe('r1');
    });

    it('getEchoReplies should handle missing fields in sort', async () => {
      getDocs.mockResolvedValueOnce({
        docs: [
          { id: 'r1', data: () => ({ reactions: null }) },
          { id: 'r2', data: () => ({ reactions: { claps: 5 } }) },
          {
            id: 'r3',
            data: () => ({ reactions: { claps: 5 }, timestamp: null }),
          },
          {
            id: 'r4',
            data: () => ({
              reactions: { claps: 5 },
              timestamp: { seconds: 100 },
            }),
          },
        ],
      });
      const replies = await getEchoReplies('u1', 'b1', 'e1');
      expect(replies[0].id).toBe('r4'); // 5 claps, newer timestamp
      // r2 and r3 both have 5 claps and 0 time, so order is not guaranteed by claps/time
      expect(replies.map(r => r.id)).toContain('r2');
      expect(replies.map(r => r.id)).toContain('r3');
    });

    it('getEchoReplies should catch error', async () => {
      getDocs.mockRejectedValueOnce(new Error('Err'));
      expect(await getEchoReplies('u1', 'b1', 'e1')).toEqual([]);
    });
  });

  describe('Misc', () => {
    it('getUserDetails should return user data', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'A' }),
      });
      expect(await getUserDetails('u1')).toEqual({ id: 'u1', name: 'A' });
    });

    it('getUserDetails should return null if missing', async () => {
      getDoc.mockResolvedValueOnce({ exists: () => false });
      expect(await getUserDetails('u1')).toBeNull();
    });

    it('getUserDetails should catch error and return null', async () => {
      getDoc.mockRejectedValueOnce(new Error('Fail'));
      expect(await getUserDetails('u1')).toBeNull();
    });

    it('createNotification should catch error without throwing', async () => {
      addDoc.mockRejectedValueOnce(new Error('Fail'));
      await createNotification('u1', 'clap', {}, 'b1', 'e1');
      expect(addDoc).toHaveBeenCalled();
    });

    it('markNotificationAsRead should call updateDoc', async () => {
      await markNotificationAsRead('u1', 'n1');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('markNotificationAsRead should catch error without throwing', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Fail'));
      await markNotificationAsRead('u1', 'n1');
    });

    it('updateUserInfluencerStatus should call updateDoc', async () => {
      await updateUserInfluencerStatus('u1', true);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('updateUserInfluencerStatus should catch error without throwing', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Fail'));
      await updateUserInfluencerStatus('u1', true);
    });
  });
});
