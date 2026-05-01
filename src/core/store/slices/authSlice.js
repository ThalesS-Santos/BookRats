import { usePopupStore } from '../../../store/usePopupStore';
import { signUp as apiSignUp, signIn as apiSignIn, signInWithGoogle as apiSignInWithGoogle, signOut as apiSignOut, updatePresence as apiUpdatePresence, updateReadingStatus as apiUpdateReadingStatus } from '@core/api/auth';

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

  setAuthUser: (user) => {
    set({ user, loading: false });
    if (user) {
      set({ loadingBooks: true });
      if(get().fetchUserData) get().fetchUserData(user.uid);
    } else {
      set({ books: [], streak: 0, totalPagesRead: 0, lastReadDate: null, loadingBooks: false });
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
        type: 'error'
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
        type: 'error'
      });
    }
  },

  signInWithGoogle: async (idToken) => {
    try {
      set({ loading: true, authError: null });
      await apiSignInWithGoogle(idToken);
    } catch (error) {
      set({ authError: error.message, loading: false });
      usePopupStore.getState().showPopup({
        title: 'Erro no Google',
        message: error.message,
        type: 'error'
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
      console.error("Sign out error:", error);
    }
  },

  updatePresence: async (isOnline, overrideUid = null) => {
    const targetUid = overrideUid || get().user?.uid;
    if (!targetUid) return;
    try {
      await apiUpdatePresence(targetUid, isOnline);
    } catch (error) {
      console.error("Error updating presence:", error);
    }
  },

  updateReadingStatus: async (bookTitle) => {
    const { user } = get();
    if (!user) return;
    try {
      await apiUpdateReadingStatus(user.uid, bookTitle);
    } catch (error) {
      console.error("Error updating reading status:", error);
    }
  },
});
