import * as FirebaseAnalytics from 'firebase/analytics';
import * as FirebaseApp from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import * as FirebaseFirestore from 'firebase/firestore';

// We need to mock the firebase modules BEFORE importing the local firebase.js
jest.mock('firebase/app', () => ({
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(() => ({ name: 'mock-app' })),
  getApp: jest.fn(() => ({ name: 'mock-app' })),
}));

jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(() => ({ name: 'mock-auth' })),
  getAuth: jest.fn(() => ({ name: 'mock-auth' })),
  getReactNativePersistence: jest.fn(),
  GoogleAuthProvider: jest.fn(() => ({})),
}));

jest.mock('firebase/firestore', () => ({
  initializeFirestore: jest.fn(() => ({ name: 'mock-db' })),
  getFirestore: jest.fn(() => ({ name: 'mock-db' })),
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({ name: 'mock-analytics' })),
  isSupported: jest.fn(() => Promise.resolve(true)),
}));

describe('Firebase Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize firebase when no apps exist', () => {
    jest.isolateModules(() => {
      require('../../src/core/firebase/firebase');
    });
    expect(FirebaseApp.initializeApp).toHaveBeenCalled();
    expect(FirebaseAuth.initializeAuth).toHaveBeenCalled();
    expect(FirebaseFirestore.initializeFirestore).toHaveBeenCalled();
    expect(FirebaseAuth.getReactNativePersistence).toHaveBeenCalled();
    expect(FirebaseAuth.GoogleAuthProvider).toHaveBeenCalled();
  });

  it('should wire analytics only when supported', async () => {
    jest.isolateModules(() => {
      require('../../src/core/firebase/firebase');
    });

    await Promise.resolve();

    expect(FirebaseAnalytics.isSupported).toHaveBeenCalled();
    expect(FirebaseAnalytics.getAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'mock-app' }),
    );
  });

  it('should get existing apps if already initialized', () => {
    const { getApps } = require('firebase/app');
    getApps.mockReturnValue([{ name: 'existing-app' }]);

    jest.isolateModules(() => {
      require('../../src/core/firebase/firebase');
    });

    expect(FirebaseApp.getApp).toHaveBeenCalled();
    expect(FirebaseAuth.getAuth).toHaveBeenCalled();
    expect(FirebaseFirestore.getFirestore).toHaveBeenCalled();
  });
});
