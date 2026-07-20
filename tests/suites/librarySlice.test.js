import { doc, collection, onSnapshot, updateDoc } from 'firebase/firestore';

import {
  addBook as apiAddBook,
  updateBookProgress,
  markAsDNF as apiMarkAsDNF,
} from '@core/api/books';
import { createLibrarySlice } from '@core/store/slices/librarySlice';

import { BOOK_STATUS } from '../../src/core/constants/bookStatus';
import { usePopupStore } from '../../src/store/usePopupStore';

// Mock dependencies
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn().mockImplementation(val => val),
  serverTimestamp: jest.fn().mockReturnValue('mock-timestamp'),
}));

jest.mock('@core/firebase/firebase', () => ({
  db: {},
}));

jest.mock('@core/api/books', () => ({
  addBook: jest.fn(),
  updateBookProgress: jest.fn(),
  markAsDNF: jest.fn(),
  updateBookWithStats: jest.fn(),
  deleteBook: jest.fn(),
}));

jest.mock('../../src/store/usePopupStore', () => ({
  usePopupStore: {
    getState: jest.fn().mockReturnValue({
      showPopup: jest.fn(),
    }),
  },
}));

// Mock the social store for the group notification try/catch
jest.mock('../../src/store/useSocialStore', () => ({
  useSocialStore: {
    getState: jest.fn().mockReturnValue({
      groups: [{ id: 'group1' }],
    }),
  },
}));

jest.mock(
  '../../../store/useSocialStore',
  () => ({
    useSocialStore: {
      getState: jest.fn().mockReturnValue({
        groups: [{ id: 'group1' }],
      }),
    },
  }),
  { virtual: true },
);

