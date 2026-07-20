import {
  doc,
  updateDoc,
  collection,
  setDoc,
  arrayUnion,
  serverTimestamp,
  getDocs,
  addDoc,
  increment,
} from 'firebase/firestore';

import {
  addBook,
  updateBookProgress,
  updateBookWithStats,
  markAsDNF,
  getUserBooks,
  addAnnotation,
  getUserAnnotations,
} from '@core/api/books';

import { BOOK_STATUS } from '../../src/core/constants/bookStatus';

const mockBatch = {
  update: jest.fn(),
  set: jest.fn(),
  commit: jest.fn().mockResolvedValue(),
};

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  writeBatch: jest.fn(() => mockBatch),
  increment: jest.fn().mockImplementation(val => val),
  arrayUnion: jest.fn().mockImplementation(val => val),
  serverTimestamp: jest.fn().mockReturnValue('mock-timestamp'),
}));

jest.mock('@core/firebase/firebase', () => ({
  db: {},
}));

describe('Books API Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addBook', () => {
    it('should throw if validation fails', async () => {
      await expect(
        addBook(null, 'Title', 10, null, '', {}, 'lendo'),
      ).rejects.toThrow('Dados inválidos');
      await expect(
        addBook('u1', null, 10, null, '', {}, 'lendo'),
      ).rejects.toThrow('Dados inválidos');
      await expect(
        addBook('u1', 'Title', -5, null, '', {}, 'lendo'),
      ).rejects.toThrow('Dados inválidos');
    });

    it('should add book with custom id', async () => {
      doc.mockReturnValue('doc-ref');
      setDoc.mockResolvedValueOnce();

      const result = await addBook(
        'u1',
        'New Book',
        300,
        'book-id',
        '',
        {},
        BOOK_STATUS.WANT_TO_READ,
      );

      expect(doc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'u1',
        'books',
        'book-id',
      );
      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          title: 'New Book',
          totalPages: 300,
          status: BOOK_STATUS.WANT_TO_READ,
          createdAt: 'mock-timestamp',
        }),
      );
    });

    it('should add book without id', async () => {
      collection.mockReturnValue('coll-ref');
      doc.mockReturnValue({ id: 'auto-id' });
      setDoc.mockResolvedValueOnce();

      const result = await addBook(
        'u1',
        'New Book',
        300,
        null,
        '',
        {},
        BOOK_STATUS.WANT_TO_READ,
      );

      expect(doc).toHaveBeenCalledWith('coll-ref');
      expect(result).toBe('auto-id');
    });

    it('should map error and throw', async () => {
      doc.mockReturnValue('doc-ref');
      setDoc.mockRejectedValueOnce(new Error('Firebase error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        addBook('u1', 'New Book', 300, 'b1', '', {}, BOOK_STATUS.WANT_TO_READ),
      ).rejects.toThrow('Ocorreu um erro inesperado. Tente novamente.');
      consoleSpy.mockRestore();
    });
  });

  describe('updateBookProgress', () => {
    const defaultBook = {
      id: 'b1',
      currentPage: 50,
      totalPages: 300,
      status: BOOK_STATUS.READING,
      title: 'A Book',
    };
    const defaultStreak = {
      streak: 5,
      totalPagesRead: 100,
      maxReadingSession: 1000,
      totalBooksCompleted: 2,
      lastReadDate: '2023-01-01',
    };

    it('should throw validation error for invalid numbers', async () => {
      await expect(
        updateBookProgress('u1', defaultBook, 'abc', 10, defaultStreak),
      ).rejects.toThrow('Erro de validação');
    });

    it('should throw validation error if pages regress or exceed', async () => {
      await expect(
        updateBookProgress('u1', defaultBook, 40, 10, defaultStreak),
      ).rejects.toThrow('Erro de validação');
      await expect(
        updateBookProgress('u1', defaultBook, 400, 10, defaultStreak),
      ).rejects.toThrow('Erro de validação');
    });

    it('should throw validation error if streak data is invalid', async () => {
      await expect(
        updateBookProgress('u1', defaultBook, 60, 10, {}),
      ).rejects.toThrow('Erro de validação');
    });

    it('should update progress and return stats', async () => {
      doc.mockReturnValue('doc-ref');
      updateDoc.mockResolvedValue();

      const result = await updateBookProgress(
        'u1',
        defaultBook,
        70,
        120,
        defaultStreak,
      );

      expect(updateDoc).toHaveBeenCalledTimes(2); // one for book, one for user stats
      expect(result).toEqual(
        expect.objectContaining({
          pagesReadToday: 20,
          isCompleted: false,
          wasCompleted: false,
          justCompleted: false,
          sessionSeconds: 120,
          newTotalPagesRead: 120, // 100 (previous) + 20 read now
          newTotalBooksCompleted: 2, // unchanged (not completed)
          newStreak: expect.any(Number),
        }),
      );
    });

    it('should complete book', async () => {
      doc.mockReturnValue('doc-ref');
      updateDoc.mockResolvedValue();

      const result = await updateBookProgress(
        'u1',
        defaultBook,
        300,
        120,
        defaultStreak,
      );

      expect(result.isCompleted).toBe(true);
    });

    it('should handle zero reading time without division by zero error', async () => {
      doc.mockReturnValue('doc-ref');
      await updateBookProgress('u1', defaultBook, 70, 0, defaultStreak);
      expect(arrayUnion).toHaveBeenCalledWith(
        expect.objectContaining({ pagesPerHour: 0 }),
      );
    });

    it('should use default values if streakData is missing some fields', async () => {
      doc.mockReturnValue('doc-ref');
      const minimalStreak = {
        streak: 1,
        totalPagesRead: 10,
        lastReadDate: '2023-01-01',
      };
      await updateBookProgress('u1', defaultBook, 60, 100, minimalStreak);
      // Verify no crash and updateDoc called
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should map error and throw', async () => {
      doc.mockReturnValue('doc-ref');
      updateDoc.mockRejectedValueOnce(new Error('Firebase error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        updateBookProgress('u1', defaultBook, 70, 120, defaultStreak),
      ).rejects.toThrow('Ocorreu um erro inesperado. Tente novamente.');
      consoleSpy.mockRestore();
    });
  });

  describe('updateBookWithStats', () => {
    beforeEach(() => {
      mockBatch.update.mockClear();
      mockBatch.set.mockClear();
      mockBatch.commit.mockClear();
      mockBatch.commit.mockResolvedValue();
    });

    it('should throw if bookId is invalid, without opening a batch', async () => {
      const { writeBatch } = require('firebase/firestore');
      await expect(
        updateBookWithStats('u1', '', { currentPage: 10 }),
      ).rejects.toThrow();
      expect(writeBatch).not.toHaveBeenCalled();
    });

    it('should bundle book, stats and reading log into a single batch commit', async () => {
      doc.mockImplementation((...args) => args.join('/'));

      await updateBookWithStats(
        'u1',
        'book-1',
        { currentPage: 80 },
        { total_pages_read: 30 },
        30,
      );

      // Uma única writeBatch — livro, stats e reading log só se tornam
      // visíveis juntos, atomicamente, no commit.
      expect(mockBatch.update).toHaveBeenCalledTimes(2); // livro + user stats
      expect(mockBatch.set).toHaveBeenCalledTimes(1); // reading log
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should skip the stats write when statsUpdates is null', async () => {
      doc.mockImplementation((...args) => args.join('/'));

      await updateBookWithStats('u1', 'book-1', { currentPage: 10 });

      expect(mockBatch.update).toHaveBeenCalledTimes(1); // só o livro
      expect(mockBatch.set).not.toHaveBeenCalled(); // sem delta, sem log
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should map error and throw if the batch commit fails', async () => {
      doc.mockImplementation((...args) => args.join('/'));
      mockBatch.commit.mockRejectedValueOnce(new Error('Firebase error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        updateBookWithStats('u1', 'book-1', { currentPage: 10 }),
      ).rejects.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('markAsDNF', () => {
    it('should update status to abandonado', async () => {
      doc.mockReturnValue('doc-ref');
      await markAsDNF('u1', 'b1');
      expect(updateDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          status: BOOK_STATUS.DROPPED,
          updatedAt: expect.anything(),
        }),
      );
    });

    it('should map error and throw', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Firebase Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await expect(markAsDNF('u1', 'b1')).rejects.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('getUserBooks', () => {
    it('should get and map books', async () => {
      getDocs.mockResolvedValueOnce({
        docs: [{ id: 'b1', data: () => ({ title: 'Book 1' }) }],
      });

      const result = await getUserBooks('u1');
      expect(result).toEqual([{ id: 'b1', title: 'Book 1' }]);
    });

    it('should map error and throw', async () => {
      getDocs.mockRejectedValueOnce(new Error('Firebase Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await expect(getUserBooks('u1')).rejects.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('addAnnotation', () => {
    it('should throw if text is invalid', async () => {
      await expect(addAnnotation('u1', 'b1', 10, '')).rejects.toThrow(
        'Erro de validação',
      );
    });

    it('should throw if page is invalid and not a reply', async () => {
      await expect(addAnnotation('u1', 'b1', 'abc', 'Note')).rejects.toThrow(
        'Erro de validação',
      );
    });

    it('should add doc', async () => {
      collection.mockReturnValue('coll-ref');
      await addAnnotation('u1', 'b1', 10, 'Great note');

      expect(addDoc).toHaveBeenCalledWith(
        'coll-ref',
        expect.objectContaining({
          text: 'Great note',
          pageLocation: 10,
        }),
      );
    });

    it('should handle reply (parentId provided)', async () => {
      collection.mockReturnValue('coll-ref');
      await addAnnotation('u1', 'b1', null, 'Reply', true, {}, 'parent-123');

      expect(addDoc).toHaveBeenCalledWith(
        'coll-ref',
        expect.objectContaining({
          text: 'Reply',
          parentId: 'parent-123',
          pageLocation: null,
        }),
      );
    });

    it('should use default display name if missing in metadata', async () => {
      collection.mockReturnValue('coll-ref');
      await addAnnotation('u1', 'b1', 10, 'Note', true, { displayName: null });

      expect(addDoc).toHaveBeenCalledWith(
        'coll-ref',
        expect.objectContaining({
          userMetadata: expect.objectContaining({ displayName: 'Leitor' }),
        }),
      );
    });

    it('should map error and throw', async () => {
      addDoc.mockRejectedValueOnce(new Error('Firebase error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await expect(addAnnotation('u1', 'b1', 10, 'Note')).rejects.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('getUserAnnotations', () => {
    it('should get and map annotations', async () => {
      getDocs.mockResolvedValueOnce({
        docs: [{ id: 'a1', data: () => ({ text: 'Note 1' }) }],
      });

      const result = await getUserAnnotations('u1', 'b1');
      expect(result).toEqual([{ id: 'a1', text: 'Note 1' }]);
    });

    it('should map error and throw', async () => {
      getDocs.mockRejectedValueOnce(new Error('Firebase Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await expect(getUserAnnotations('u1', 'b1')).rejects.toThrow();
      consoleSpy.mockRestore();
    });
  });
});
