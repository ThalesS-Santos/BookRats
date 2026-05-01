import { db } from '@core/firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { updateUserInfluencerStatus } from '@core/api/social';
import { ALL_BADGES } from '@constants/badges';

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

  setClaps: (count) => {
    set({ totalClaps: count });
    if(get().checkAchievements) get().checkAchievements();
  },

  checkAchievements: () => {
    const state = get();
    const userData = {
      streak: state.streak || 0,
      totalPagesRead: state.totalPagesRead || 0,
      totalClaps: state.totalClaps || 0,
      completedBooks: state.books ? state.books.filter(b => b.status === 'completed').length : 0,
      readingBooks: state.books ? state.books.filter(b => b.status === 'reading').length : 0,
    };

    const newUnlocked = { ...state.unlockedBadges };
    let changed = false;

    ALL_BADGES.forEach(badge => {
      if (!newUnlocked[badge.id] && badge.check(userData)) {
        newUnlocked[badge.id] = { 
          dateUnlocked: new Date().toISOString(),
          id: badge.id,
          title: badge.title
        };
        changed = true;
      }
    });

    if (changed) {
      set({ unlockedBadges: newUnlocked });
    }
  },

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