describe('Library Slice', () => {
  let state;
  let setMock;
  let getMock;

  beforeEach(() => {
    jest.clearAllMocks();

    state = {};
    setMock = jest.fn(newState => {
      const current =
        typeof newState === 'function' ? newState(state) : newState;
      state = { ...state, ...current };
    });

    getMock = jest.fn(() => state);

    const slice = createLibrarySlice(setMock, getMock);
    state = {
      ...slice,
      books: [],
      user: { uid: 'user1', displayName: 'Thales' },
      streak: 0,
      lastReadDate: '2023-01-01',
      totalPagesRead: 100,
      maxReadingSession: 50,
      totalBooksCompleted: 2,
      sendMessage: jest.fn(),
      repairLocked: false,
    };
  });

  describe('fetchUserData', () => {
    it('should setup snapshots and handle initial data (including sorted books)', () => {
      onSnapshot.mockImplementation((ref, callback) => {
        if (ref === 'userDocRef') {
          callback({
            exists: () => true,
            data: () => ({
              current_streak: 5,
              total_pages_read: 200,
              socialSummary: { totalPagesRead: 200, currentStreak: 5 },
            }),
          });
        } else {
          callback({
            docs: [
              {
                id: 'b1',
                data: () => ({ title: 'Old', createdAt: { seconds: 10 } }),
              },
              {
                id: 'b2',
                data: () => ({ title: 'New', createdAt: { seconds: 20 } }),
              },
              { id: 'b3', data: () => ({ title: 'NoTime' }) },
            ],
          });
        }
        return jest.fn();
      });

      doc.mockReturnValue('userDocRef');
      collection.mockReturnValue('booksColRef');

      state.fetchUserData('user1');

      expect(state.books[0].title).toBe('New');
      expect(state.books[1].title).toBe('Old');
      expect(state.books[2].title).toBe('NoTime');
    });

    it('should return a cleanup function that calls unsubs', () => {
      const unsubUser = jest.fn();
      const unsubBooks = jest.fn();
      onSnapshot.mockReturnValueOnce(unsubUser).mockReturnValueOnce(unsubBooks);

      const cleanup = state.fetchUserData('user1');
      cleanup();

      expect(unsubUser).toHaveBeenCalled();
      expect(unsubBooks).toHaveBeenCalled();
    });

    it('should lock repair and updateDoc if summary is out of sync', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          current_streak: 5,
          total_pages_read: 200,
          socialSummary: null, // triggers repair
        }),
      };

      onSnapshot.mockImplementation((ref, callback) => {
        if (ref === 'userDocRef') callback(mockDocSnap);
        return jest.fn();
      });

      doc.mockReturnValue('userDocRef');
      updateDoc.mockResolvedValueOnce();

      state.fetchUserData('user1');

      expect(setMock).toHaveBeenCalledWith({ repairLocked: true });

      // The write now waits for the auth token handshake (async), so flush
      // the microtask queue before asserting.
      await new Promise(process.nextTick);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should handle updateDoc error during repair', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ socialSummary: null }), // triggers repair
      };

      onSnapshot.mockImplementation((ref, callback) => {
        if (ref === 'userDocRef') callback(mockDocSnap);
        return jest.fn();
      });

      doc.mockReturnValue('userDocRef');
      const mockError = new Error('Repair failed');
      updateDoc.mockRejectedValueOnce(mockError);

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      state.fetchUserData('user1');

      // Since updateDoc is async, we need to wait for the next tick
      await new Promise(process.nextTick);

      // Transient (non-permission) errors release the lock so a later snapshot
      // can retry; the structured ERROR record carries op + original message.
      expect(errorSpy).toHaveBeenCalled();
      const logged = String(errorSpy.mock.calls[0][0]);
      expect(logged).toContain('repairSocialSummary');
      expect(logged).toContain('Social-summary repair failed');
      expect(state.repairLocked).toBe(false);
      errorSpy.mockRestore();
    });

    it('should release the lock on permission-denied to allow a cold-start retry', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ socialSummary: null }), // triggers repair
      };

      onSnapshot.mockImplementation((ref, callback) => {
        if (ref === 'userDocRef') callback(mockDocSnap);
        return jest.fn();
      });

      doc.mockReturnValue('userDocRef');
      const permError = Object.assign(
        new Error('Missing or insufficient permissions'),
        { code: 'permission-denied' },
      );
      updateDoc.mockRejectedValueOnce(permError);

      // A retryable cold-start permission failure is logged as WARN.
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      state.fetchUserData('user1');
      await new Promise(process.nextTick);

      // First failure: lock released + attempt counted, so the next snapshot
      // (once the auth token is ready) can retry.
      expect(state.repairLocked).toBe(false);
      expect(state.repairAttempts).toBe(1);
      expect(warnSpy).toHaveBeenCalled();
      const logged = String(warnSpy.mock.calls[0][0]);
      expect(logged).toContain('repairSocialSummary');
      expect(logged).toContain('BR_FIRESTORE_PERMISSION_DENIED');
      warnSpy.mockRestore();
    });

    it('should give up after the max permission-denied retries (no infinite spam)', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ socialSummary: null }), // triggers repair
      };

      onSnapshot.mockImplementation((ref, callback) => {
        if (ref === 'userDocRef') callback(mockDocSnap);
        return jest.fn();
      });

      doc.mockReturnValue('userDocRef');
      const permError = Object.assign(
        new Error('Missing or insufficient permissions'),
        { code: 'permission-denied' },
      );
      updateDoc.mockRejectedValueOnce(permError);

      // Pretend 4 retries already happened this session; this is the 5th.
      state.repairAttempts = 4;

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      state.fetchUserData('user1');
      await new Promise(process.nextTick);

      // At the cap the lock stays engaged (true) so it stops retrying, and the
      // give-up is escalated to a structured ERROR record.
      expect(state.repairLocked).toBe(true);
      expect(errorSpy).toHaveBeenCalled();
      const logged = String(errorSpy.mock.calls[0][0]);
      expect(logged).toContain('repair giving up after retries');
      expect(logged).toContain('BR_FIRESTORE_PERMISSION_DENIED');
      errorSpy.mockRestore();
    });

    it('should return if user document does not exist', () => {
      onSnapshot.mockImplementation((ref, callback) => {
        if (ref === 'userDocRef') callback({ exists: () => false });
        return jest.fn();
      });
      doc.mockReturnValue('userDocRef');
      state.fetchUserData('user1');
      expect(setMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ streak: expect.any(Number) }),
      );
    });

    it('should skip repair if repairLocked is true', () => {
      state.repairLocked = true;
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ socialSummary: null }),
      };
      onSnapshot.mockImplementation((ref, callback) => {
        if (ref === 'userDocRef') callback(mockDocSnap);
        return jest.fn();
      });
      doc.mockReturnValue('userDocRef');
      state.fetchUserData('user1');
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should handle errors in books onSnapshot', () => {
      onSnapshot.mockImplementation((ref, callback, errorCallback) => {
        if (ref === 'booksColRef') {
          errorCallback(new Error('Snapshot error'));
        }
        return jest.fn();
      });
      collection.mockReturnValue('booksColRef');

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      state.fetchUserData('user1');

      expect(errorSpy).toHaveBeenCalled();
      const logged = String(errorSpy.mock.calls[0][0]);
      expect(logged).toContain('fetchUserData.books');
      expect(setMock).toHaveBeenCalledWith({ loadingBooks: false });
      errorSpy.mockRestore();
    });
  });

  describe('addBook', () => {
    it('should call apiAddBook', async () => {
      await state.addBook(
        'My Book',
        300,
        null,
        '',
        {},
        BOOK_STATUS.WANT_TO_READ,
      );
      expect(apiAddBook).toHaveBeenCalledWith(
        'user1',
        'My Book',
        300,
        null,
        '',
        {},
        BOOK_STATUS.WANT_TO_READ,
      );
    });

    it('should NOT call apiAddBook if user is missing', async () => {
      state.user = null;
      await state.addBook(
        'My Book',
        300,
        null,
        '',
        {},
        BOOK_STATUS.WANT_TO_READ,
      );
      expect(apiAddBook).not.toHaveBeenCalled();
    });

    it('should NOT call apiAddBook if book ID is duplicated', async () => {
      state.books = [{ id: 'book1' }];
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await state.addBook(
        'My Book',
        300,
        'book1',
        '',
        {},
        BOOK_STATUS.WANT_TO_READ,
      );

      expect(warnSpy).toHaveBeenCalled();
      expect(apiAddBook).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should show popup on error', async () => {
      apiAddBook.mockRejectedValueOnce(new Error('Add failed'));
      const showPopupMock = usePopupStore.getState().showPopup;

      await state.addBook(
        'My Book',
        300,
        null,
        '',
        {},
        BOOK_STATUS.WANT_TO_READ,
      );

      expect(showPopupMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro ao Adicionar',
          message: 'Add failed',
          type: 'error',
        }),
      );
    });

    it('should fail-fast if status is missing', async () => {
      const loggerSpy = require('@core/store/slices/librarySlice').Logger;
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      await state.addBook('My Book', 300); // Missing status

      expect(apiAddBook).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('updateProgress', () => {
    it('should announce a milestone via sendMessage when a landmark is reached', async () => {
      state.books = [{ id: 'book1', title: 'My Book' }];
      state.announcedMilestones = {};

      // 60 pages in one session crosses the "50 pages in a session" milestone.
      updateBookProgress.mockResolvedValueOnce({
        pagesReadToday: 60,
        sessionSeconds: 300,
        newTotalPagesRead: 160,
        newTotalBooksCompleted: 2,
        newStreak: 1,
        justCompleted: false,
      });

      await state.updateProgress('book1', 60, 300);

      expect(updateBookProgress).toHaveBeenCalled();
      expect(state.sendMessage).toHaveBeenCalledWith(
        'group1',
        expect.objectContaining({
          text: expect.stringContaining('50 páginas'),
          type: 'system_notification',
        }),
      );
    });

    it('should NOT message the chat when no milestone is reached (no spam)', async () => {
      state.books = [{ id: 'book1', title: 'My Book' }];
      state.announcedMilestones = {};
      // Below every threshold: short session, few pages, no totals crossed.
      updateBookProgress.mockResolvedValueOnce({
        pagesReadToday: 10,
        sessionSeconds: 60,
        newTotalPagesRead: 110,
        newTotalBooksCompleted: 0,
        newStreak: 1,
        justCompleted: false,
      });

      await state.updateProgress('book1', 30, 60);
      expect(state.sendMessage).not.toHaveBeenCalled();
    });

    it('should fallback to email prefix if displayName is missing', async () => {
      state.user = { uid: 'u1', email: 'no-name@test.com', displayName: null };
      state.books = [{ id: 'book1', title: 'My Book' }];
      state.announcedMilestones = {};
      updateBookProgress.mockResolvedValueOnce({
        pagesReadToday: 60,
        sessionSeconds: 300,
        newTotalPagesRead: 160,
        newTotalBooksCompleted: 2,
        newStreak: 1,
        justCompleted: false,
      });

      await state.updateProgress('book1', 60, 300);
      expect(state.sendMessage).toHaveBeenCalledWith(
        'group1',
        expect.objectContaining({
          text: expect.stringContaining('@no-name'),
        }),
      );
    });

    it('should return if user or book is missing', async () => {
      state.user = null;
      await state.updateProgress('book1', 50, 120);
      expect(updateBookProgress).not.toHaveBeenCalled();

      state.user = { uid: 'u1' };
      state.books = [];
      await state.updateProgress('book1', 50, 120);
      expect(updateBookProgress).not.toHaveBeenCalled();
    });

    it('should skip notification if sendMessage is missing', async () => {
      state.books = [{ id: 'book1', title: 'My Book' }];
      updateBookProgress.mockResolvedValueOnce({ pagesReadToday: 20 });
      state.sendMessage = null;

      await expect(
        state.updateProgress('book1', 50, 120),
      ).resolves.not.toThrow();
    });

    it('should handle case where groups are missing in social store', async () => {
      const { useSocialStore } = require('../../src/store/useSocialStore');
      useSocialStore.getState.mockReturnValueOnce({ groups: null });

      state.books = [{ id: 'book1', title: 'My Book' }];
      updateBookProgress.mockResolvedValueOnce({ pagesReadToday: 20 });

      await state.updateProgress('book1', 50, 120);
      expect(state.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle error when milestone notification fails', async () => {
      state.books = [{ id: 'book1', title: 'My Book' }];
      state.announcedMilestones = {};
      updateBookProgress.mockResolvedValueOnce({
        pagesReadToday: 60,
        sessionSeconds: 300,
        newTotalPagesRead: 160,
        newTotalBooksCompleted: 2,
        newStreak: 1,
        justCompleted: false,
      });
      state.sendMessage.mockRejectedValueOnce(new Error('Send message failed'));

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await state.updateProgress('book1', 60, 300);

      expect(warnSpy).toHaveBeenCalled();
      const logged = String(warnSpy.mock.calls[0][0]);
      expect(logged).toContain('Could not send milestone notification');
      warnSpy.mockRestore();
    });

    it('should show popup on error', async () => {
      state.books = [{ id: 'book1', title: 'My Book' }];
      updateBookProgress.mockRejectedValueOnce(new Error('Update failed'));
      const showPopupMock = usePopupStore.getState().showPopup;

      await state.updateProgress('book1', 50, 120);

      expect(showPopupMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro ao Salvar',
          message: 'Update failed',
          type: 'error',
        }),
      );
    });
  });

  describe('markAsDNF', () => {
    it('should return if no user', async () => {
      state.user = null;
      await state.markAsDNF('book1');
      expect(apiMarkAsDNF).not.toHaveBeenCalled();
    });

    it('should call apiMarkAsDNF', async () => {
      await state.markAsDNF('book1');
      expect(apiMarkAsDNF).toHaveBeenCalledWith('user1', 'book1', 'abandonado');
    });

    it('should log error on failure', async () => {
      apiMarkAsDNF.mockRejectedValueOnce(new Error('DNF failed'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      await state.markAsDNF('book1');

      expect(errorSpy).toHaveBeenCalled();
      const logged = String(errorSpy.mock.calls[0][0]);
      expect(logged).toContain('markAsDNF');
      expect(logged).toContain('DNF failed');
      errorSpy.mockRestore();
    });
  });

  describe('updateBook & updateBookStatus', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should update book and handle automatic status transitions (Reading -> Read)', async () => {
      const book = {
        id: 'b1',
        title: 'B1',
        currentPage: 50,
        totalPages: 100,
        status: BOOK_STATUS.READING,
      };
      state.books = [book];
      const api = require('@core/api/books');
      api.updateBookWithStats.mockResolvedValueOnce();

      await state.updateBook('b1', { currentPage: 100 });

      const updatedBook = getMock().books.find(b => b.id === 'b1');
      expect(updatedBook.status).toBe(BOOK_STATUS.READ);
      expect(updatedBook.currentPage).toBe(100);
    });

    it('bundles the book update, user stats, and reading log into a single atomic call', async () => {
      const book = {
        id: 'b1',
        title: 'B1',
        currentPage: 50,
        totalPages: 100,
        status: BOOK_STATUS.READING,
      };
      state.books = [book];
      const api = require('@core/api/books');
      api.updateBookWithStats.mockResolvedValueOnce();

      await state.updateBook('b1', { currentPage: 100 });

      // Uma única chamada — o livro, as stats do usuário e o reading log viajam
      // juntos numa writeBatch atômica, em vez de 3 escritas independentes.
      expect(api.updateBookWithStats).toHaveBeenCalledTimes(1);
      const [uid, bookId, bookUpdates, statsUpdates, readingLogDelta] =
        api.updateBookWithStats.mock.calls[0];
      expect(uid).toBe('user1');
      expect(bookId).toBe('b1');
      expect(bookUpdates.currentPage).toBe(100);
      expect(bookUpdates.status).toBe(BOOK_STATUS.READ);
      expect(statsUpdates).not.toBeNull();
      expect(readingLogDelta).toBe(50);
    });

    it('should revert status to reading if progress is rolled back from 100%', async () => {
      const book = {
        id: 'b1',
        title: 'B1',
        currentPage: 100,
        totalPages: 100,
        status: BOOK_STATUS.READ,
      };
      state.books = [book];

      await state.updateBook('b1', { currentPage: 90 });

      const updatedBook = getMock().books.find(b => b.id === 'b1');
      expect(updatedBook.status).toBe(BOOK_STATUS.READING);
      expect(updatedBook.currentPage).toBe(90);
    });

    it('should jump to 100% progress if status is manually set to read', async () => {
      const book = {
        id: 'b1',
        title: 'B1',
        currentPage: 50,
        totalPages: 100,
        status: BOOK_STATUS.READING,
      };
      state.books = [book];

      await state.updateBook('b1', { status: BOOK_STATUS.READ });

      const updatedBook = getMock().books.find(b => b.id === 'b1');
      expect(updatedBook.status).toBe(BOOK_STATUS.READ);
      expect(updatedBook.currentPage).toBe(100);
    });
  });

  describe('removeBook', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should remove book from state and call API', async () => {
      state.books = [{ id: 'b1' }];
      const api = require('@core/api/books');
      api.deleteBook.mockResolvedValueOnce();

      await state.removeBook('b1');

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          books: [],
        }),
      );
      expect(api.deleteBook).toHaveBeenCalledWith('user1', 'b1');
    });

    it('should rollback and show popup on API failure', async () => {
      const originalBooks = [{ id: 'b1' }];
      state.books = originalBooks;
      const api = require('@core/api/books');
      api.deleteBook.mockRejectedValueOnce(new Error('Delete failed'));

      await state.removeBook('b1');

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({ books: [] }),
      );
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({ books: originalBooks }),
      );

      expect(usePopupStore.getState().showPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro ao Excluir',
          type: 'error',
        }),
      );
    });
  });
});
