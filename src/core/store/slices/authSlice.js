import {
  signUp as apiSignUp,
  signIn as apiSignIn,
  signInWithGoogle as apiSignInWithGoogle,
  signOut as apiSignOut,
  updatePresence as apiUpdatePresence,
  updateReadingStatus as apiUpdateReadingStatus,
} from '@core/api/auth';

import { usePopupStore } from '../../../store/usePopupStore';

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

  setAuthUser: user => {
    set({ user, loading: false });
    if (user) {
      set({ loadingBooks: true });
      if (get().fetchUserData) get().fetchUserData(user.uid);
    } else {
      set({
        books: [],
        streak: 0,
        totalPagesRead: 0,
        lastReadDate: null,
        loadingBooks: false,
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
      console.error('Sign out error:', error);
    }
  },

  updatePresence: async (isOnline, overrideUid = null) => {
    const targetUid = overrideUid || get().user?.uid;
    if (!targetUid) return;
    try {
      await apiUpdatePresence(targetUid, isOnline);
    } catch (error) {
      let extraHint = '';
      if (
        error.code === 'permission-denied' ||
        error.message.includes('Missing or insufficient permissions')
      ) {
        extraHint =
          '\n💡 Hint: "permission-denied" on mobile can happen if Firebase App Check is enforcing, if the users/{userId} doc is missing (SignUp failed midway), or due to a known React Native AsyncStorage startup delay where Firestore connects before Auth is ready.';
      }
      console.error(
        `Presence update error for UID [${targetUid}] (isOnline: ${isOnline}): ${error.message}${extraHint}`,
      );
    }
  },

  updateReadingStatus: async bookTitle => {
    const { user } = get();
    if (!user) return;
    try {
      await apiUpdateReadingStatus(user.uid, bookTitle);
    } catch (error) {
      console.error('Error updating reading status:', error);
    }
  },
});
