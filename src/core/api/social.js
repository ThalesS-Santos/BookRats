import { mapFirebaseError } from '@utils/errorMapper';
import { sanitizeEchoText, sanitizeName } from '@utils/sanitize';
import {
  validateFriendRequest,
  validateFriendRequestReceiver,
  validateEchoText,
  validateUserId,
} from '@utils/validators';
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
  startAfter,
  documentId,
  collectionGroup,
  increment,
  runTransaction,
} from 'firebase/firestore';

import { db } from '@core/firebase/firebase';
import { Logger } from '@core/services/Logger';

import { NotificationService } from '../services/NotificationService';

export const subscribeToRanking = (onUpdate, pageSize = 50) => {
  const { getAuth } = require('firebase/auth');
  const currentUser = getAuth().currentUser;
  if (!currentUser) {
    // Auth not yet restored from persistence — skip silently
    return () => {};
  }
  const q = query(
    collection(db, 'users'),
    orderBy('total_pages_read', 'desc'),
    limit(pageSize),
  );
  return onSnapshot(
    q,
    snapshot => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      onUpdate(users);
    },
    error => {
      Logger.error('Error subscribing to ranking:', error);
    },
  );
};

export const getPaginatedRanking = async (
  lastVisibleDoc = null,
  pageSize = 20,
) => {
  try {
    let q;
    if (lastVisibleDoc) {
      q = query(
        collection(db, 'users'),
        orderBy('total_pages_read', 'desc'),
        startAfter(lastVisibleDoc),
        limit(pageSize),
      );
    } else {
      q = query(
        collection(db, 'users'),
        orderBy('total_pages_read', 'desc'),
        limit(pageSize),
      );
    }

    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const lastDoc = snapshot.docs.slice(-1)[0];

    return { users, lastDoc, hasMore: users.length === pageSize };
  } catch (error) {
    Logger.error('Error getting paginated ranking:', error);
    throw new Error(mapFirebaseError(error));
  }
};

