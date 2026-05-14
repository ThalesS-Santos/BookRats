import { createLibrarySlice } from '@core/store/slices/librarySlice';
import { addBook as apiAddBook, updateBookProgress, markAsDNF as apiMarkAsDNF } from '@core/api/books';
import { usePopupStore } from '../../src/store/usePopupStore';
import { doc, collection, onSnapshot, updateDoc } from 'firebase/firestore';
import { BOOK_STATUS } from '../../src/core/constants/bookStatus';

// Mock dependencies
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn().mockImplementation((val) => val),
  serverTimestamp: jest.fn().mockReturnValue('mock-timestamp')
}));

jest.mock('@core/firebase/firebase', () => ({
  db: {}
}));

jest.mock('@core/api/books', () => ({
  addBook: jest.fn(),
  updateBookProgress: jest.fn(),
  markAsDNF: jest.fn(),
  updateBook: jest.fn(),
  deleteBook: jest.fn(),
  addReadingLog: jest.fn(),
}));

jest.mock('../../src/store/usePopupStore', () => ({
  usePopupStore: {
    getState: jest.fn().mockReturnValue({
      showPopup: jest.fn()
    })
  }
}));

// Mock the social store for the group notification try/catch
jest.mock('../../src/store/useSocialStore', () => ({
  useSocialStore: {
    getState: jest.fn().mockReturnValue({
      groups: [{ id: 'group1' }]
    })
  }
}), { virtual: true });

