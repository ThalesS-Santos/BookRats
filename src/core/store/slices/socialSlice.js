import {
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';

import {
  subscribeToNotifications,
  markNotificationAsRead,
  subscribeToReceivedRequests,
  subscribeToSentRequests,
  subscribeToFriends,
  acceptFriendRequest as apiAcceptFriendRequest,
  rejectFriendRequest as apiRejectFriendRequest,
  sendFriendRequest as apiSendFriendRequest,
  getUsersByIds,
} from '@core/api/social';
import { db } from '@core/firebase/firebase';
import { createLogger } from '@core/observability';

import { usePopupStore } from '../../../store/usePopupStore';
import { NotificationService } from '../../services/NotificationService';

const log = createLogger('core.store.social');

/**
 * Social Slice handles Notifications, Group Chats, and basic Social feeds.
 *
 * @param {Function} set
 * @param {Function} get
 */
export const createSocialSlice = (set, get) => ({
  // Notification State. `unreadCount` is intentionally NOT stored here — it is
  // derived from `notifications` via `selectUnreadCount` (Etapa 10).
  notifications: [],

  messages: [],
  chatError: null,

  // Friend Request State
  receivedRequests: [],
  sentRequests: [],
  friends: [],
  socialLoading: false,

  // --- Notifications Logic ---
  startNotificationsListener: uid => {
    if (!uid) return () => {};

    if (get().calculateInfluencerBadge) {
      get().calculateInfluencerBadge(uid);
    }

    return subscribeToNotifications(uid, notifs => {
      const defensiveNotifs = notifs || [];

      // 🔔 Real-Time UI Alert Logic
      const latestNotif = defensiveNotifs[0]; // Assuming sorted by timestamp desc
      if (latestNotif && !latestNotif.read) {
        const createdAt = new Date(latestNotif.createdAt || 0).getTime();
        const now = Date.now();
        const diffSeconds = (now - createdAt) / 1000;

        // Only trigger if notification is "fresh" (last 10 seconds)
        if (diffSeconds < 10) {
          usePopupStore.getState().showPopup({
            title: 'Nova Interação',
            message: latestNotif.message,
            type: 'toast',
            icon:
              latestNotif.type === 'FRIEND_ACCEPT' ? 'people' : 'notifications',
          });
        }
      }

      set({ notifications: defensiveNotifs });

      const { hasInfluencerBadge } = get();
      if (!hasInfluencerBadge && defensiveNotifs.length > 0) {
        if (get().calculateInfluencerBadge) get().calculateInfluencerBadge(uid);
      }
    });
  },

  startSocialListeners: uid => {
    if (!uid) return () => {};

    const unsubReceived = subscribeToReceivedRequests(uid, async requests => {
      // We only care about pending requests for the UI list
      const pending = requests.filter(r => r.status === 'pending');

      // Fetch user details for each request to display on the card
      const senderIds = pending.map(r => r.senderId);
      const senders = await getUsersByIds(senderIds);

      const enriched = pending.map(req => ({
        ...req,
        sender: senders.find(s => s.id === req.senderId),
      }));

      set({ receivedRequests: enriched });
    });

    const unsubSent = subscribeToSentRequests(uid, requests => {
      set({ sentRequests: requests });
    });

    const unsubFriends = subscribeToFriends(uid, async friendIds => {
      if (friendIds.length === 0) {
        set({ friends: [] });
        return;
      }
      const users = await getUsersByIds(friendIds);
      set({ friends: users });
    });

    return () => {
      unsubReceived();
      unsubSent();
      unsubFriends();
    };
  },

  acceptFriend: async requestId => {
    const { user } = get();
    if (!user) return;

    set({ socialLoading: true });
    try {
      const userName = user.displayName || user.email.split('@')[0];
      await apiAcceptFriendRequest(
        requestId,
        user.uid,
        userName,
        user.photoURL,
      );
      // Local state will update via listener
    } catch (error) {
      log.exception(error, {
        op: 'acceptFriend',
        action: 'update',
        resource: `friendships/${requestId}`,
        context: { requestId },
      });
    } finally {
      set({ socialLoading: false });
    }
  },

  declineFriend: async requestId => {
    set({ socialLoading: true });
    try {
      await apiRejectFriendRequest(requestId);
    } catch (error) {
      log.exception(error, {
        op: 'declineFriend',
        action: 'update',
        resource: `friendships/${requestId}`,
        context: { requestId },
      });
    } finally {
      set({ socialLoading: false });
    }
  },

  sendFriendRequest: async targetUserId => {
    const { user } = get();
    if (!user) return;

    try {
      await apiSendFriendRequest(user.uid, targetUserId);
    } catch (error) {
      log.exception(error, {
        op: 'sendFriendRequest',
        action: 'create',
        resource: 'friendships',
        context: { senderUid: user.uid, targetUserId },
      });
    }
  },

  // ℹ️ Ranking now lives solely in useSocialStore (real-time), consumed by
  // RankingScreen with both Global and Amigos scopes. The previous paginated
  // ranking + `selectFilteredRanking` were removed here: the friends-scope
  // selector returned a fresh array on every call, which crashed the app with
  // an infinite re-render loop (see RankingScreen / buildFriendsRanking).

  markAsRead: async (uid, notifId) => {
    await markNotificationAsRead(uid, notifId);
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === notifId ? { ...n, read: true } : n,
      ),
    }));
  },

  markAllAsRead: async uid => {
    const { notifications } = get();
    if (!notifications || notifications.length === 0) return;

    set(state => ({
      notifications: (state.notifications || []).map(n => ({
        ...n,
        read: true,
      })),
    }));

    await NotificationService.markAllAsRead(uid);
  },

  // --- Chat & Group Logic ---
  subscribeToGroupMessages: (groupId = 'squad-geral') => {
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));

    set({ chatError: null });
    const unsub = onSnapshot(
      q,
      snapshot => {
        const messagesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        set({ messages: messagesList, chatError: null });
      },
      error => {
        set({
          chatError:
            'Erro ao carregar mensagens. Verifique se você é membro deste grupo e as regras do Firestore.',
        });
        log.exception(error, {
          op: 'subscribeToGroupMessages',
          action: 'listen',
          resource: `groups/${groupId}/messages`,
          context: { groupId },
        });
      },
    );

    return unsub;
  },

  sendMessage: async (groupId = 'squad-geral', messageData) => {
    const { user } = get();
    if (!user) return;

    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      const senderName = user.displayName || user.email.split('@')[0];

      const isString = typeof messageData === 'string';
      const extra = isString ? {} : messageData;
      const text = isString ? messageData : messageData.text;
      const type = isString ? 'text' : messageData.type || 'text';

      // Spread any extra metadata first, then let the canonical fields win so
      // text/type/senderId aren't written twice with conflicting values.
      await addDoc(messagesRef, {
        ...extra,
        text,
        type,
        senderId: user.uid,
        senderName: senderName,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      usePopupStore.getState().showPopup({
        title: 'Erro no Chat',
        message: error.message,
        type: 'error',
      });
    }
  },
});
