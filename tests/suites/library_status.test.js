import { serverTimestamp } from 'firebase/firestore';

import { updateBook as apiUpdateBook } from '@core/api/books';
import { createLibrarySlice } from '@core/store/slices/librarySlice';

import { BOOK_STATUS } from '../../src/core/constants/bookStatus';

// Mock dependencies
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn().mockImplementation(val => val),
  serverTimestamp: jest.fn().mockReturnValue('mock-timestamp'),
}));

jest.mock('@core/firebase/firebase', () => ({
  db: {},
}));

jest.mock('@core/api/books', () => ({
  updateBook: jest.fn(),
  addReadingLog: jest.fn(),
}));

jest.mock('../../src/store/usePopupStore', () => ({
  usePopupStore: {
    getState: jest.fn().mockReturnValue({
      showPopup: jest.fn(),
    }),
  },
}));

describe('Library Status Transitions (Item 20)', () => {
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
      user: { uid: 'user1' },
      streak: 5,
      lastReadDate: '2023-01-01',
      totalPagesRead: 1000,
    };
  });

  describe('Automatic Status Transitions', () => {
    it('should transition from READING to READ when progress reaches 100%', async () => {
      const book = {
        id: 'b1',
        title: 'Dom Casmurro',
        currentPage: 50,
        totalPages: 100,
        status: BOOK_STATUS.READING,
        author: 'Machado de Assis',
      };
      state.books = [book];

      apiUpdateBook.mockResolvedValueOnce();

      await state.updateBook('b1', { currentPage: 100 });

      const updatedBook = state.books.find(b => b.id === 'b1');
      expect(updatedBook.status).toBe(BOOK_STATUS.READ);
      expect(updatedBook.currentPage).toBe(100);
      expect(updatedBook.completedAt).toBeDefined(); // Should record completion time

      expect(apiUpdateBook).toHaveBeenCalledWith(
        'user1',
        'b1',
        expect.objectContaining({
          status: BOOK_STATUS.READ,
          currentPage: 100,
          updatedAt: 'mock-timestamp',
        }),
      );
    });

    it('should revert from READ to READING if progress is decreased below 100%', async () => {
      const book = {
        id: 'b1',
        title: 'Dom Casmurro',
        currentPage: 100,
        totalPages: 100,
        status: BOOK_STATUS.READ,
      };
      state.books = [book];

      await state.updateBook('b1', { currentPage: 99 });

      const updatedBook = state.books.find(b => b.id === 'b1');
      expect(updatedBook.status).toBe(BOOK_STATUS.READING);
      expect(updatedBook.currentPage).toBe(99);
    });

    it('should jump progress to 100% when status is manually set to READ', async () => {
      const book = {
        id: 'b1',
        title: 'Dom Casmurro',
        currentPage: 0,
        totalPages: 200,
        status: BOOK_STATUS.WANT_TO_READ,
      };
      state.books = [book];

      await state.updateBookStatus('b1', BOOK_STATUS.READ);

      const updatedBook = state.books.find(b => b.id === 'b1');
      expect(updatedBook.status).toBe(BOOK_STATUS.READ);
      expect(updatedBook.currentPage).toBe(200);
    });
  });

  describe('Metadata Integrity', () => {
    it('should maintain existing metadata when changing status', async () => {
      const book = {
        id: 'b1',
        title: 'O Alquimista',
        author: 'Paulo Coelho',
        thumbnail: 'image_url',
        categories: ['Fiction'],
        currentPage: 10,
        totalPages: 150,
        status: BOOK_STATUS.WANT_TO_READ,
        extraData: 'some_value',
      };
      state.books = [book];

      await state.updateBookStatus('b1', BOOK_STATUS.READING);

      const updatedBook = state.books.find(b => b.id === 'b1');
      expect(updatedBook.status).toBe(BOOK_STATUS.READING);
      expect(updatedBook.title).toBe('O Alquimista');
      expect(updatedBook.author).toBe('Paulo Coelho');
      expect(updatedBook.thumbnail).toBe('image_url');
      expect(updatedBook.categories).toEqual(['Fiction']);
      expect(updatedBook.extraData).toBe('some_value');
    });
  });

  describe('Invalid Transitions', () => {
    it('should abort and log error if an invalid status is provided', async () => {
      const book = { id: 'b1', status: BOOK_STATUS.READING };
      state.books = [book];

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      await state.updateBookStatus('b1', 'INVALID_STATUS');

      expect(apiUpdateBook).not.toHaveBeenCalled();
      // The structured validation record is emitted with the BR_VALIDATION code.
      expect(errorSpy).toHaveBeenCalled();
      expect(String(errorSpy.mock.calls[0][0])).toContain('BR_VALIDATION');
      errorSpy.mockRestore();

      const updatedBook = state.books.find(b => b.id === 'b1');
      expect(updatedBook.status).toBe(BOOK_STATUS.READING); // No change
    });
  });
});
