import BadgeListenerService from '../../src/core/services/BadgeListenerService';
import { useMainStore } from '../../src/core/store';
import { BOOK_STATUS } from '../../src/core/constants/bookStatus';

// Mock the store
jest.mock('../../src/core/store', () => ({
  useMainStore: {
    getState: jest.fn(),
    subscribe: jest.fn()
  }
}));

describe('Badge Listener Service (Event Cycle)', () => {
  let booksListener;
  let streakListener;
  let mockCheckBadges;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckBadges = jest.fn();

    useMainStore.getState.mockReturnValue({
      books: [],
      streak: 0,
      checkAndUnlockBadges: mockCheckBadges
    });

    // Capture listeners
    useMainStore.subscribe.mockImplementation((selector, callback) => {
      const selected = selector(useMainStore.getState());
      if (Array.isArray(selected)) {
        booksListener = callback;
      } else if (typeof selected === 'number') {
        streakListener = callback;
      }
    });

    BadgeListenerService.initialize();
  });

  test('Trap 1: should trigger checkAndUnlockBadges when a book status transitions to READ', () => {
    const prevBooks = [{ id: 'b1', title: 'Book 1', status: BOOK_STATUS.READING }];
    const currBooks = [{ id: 'b1', title: 'Book 1', status: BOOK_STATUS.READ }];

    booksListener(currBooks, prevBooks);

    expect(mockCheckBadges).toHaveBeenCalled();
  });

  test('Trap 2: should trigger checkAndUnlockBadges when streak is incremented', () => {
    streakListener(5, 4);
    expect(mockCheckBadges).toHaveBeenCalled();
  });

  test('Isolation: should NOT trigger when book title changes but status remains the same', () => {
    const prevBooks = [{ id: 'b1', title: 'Old Title', status: BOOK_STATUS.READING }];
    const currBooks = [{ id: 'b1', title: 'New Title', status: BOOK_STATUS.READING }];

    booksListener(currBooks, prevBooks);

    expect(mockCheckBadges).not.toHaveBeenCalled();
  });

  test('Isolation: should NOT trigger when streak is decremented or stays same', () => {
    streakListener(4, 5);
    streakListener(5, 5);
    expect(mockCheckBadges).not.toHaveBeenCalled();
  });
});
