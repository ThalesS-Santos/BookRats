import { createAuthSlice } from '@core/store/slices/authSlice';
import { signUp as apiSignUp, signIn as apiSignIn, signInWithGoogle as apiSignInWithGoogle, signOut as apiSignOut, updatePresence as apiUpdatePresence, updateReadingStatus as apiUpdateReadingStatus } from '@core/api/auth';
import { usePopupStore } from '../../src/store/usePopupStore';

jest.mock('@core/api/auth', () => ({
  signUp: jest.fn(),
  signIn: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  updatePresence: jest.fn(),
  updateReadingStatus: jest.fn(),
}));

jest.mock('../../src/store/usePopupStore', () => ({
  usePopupStore: {
    getState: jest.fn().mockReturnValue({
      showPopup: jest.fn()
    })
  }
}));

describe('Auth Slice', () => {
  let state;
  let setMock;
  let getMock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    state = {};
    setMock = jest.fn((newState) => {
      state = { ...state, ...(typeof newState === 'function' ? newState(state) : newState) };
    });
    
    getMock = jest.fn(() => state);
    
    const slice = createAuthSlice(setMock, getMock);
    state = { 
      ...slice, 
      user: null,
      authError: null,
      loading: false,
      fetchUserData: jest.fn()
    };
  });

  describe('setAuthUser', () => {
    it('should set user and trigger fetchUserData', () => {
      const user = { uid: '123' };
      state.setAuthUser(user);
      
      expect(setMock).toHaveBeenCalledWith({ user, loading: false });
      expect(setMock).toHaveBeenCalledWith({ loadingBooks: true });
      expect(state.fetchUserData).toHaveBeenCalledWith('123');
    });

    it('should clear books and stats if user is null', () => {
      state.setAuthUser(null);
      expect(setMock).toHaveBeenCalledWith({ user: null, loading: false });
      expect(setMock).toHaveBeenCalledWith({ books: [], streak: 0, totalPagesRead: 0, lastReadDate: null, loadingBooks: false });
    });
  });

  describe('signUp', () => {
    it('should call apiSignUp', async () => {
      await state.signUp('test@email.com', '123456');
      expect(setMock).toHaveBeenCalledWith({ loading: true, authError: null });
      expect(apiSignUp).toHaveBeenCalledWith('test@email.com', '123456');
    });

    it('should handle signUp error', async () => {
      apiSignUp.mockRejectedValueOnce(new Error('Sign up fail'));
      const showPopupMock = usePopupStore.getState().showPopup;

      await state.signUp('test@email.com', '123456');
      
      expect(setMock).toHaveBeenCalledWith({ authError: 'Sign up fail', loading: false });
      expect(showPopupMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });

  describe('signIn', () => {
    it('should call apiSignIn', async () => {
      await state.signIn('test@email.com', '123456');
      expect(setMock).toHaveBeenCalledWith({ loading: true, authError: null });
      expect(apiSignIn).toHaveBeenCalledWith('test@email.com', '123456');
    });

    it('should handle signIn error', async () => {
      apiSignIn.mockRejectedValueOnce(new Error('Sign in fail'));
      const showPopupMock = usePopupStore.getState().showPopup;

      await state.signIn('test@email.com', '123456');
      
      expect(setMock).toHaveBeenCalledWith({ authError: 'Sign in fail', loading: false });
      expect(showPopupMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });

  describe('signInWithGoogle', () => {
    it('should call apiSignInWithGoogle', async () => {
      await state.signInWithGoogle('token123');
      expect(setMock).toHaveBeenCalledWith({ loading: true, authError: null });
      expect(apiSignInWithGoogle).toHaveBeenCalledWith('token123');
    });

    it('should handle signInWithGoogle error', async () => {
      apiSignInWithGoogle.mockRejectedValueOnce(new Error('Google login fail'));
      const showPopupMock = usePopupStore.getState().showPopup;

      await state.signInWithGoogle('token123');
      
      expect(setMock).toHaveBeenCalledWith({ authError: 'Google login fail', loading: false });
      expect(showPopupMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });

  describe('signOut', () => {
    it('should call updatePresence and apiSignOut', async () => {
      state.user = { uid: '123' };
      const presenceSpy = jest.spyOn(state, 'updatePresence').mockImplementation();
      await state.signOut();
      
      expect(presenceSpy).toHaveBeenCalledWith(false, '123');
      expect(apiSignOut).toHaveBeenCalled();
      presenceSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      state.user = { uid: '123' };
      apiSignOut.mockRejectedValueOnce(new Error('Signout error'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await state.signOut();
      
      expect(errorSpy).toHaveBeenCalledWith("Sign out error:", expect.any(Error));
      errorSpy.mockRestore();
    });
  });

  describe('updatePresence', () => {
    it('should call apiUpdatePresence with overrideUid', async () => {
      await state.updatePresence(true, 'override_uid');
      expect(apiUpdatePresence).toHaveBeenCalledWith('override_uid', true);
    });

    it('should call apiUpdatePresence with state user uid', async () => {
      state.user = { uid: 'state_uid' };
      await state.updatePresence(true);
      expect(apiUpdatePresence).toHaveBeenCalledWith('state_uid', true);
    });

    it('should return if no uid', async () => {
      state.user = null;
      await state.updatePresence(true);
      expect(apiUpdatePresence).not.toHaveBeenCalled();
    });

    it('should log error on failure', async () => {
      state.user = { uid: 'state_uid' };
      apiUpdatePresence.mockRejectedValueOnce(new Error('Presence error'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await state.updatePresence(true);
      
      expect(errorSpy).toHaveBeenCalledWith("Error updating presence:", expect.any(Error));
      errorSpy.mockRestore();
    });
  });

  describe('updateReadingStatus', () => {
    it('should call apiUpdateReadingStatus', async () => {
      state.user = { uid: '123' };
      await state.updateReadingStatus('Book Title');
      expect(apiUpdateReadingStatus).toHaveBeenCalledWith('123', 'Book Title');
    });

    it('should return if no user', async () => {
      state.user = null;
      await state.updateReadingStatus('Book Title');
      expect(apiUpdateReadingStatus).not.toHaveBeenCalled();
    });

    it('should log error on failure', async () => {
      state.user = { uid: '123' };
      apiUpdateReadingStatus.mockRejectedValueOnce(new Error('Reading error'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await state.updateReadingStatus('Book Title');
      
      expect(errorSpy).toHaveBeenCalledWith("Error updating reading status:", expect.any(Error));
      errorSpy.mockRestore();
    });
  });
});
