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
  removeFriendship as apiRemoveFriendship,
  leaveGroup as apiLeaveGroup
} from '../api/social';

export const useSocialStore = create((set, get) => ({
  friends: [],
  pendingRequests: [], // Requests received
  allReceived: [], // All received requests for resolution
  sentRequests: [], // Requests sent
  groups: [],
  searchResults: [],
  loadingSearch: false,
  errorSearch: null,

  searchUsers: async (queryText, currentUserId) => {
    if (!queryText.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ loadingSearch: true, errorSearch: null });
    
    try {
      // 🚀 Fallback Robusto: Usar dados locais do Ranking ou baixar todos como fallback
      const { users: localUsers } = useBookStore.getState();
      let searchSource = localUsers;

      if (!searchSource || searchSource.length === 0) {
        // Se não houver cache do ranking, busca da API
        searchSource = await apiSearchUsers(queryText);
      }

      const filtered = searchSource.filter(u => 
        u.id !== currentUserId && 
        ((u.username && u.username.toLowerCase().includes(queryText.toLowerCase())) || 
         (u.email && u.email.toLowerCase().includes(queryText.toLowerCase())))
      );

      set({ searchResults: filtered, loadingSearch: false });
    } catch (error) {
      set({ errorSearch: error.message, loadingSearch: false });
    }
  },

  sendFriendRequest: async (senderUid, receiverUid) => {
    if (senderUid === receiverUid) return;
    try {
      await apiSendFriendRequest(senderUid, receiverUid);
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  },

  acceptFriendRequest: async (requestId) => {
    try {
      await apiAcceptFriendRequest(requestId);
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  },

  rejectFriendRequest: async (requestId) => {
    try {
      await apiRejectFriendRequest(requestId);
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  },

  createGroup: async (name, adminId, memberIds) => {
    try {
      return await apiCreateGroup(name, adminId, memberIds);
    } catch (error) {
      console.error("Error creating group:", error);
      return null;
    }
  },

  subscribeToSocialData: (uid) => {
    if (!uid) return () => {};

    // 1. Sent Requests
    const unsubSent = subscribeToSentRequests(uid, (reqs) => {
      set({ sentRequests: reqs });
      get().resolveFriendships(uid);
    });

    // 2. Received Requests
    const unsubReceived = subscribeToReceivedRequests(uid, (reqs) => {
      set({ 
        pendingRequests: reqs.filter(r => r.status === 'pending'),
        allReceived: reqs 
      });
      get().resolveFriendships(uid);
    });

    // 3. Groups
    const unsubGroups = subscribeToGroups(uid, (groupsList) => {
      set({ groups: groupsList });
    });

    return () => {
      unsubSent();
      unsubReceived();
      unsubGroups();
    };
  },

  // Helper to fetch user details for friendships
  resolveFriendships: async (uid) => {
    const { sentRequests, allReceived = [] } = get();
    const allRequests = [...sentRequests, ...allReceived];
    const acceptedRequests = allRequests.filter(r => r.status === 'accepted');

    // Get unique friend IDs
    const friendIds = [...new Set(acceptedRequests.map(r => r.senderId === uid ? r.receiverId : r.senderId))];

    // Fetch details
    const friendsData = [];
    for (const fid of friendIds) {
      const details = await getUserDetails(fid);
      if (details) {
        friendsData.push(details);
      }
    }
    set({ friends: friendsData });

    // Also resolve names for pending requests (who sent them)
    const { pendingRequests } = get();
    const pendingWithDetails = [];
    for (const req of pendingRequests) {
      const details = await getUserDetails(req.senderId);
      if (details) {
        pendingWithDetails.push({ ...req, senderName: details.username || details.email.split('@')[0] });
      }
    }
    set({ pendingRequests: pendingWithDetails });
  },

  removeFriend: async (friendId) => {
    const { user } = useBookStore.getState();
    if (!user) return;
    try {
      await apiRemoveFriendship(user.uid, friendId);
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  },

  leaveGroup: async (groupId) => {
    const { user } = useBookStore.getState();
    if (!user) return;
    try {
      await apiLeaveGroup(groupId, user.uid);
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  }
}));