describe('Library Slice', () => {
  let state;
  let setMock;
  let getMock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    state = {};
    setMock = jest.fn((newState) => {
      const current = typeof newState === 'function' ? newState(state) : newState;
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
      repairLocked: false
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
              socialSummary: { totalPagesRead: 200, currentStreak: 5 }
            })
          });
        } else {
          callback({ 
            docs: [
              { id: 'b1', data: () => ({ title: 'Old', createdAt: { seconds: 10 } }) },
              { id: 'b2', data: () => ({ title: 'New', createdAt: { seconds: 20 } }) },
              { id: 'b3', data: () => ({ title: 'NoTime' }) }
            ] 
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

    it('should lock repair and updateDoc if summary is out of sync', () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          current_streak: 5,
          total_pages_read: 200,
          socialSummary: null // triggers repair
        })
      };

      onSnapshot.mockImplementation((ref, callback) => {
        if (ref === 'userDocRef') callback(mockDocSnap);
        return jest.fn();
      });

      doc.mockReturnValue('userDocRef');
      updateDoc.mockResolvedValueOnce();

      state.fetchUserData('user1');

      expect(setMock).toHaveBeenCalledWith({ repairLocked: true });
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should handle updateDoc error during repair', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ socialSummary: null }) // triggers repair
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

      expect(errorSpy).toHaveBeenCalledWith("🩺 Repair error:", mockError);
      expect(setMock).toHaveBeenCalledWith({ repairLocked: false });
      errorSpy.mockRestore();
    });

    it('should return if user document does not exist', () => {
      onSnapshot.mockImplementation((ref, callback) => {
        if (ref === 'userDocRef') callback({ exists: () => false });
        return jest.fn();
      });
      doc.mockReturnValue('userDocRef');
      state.fetchUserData('user1');
      expect(setMock).not.toHaveBeenCalledWith(expect.objectContaining({ streak: expect.any(Number) }));
    });

    it('should skip repair if repairLocked is true', () => {
      state.repairLocked = true;
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ socialSummary: null })
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

      expect(errorSpy).toHaveBeenCalledWith("Error fetching books:", expect.any(Error));
      expect(setMock).toHaveBeenCalledWith({ loadingBooks: false });
      errorSpy.mockRestore();
    });
  });

  describe('addBook', () => {
    it('should call apiAddBook', async () => {
      await state.addBook('My Book', 300);
      expect(apiAddBook).toHaveBeenCalledWith('user1', 'My Book', 300, null, '', {}, 'quero_ler');
    });

    it('should NOT call apiAddBook if user is missing', async () => {
      state.user = null;
      await state.addBook('My Book', 300);
      expect(apiAddBook).not.toHaveBeenCalled();
    });

    it('should NOT call apiAddBook if book ID is duplicated', async () => {
      state.books = [{ id: 'book1' }];
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await state.addBook('My Book', 300, 'book1');
      
      expect(warnSpy).toHaveBeenCalled();
      expect(apiAddBook).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should show popup on error', async () => {
      apiAddBook.mockRejectedValueOnce(new Error('Add failed'));
      const showPopupMock = usePopupStore.getState().showPopup;
      
      await state.addBook('My Book', 300);
      
      expect(showPopupMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Erro ao Adicionar',
        message: 'Add failed',
        type: 'error'
      }));
    });
  });

  describe('updateProgress', () => {
    it('should call updateBookProgress and sendMessage for notifications', async () => {
      state.books = [{ id: 'book1', title: 'My Book' }];
      
      updateBookProgress.mockResolvedValueOnce({ pagesReadToday: 20 });
      
      await state.updateProgress('book1', 50, 120);
      
      expect(updateBookProgress).toHaveBeenCalled();
      expect(state.sendMessage).toHaveBeenCalledWith('group1', expect.objectContaining({
        text: expect.stringContaining('Thales acaba de ler 20 páginas'),
        bookTitle: 'My Book'
      }));
    });

    it('should fallback to email prefix if displayName is missing', async () => {
      state.user = { uid: 'u1', email: 'no-name@test.com', displayName: null };
      state.books = [{ id: 'book1', title: 'My Book' }];
      updateBookProgress.mockResolvedValueOnce({ pagesReadToday: 20 });

      await state.updateProgress('book1', 50, 120);
      expect(state.sendMessage).toHaveBeenCalledWith('group1', expect.objectContaining({
        text: expect.stringContaining('@no-name')
      }));
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

      await expect(state.updateProgress('book1', 50, 120)).resolves.not.toThrow();
    });

    it('should handle case where groups are missing in social store', async () => {
      const { useSocialStore } = require('../../src/store/useSocialStore');
      useSocialStore.getState.mockReturnValueOnce({ groups: null });
      
      state.books = [{ id: 'book1', title: 'My Book' }];
      updateBookProgress.mockResolvedValueOnce({ pagesReadToday: 20 });

      await state.updateProgress('book1', 50, 120);
      expect(state.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle error when group notification fails', async () => {
      state.books = [{ id: 'book1', title: 'My Book' }];
      updateBookProgress.mockResolvedValueOnce({ pagesReadToday: 20 });
      state.sendMessage.mockRejectedValueOnce(new Error('Send message failed'));
      
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await state.updateProgress('book1', 50, 120);
      
      expect(warnSpy).toHaveBeenCalledWith("Could not send group notification:", 'Send message failed');
      warnSpy.mockRestore();
    });

    it('should show popup on error', async () => {
      state.books = [{ id: 'book1', title: 'My Book' }];
      updateBookProgress.mockRejectedValueOnce(new Error('Update failed'));
      const showPopupMock = usePopupStore.getState().showPopup;
      
      await state.updateProgress('book1', 50, 120);
      
      expect(showPopupMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Erro ao Salvar',
        message: 'Update failed',
        type: 'error'
      }));
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
      
      expect(errorSpy).toHaveBeenCalledWith('DNF failed');
      errorSpy.mockRestore();
    });
  });

  describe('updateBook & updateBookStatus', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should update book and handle automatic status transitions (Reading -> Read)', async () => {
      const book = { id: 'b1', title: 'B1', currentPage: 50, totalPages: 100, status: BOOK_STATUS.READING };
      state.books = [book];
      const api = require('@core/api/books');
      api.updateBook.mockResolvedValueOnce();

      await state.updateBook('b1', { currentPage: 100 });

      const updatedBook = getMock().books.find(b => b.id === 'b1');
      expect(updatedBook.status).toBe(BOOK_STATUS.READ);
      expect(updatedBook.currentPage).toBe(100);
    });

    it('should revert status to reading if progress is rolled back from 100%', async () => {
      const book = { id: 'b1', title: 'B1', currentPage: 100, totalPages: 100, status: BOOK_STATUS.READ };
      state.books = [book];
      
      await state.updateBook('b1', { currentPage: 90 });

      const updatedBook = getMock().books.find(b => b.id === 'b1');
      expect(updatedBook.status).toBe(BOOK_STATUS.READING);
      expect(updatedBook.currentPage).toBe(90);
    });

    it('should jump to 100% progress if status is manually set to read', async () => {
      const book = { id: 'b1', title: 'B1', currentPage: 50, totalPages: 100, status: BOOK_STATUS.READING };
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

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        books: []
      }));
      expect(api.deleteBook).toHaveBeenCalledWith('user1', 'b1');
    });

    it('should rollback and show popup on API failure', async () => {
      const originalBooks = [{ id: 'b1' }];
      state.books = originalBooks;
      const api = require('@core/api/books');
      api.deleteBook.mockRejectedValueOnce(new Error('Delete failed'));

      await state.removeBook('b1');

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ books: [] }));
      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ books: originalBooks }));
      
      expect(usePopupStore.getState().showPopup).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Erro ao Excluir',
        type: 'error'
      }));
    });
  });
});
