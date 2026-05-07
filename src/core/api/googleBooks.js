import { apiClient } from './apiClient';
import { Logger } from '@core/services/Logger';
import { BookNormalizationService } from '@core/services/BookNormalizationService';

/**
 * Base URL for the Google Books API Volume endpoint.
 */
const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Searches for books using the Google Books API with advanced filtering.
 * 
 * @param {Object} options - Search options.
 * @param {string} [options.title] - Filter by book title (intitle).
 * @param {string} [options.author] - Filter by book author (inauthor).
 * @param {string} [options.isbn] - Filter by ISBN (most precise).
 * @param {string} [options.generalQuery] - Fallback general search query.
 * @param {number} [options.startIndex=0] - Index of the first result to return (for pagination).
 * @param {number} [options.maxResults=20] - Maximum number of results to return (max 40).
 * @returns {Promise<Object>} - Normalized books and total count.
 */
export const searchBooks = async (options = {}) => {
  const { 
    title, 
    author, 
    isbn, 
    subjects = [], // Array of subjects
    generalQuery, 
    printType = 'all', 
    orderBy = 'relevance', 
    startIndex = 0, 
    maxResults = 20 
  } = options;

  const queryParts = [];

  // Prioritize ISBN as it's the most precise filter
  if (isbn) {
    queryParts.push(`isbn:${isbn}`);
  } else {
    if (title) queryParts.push(`intitle:"${title}"`);
    if (author) queryParts.push(`inauthor:"${author}"`);
    
    // Add subjects (categories)
    if (Array.isArray(subjects) && subjects.length > 0) {
      subjects.forEach(s => queryParts.push(`subject:${s}`));
    }
    
    if (generalQuery) queryParts.push(generalQuery);
  }

  const q = queryParts.join(' ');
  if (!q.trim()) return { items: [], totalItems: 0 };

  const params = new URLSearchParams({
    q,
    printType,
    orderBy,
    startIndex: startIndex.toString(),
    maxResults: maxResults.toString()
  });

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  if (apiKey) {
    params.append('key', apiKey);
  }

  const url = `${BASE_URL}?${params.toString()}`;

  // Log final URL in Development Mode for debugging
  if (__DEV__) {
    Logger.info(`[GoogleBooks] Fetching: ${url}`);
  }

  try {
    const data = await apiClient.get(url);
    
    return {
      items: BookNormalizationService.normalizeGoogleBooks(data.items),
      totalItems: data.totalItems || 0
    };
  } catch (error) {
    Logger.error('Google Books: Search failed', error, { options, url });
    throw error;
  }
};

/**
 * Fetches a specific book by its ISBN (10 or 13).
 * 
 * @param {string} isbn - The ISBN identifier of the book.
 * @returns {Promise<Object>} - The raw volume response from Google Books API.
 * @throws {Error} - If the request fails.
 */
export const getBookByIsbn = async (isbn) => {
  if (!isbn) throw new Error('ISBN is required for this search.');
  return await searchBooks({ isbn });
};
