import { searchBooks, getBookByIsbn } from '@core/api/googleBooks';
import { apiClient } from '@core/api/apiClient';
import { Logger } from '@core/services/Logger';
import { PixelBook } from '@ui/assets';

// Mock the apiClient singleton
jest.mock('@core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn()
  }
}));

// Mock the Logger service
jest.mock('@core/services/Logger', () => ({
  Logger: {
    error: jest.fn(),
    info: jest.fn()
  }
}));

// Mock __DEV__
global.__DEV__ = true;

describe('Google Books API Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  });

  describe('searchBooks', () => {
    it('should return empty items and zero totalItems if no filters are provided', async () => {
      const result = await searchBooks({});
      expect(result).toEqual({ items: [], totalItems: 0 });
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should call apiClient and return normalized results with HTTPS thumbnails', async () => {
      apiClient.get.mockResolvedValue({ 
        items: [
          { 
            id: '123', 
            volumeInfo: { 
              title: 'Clean Code', 
              authors: ['Robert Martin'],
              pageCount: 464,
              imageLinks: { thumbnail: 'http://img.png' }
            } 
          }
        ],
        totalItems: 1
      });
      
      const result = await searchBooks({ title: 'Clean Code' });
      
      expect(result.totalItems).toBe(1);
      expect(result.items[0]).toEqual(expect.objectContaining({
        id: '123',
        title: 'Clean Code',
        author: 'Robert Martin',
        totalPages: 464,
        description: 'Sinopse não disponível para esta edição.',
        thumbnail: { uri: 'https://img.png' } // HTTPS forced
      }));
    });

    it('should strip HTML tags from description (Step 1.7)', async () => {
      apiClient.get.mockResolvedValue({ 
        items: [
          { 
            id: 'html-desc', 
            volumeInfo: { 
              title: 'HTML Book',
              description: '<p>Este é um <b>livro</b> incrível.&nbsp;Leitura obrigatória.</p>'
            } 
          }
        ],
        totalItems: 1
      });
      
      const result = await searchBooks({ title: 'HTML' });
      
      expect(result.items[0].description).toBe('Este é um livro incrível. Leitura obrigatória.');
    });

    it('should use local PixelBook fallback when thumbnail is missing (Step 1.4)', async () => {
      apiClient.get.mockResolvedValue({ 
        items: [
          { 
            id: 'no-cover-id', 
            volumeInfo: { title: 'No Cover Book' } 
          }
        ],
        totalItems: 1
      });
      
      const result = await searchBooks({ title: 'No Cover' });
      
      // PixelBook is a numeric require in RN
      expect(result.items[0].thumbnail).toBe(PixelBook);
    });

    it('should handle search without API key gracefully', async () => {
      delete process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
      apiClient.get.mockResolvedValue({ items: [], totalItems: 0 });

      await searchBooks({ generalQuery: 'No Key' });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.not.stringContaining('key=')
      );
    });

    it('should correctly encode special characters in query (Sanitization)', async () => {
      apiClient.get.mockResolvedValue({ items: [], totalItems: 0 });
      await searchBooks({ title: 'Amanhã & Depois', author: 'João Silva' });
      
      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('intitle%3AAmanh%C3%A3+%26+Depois');
      expect(callUrl).toContain('inauthor%3AJo%C3%A3o+Silva');
    });

    it('should prioritize ISBN and return normalized data', async () => {
      apiClient.get.mockResolvedValue({ 
        items: [{ id: 'isbn-1', volumeInfo: { title: 'ISBN Book', industryIdentifiers: [{ type: 'ISBN_13', identifier: '123' }] } }],
        totalItems: 1
      });
      
      const result = await searchBooks({ isbn: '123' });
      
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('q=isbn%3A123'));
      expect(result.items[0].isbn).toBe('123');
    });

    it('should log contextual error and rethrow if apiClient fails', async () => {
      const mockError = new Error('Quota Exceeded');
      apiClient.get.mockRejectedValue(mockError);

      await expect(searchBooks({ title: 'Fail' })).rejects.toThrow('Quota Exceeded');
      
      expect(Logger.error).toHaveBeenCalledWith(
        'Google Books: Search failed',
        mockError,
        expect.objectContaining({ options: expect.objectContaining({ title: 'Fail' }) })
      );
    });
  });
});
