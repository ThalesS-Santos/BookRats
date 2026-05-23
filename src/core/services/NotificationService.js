import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';

import { db } from '../firebase/firebase';

/**
 * NotificationService
 * Handles the dispatch and management of in-app notifications in Firestore.
 */
export const NotificationService = {
  /**
   * Sends a notification to a target user.
   *
   * @param {string} targetUserId - The ID of the user receiving the notification.
   * @param {Object} data - Notification payload.
   * @param {string} data.type - CLAP_ECHO | COMMENT_ECHO | FRIEND_ACCEPT.
   * @param {string} data.senderId - Current user ID.
   * @param {string} data.senderName - Current user display name.
   * @param {string} data.senderAvatar - Current user photo URL.
   * @param {string} data.relatedId - Echo ID or Friend Request ID.
   * @param {string} data.message - Descriptive message.
   */
  async sendNotification(
    targetUserId,
    { type, senderId, senderName, senderAvatar, relatedId, message },
  ) {
    if (!targetUserId || targetUserId === senderId) return;

    try {
      const notificationsRef = collection(
        db,
        'users',
        targetUserId,
        'notifications',
      );
      await addDoc(notificationsRef, {
        type,
        senderId,
        senderName,
        senderAvatar: senderAvatar || null,
        relatedId,
        message,
        read: false,
        createdAt: new Date().toISOString(), // Used for local 10s check
        timestamp: serverTimestamp(), // Used for database sorting
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  },

  /**
   * Marks all notifications as read for a specific user.
   *
   * @param {string} userId - The current user ID.
   */
  async markAllAsRead(userId) {
    if (!userId) return;

    try {
      const notificationsRef = collection(db, 'users', userId, 'notifications');
      const q = query(notificationsRef, where('read', '==', false));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.update(d.ref, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },
};
