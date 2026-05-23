import { searchBooks } from '../../src/core/api/googleBooks';
import { Logger } from '../../src/core/services/Logger';

// Mock Logger to prevent console noise during expected error tests
jest.mock('../../src/core/services/Logger', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

/**
 * 🧪 Google Books Integration Tests
 * Validates the full API -> Normalization pipeline using MSW mocks.
 */
describe('Google Books Integration (via MSW)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and normalize "Dom Casmurro" correctly with all fields (Step 1.8)', async () => {
    const result = await searchBooks({ title: 'Dom Casmurro' });

    expect(result.totalItems).toBe(1);
    expect(result.items.length).toBe(1);

    const book = result.items[0];

    // Core Fields
    expect(book.title).toBe('Dom Casmurro');
    expect(book.author).toBe('Machado de Assis');
    expect(book.totalPages).toBe(371);

    // Granular Metadata (Step 1.8)
    expect(book.categories).toContain('Fiction');
    expect(book.language).toBe('pt');
    expect(book.publishedDate).toBe('1899');

    // UI Ready Fields
    expect(book.description).toBe('A clássica história de Bentinho e Capitu.');
    expect(book.thumbnail).toEqual({
      uri: 'https://example.com/dom_casmurro.jpg',
    }); // Note: MSW returns http, service forces https
  });

  it('should return the default mock for generic queries', async () => {
    const result = await searchBooks({ title: 'Qualquer outro livro' });

    expect(result.items[0].title).toBe('Cem Anos de Solidão');
    expect(result.items[0].categories).toContain('Classic');
  });

  it('should handle 500 Internal Server Error via trigger keyword', async () => {
    await expect(
      searchBooks({ generalQuery: 'trigger_error_500' }),
    ).rejects.toThrow(
      'Erro interno no servidor remoto. Tente novamente mais tarde.',
    );

    expect(Logger.error).toHaveBeenCalled();
  });

  it('should handle 429 Rate Limit Error via trigger keyword', async () => {
    await expect(
      searchBooks({ generalQuery: 'trigger_rate_limit' }),
    ).rejects.toThrow('Too Many Requests');

    expect(Logger.error).toHaveBeenCalled();
  });

  it('should return empty results if no query is provided', async () => {
    const result = await searchBooks({});
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
  });
});