export const searchUsers = async queryText => {
  if (!queryText) return [];
  try {
    const q = query(
      collection(db, 'users'),
      where('username_lowercase', '>=', queryText.toLowerCase()),
      where('username_lowercase', '<=', queryText.toLowerCase() + '\uf8ff'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    Logger.error('Search users error:', error);
    throw new Error(mapFirebaseError(error));
  }
};

export const sendFriendRequest = async (senderUid, receiverUid) => {
  // 🛡️ Guard: prevent self-requests and validate UIDs
  validateFriendRequest(senderUid, receiverUid);

  try {
    const q = query(
      collection(db, 'friendships'),
      where('senderId', '==', senderUid),
      where('receiverId', '==', receiverUid),
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return; // Already requested

    await addDoc(collection(db, 'friendships'), {
      senderId: senderUid,
      receiverId: receiverUid,
      status: 'pending',
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    Logger.error('Send friend request error:', error);
    throw new Error(mapFirebaseError(error));
  }
};

export const acceptFriendRequest = async (
  requestId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
) => {
  // 🛡️ Validate current user UID
  validateUserId(currentUserId, 'aceitar pedido de amizade');

  try {
    const docRef = doc(db, 'friendships', requestId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return;
    const requestData = snap.data();

    // Security: enforce receiver validation when receiverId exists.
    // Legacy fixtures/docs without receiverId remain accepted by rules layer.
    if (requestData?.receiverId && currentUserId) {
      validateFriendRequestReceiver(currentUserId, requestData.receiverId);
    }

    await updateDoc(docRef, { status: 'accepted' });

    // Notify the requester
    await NotificationService.sendNotification(requestData.senderId, {
      type: 'FRIEND_ACCEPT',
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      relatedId: requestId,
      message: `${currentUserName} aceitou seu pedido de amizade!`,
    });
  } catch (error) {
    Logger.error('Accept friend request error:', error);
    throw new Error(mapFirebaseError(error));
  }
};

export const rejectFriendRequest = async requestId => {
  try {
    const docRef = doc(db, 'friendships', requestId);
    await updateDoc(docRef, { status: 'rejected' });
  } catch (error) {
    Logger.error('Reject friend request error:', error);
    throw new Error(mapFirebaseError(error));
  }
};

export const createGroup = async (name, adminId, memberIds) => {
  // 🧹 Sanitize group name before persisting
  const cleanName = sanitizeName(name);

  try {
    const groupRef = await addDoc(collection(db, 'groups'), {
      name: cleanName,
      adminId,
      members: [adminId, ...memberIds],
      createdAt: serverTimestamp(),
    });
    return groupRef.id;
  } catch (error) {
    Logger.error('Create group error:', error);
    throw new Error(mapFirebaseError(error));
  }
};

// Subscriptions
export const subscribeToSentRequests = (uid, onUpdate) => {
  const q = query(collection(db, 'friendships'), where('senderId', '==', uid));
  return onSnapshot(
    q,
    snapshot => {
      onUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    error => {
      Logger.error(
        '[Friendships] Error in sent requests listener:',
        error.message,
      );
    },
  );
};

export const subscribeToReceivedRequests = (uid, onUpdate) => {
  const q = query(
    collection(db, 'friendships'),
    where('receiverId', '==', uid),
  );
  return onSnapshot(
    q,
    snapshot => {
      onUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    error => {
      Logger.error(
        '[Friendships] Error in received requests listener:',
        error.message,
      );
    },
  );
};

export const subscribeToFriends = (uid, onUpdate) => {
  const qSent = query(
    collection(db, 'friendships'),
    where('senderId', '==', uid),
    where('status', '==', 'accepted'),
  );
  const qReceived = query(
    collection(db, 'friendships'),
    where('receiverId', '==', uid),
    where('status', '==', 'accepted'),
  );

  let sentFriends = [];
  let receivedFriends = [];

  const update = () => {
    const friendIds = [
      ...sentFriends.map(f => f.receiverId),
      ...receivedFriends.map(f => f.senderId),
    ];
    onUpdate(friendIds);
  };

  const unsubSent = onSnapshot(
    qSent,
    snap => {
      sentFriends = snap.docs.map(doc => doc.data());
      update();
    },
    error => {
      Logger.error('[Friends] Error in sent friends listener:', error.message);
    },
  );

  const unsubReceived = onSnapshot(
    qReceived,
    snap => {
      receivedFriends = snap.docs.map(doc => doc.data());
      update();
    },
    error => {
      Logger.error(
        '[Friends] Error in received friends listener:',
        error.message,
      );
    },
  );

  return () => {
    unsubSent();
    unsubReceived();
  };
};

export const subscribeToGroups = (uid, onUpdate, onError) => {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', uid),
  );
  return onSnapshot(
    q,
    snapshot => {
      onUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    error => {
      Logger.error('[Groups] Error in groups listener:', error.message);
      if (onError) onError(error);
    },
  );
};

export const getUserDetails = async uid => {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    return docSnap.exists() ? { id: uid, ...docSnap.data() } : null;
  } catch (error) {
    Logger.error('Error getting user details:', uid, error);
    return null;
  }
};

/**
 * 🚀 Batch Fetch Users by IDs
 * Uses Firestore 'in' query to fetch up to 30 documents in a single read trip.
 */
export const getUsersByIds = async uids => {
  if (!uids || uids.length === 0) return [];

  try {
    // Firestore 'in' limit is 30. If more, we'd need to chunk.
    const chunks = [];
    for (let i = 0; i < uids.length; i += 30) {
      chunks.push(uids.slice(i, i + 30));
    }

    const results = await Promise.all(
      chunks.map(async chunk => {
        const q = query(
          collection(db, 'users'),
          where(documentId(), 'in', chunk),
        );
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }),
    );

    return results.flat();
  } catch (error) {
    Logger.error('Error in getUsersByIds:', error);
    throw new Error(mapFirebaseError(error));
  }
};

export const removeFriendship = async (uid, friendId) => {
  try {
    const q1 = query(
      collection(db, 'friendships'),
      where('senderId', '==', uid),
      where('receiverId', '==', friendId),
    );
    const q2 = query(
      collection(db, 'friendships'),
      where('senderId', '==', friendId),
      where('receiverId', '==', uid),
    );

    const snap1 = await getDocs(q1);
    const snap2 = await getDocs(q2);

    const docs = [...snap1.docs, ...snap2.docs];
    for (const d of docs) {
      await deleteDoc(d.ref);
    }
  } catch (error) {
    Logger.error('Error removing friendship:', error);
    throw new Error(mapFirebaseError(error));
  }
};

export const leaveGroup = async (groupId, uid) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayRemove(uid),
    });
  } catch (error) {
    Logger.error('Error leaving group:', error);
    throw new Error(mapFirebaseError(error));
  }
};

export const getGroupDetails = async groupId => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const snap = await getDoc(groupRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    // ⚡ Optimized Batch Fetch of member details (O(1) extra read instead of O(N))
    const members = await getUsersByIds(data.members || []);

    return { id: groupId, ...data, members };
  } catch (error) {
    Logger.error('Error getting group details:', error);
    throw new Error(mapFirebaseError(error));
  }
};

export const updateGroupDetails = async (groupId, name, description) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, { name, description });
  } catch (error) {
    Logger.error('Error updating group details:', error);
    throw new Error(mapFirebaseError(error));
  }
};

