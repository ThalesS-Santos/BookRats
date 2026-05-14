import { PixelBook } from '@ui/assets';
import { BOOK_STATUS } from '../constants/bookStatus';

/**
 * @typedef {Object} Book
 * @property {string} id - Unique identifier (Google ID or generated).
 * @property {string} title - Book title.
 * @property {string} author - Author name(s).
 * @property {number} totalPages - Total page count.
 * @property {number} currentPage - Current progress (usually set in store).
 * @property {Object|number} thumbnail - Cover image source.
 * @property {string} description - Cleaned synopsis.
 * @property {string|null} isbn - ISBN-13 or ISBN-10.
 * @property {string[]} categories - Genre tags.
 * @property {string} language - Language code (pt, en, etc).
 * @property {'quero_ler' | 'lendo' | 'lido' | 'comprado' | 'lista_desejos' | 'recomendado' | 'abandonado'} status - Current state in library.
 * @property {string|null} publishedDate - Publication date.
 * @property {number|null} averageRating - Rating from 1 to 5.
 * @property {number|null} ratingsCount - Number of ratings.
 * @property {string|null} publisher - Publisher name.
 * @property {string} source - 'google_books' or 'manual'.
 * @property {string} normalizedAt - ISO date string.
 */

/**
 * Service responsible for normalizing raw data from external APIs 
 * into the internal Book schema used by BookRats.
 */
export const BookNormalizationService = {
  /**
   * Resolves the best possible cover for a book.
   * Handles missing URLs with a local pixel-art fallback and forces HTTPS.
   * 
   * @param {string|null} thumbnailUrl - The raw URL from the API.
   * @returns {Object|number} The source object for React Native Image component.
   */
  getBookCover(thumbnailUrl) {
    if (!thumbnailUrl || typeof thumbnailUrl !== 'string') {
      return PixelBook;
    }

    // Force HTTPS to comply with mobile security policies (ATS/Network Security Config)
    const secureUrl = thumbnailUrl.replace(/^http:/, 'https:');
    
    return { uri: secureUrl };
  },

  /**
   * Removes HTML tags and sanitizes text descriptions.
   * 
   * @param {string|null} html - Raw description from the API.
   * @returns {string} Clean plain text.
   */
  cleanHtml(html) {
    if (!html || typeof html !== 'string') {
      return 'Sinopse não disponível para esta edição.';
    }

    return html
      .replace(/<[^>]*>?/gm, '') // Strip HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  },

  /**
   * Converts a single Google Books API item into a normalized Book object.
   * 
   * @param {Object} googleItem - Raw item from Google Books API response.
   * @returns {Book|null} Normalized book object.
   */
  normalizeGoogleBook(googleItem) {
    if (!googleItem) return null;

    const { id, volumeInfo } = googleItem;
    
    // Extract ISBN_13 prioritizing it over ISBN_10
    const identifiers = volumeInfo?.industryIdentifiers || [];
    const isbn13 = identifiers.find(id => id.type === 'ISBN_13')?.identifier;
    const isbn10 = identifiers.find(id => id.type === 'ISBN_10')?.identifier;

    return {
      id: id || `gb_${Math.random().toString(36).substr(2, 9)}`,
      title: volumeInfo?.title || 'Título Desconhecido',
      author: volumeInfo?.authors?.join(', ') || 'Autor Desconhecido',
      totalPages: volumeInfo?.pageCount || 0, // UI will handle the "Páginas não informadas" label
      currentPage: 0,
      thumbnail: this.getBookCover(volumeInfo?.imageLinks?.thumbnail),
      description: this.cleanHtml(volumeInfo?.description),
      isbn: isbn13 || isbn10 || null,
      categories: volumeInfo?.categories || [], // Array of strings (Step 1.8)
      language: volumeInfo?.language || 'pt',
      status: BOOK_STATUS.WANT_TO_READ, // Default status for new books (Etapa 2)
      publishedDate: volumeInfo?.publishedDate || null,
      averageRating: volumeInfo?.averageRating || null,
      ratingsCount: volumeInfo?.ratingsCount || null,
      publisher: volumeInfo?.publisher || null,
      // Internal fields
      source: 'google_books',
      normalizedAt: new Date().toISOString()
    };
  },

  /**
   * Normalizes a collection of Google Books items.
   */
  normalizeGoogleBooks(items) {
    if (!Array.isArray(items)) return [];
    // Important: use .map(item => this.normalizeGoogleBook(item)) 
    // to preserve 'this' context if needed, or bind it.
    return items.map(item => this.normalizeGoogleBook(item)).filter(Boolean);
  }
};
