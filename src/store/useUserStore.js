import { create } from 'zustand';
import { db } from '../services/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { subscribeToNotifications, markNotificationAsRead, updateUserInfluencerStatus } from '../api/social';

export const useUserStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  hasInfluencerBadge: false,
  calculatingBadge: false,

  startNotificationsListener: (uid) => {
    if (!uid) return () => {};
    
    // Trigger calculation asynchronously
    get().calculateInfluencerBadge(uid);

    return subscribeToNotifications(uid, (notifs) => {
      const unreadCount = notifs.filter(n => !n.read).length;
      set({ notifications: notifs, unreadCount });
      
      const { hasInfluencerBadge } = get();
      if (!hasInfluencerBadge && notifs.length > 0) {
         // Optionally recalculate if they get new claps
         get().calculateInfluencerBadge(uid);
      }
    });
  },

  markAsRead: async (uid, notifId) => {
    await markNotificationAsRead(uid, notifId);
    set(state => {
      const updated = state.notifications.map(n => n.id === notifId ? { ...n, read: true } : n);
      return { 
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length
      };
    });
  },

  markAllAsRead: async (uid) => {
    const { notifications } = get();
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Use a quick map to update visually instantly
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));

    // Perform the background updates
    for (const notifId of unreadIds) {
      await markNotificationAsRead(uid, notifId);
    }
  },

  calculateInfluencerBadge: async (uid) => {
    if (get().hasInfluencerBadge) return;
    set({ calculatingBadge: true });
    try {
      // Logic: Iterate over books and get user annotations to tally claps
      // We will perform lightweight reads of the user's books and sum claps
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
        // Update user document so other people see the badge unconditionally
        await updateUserInfluencerStatus(uid, true);
      }
    } catch (e) {
      console.error("Failed to calculate influencer badge:", e);
    } finally {
      set({ calculatingBadge: false });
    }
  }
}));
