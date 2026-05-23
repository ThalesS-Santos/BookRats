import { BOOK_STATUS } from '../../src/core/constants/bookStatus';

/**
 * @typedef {import('@core/types').Book} Book
 */

const STATUSES = [
  BOOK_STATUS.READING,
  BOOK_STATUS.READ,
  BOOK_STATUS.WANT_TO_READ,
];

export const BookFactory = {
  /**
   * Generates a realistic mock Book object based on JSDoc types.
   * @param {Partial<Book>} [overrides]
   * @returns {Book}
   */
  create: (overrides = {}) => {
    const rand = Math.floor(Math.random() * 3);
    const randomStatus =
      rand === 0
        ? BOOK_STATUS.READING
        : rand === 1
          ? BOOK_STATUS.READ
          : BOOK_STATUS.WANT_TO_READ;

    return {
      id: `book-${Math.random().toString(36).substring(2, 9)}`,
      title: `Mocked Book Title ${Math.floor(Math.random() * 100)}`,
      author: `Author ${Math.floor(Math.random() * 100)}`,
      description:
        'This is a dynamically generated description for testing purposes.',
      coverImage: 'https://via.placeholder.com/150',
      status: randomStatus,
      pageCount: 300,
      currentPage: 0,
      ...overrides,
    };
  },

  /**
   * Generates a book explicitly in 'reading' status
   */
  createReading: (overrides = {}) =>
    BookFactory.create({
      status: BOOK_STATUS.READING,
      currentPage: 50,
      ...overrides,
    }),

  /**
   * Generates an array of books
   */
  createMany: (count, overrides = {}) =>
    Array.from({ length: count }, () => BookFactory.create(overrides)),
};
