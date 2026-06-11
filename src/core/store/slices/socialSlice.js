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
  // Notification State
  notifications: [],
  unreadCount: 0,

  // Ranking State
  rankingList: [],
  lastVisibleUser: null,
  hasMoreRanking: true,
  loadingMoreRanking: false,
  rankingLoading: false,

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
      const unreadCount = defensiveNotifs.filter(n => !n.read).length;

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

      set({ notifications: defensiveNotifs, unreadCount });

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

  /**
   * selectFilteredRanking
   * Returns a function that filters the ranking based on scope.
   */
  selectFilteredRanking: scope => state => {
    if (scope === 'global') return state.rankingList;

    // Amigos Scope: Current User + Friends
    const { user, friends } = state;
    if (!user) return [];

    // Map current user to the same format as friends
    const currentUserData = {
      id: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      username: user.username || user.email?.split('@')[0],
      total_pages_read: state.totalPagesRead || 0, // From librarySlice
      total_claps_received: state.totalClaps || 0, // From gamificationSlice
    };

    const combined = [currentUserData, ...friends];

    // Sort by pages read (descending)
    return combined.sort(
      (a, b) => (b.total_pages_read || 0) - (a.total_pages_read || 0),
    );
  },

  // --- Ranking Logic ---
  fetchRanking: async (pageSize = 20) => {
    const { getPaginatedRanking } = require('@core/api/social');
    set({ rankingLoading: true, hasMoreRanking: true, lastVisibleUser: null });

    try {
      const { users, lastDoc, hasMore } = await getPaginatedRanking(
        null,
        pageSize,
      );
      set({
        rankingList: users,
        lastVisibleUser: lastDoc,
        hasMoreRanking: hasMore,
      });
    } catch (error) {
      log.exception(error, {
        op: 'fetchRanking',
        action: 'query',
        resource: 'users',
      });
    } finally {
      set({ rankingLoading: false });
    }
  },

  fetchNextRankingPage: async (pageSize = 20) => {
    const { rankingList, lastVisibleUser, hasMoreRanking, loadingMoreRanking } =
      get();
    if (!hasMoreRanking || loadingMoreRanking || !lastVisibleUser) return;

    const { getPaginatedRanking } = require('@core/api/social');
    set({ loadingMoreRanking: true });

    try {
      const { users, lastDoc, hasMore } = await getPaginatedRanking(
        lastVisibleUser,
        pageSize,
      );
      set({
        rankingList: [...rankingList, ...users],
        lastVisibleUser: lastDoc,
        hasMoreRanking: hasMore,
      });
    } catch (error) {
      log.exception(error, {
        op: 'fetchNextRankingPage',
        action: 'query',
        resource: 'users',
      });
    } finally {
      set({ loadingMoreRanking: false });
    }
  },

  markAsRead: async (uid, notifId) => {
    await markNotificationAsRead(uid, notifId);
    set(state => {
      const updated = state.notifications.map(n =>
        n.id === notifId ? { ...n, read: true } : n,
      );
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length,
      };
    });
  },

  markAllAsRead: async uid => {
    const { notifications } = get();
    if (!notifications || notifications.length === 0) return;

    set(state => ({
      notifications: (state.notifications || []).map(n => ({
        ...n,
        read: true,
      })),
      unreadCount: 0,
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
