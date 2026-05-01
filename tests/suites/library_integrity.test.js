import { useMainStore } from '@core/store';
import { act } from 'react-test-renderer/shallow'; // Not needed for Zustand but good practice for some hooks
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '@core/api/books';
import { BookFactory } from '@tests/factories/BookFactory';
import { UserFactory } from '@tests/factories/UserFactory';

// Mock the API to simulate successful additions
jest.mock('@core/api/books', () => ({
  addBook: jest.fn((uid, title, pages, id) => Promise.resolve(id || 'mock-id')),
}));

describe('Library Integrity Validation', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    
    // Reset store state
    useMainStore.setState({
      books: [],
      user: UserFactory.create({ uid: 'test-user', email: 'test@bookrats.com' }),
      loading: false,
    });
  });

  describe('Scenario 1: Initial State Verification', () => {
    it('should start with an empty books array', () => {
      const state = useMainStore.getState();
      expect(state.books).toEqual([]);
    });
  });

  describe('Scenario 2: Anti-Duplicate Logic (The Gauntlet)', () => {
    it('should prevent duplicate book entries based on unique ID', async () => {
      const bookTitle = 'Dom Casmurro';
      const bookId = 'machado-01';

      // 1. Add first copy
      await useMainStore.getState().addBook(bookTitle, 400, bookId);
      
      // Manually simulate the state update that would normally come from Firestore listener
      useMainStore.setState((state) => ({
        books: [BookFactory.create({ id: bookId, title: bookTitle, pageCount: 400 })]
      }));

      expect(useMainStore.getState().books.length).toBe(1);

      // 2. Attempt to add the same book again with the same ID
      await useMainStore.getState().addBook(bookTitle, 400, bookId);

      // Verify that api.addBook was NOT called a second time due to the store guard
      expect(api.addBook).toHaveBeenCalledTimes(1);
      expect(useMainStore.getState().books.length).toBe(1);
    });

    it('should handle null IDs by allowing addition (generating a random ID behavior)', async () => {
      await useMainStore.getState().addBook('New Book', 100, null);
      expect(api.addBook).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 3: Persistence Sync', () => {
    it('should trigger AsyncStorage.setItem when adding a book', async () => {
      const bookId = 'sync-test-01';
      
      await useMainStore.getState().addBook('Test Book', 100, bookId);
      
      // Manually update state to trigger persistence update if not immediate
      useMainStore.setState((state) => ({
        books: [BookFactory.create({ id: bookId, title: 'Test Book', pageCount: 100 })]
      }));

      // Wait for Zustand persistence cycle (which is async via AsyncStorage)
      await new Promise(r => setTimeout(r, 50));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'bookrats-main-storage',
        expect.stringContaining(bookId)
      );
    });
  });

  describe('Scenario 4: Mass Addition Performance', () => {
    it('should handle a batch of 10 unique books correctly', async () => {
      const totalToBatch = 10;
      
      for (let i = 0; i < totalToBatch; i++) {
        const id = `batch-id-${i}`;
        await useMainStore.getState().addBook(`Book ${i}`, 100 * (i + 1), id);
        
        // Simulating the store updating its state
        useMainStore.setState(state => ({
          books: [...state.books, BookFactory.create({ id, title: `Book ${i}` })]
        }));
      }

      expect(useMainStore.getState().books.length).toBe(10);
      expect(api.addBook).toHaveBeenCalledTimes(10);
    });
  });
});
