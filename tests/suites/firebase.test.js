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
