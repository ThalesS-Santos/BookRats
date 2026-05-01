/**
 * @typedef {import('@core/types').Book} Book
 */

const STATUSES = ['reading', 'read', 'wantToRead'];

export const BookFactory = {
  /**
   * Generates a realistic mock Book object based on JSDoc types.
   * @param {Partial<Book>} [overrides]
   * @returns {Book}
   */
  create: (overrides = {}) => ({
    id: `book-${Math.random().toString(36).substring(2, 9)}`,
    title: `Mocked Book Title ${Math.floor(Math.random() * 100)}`,
    author: `Author ${Math.floor(Math.random() * 100)}`,
    description: 'This is a dynamically generated description for testing purposes.',
    coverImage: 'https://via.placeholder.com/150',
    status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
    pageCount: 300,
    currentPage: 0,
    ...overrides
  }),
  
  /**
   * Generates a book explicitly in 'reading' status
   */
  createReading: (overrides = {}) => BookFactory.create({ status: 'reading', currentPage: 50, ...overrides }),
  
  /**
   * Generates an array of books
   */
  createMany: (count, overrides = {}) => Array.from({ length: count }, () => BookFactory.create(overrides))
};
