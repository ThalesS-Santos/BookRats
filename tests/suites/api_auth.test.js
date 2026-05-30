import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithCredential,
  GoogleAuthProvider,
} from 'firebase/auth';
import { setDoc, getDoc } from 'firebase/firestore';

import {
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  updatePresence,
  updateReadingStatus,
} from '@core/api/auth';

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  signInWithCredential: jest.fn(),
  GoogleAuthProvider: {
    credential: jest.fn().mockReturnValue('mock-credential'),
  },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn().mockReturnValue('mock-timestamp'),
}));

jest.mock('@core/firebase/firebase', () => ({
  auth: {},
  db: {},
}));

describe('Auth API Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should create user and set user doc', async () => {
      const mockUser = { user: { uid: 'u1' } };
      createUserWithEmailAndPassword.mockResolvedValueOnce(mockUser);
      setDoc.mockResolvedValueOnce();

      const result = await signUp('test@email.com', 'pass123');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@email.com',
        'pass123',
      );
      expect(setDoc).toHaveBeenCalledWith(
        undefined, // doc() returns undefined in mock
        expect.objectContaining({ email: 'test@email.com', username: 'test' }),
      );
      expect(result).toEqual(mockUser.user);
    });

    it('should map error and throw', async () => {
      createUserWithEmailAndPassword.mockRejectedValueOnce({
        code: 'auth/email-already-in-use',
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(signUp('test@email.com', 'pass123')).rejects.toThrow(
        'Este e-mail já está em uso.',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('signIn', () => {
    it('should sign in and return user', async () => {
      const mockUser = { user: { uid: 'u1' } };
      signInWithEmailAndPassword.mockResolvedValueOnce(mockUser);

      const result = await signIn('test@email.com', 'pass123');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@email.com',
        'pass123',
      );
      expect(result).toEqual(mockUser.user);
    });

    it('should map error and throw', async () => {
      signInWithEmailAndPassword.mockRejectedValueOnce({
        code: 'auth/wrong-password',
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(signIn('test@email.com', 'pass123')).rejects.toThrow(
        'E-mail não cadastrado ou senha incorreta. Se não tem uma conta, cadastre-se!',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('signInWithGoogle', () => {
    it('should sign in with google and set doc if user does not exist', async () => {
      const mockUser = {
        user: { uid: 'u1', email: 'g@g.com', displayName: 'Google User' },
      };
      signInWithCredential.mockResolvedValueOnce(mockUser);
      getDoc.mockResolvedValueOnce({ exists: () => false });

      const result = await signInWithGoogle('idToken123');

      expect(signInWithCredential).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ email: 'g@g.com', username: 'Google User' }),
      );
      expect(result).toEqual(mockUser.user);
    });

    it('should sign in with google and skip set doc if user exists', async () => {
      const mockUser = { user: { uid: 'u1', email: 'g@g.com' } };
      signInWithCredential.mockResolvedValueOnce(mockUser);
      getDoc.mockResolvedValueOnce({ exists: () => true });

      await signInWithGoogle('idToken123');

      expect(setDoc).not.toHaveBeenCalled();
    });

    it('should map error and throw', async () => {
      signInWithCredential.mockRejectedValueOnce(new Error('Firebase Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(signInWithGoogle('idToken123')).rejects.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('signOut', () => {
    it('should call firebaseSignOut', async () => {
      await signOut();
      expect(firebaseSignOut).toHaveBeenCalled();
    });

    it('should throw on error', async () => {
      firebaseSignOut.mockRejectedValueOnce(new Error('Fail'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await expect(signOut()).rejects.toThrow('Fail');
      consoleSpy.mockRestore();
    });
  });

  describe('updatePresence', () => {
    it('should update isOnline status', async () => {
      await updatePresence('u1', true);
      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ isOnline: true }),
        { merge: true },
      );
    });

    it('should catch error without throwing', async () => {
      setDoc.mockRejectedValueOnce(new Error('Fail'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await updatePresence('u1', true);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('updateReadingStatus', () => {
    it('should update currentReadingBook', async () => {
      await updateReadingStatus('u1', 'New Book');
      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ currentReadingBook: 'New Book' }),
        { merge: true },
      );
    });

    it('should set currentReadingBook to null if no title provided', async () => {
      await updateReadingStatus('u1', undefined);
      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ currentReadingBook: null }),
        { merge: true },
      );
    });

    it('should catch error without throwing', async () => {
      setDoc.mockRejectedValueOnce(new Error('Fail'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await updateReadingStatus('u1', 'New Book');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('signInWithGoogle Edge Cases', () => {
    it('should use email prefix if displayName is missing', async () => {
      const mockUser = {
        user: { uid: 'u1', email: 'no-name@test.com', displayName: null },
      };
      signInWithCredential.mockResolvedValueOnce(mockUser);
      getDoc.mockResolvedValueOnce({ exists: () => false });

      await signInWithGoogle('token');

      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ username: 'no-name' }),
      );
    });
  });
});