export const addGroupMember = async (groupId, userId) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
    });
  } catch (error) {
    Logger.error('Error adding group member:', error);
    throw new Error(mapFirebaseError(error));
  }
};

export const removeGroupMember = async (groupId, userId) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayRemove(userId),
    });
  } catch (error) {
    Logger.error('Error removing group member:', error);
    throw new Error(mapFirebaseError(error));
  }
};

/**
 * 🌟 Social Layer: Get Public Echoes (Notes) for a specific book
 * Uses collectionGroup to fetch across all user sub-collections efficiently.
 */
export const getPublicEchoes = async (
  bookId = null,
  userCurrentPage = 999999,
  _currentUserId,
) => {
  try {
    const echoesRef = collectionGroup(db, 'annotations');
    let q;

    if (bookId) {
      q = query(
        echoesRef,
        where('bookId', '==', bookId),
        where('isPublic', '==', true),
        orderBy('timestamp', 'desc'),
        limit(30),
      );
    } else {
      q = query(
        echoesRef,
        where('isPublic', '==', true),
        orderBy('timestamp', 'desc'),
        limit(30),
      );
    }

    const snap = await getDocs(q);
    let echoes = snap.docs.map(doc => ({
      id: doc.id,
      userId: doc.ref.parent.parent.id,
      ...doc.data(),
    }));

    // Security/Integrity Check: Exclude user's own notes
    // COMPORTAMENTO TEMPORÁRIO PARA TESTES: Comentado para você poder ver suas próprias notas no Deck enquanto desenvolve.
    /*
    if (currentUserId) {
      echoes = echoes.filter(e => e.userId !== currentUserId);
    }
    */

    // Spoiler Protection: Only show echoes up to the user's current page
    if (userCurrentPage !== undefined && userCurrentPage !== null) {
      echoes = echoes.filter(
        e => e.pageLocation && e.pageLocation <= userCurrentPage,
      );
    }

    // Ordering: Most clapped first, secondarily by timestamp
    echoes.sort((a, b) => {
      const clapsA = a.reactions?.claps || 0;
      const clapsB = b.reactions?.claps || 0;
      if (clapsB !== clapsA) return clapsB - clapsA;

      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeB - timeA;
    });

    return echoes.slice(0, 20);
  } catch (error) {
    Logger.error('Error getting echoes:', error);
    // 💡 If index is missing, firebase returns an error.
    // Usually, Firestore will provide a link in the error console to create the index.
    return [];
  }
};

/**
 * 🐭 Collaborative: Add a Rat Clap to an Echo
 */
export const addRatClap = async (
  userId,
  bookId,
  echoId,
  currentUserId,
  currentUserName,
) => {
  try {
    const echoRef = doc(
      db,
      'users',
      userId,
      'books',
      bookId,
      'annotations',
      echoId,
    );
    await updateDoc(echoRef, {
      'reactions.claps': increment(1),
    });

    if (userId !== currentUserId) {
      await NotificationService.sendNotification(userId, {
        type: 'CLAP_ECHO',
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: null, // Avatar can be added if available in context
        relatedId: echoId,
        message: `${currentUserName} curtiu seu Echo!`,
      });
    }
  } catch (error) {
    Logger.error('Error adding clap:', error);
    throw new Error(mapFirebaseError(error));
  }
};

/**
 * 🌟 Social Echoes: Reply to an existing Echo
 * Uses a Transaction to create the reply inside the parent author's collection
 * and increments the parent's replyCount.
 */
