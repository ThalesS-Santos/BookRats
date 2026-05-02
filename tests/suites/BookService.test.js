import { BookService } from '@core/services/BookService';
import { getUserAnnotations } from '@core/api/books';

jest.mock('@core/api/books', () => ({
  getUserAnnotations: jest.fn()
}));

describe('BookService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecentAnnotations', () => {
    it('should return empty if uid is missing', async () => {
      expect(await BookService.getRecentAnnotations(null, [{ id: 'b1' }])).toEqual([]);
    });

    it('should return empty if books are empty', async () => {
      expect(await BookService.getRecentAnnotations('u1', [])).toEqual([]);
    });

    it('should fetch from up to 3 books, sort and limit', async () => {
      const books = [
        { id: 'b1', title: 'Book 1' },
        { id: 'b2', title: 'Book 2' },
        { id: 'b3', title: 'Book 3' },
        { id: 'b4', title: 'Book 4' } // Should be ignored (slice to 3)
      ];

      getUserAnnotations
        .mockResolvedValueOnce([{ id: 'a1', timestamp: { seconds: 10 } }]) // b1
        .mockResolvedValueOnce([{ id: 'a2', timestamp: { seconds: 30 } }]) // b2
        .mockResolvedValueOnce([{ id: 'a3', timestamp: { seconds: 20 } }, { id: 'a4', timestamp: { seconds: 5 } }]); // b3

      const result = await BookService.getRecentAnnotations('u1', books, 2);

      expect(getUserAnnotations).toHaveBeenCalledTimes(3);
      // a2 is 30, a3 is 20, a1 is 10, a4 is 5
      expect(result).toHaveLength(2); // limited to 2
      expect(result[0].id).toBe('a2');
      expect(result[0].bookTitle).toBe('Book 2');
      expect(result[1].id).toBe('a3');
      expect(result[1].bookTitle).toBe('Book 3');
    });

    it('should catch error and return empty array', async () => {
      getUserAnnotations.mockRejectedValueOnce(new Error('Fail API'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await BookService.getRecentAnnotations('u1', [{ id: 'b1' }]);
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch fresh notes:", "Fail API");

      consoleSpy.mockRestore();
    });

    it('should handle missing timestamps in sort and use default limit', async () => {
      getUserAnnotations.mockResolvedValueOnce([
        { id: 'a1', text: 'No time' },
        { id: 'a2', timestamp: { seconds: 100 } }
      ]);

      const result = await BookService.getRecentAnnotations('u1', [{ id: 'b1', title: 'T' }]);
      // Default limit is 3, so we get both
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a2'); // 100 > 0
    });
  });
});
