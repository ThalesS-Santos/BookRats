import { act } from 'react-test-renderer/shallow'; // Not needed for Zustand but good practice for some hooks
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBookStore } from '../store/useBookStore';
import * as api from '../api/books';

// Mock the API to simulate successful additions
jest.mock('../api/books', () => ({
  addBook: jest.fn((uid, title, pages, id) => Promise.resolve(id || 'mock-id')),
}));

describe('Library Integrity Validation', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    
    // Reset store state
    useBookStore.setState({
      books: [],
      user: { uid: 'test-user', email: 'test@bookrats.com' },
      loading: false,
    });
  });

  describe('Scenario 1: Initial State Verification', () => {
    it('should start with an empty books array', () => {
      const state = useBookStore.getState();
      expect(state.books).toEqual([]);
    });
  });

  describe('Scenario 2: Anti-Duplicate Logic (The Gauntlet)', () => {
    it('should prevent duplicate book entries based on unique ID', async () => {
      const bookTitle = 'Dom Casmurro';
      const bookId = 'machado-01';

      // 1. Add first copy
      await useBookStore.getState().addBook(bookTitle, 400, bookId);
      
      // Manually simulate the state update that would normally come from Firestore listener
      useBookStore.setState((state) => ({
        books: [{ id: bookId, title: bookTitle, totalPages: 400 }]
      }));

      expect(useBookStore.getState().books.length).toBe(1);

      // 2. Attempt to add the same book again with the same ID
      await useBookStore.getState().addBook(bookTitle, 400, bookId);

      // Verify that api.addBook was NOT called a second time due to the store guard
      expect(api.addBook).toHaveBeenCalledTimes(1);
      expect(useBookStore.getState().books.length).toBe(1);
    });

    it('should handle null IDs by allowing addition (generating a random ID behavior)', async () => {
      await useBookStore.getState().addBook('New Book', 100, null);
      expect(api.addBook).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 3: Persistence Sync', () => {
    it('should trigger AsyncStorage.setItem when adding a book', async () => {
      const bookId = 'sync-test-01';
      
      await useBookStore.getState().addBook('Test Book', 100, bookId);
      
      // Manually update state to trigger persistence update if not immediate
      useBookStore.setState((state) => ({
        books: [{ id: bookId, title: 'Test Book', totalPages: 100 }]
      }));

      // Wait for Zustand persistence cycle (which is async via AsyncStorage)
      await new Promise(r => setTimeout(r, 50));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'bookrats-library-storage',
        expect.stringContaining(bookId)
      );
    });
  });

  describe('Scenario 4: Mass Addition Performance', () => {
    it('should handle a batch of 10 unique books correctly', async () => {
      const totalToBatch = 10;
      
      for (let i = 0; i < totalToBatch; i++) {
        const id = `batch-id-${i}`;
        await useBookStore.getState().addBook(`Book ${i}`, 100 * (i + 1), id);
        
        // Simulating the store updating its state
        useBookStore.setState(state => ({
          books: [...state.books, { id, title: `Book ${i}` }]
        }));
      }

      expect(useBookStore.getState().books.length).toBe(10);
      expect(api.addBook).toHaveBeenCalledTimes(10);
    });
  });
});
