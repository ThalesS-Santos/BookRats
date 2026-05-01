import { db } from '@core/firebase/firebase';
import { collection, onSnapshot, query, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { subscribeToNotifications, markNotificationAsRead } from '@core/api/social';
import { usePopupStore } from '../../../store/usePopupStore';

/**
 * Social Slice handles Notifications, Group Chats, and basic Social feeds.
 * 
 * @param {Function} set
 * @param {Function} get
 */
export const createSocialSlice = (set, get) => ({
  // Notification State
  notifications: [],
  unreadCount: 0,
  
  // Chat & Ranking State
  users: [],
  messages: [],
  chatError: null,
  rankingError: null,

  // --- Notifications Logic ---
  startNotificationsListener: (uid) => {
    if (!uid) return () => {};
    
    if (get().calculateInfluencerBadge) {
      get().calculateInfluencerBadge(uid);
    }

    return subscribeToNotifications(uid, (notifs) => {
      const unreadCount = notifs.filter(n => !n.read).length;
      set({ notifications: notifs, unreadCount });
      
      const { hasInfluencerBadge } = get();
      if (!hasInfluencerBadge && notifs.length > 0) {
        if(get().calculateInfluencerBadge) get().calculateInfluencerBadge(uid);
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

    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));

    for (const notifId of unreadIds) {
      await markNotificationAsRead(uid, notifId);
    }
  },

  // --- Chat & Group Logic ---
  subscribeToGroupMessages: (groupId = 'squad-geral') => {
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));
    
    set({ chatError: null });
    const unsub = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ messages: messagesList, chatError: null });
    }, (error) => {
      set({ chatError: "Erro ao carregar mensagens. Verifique se você é membro deste grupo e as regras do Firestore." });
      console.error("Firestore (Group Messages):", error.message);
    });

    return unsub;
  },

  subscribeToUsers: () => {
    const usersRef = collection(db, 'users');
    set({ rankingError: null });
    const unsub = onSnapshot(usersRef, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ users: usersList, rankingError: null });
    }, (error) => {
      set({ rankingError: error.message });
      console.error("Firestore (Users):", error.message);
    });

    return unsub;
  },

  sendMessage: async (groupId = 'squad-geral', messageData) => {
    const { user } = get();
    if (!user) return;

    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      const senderName = user.displayName || user.email.split('@')[0];
      
      const isString = typeof messageData === 'string';
      const text = isString ? messageData : messageData.text;
      const type = isString ? 'text' : (messageData.type || 'text');

      await addDoc(messagesRef, {
        text,
        senderId: user.uid,
        senderName: senderName,
        timestamp: serverTimestamp(),
        type,
        ...(isString ? {} : messageData)
      });
    } catch (error) {
      usePopupStore.getState().showPopup({
        title: 'Erro no Chat',
        message: error.message,
        type: 'error'
      });
    }
  },
});
