import { BOOK_STATUS } from '../../src/core/constants/bookStatus';
import BadgeListenerService from '../../src/core/services/BadgeListenerService';
import PushNotificationService from '../../src/core/services/PushNotificationService';
import { useMainStore } from '../../src/core/store';

// Mock the store
jest.mock('../../src/core/store', () => ({
  useMainStore: {
    getState: jest.fn(),
    subscribe: jest.fn(),
  },
}));

// Mock the local-notification service (side-effect of the badge traps)
jest.mock('../../src/core/services/PushNotificationService', () => ({
  __esModule: true,
  default: { notifyGoalReached: jest.fn(), notifyBookFinished: jest.fn() },
}));

describe('Badge Listener Service (Event Cycle)', () => {
  let booksListener;
  let streakListener;
  let badgesListener;
  let mockCheckBadges;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckBadges = jest.fn();

    useMainStore.getState.mockReturnValue({
      books: [],
      streak: 0,
      lastUnlockedBadges: [],
      checkAndUnlockBadges: mockCheckBadges,
    });

    // Capture listeners by subscription order (initialize() registers:
    // 1=books, 2=streak, 3=lastUnlockedBadges).
    const captured = [];
    useMainStore.subscribe.mockImplementation((selector, callback) => {
      captured.push(callback);
    });

    BadgeListenerService.initialize();

    // initialize() só inscreve uma vez (guard `initialized` no módulo). Nos
    // testes seguintes nada é capturado — mantemos os callbacks da 1ª execução.
    if (captured.length >= 3) {
      [booksListener, streakListener, badgesListener] = captured;
    }
  });

  test('Trap 1: should trigger checkAndUnlockBadges when a book status transitions to READ', () => {
    const prevBooks = [
      { id: 'b1', title: 'Book 1', status: BOOK_STATUS.READING },
    ];
    const currBooks = [{ id: 'b1', title: 'Book 1', status: BOOK_STATUS.READ }];

    booksListener(currBooks, prevBooks);

    expect(mockCheckBadges).toHaveBeenCalled();
    expect(PushNotificationService.notifyBookFinished).toHaveBeenCalledWith(
      'Book 1',
    );
  });

  test('Trap 2: should trigger checkAndUnlockBadges when streak is incremented', () => {
    streakListener(5, 4);
    expect(mockCheckBadges).toHaveBeenCalled();
  });

  test('Isolation: should NOT trigger when book title changes but status remains the same', () => {
    const prevBooks = [
      { id: 'b1', title: 'Old Title', status: BOOK_STATUS.READING },
    ];
    const currBooks = [
      { id: 'b1', title: 'New Title', status: BOOK_STATUS.READING },
    ];

    booksListener(currBooks, prevBooks);

    expect(mockCheckBadges).not.toHaveBeenCalled();
  });

  test('Isolation: should NOT trigger when streak is decremented or stays same', () => {
    streakListener(4, 5);
    streakListener(5, 5);
    expect(mockCheckBadges).not.toHaveBeenCalled();
  });

  test('Trap 3: should fire a local notification for each newly unlocked badge', () => {
    const previous = [{ id: 'first', title: 'Primeiro Livro' }];
    const current = [
      { id: 'first', title: 'Primeiro Livro' },
      { id: 'streak7', title: 'Maratonista' },
    ];

    badgesListener(current, previous);

    expect(PushNotificationService.notifyGoalReached).toHaveBeenCalledTimes(1);
    expect(PushNotificationService.notifyGoalReached).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Maratonista'),
    );
  });

  test('Trap 3: should NOT notify when the queue is cleared (length shrinks)', () => {
    badgesListener([], [{ id: 'first', title: 'Primeiro Livro' }]);
    expect(PushNotificationService.notifyGoalReached).not.toHaveBeenCalled();
  });
});
