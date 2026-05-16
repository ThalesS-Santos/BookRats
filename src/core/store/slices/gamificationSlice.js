import { db } from '@core/firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { updateUserInfluencerStatus } from '@core/api/social';
import { ALL_BADGES } from '@constants/badges';
import { BOOK_STATUS } from '@core/constants/bookStatus';

/**
 * Gamification Slice handles badges, points, and achievements.
 * 
 * @param {Function} set
 * @param {Function} get
 */
export const createGamificationSlice = (set, get) => ({
  totalClaps: 0,
  unlockedBadges: {},
  hasInfluencerBadge: false,
  calculatingBadge: false,
  lastUnlockedBadges: [], // 🔔 Queue for notification popups

  setClaps: (count) => {
    set({ totalClaps: count });
    if(get().checkAndUnlockBadges) get().checkAndUnlockBadges();
  },

  checkAndUnlockBadges: () => {
    const state = get();
    const currentHour = new Date().getHours();
    
    // Enrich userData with all possible metrics for the new 20+ badges
    const userData = {
      streak: state.streak || 0,
      totalPagesRead: state.totalPagesRead || 0,
      totalClaps: state.totalClaps || 0,
      completedBooks: state.books ? state.books.filter(b => b.status === BOOK_STATUS.READ).length : 0,
      readingBooks: state.books ? state.books.filter(b => b.status === BOOK_STATUS.READING).length : 0,
      totalBooks: state.books ? state.books.length : 0,
      wishlistBooks: state.books ? state.books.filter(b => b.status === BOOK_STATUS.WISH_LIST || b.status === BOOK_STATUS.WANT_TO_READ).length : 0,
      maxSessionTime: state.maxReadingSession || 0,
      isNightReader: currentHour >= 0 && currentHour <= 4,
      isEarlyReader: currentHour >= 5 && currentHour <= 8,
      // Note: Some metrics like totalNotes and friendCount will be added as they are implemented
    };

    const newUnlocked = { ...state.unlockedBadges };
    const justUnlocked = [];
    let changed = false;

    ALL_BADGES.forEach(badge => {
      if (!newUnlocked[badge.id] && badge.check(userData)) {
        const unlockData = { 
          dateUnlocked: new Date().toISOString(),
          id: badge.id,
          title: badge.title,
          icon: badge.icon
        };
        newUnlocked[badge.id] = unlockData;
        justUnlocked.push(unlockData);
        changed = true;
      }
    });

    if (changed) {
      set({ 
        unlockedBadges: newUnlocked,
        lastUnlockedBadges: [...state.lastUnlockedBadges, ...justUnlocked]
      });
    }
  },

  clearUnlockedBadges: () => set({ lastUnlockedBadges: [] }),

  calculateInfluencerBadge: async (uid) => {
    if (get().hasInfluencerBadge) return;
    set({ calculatingBadge: true });
    try {
      const booksRef = collection(db, 'users', uid, 'books');
      const booksSnap = await getDocs(booksRef);
      
      let totalClaps = 0;

      for (const bookDoc of booksSnap.docs) {
        const annotsRef = collection(db, 'users', uid, 'books', bookDoc.id, 'annotations');
        const annotsSnap = await getDocs(annotsRef);
        annotsSnap.forEach(annotDoc => {
          totalClaps += (annotDoc.data().reactions?.claps || 0);
        });
      }

      if (totalClaps >= 50) {
        set({ hasInfluencerBadge: true });
        await updateUserInfluencerStatus(uid, true);
      }
    } catch (e) {
      console.error("Failed to calculate influencer badge:", e);
    } finally {
      set({ calculatingBadge: false });
    }
  }
});
