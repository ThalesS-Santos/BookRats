import { BOOK_STATUS } from '../constants/bookStatus';
import { useMainStore } from '../store';

let initialized = false;

/**
 * BadgeListenerService
 * Decoupled event-driven system that monitors state changes in the store
 * and triggers badge verification without bloating the business logic slices.
 */
const BadgeListenerService = {
  /**
   * Initializes the background state listeners.
   */
  initialize() {
    if (initialized) return;
    initialized = true;

    // Trap 1: Book Status Transitions
    // We only listen to the 'books' slice to minimize performance impact.
    useMainStore.subscribe(
      state => state.books,
      (currentBooks, previousBooks) => {
        if (!previousBooks) return;

        // Check for state transitions to 'READ'
        currentBooks.forEach(book => {
          const prevBook = previousBooks.find(pb => pb.id === book.id);

          const wasRead = prevBook?.status === BOOK_STATUS.READ;
          const isRead = book.status === BOOK_STATUS.READ;

          // Event: Book just finished
          if (!wasRead && isRead) {
            useMainStore.getState().checkAndUnlockBadges();
          }
        });
      },
    );

    // Trap 2: Streak Advancement
    // We only listen to the 'streak' value.
    useMainStore.subscribe(
      state => state.streak,
      (currentStreak, previousStreak) => {
        if (currentStreak > previousStreak) {
          useMainStore.getState().checkAndUnlockBadges();
        }
      },
    );
  },
};

export default BadgeListenerService;
