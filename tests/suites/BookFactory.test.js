import { BookFactory } from '../factories/BookFactory';

describe('BookFactory', () => {
  it('creates a book with default values', () => {
    const book = BookFactory.create();
    expect(book).toHaveProperty('id');
    expect(book).toHaveProperty('title');
    expect(book).toHaveProperty('author');
  });

  it('creates a book with overrides', () => {
    const book = BookFactory.create({ title: 'Overridden Title', pageCount: 500 });
    expect(book.title).toBe('Overridden Title');
    expect(book.pageCount).toBe(500);
  });

  it('creates a reading book', () => {
    const book = BookFactory.createReading({ author: 'Overridden Author' });
    expect(book.status).toBe('reading');
    expect(book.currentPage).toBe(50);
    expect(book.author).toBe('Overridden Author');
  });

  it('creates a reading book without overrides', () => {
    const book = BookFactory.createReading();
    expect(book.status).toBe('reading');
    expect(book.currentPage).toBe(50);
  });

  it('creates many books with default overrides', () => {
    const books = BookFactory.createMany(3);
    expect(books).toHaveLength(3);
    expect(books[0]).toHaveProperty('id');
  });

  it('covers random status generation', () => {
    const books = BookFactory.createMany(20);
    const statuses = books.map(b => b.status);
    expect(statuses).toContain('reading');
    expect(statuses).toContain('read');
    expect(statuses).toContain('wantToRead');
  });
});
