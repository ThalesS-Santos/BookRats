import { apiClient } from '@core/api/apiClient';
import { searchBooks } from '@core/api/googleBooks';

// Mocking apiClient to intercept the constructed URL
jest.mock('@core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ items: [] }),
  },
}));

describe('Google Books ISBN Check (Etapa 1.2 Validation)', () => {
  it('should generate the correct URL for an ISBN search', async () => {
    const isbn = '9788535902778';

    // Trigger the search
    const result = await searchBooks({ isbn });

    /**
     * Validation according to Step 1.2:
     * - The ISBN search should be prioritized.
     * - The URL should use the prefix 'isbn:'.
     * - URLSearchParams should handle the encoding of ':'.
     */
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('q=isbn%3A9788535902778'),
    );
    expect(result.items).toBeDefined();
  });
});
