import { create } from 'zustand';
import { db } from '../services/firebase';
import { useBookStore } from './useBookStore'; // Importar useBookStore
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';

export const useSocialStore = create((set, get) => ({
  friends: [],
  pendingRequests: [], // Requests received
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
      // para garantir que usuários sem o index (antigos) sejam encontrados.
      const { users: localUsers } = useBookStore.getState();
      let searchSource = localUsers;

      if (!searchSource || searchSource.length === 0) {
        // Se não houver cache do ranking, baixa a lista para busca local
        const snapshot = await getDocs(collection(db, 'users'));
        searchSource = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      // Check if already exists to prevent duplicates
      const q = query(
        collection(db, 'friendships'),
        where('senderId', '==', senderUid),
        where('receiverId', '==', receiverUid)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return; // Already requested

      await addDoc(collection(db, 'friendships'), {
        senderId: senderUid,
        receiverId: receiverUid,
        status: 'pending',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  },

  acceptFriendRequest: async (requestId) => {
    try {
      const docRef = doc(db, 'friendships', requestId);
      await updateDoc(docRef, { status: 'accepted' });
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  },

  rejectFriendRequest: async (requestId) => {
    try {
      const docRef = doc(db, 'friendships', requestId);
      await updateDoc(docRef, { status: 'rejected' });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  },

  createGroup: async (name, adminId, memberIds) => {
    try {
      const groupRef = await addDoc(collection(db, 'groups'), {
        name,
        adminId,
        members: [adminId, ...memberIds],
        createdAt: serverTimestamp()
      });
      return groupRef.id;
    } catch (error) {
      console.error("Error creating group:", error);
      return null;
    }
  },

  subscribeToSocialData: (uid) => {
    if (!uid) return () => {};

    // 1. Sent Requests
    const qSent = query(collection(db, 'friendships'), where('senderId', '==', uid));
    const unsubSent = onSnapshot(qSent, async (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ sentRequests: reqs });
      get().resolveFriendships(uid);
    });

    // 2. Received Requests
    const qReceived = query(collection(db, 'friendships'), where('receiverId', '==', uid));
    const unsubReceived = onSnapshot(qReceived, async (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ pendingRequests: reqs.filter(r => r.status === 'pending') });
      get().resolveFriendships(uid);
    });

    // 3. Groups
    const qGroups = query(collection(db, 'groups'), where('members', 'array-contains', uid));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      const groupsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    const { sentRequests, pendingRequests } = get();
    const allRequests = [...sentRequests, ...pendingRequests];
    const acceptedRequests = allRequests.filter(r => r.status === 'accepted');

    // Get unique friend IDs
    const friendIds = [...new Set(acceptedRequests.map(r => r.senderId === uid ? r.receiverId : r.senderId))];

    // Fetch details
    const friendsData = [];
    for (const fid of friendIds) {
      try {
        const docSnap = await getDoc(doc(db, 'users', fid));
        if (docSnap.exists()) {
          friendsData.push({ id: fid, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error resolving friend user:", fid, error);
      }
    }
    set({ friends: friendsData });

    // Also resolve names for pending requests (who sent them)
    const pendingWithDetails = [];
    for (const req of pendingRequests) {
      if (req.status === 'pending') {
        const docSnap = await getDoc(doc(db, 'users', req.senderId));
        if (docSnap.exists()) {
          pendingWithDetails.push({ ...req, senderName: docSnap.data().username || docSnap.data().email.split('@')[0] });
        }
      }
    }
    set({ pendingRequests: pendingWithDetails });
  }
}));
