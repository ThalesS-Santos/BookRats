import PushNotificationService from './PushNotificationService';
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
            PushNotificationService.notifyBookFinished(book.title);
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

    // Trap 3: Badge Unlocked → fire a local "meta atingida" notification.
    // Reacts to the same queue that drives the in-app popup, so every newly
    // unlocked achievement (streak/page/book milestones) also lands in the
    // system tray. Kept here to keep the side-effect out of the store slice.
    useMainStore.subscribe(
      state => state.lastUnlockedBadges,
      (current, previous) => {
        if (!previous || !current) return;
        if (current.length <= previous.length) return; // cleared or unchanged

        const justUnlocked = current.slice(previous.length);
        justUnlocked.forEach(badge => {
          PushNotificationService.notifyGoalReached(
            '🏆 Conquista desbloqueada!',
            `Você ganhou: ${badge.title}`,
          );
        });
      },
    );
  },
};

export default BadgeListenerService;
