import { create } from 'zustand';
import { useBookStore } from './useBookStore';
import { 
  searchUsers as apiSearchUsers, 
  sendFriendRequest as apiSendFriendRequest, 
  acceptFriendRequest as apiAcceptFriendRequest, 
  rejectFriendRequest as apiRejectFriendRequest, 
  createGroup as apiCreateGroup,
  subscribeToSentRequests,
  subscribeToReceivedRequests,
  subscribeToGroups,
  getUserDetails,
  getUsersByIds,
  removeFriendship as apiRemoveFriendship,
  leaveGroup as apiLeaveGroup,
  getPaginatedRanking as apiGetPaginatedRanking
} from '../api/social';
import { usePopupStore } from './usePopupStore';

export const useSocialStore = create((set, get) => ({
  friends: [],
  pendingRequests: [], // Requests received
  allReceived: [], // All received requests for resolution
  sentRequests: [], // Requests sent
  groups: [],
  searchResults: [],
  loadingSearch: false,
  errorSearch: null,

  // Ranking Pagination State
  rankingList: [],
  lastDoc: null,
  hasMore: true,
  loadingRanking: false,

  fetchInitialRanking: async () => {
    set({ loadingRanking: true, rankingList: [], lastDoc: null, hasMore: true });
    try {
      const { users, lastDoc, hasMore } = await apiGetPaginatedRanking(null, 15);
      set({ rankingList: users, lastDoc, hasMore, loadingRanking: false });
    } catch (error) {
      set({ loadingRanking: false });
      usePopupStore.getState().showPopup({
        title: 'Erro no Ranking',
        message: error.message,
        type: 'error'
      });
    }
  },

  fetchMoreRanking: async () => {
    const { lastDoc, hasMore, loadingRanking, rankingList } = get();
    // Guard: Prevent calling if already loading, no more data, or missing cursor
    if (!hasMore || loadingRanking || !lastDoc) return;

    set({ loadingRanking: true });
    try {
      const { users, lastDoc: nextLastDoc, hasMore: nextHasMore } = await apiGetPaginatedRanking(lastDoc, 5);
      
      // Evitar duplicatas por precaução
      const newUsers = users.filter(u => !rankingList.some(existing => existing.id === u.id));
      
      set({ 
        rankingList: [...rankingList, ...newUsers], 
        lastDoc: nextLastDoc, 
        hasMore: nextHasMore, 
        loadingRanking: false 
      });
    } catch (error) {
      set({ loadingRanking: false });
      usePopupStore.getState().showPopup({
        title: 'Erro ao Carregar Mais',
        message: error.message,
        type: 'error'
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
      // 🚀 Fallback Robusto: Usar dados locais do Ranking ou buscar da API com filtro
      const { users: localUsers } = useBookStore.getState();
      let searchSource = localUsers;

      if (!searchSource || searchSource.length === 0) {
        // Se não houver cache do ranking, busca da API (agora com filtro direto no Firestore)
        searchSource = await apiSearchUsers(queryText);
      } else {
        // Se houver dados locais, filtra localmente
        searchSource = searchSource.filter(u => 
          ((u.username && u.username.toLowerCase().includes(queryText.toLowerCase())) || 
           (u.email && u.email.toLowerCase().includes(queryText.toLowerCase())))
        );
      }

      const filtered = searchSource.filter(u => u.id !== currentUserId);
      set({ searchResults: filtered, loadingSearch: false });
    } catch (error) {
      set({ errorSearch: error.message, loadingSearch: false });
      usePopupStore.getState().showPopup({
        title: 'Erro na Busca',
        message: error.message,
        type: 'error'
      });
    }
  },

  sendFriendRequest: async (senderUid, receiverUid) => {
    if (senderUid === receiverUid) return;
    try {
      await apiSendFriendRequest(senderUid, receiverUid);
    } catch (error) {
      console.error("Error sending friend request:", error);
      usePopupStore.getState().showPopup({
        title: 'Erro na Solicitação',
        message: error.message,
        type: 'error'
      });
    }
  },

  acceptFriendRequest: async (requestId) => {
    try {
      await apiAcceptFriendRequest(requestId);
    } catch (error) {
      console.error("Error accepting friend request:", error);
      usePopupStore.getState().showPopup({
        title: 'Erro ao Aceitar',
        message: error.message,
        type: 'error'
      });
    }
  },

  rejectFriendRequest: async (requestId) => {
    try {
      await apiRejectFriendRequest(requestId);
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      usePopupStore.getState().showPopup({
        title: 'Erro ao Recusar',
        message: error.message,
        type: 'error'
      });
    }
  },

  loadingSocial: true,

  createGroup: async (name, adminId, memberIds) => {
    try {
      return await apiCreateGroup(name, adminId, memberIds);
    } catch (error) {
      console.error("Error creating group:", error);
      usePopupStore.getState().showPopup({
        title: 'Erro ao Criar Grupo',
        message: error.message,
        type: 'error'
      });
      return null;
    }
  },

  subscribeToSocialData: (uid) => {
    if (!uid) {
      set({ loadingSocial: false });
      return () => {};
    }

    set({ loadingSocial: true });
    let isSentLoaded = false;
    let isReceivedLoaded = false;
    let isGroupsLoaded = false;

    const checkComplete = () => {
      if (isSentLoaded && isReceivedLoaded && isGroupsLoaded) {
        set({ loadingSocial: false });
      }
    };

    // 1. Sent Requests
    const unsubSent = subscribeToSentRequests(uid, async (reqs) => {
      set({ sentRequests: reqs });
      await get().resolveFriendships(uid);
      isSentLoaded = true;
      checkComplete();
    });

    // 2. Received Requests
    const unsubReceived = subscribeToReceivedRequests(uid, async (reqs) => {
      set({ 
        pendingRequests: reqs.filter(r => r.status === 'pending'),
        allReceived: reqs 
      });
      await get().resolveFriendships(uid);
      isReceivedLoaded = true;
      checkComplete();
    });

    // 3. Groups
    const unsubGroups = subscribeToGroups(uid, (groupsList) => {
      set({ groups: groupsList });
      isGroupsLoaded = true;
      checkComplete();
    });

    return () => {
      unsubSent();
      unsubReceived();
      unsubGroups();
    };
  },

  resolveFriendships: async (uid) => {
    const { sentRequests, allReceived = [] } = get();
    const allRequests = [...sentRequests, ...allReceived];
    const acceptedRequests = allRequests.filter(r => r.status === 'accepted');

    // 1. Get unique friend IDs
    const friendIds = [...new Set(acceptedRequests.map(r => r.senderId === uid ? r.receiverId : r.senderId))];

    // 2. Fetch friend details in batch ⚡
    const friendsData = await getUsersByIds(friendIds);
    set({ friends: friendsData });

    // 3. Resolve names for pending requests in batch ⚡
    const { pendingRequests } = get();
    const pendingSenderIds = pendingRequests.map(req => req.senderId);
    const pendingSendersDetails = await getUsersByIds(pendingSenderIds);
    
    const pendingWithDetails = pendingRequests.map(req => {
      const details = pendingSendersDetails.find(d => d.id === req.senderId);
      return details ? { ...req, senderName: details.username || details.email.split('@')[0] } : null;
    }).filter(Boolean);
    
    set({ pendingRequests: pendingWithDetails });
  },

  removeFriend: async (friendId) => {
    const { user } = useBookStore.getState();
    if (!user) return;
    try {
      await apiRemoveFriendship(user.uid, friendId);
    } catch (error) {
      console.error("Error removing friend:", error);
      usePopupStore.getState().showPopup({
        title: 'Erro ao Remover',
        message: error.message,
        type: 'error'
      });
    }
  },

  leaveGroup: async (groupId) => {
    const { user } = useBookStore.getState();
    if (!user) return;
    try {
      await apiLeaveGroup(groupId, user.uid);
    } catch (error) {
      console.error("Error leaving group:", error);
      usePopupStore.getState().showPopup({
        title: 'Erro ao Sair',
        message: error.message,
        type: 'error'
      });
    }
  }
}));
