import { searchBooks } from '@core/api/googleBooks';
import { auth } from '@core/firebase/firebase';

describe('Google Books API - MSW Integration Test', () => {
  beforeAll(() => {
    // Mock getIdToken if user is present to avoid errors in apiClient
    if (auth.currentUser) {
      auth.currentUser.getIdToken = jest.fn().mockResolvedValue('mock-token');
    }
  });

  it('should fetch data through MSW interceptor (Network Path Validation)', async () => {
    /**
     * This test uses the REAL searchBooks and REAL apiClient (unmocked).
     * It validates that:
     * 1. searchBooks calls apiClient correctly.
     * 2. apiClient performs a real fetch.
     * 3. MSW intercepts the request and returns the data defined in handlers.js.
     */
    const result = await searchBooks({ generalQuery: 'Cem Anos de Solidão' });

    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.totalItems).toBeDefined();
    
    // This value comes directly from tests/mocks/handlers.js and is now NORMALIZED
    expect(result.items[0].title).toBe('Cem Anos de Solidão');
    expect(result.items[0].author).toBe('Gabriel García Márquez');
    expect(result.items[0].totalPages).toBe(418);
    expect(result.items[0].isbn).toBe('9788501012074');
    expect(result.items[0].thumbnail).toEqual({ uri: 'https://example.com/cover.jpg' });
  });
});