export const replyToEcho = async (
  parentUserId,
  parentBookId,
  parentEchoId,
  text,
  userMetadata,
  currentUserId,
) => {
  const parentRef = doc(
    db,
    'users',
    parentUserId,
    'books',
    parentBookId,
    'annotations',
    parentEchoId,
  );
  const repliesCollectionRef = collection(
    db,
    'users',
    parentUserId,
    'books',
    parentBookId,
    'annotations',
  );
  // Generate a new document reference for the reply
  const replyRef = doc(repliesCollectionRef);

  // 🛡️ Validate and sanitize text before entering transaction
  validateEchoText(text);
  const cleanText = sanitizeEchoText(text);

  try {
    await runTransaction(db, async transaction => {
      const parentDoc = await transaction.get(parentRef);
      if (!parentDoc.exists()) {
        throw new Error('O Echo original não foi encontrado.');
      }

      // Operation 1 & 2: Create a new document in the original author's subcollection
      transaction.set(replyRef, {
        userId: currentUserId, // Crucial for security rules: the replier owns this document
        bookId: parentBookId,
        pageLocation: parentDoc.data().pageLocation || null,
        text: cleanText,
        isPublic: true,
        parentId: parentEchoId,
        replyCount: 0,
        userMetadata: {
          displayName: userMetadata.displayName || 'Leitor',
          photoURL: userMetadata.photoURL || null,
        },
        reactions: { claps: 0 },
        timestamp: serverTimestamp(),
      });

      // Operation 3: Increment parent's replyCount
      transaction.update(parentRef, {
        replyCount: increment(1),
      });
    });

    if (parentUserId !== currentUserId) {
      await NotificationService.sendNotification(parentUserId, {
        type: 'COMMENT_ECHO',
        senderId: currentUserId,
        senderName: userMetadata.displayName || 'Leitor',
        senderAvatar: userMetadata.photoURL || null,
        relatedId: parentEchoId,
        message: `${userMetadata.displayName || 'Leitor'} comentou no seu Echo!`,
      });
    }

    return replyRef.id;
  } catch (error) {
    Logger.error('Error replying to echo:', error);
    throw new Error(mapFirebaseError(error));
  }
};

/**
 * 🌟 Get Discussion Replies for an Echo
 */
export const getEchoReplies = async (
  parentUserId,
  parentBookId,
  parentEchoId,
) => {
  try {
    const repliesRef = collection(
      db,
      'users',
      parentUserId,
      'books',
      parentBookId,
      'annotations',
    );
    const q = query(repliesRef, where('parentId', '==', parentEchoId));
    const snap = await getDocs(q);
    const replies = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by claps desc, then timestamp desc
    replies.sort((a, b) => {
      const clapsA = a.reactions?.claps || 0;
      const clapsB = b.reactions?.claps || 0;
      if (clapsB !== clapsA) return clapsB - clapsA;

      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeB - timeA;
    });

    return replies;
  } catch (error) {
    Logger.error('Error getting echo replies:', error);
    return [];
  }
};

/**
 * 🌟 Create a Notification
 */
export const createNotification = async (
  targetUserId,
  type,
  fromUser,
  bookId,
  echoId,
) => {
  try {
    const notificationsRef = collection(
      db,
      'users',
      targetUserId,
      'notifications',
    );
    await addDoc(notificationsRef, {
      type, // 'reply' or 'clap'
      fromUser, // { displayName, uid }
      bookId,
      echoId,
      read: false,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    Logger.error('Error creating notification:', error);
  }
};

/**
 * 🌟 Subscribe to Notifications
 */
export const subscribeToNotifications = (uid, onUpdate) => {
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    orderBy('timestamp', 'desc'),
    limit(50), // Arbitrary limit for performance
  );
  return onSnapshot(
    q,
    snapshot => {
      onUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    error => {
      Logger.error(
        '[Notifications] Error in notifications listener:',
        error.message,
      );
    },
  );
};

/**
 * 🌟 Mark Notification as Read
 */
export const markNotificationAsRead = async (uid, notificationId) => {
  try {
    const notifRef = doc(db, 'users', uid, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    Logger.error('Error marking notification as read:', error);
  }
};

/**
 * 🌟 Update Influencer Status
 */
export const updateUserInfluencerStatus = async (uid, isInfluencer) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { isInfluencer });
  } catch (error) {
    Logger.error('Error updating influencer status:', error);
  }
};
