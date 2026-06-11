import { create } from 'zustand';

import {
  searchUsers as apiSearchUsers,
  createGroup as apiCreateGroup,
  subscribeToGroups,
  removeFriendship as apiRemoveFriendship,
  leaveGroup as apiLeaveGroup,
  getPaginatedRanking as apiGetPaginatedRanking,
  subscribeToRanking as apiSubscribeToRanking,
  addRatClap as apiAddRatClap,
} from '@core/api/social';
import { createLogger } from '@core/observability';

import { usePopupStore } from './usePopupStore';

const log = createLogger('store.social');

// ⚠️ useMainStore must be loaded lazily (at call time) to break the require
// cycle: @core/store → librarySlice → useSocialStore → @core/store.
// It MUST be a literal `require('@core/store')` call — babel-module-resolver
// only rewrites the alias on literal require/import calls, so an aliased
// helper (the old `safeRequire`) shipped the raw '@core/store' string to
// Metro's runtime, crashing with "Requiring unknown module".
const getMainStore = () => require('@core/store').useMainStore;

export const useSocialStore = create((set, get) => ({
  friends: [], // Mirrored from useMainStore (single source of truth)
  pendingRequests: [], // Pending received requests (mirrored)
  sentRequests: [], // Requests sent (mirrored)
  groups: [],
  searchResults: [],
  loadingSearch: false,
  errorSearch: null,

  // Ranking Pagination State
  rankingList: [],
  lastDoc: null,
  hasMore: true,
  loadingRanking: false,
  rankingUnsubscribe: null,

  subscribeToRanking: () => {
    const { rankingUnsubscribe } = get();
    if (rankingUnsubscribe) return;

    set({ loadingRanking: true });
    const unsub = apiSubscribeToRanking(users => {
      set({
        rankingList: users,
        loadingRanking: false,
        hasMore: false, // Disable pagination in real-time mode
      });
    });
    set({ rankingUnsubscribe: unsub });
  },

  unsubscribeFromRanking: () => {
    const { rankingUnsubscribe } = get();
    if (rankingUnsubscribe) {
      rankingUnsubscribe();
      set({ rankingUnsubscribe: null });
    }
  },

  fetchInitialRanking: async () => {
    set({
      loadingRanking: true,
      rankingList: [],
      lastDoc: null,
      hasMore: true,
    });
    try {
      const { users, lastDoc, hasMore } = await apiGetPaginatedRanking(
        null,
        15,
      );
      set({ rankingList: users, lastDoc, hasMore, loadingRanking: false });
    } catch (error) {
      set({ loadingRanking: false });
      usePopupStore.getState().showPopup({
        title: 'Erro no Ranking',
        message: error.message,
        type: 'error',
      });
    }
  },

  fetchMoreRanking: async () => {
    const { lastDoc, hasMore, loadingRanking, rankingList } = get();
    // Guard: Prevent calling if already loading, no more data, or missing cursor
    if (!hasMore || loadingRanking || !lastDoc) return;

    set({ loadingRanking: true });
    try {
      const {
        users,
        lastDoc: nextLastDoc,
        hasMore: nextHasMore,
      } = await apiGetPaginatedRanking(lastDoc, 5);

      // Evitar duplicatas por precaução
      const newUsers = users.filter(
        u => !rankingList.some(existing => existing.id === u.id),
      );

      set({
        rankingList: [...rankingList, ...newUsers],
        lastDoc: nextLastDoc,
        hasMore: nextHasMore,
        loadingRanking: false,
      });
    } catch (error) {
      set({ loadingRanking: false });
      usePopupStore.getState().showPopup({
        title: 'Erro ao Carregar Mais',
        message: error.message,
        type: 'error',
      });
    }
  },

  searchUsers: async (queryText, currentUserId) => {
    if (!queryText.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ loadingSearch: true, errorSearch: null });

    try {
      // 🚀 Busca direta na API (Filtro no Firestore) para melhor performance e economia de dados
      const searchResults = await apiSearchUsers(queryText);

      const filtered = searchResults.filter(u => u.id !== currentUserId);
      set({ searchResults: filtered, loadingSearch: false });
    } catch (error) {
      set({ errorSearch: error.message, loadingSearch: false });
      usePopupStore.getState().showPopup({
        title: 'Erro na Busca',
        message: error.message,
        type: 'error',
      });
    }
  },

  // 🔗 Friend actions delegate to the main social slice, which owns the user
  // context and passes the full argument set the API requires (the previous
  // direct calls here were missing currentUserId/name/avatar).
  sendFriendRequest: async (senderUid, receiverUid) => {
    if (senderUid === receiverUid) return;
    const useMainStore = getMainStore();
    return useMainStore.getState().sendFriendRequest(receiverUid);
  },

  acceptFriendRequest: async requestId => {
    const useMainStore = getMainStore();
    return useMainStore.getState().acceptFriend(requestId);
  },

  rejectFriendRequest: async requestId => {
    const useMainStore = getMainStore();
    return useMainStore.getState().declineFriend(requestId);
  },

  loadingSocial: true,

  createGroup: async (name, adminId, memberIds) => {
    try {
      return await apiCreateGroup(name, adminId, memberIds);
    } catch (error) {
      log.exception(error, {
        op: 'createGroup',
        action: 'create',
        resource: 'groups',
        context: { adminId },
      });
      usePopupStore.getState().showPopup({
        title: 'Erro ao Criar Grupo',
        message: error.message,
        type: 'error',
      });
      return null;
    }
  },

  subscribeToSocialData: uid => {
    if (!uid) {
      set({ loadingSocial: false });
      return () => {};
    }

    set({ loadingSocial: true });

    // 🔗 friends / sent / received requests are owned by the main store's
    // social slice (wired once on login). Mirror them here so screens reading
    // useSocialStore stay in sync — without a duplicate set of Firestore
    // listeners and without the old resolveFriendships race condition.
    const useMainStore = getMainStore();

    const syncFromMain = () => {
      const ms = useMainStore.getState();
      set({
        friends: ms.friends || [],
        sentRequests: ms.sentRequests || [],
        pendingRequests: (ms.receivedRequests || []).map(req => ({
          ...req,
          senderName:
            req.sender?.username ||
            req.sender?.displayName ||
            req.sender?.email?.split('@')[0] ||
            'Convite',
        })),
      });
    };

    const unsubMirror = useMainStore.subscribe(
      state => [state.friends, state.sentRequests, state.receivedRequests],
      syncFromMain,
      {
        equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2],
        fireImmediately: true,
      },
    );

    // Groups stay owned by this store (the main slice doesn't track them).
    const unsubGroups = subscribeToGroups(
      uid,
      groupsList => {
        set({ groups: groupsList, loadingSocial: false });
      },
      error => {
        log.exception(error, {
          op: 'subscribeToSocialData.groups',
          action: 'listen',
          resource: 'groups',
          level: 'WARN',
          context: { uid },
        });
        set({ loadingSocial: false });
      },
    );

    return () => {
      unsubMirror();
      unsubGroups();
    };
  },

  removeFriend: async friendId => {
    const useMainStore = getMainStore();
    const { user } = useMainStore.getState();
    if (!user) return;
    try {
      await apiRemoveFriendship(user.uid, friendId);
    } catch (error) {
      log.exception(error, {
        op: 'removeFriend',
        action: 'delete',
        resource: 'friendships',
        context: { uid: user.uid, friendId },
      });
      usePopupStore.getState().showPopup({
        title: 'Erro ao Remover',
        message: error.message,
        type: 'error',
      });
    }
  },

  leaveGroup: async groupId => {
    const useMainStore = getMainStore();
    const { user } = useMainStore.getState();
    if (!user) return;
    try {
      await apiLeaveGroup(groupId, user.uid);
    } catch (error) {
      log.exception(error, {
        op: 'leaveGroup',
        action: 'update',
        resource: `groups/${groupId}`,
        context: { groupId, uid: user.uid },
      });
      usePopupStore.getState().showPopup({
        title: 'Erro ao Sair',
        message: error.message,
        type: 'error',
      });
    }
  },

  clapEcho: async (targetUserId, bookId, echoId) => {
    const useMainStore = getMainStore();
    const { user } = useMainStore.getState();
    if (!user) return;
    const currentUserName =
      user.displayName ||
      user.username ||
      user.email?.split('@')[0] ||
      'Leitor';
    try {
      await apiAddRatClap(
        targetUserId,
        bookId,
        echoId,
        user.uid,
        currentUserName,
      );
    } catch (error) {
      log.exception(error, {
        op: 'clapEcho',
        action: 'update',
        resource: `users/${targetUserId}/books/${bookId}/annotations/${echoId}`,
        context: { targetUserId, bookId, echoId },
      });
      usePopupStore.getState().showPopup({
        title: 'Erro ao Curtir',
        message: error.message,
        type: 'error',
      });
    }
  },
}));
