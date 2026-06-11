import {
  signUp as apiSignUp,
  signIn as apiSignIn,
  signInWithGoogle as apiSignInWithGoogle,
  signOut as apiSignOut,
  updatePresence as apiUpdatePresence,
  updateReadingStatus as apiUpdateReadingStatus,
} from '@core/api/auth';
import { createLogger } from '@core/observability';

import { usePopupStore } from '../../../store/usePopupStore';

const log = createLogger('core.store.auth');

/**
 * Auth Slice handles all authentication logic (login, logout, session).
 *
 * @param {Function} set
 * @param {Function} get
 */
export const createAuthSlice = (set, get) => ({
  user: null,
  authError: null,
  loading: true,

  // Holders for active Firestore listener unsubscribe functions.
  unsubUserData: null,
  unsubNotifications: null,
  unsubSocialListeners: null,

  setAuthUser: user => {
    // 🧹 Always tear down any previously active listeners first. This guards
    // against onAuthStateChanged firing twice with a user (e.g. token-driven
    // re-auth) and leaking duplicate Firestore subscriptions.
    const {
      unsubUserData: prevUserData,
      unsubNotifications: prevNotifs,
      unsubSocialListeners: prevSocial,
    } = get();
    if (prevUserData) prevUserData();
    if (prevNotifs) prevNotifs();
    if (prevSocial) prevSocial();

    set({ user, loading: false });

    if (user) {
      set({ loadingBooks: true });

      // 📚 User stats + books listeners. fetchUserData returns an unsubscribe
      // function — keep it so we can clean it up on logout (was being dropped).
      let unsubUserData = null;
      if (get().fetchUserData) {
        unsubUserData = get().fetchUserData(user.uid);
      }

      // 🔌 Wire up real-time Notification and Social listeners (single source).
      let unsubNotifs = null;
      let unsubSocial = null;
      if (get().startNotificationsListener) {
        unsubNotifs = get().startNotificationsListener(user.uid);
        unsubSocial = get().startSocialListeners(user.uid);
      }

      set({
        unsubUserData,
        unsubNotifications: unsubNotifs,
        unsubSocialListeners: unsubSocial,
      });
    } else {
      // 🧹 Full reset on logout (listeners already torn down above).
      set({
        books: [],
        streak: 0,
        totalPagesRead: 0,
        lastReadDate: null,
        loadingBooks: false,
        repairLocked: false,
        repairAttempts: 0,
        unsubUserData: null,
        unsubNotifications: null,
        unsubSocialListeners: null,
      });
    }
  },

  signUp: async (email, password) => {
    try {
      set({ loading: true, authError: null });
      await apiSignUp(email, password);
    } catch (error) {
      set({ authError: error.message, loading: false });
      usePopupStore.getState().showPopup({
        title: 'Erro no Cadastro',
        message: error.message,
        type: 'error',
      });
    }
  },

  signIn: async (email, password) => {
    try {
      set({ loading: true, authError: null });
      await apiSignIn(email, password);
    } catch (error) {
      set({ authError: error.message, loading: false });
      usePopupStore.getState().showPopup({
        title: 'Erro no Login',
        message: error.message,
        type: 'error',
      });
    }
  },

  signInWithGoogle: async idToken => {
    try {
      set({ loading: true, authError: null });
      await apiSignInWithGoogle(idToken);
    } catch (error) {
      set({ authError: error.message, loading: false });
      usePopupStore.getState().showPopup({
        title: 'Erro no Google',
        message: error.message,
        type: 'error',
      });
    }
  },

  signOut: async () => {
    try {
      const uid = get().user?.uid;
      if (uid && get().updatePresence) {
        await get().updatePresence(false, uid);
      }
      await apiSignOut();
    } catch (error) {
      log.exception(error, { op: 'signOut', action: 'authenticate' });
    }
  },

  updatePresence: async (isOnline, overrideUid = null) => {
    const targetUid = overrideUid || get().user?.uid;
    if (!targetUid) return;
    try {
      await apiUpdatePresence(targetUid, isOnline);
    } catch (error) {
      // The structured logger already classifies permission-denied and tags
      // the resource path, so the old free-text diagnostic hint is gone.
      log.exception(error, {
        op: 'updatePresence',
        action: 'write',
        resource: `users/${targetUid}`,
        context: { uid: targetUid, isOnline },
      });
    }
  },

  updateReadingStatus: async bookTitle => {
    const { user } = get();
    if (!user) return;
    try {
      await apiUpdateReadingStatus(user.uid, bookTitle);
    } catch (error) {
      log.exception(error, {
        op: 'updateReadingStatus',
        action: 'write',
        resource: `users/${user.uid}`,
        context: { uid: user.uid },
      });
    }
  },
});
