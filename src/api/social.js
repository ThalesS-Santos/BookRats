import { db } from '../services/firebase';
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
  arrayRemove,
  arrayUnion,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { mapFirebaseError } from '../utils/errorMapper';

export const getPaginatedRanking = async (lastVisibleDoc = null, pageSize = 20) => {
  try {
    let q;
    if (lastVisibleDoc) {
      q = query(
        collection(db, 'users'),
        orderBy('total_pages_read', 'desc'),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    } else {
      q = query(
        collection(db, 'users'),
        orderBy('total_pages_read', 'desc'),
        limit(pageSize)
      );
    }

    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return { users, lastDoc, hasMore: users.length === pageSize };
  } catch (error) {
    console.error("Error getting paginated ranking:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const searchUsers = async (queryText) => {
  if (!queryText) return [];
  try {
    const q = query(
      collection(db, 'users'),
      where('username_lowercase', '>=', queryText.toLowerCase()),
      where('username_lowercase', '<=', queryText.toLowerCase() + '\uf8ff')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Search users error:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const sendFriendRequest = async (senderUid, receiverUid) => {
  try {
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
    console.error("Send friend request error:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const acceptFriendRequest = async (requestId) => {
  try {
    const docRef = doc(db, 'friendships', requestId);
    await updateDoc(docRef, { status: 'accepted' });
  } catch (error) {
    console.error("Accept friend request error:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const rejectFriendRequest = async (requestId) => {
  try {
    const docRef = doc(db, 'friendships', requestId);
    await updateDoc(docRef, { status: 'rejected' });
  } catch (error) {
    console.error("Reject friend request error:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const createGroup = async (name, adminId, memberIds) => {
  try {
    const groupRef = await addDoc(collection(db, 'groups'), {
      name,
      adminId,
      members: [adminId, ...memberIds],
      createdAt: serverTimestamp()
    });
    return groupRef.id;
  } catch (error) {
    console.error("Create group error:", error);
    throw new Error(mapFirebaseError(error));
  }
};

// Subscriptions
export const subscribeToSentRequests = (uid, onUpdate) => {
  const q = query(collection(db, 'friendships'), where('senderId', '==', uid));
  return onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const subscribeToReceivedRequests = (uid, onUpdate) => {
  const q = query(collection(db, 'friendships'), where('receiverId', '==', uid));
  return onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const subscribeToGroups = (uid, onUpdate) => {
  const q = query(collection(db, 'groups'), where('members', 'array-contains', uid));
  return onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const getUserDetails = async (uid) => {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    return docSnap.exists() ? { id: uid, ...docSnap.data() } : null;
  } catch (error) {
    console.error("Error getting user details:", uid, error);
    return null;
  }
};

export const removeFriendship = async (uid, friendId) => {
  try {
    const q1 = query(collection(db, 'friendships'), where('senderId', '==', uid), where('receiverId', '==', friendId));
    const q2 = query(collection(db, 'friendships'), where('senderId', '==', friendId), where('receiverId', '==', uid));
    
    const snap1 = await getDocs(q1);
    const snap2 = await getDocs(q2);
    
    const docs = [...snap1.docs, ...snap2.docs];
    for (const d of docs) {
      await deleteDoc(d.ref);
    }
  } catch (error) {
    console.error("Error removing friendship:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const leaveGroup = async (groupId, uid) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayRemove(uid)
    });
  } catch (error) {
    console.error("Error leaving group:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const getGroupDetails = async (groupId) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const snap = await getDoc(groupRef);
    if (!snap.exists()) return null;
    
    const data = snap.data();
    // Paraleliza a busca de detalhes dos membros 🚀
    const memberPromises = (data.members || []).map(async (uid) => {
       const userSnap = await getDoc(doc(db, 'users', uid));
       return userSnap.exists() ? { id: uid, ...userSnap.data() } : null;
    });
    
    const members = (await Promise.all(memberPromises)).filter(Boolean);
    return { id: groupId, ...data, members };
  } catch (error) {
    console.error("Error getting group details:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const updateGroupDetails = async (groupId, name, description) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, { name, description });
  } catch (error) {
    console.error("Error updating group details:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const addGroupMember = async (groupId, userId) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(userId)
    });
  } catch (error) {
    console.error("Error adding group member:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const removeGroupMember = async (groupId, userId) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayRemove(userId)
    });
  } catch (error) {
    console.error("Error removing group member:", error);
    throw new Error(mapFirebaseError(error));
  }
};
