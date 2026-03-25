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
  arrayUnion
} from 'firebase/firestore';

export const searchUsers = async (queryText) => {
  try {
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Search users error:", error);
    throw new Error("Erro ao buscar usuários.");
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
    throw new Error("Erro ao enviar solicitação.");
  }
};

export const acceptFriendRequest = async (requestId) => {
  try {
    const docRef = doc(db, 'friendships', requestId);
    await updateDoc(docRef, { status: 'accepted' });
  } catch (error) {
    console.error("Accept friend request error:", error);
    throw new Error("Erro ao aceitar solicitação.");
  }
};

export const rejectFriendRequest = async (requestId) => {
  try {
    const docRef = doc(db, 'friendships', requestId);
    await updateDoc(docRef, { status: 'rejected' });
  } catch (error) {
    console.error("Reject friend request error:", error);
    throw new Error("Erro ao recusar solicitação.");
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
    throw new Error("Erro ao criar grupo.");
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
    throw new Error("Erro ao desfazer amizade.");
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
    throw new Error("Erro ao sair do grupo.");
  }
};

export const getGroupDetails = async (groupId) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const snap = await getDoc(groupRef);
    if (!snap.exists()) return null;
    
    const data = snap.data();
    const members = [];
    for (const uid of (data.members || [])) {
       const userSnap = await getDoc(doc(db, 'users', uid));
       if (userSnap.exists()) {
          members.push({ id: uid, ...userSnap.data() });
       }
    }
    return { id: groupId, ...data, members };
  } catch (error) {
    console.error("Error getting group details:", error);
    throw new Error("Erro ao carregar detalhes do grupo.");
  }
};

export const updateGroupDetails = async (groupId, name, description) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, { name, description });
  } catch (error) {
    console.error("Error updating group details:", error);
    throw new Error("Erro ao atualizar grupo.");
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
    throw new Error("Erro ao adicionar membro.");
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
    throw new Error("Erro ao remover membro.");
  }
};
