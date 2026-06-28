import '@testing-library/jest-native/extend-expect';
import { server } from '../mocks/server';

// --- Hardware & UI Mocks ---

// Mock AsyncStorage (for Zustand Persistence)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock Expo Icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
}));

// Mock Expo Auth Session & Web Browser
jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: () => [{}, null, jest.fn()],
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

// Mock Expo Keep Awake
jest.mock('expo-keep-awake', () => ({
  useKeepAwake: jest.fn(),
}));

// Mock Expo Constants — força ambiente "standalone" (não Expo Go) para que o
// PushNotificationService seja considerado suportado nos testes.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', appOwnership: 'standalone' },
}));

// Mock Expo Notifications (local notifications — no native bindings in tests)
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-notif-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date' },
  IosAuthorizationStatus: { PROVISIONAL: 1, AUTHORIZED: 2 },
}));

// Mock React Native Reanimated & Worklets (Robust manual mock)
jest.mock('react-native-worklets', () => ({
  Worklets: {
    createContext: jest.fn(),
    createRunOnJS: fn => fn,
    createRunOnUI: fn => fn,
  },
  useWorklet: fn => fn,
  useEvent: () => {},
  useSharedValue: v => ({ value: v }),
  useDerivedValue: v => ({ value: v }),
  createSerializable: v => v,
}));

jest.mock('react-native-worklets-core', () => ({
  Worklets: {
    createContext: jest.fn(),
    createRunOnJS: fn => fn,
    createRunOnUI: fn => fn,
  },
  useWorklet: fn => fn,
  useEvent: () => {},
  useSharedValue: v => ({ value: v }),
  useDerivedValue: v => ({ value: v }),
  createSerializable: v => v,
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      call: () => {},
      View: View,
      Text: View,
      Image: View,
      ScrollView: View,
      FlatList: View,
    },
    useSharedValue: v => ({ value: v }),
    useDerivedValue: fn => ({ value: fn() }),
    useAnimatedStyle: fn => fn(),
    useAnimatedProps: fn => fn(),
    useAnimatedScrollHandler: () => () => {},
    useAnimatedGestureHandler: () => () => {},
    withTiming: toValue => toValue,
    withSpring: toValue => toValue,
    withRepeat: anim => anim,
    withSequence: (...anims) => anims[0],
    withDelay: (delay, anim) => anim,
    cancelAnimation: () => {},
    measure: () => ({ x: 0, y: 0, width: 0, height: 0, pageX: 0, pageY: 0 }),
    runOnJS: fn => fn,
    runOnUI: fn => fn,
    makeMutable: v => ({ value: v }),
    Extrapolate: { CLAMP: 'clamp', IDENTITY: 'identity', EXTEND: 'extend' },
    Extrapolation: { CLAMP: 'clamp', IDENTITY: 'identity', EXTEND: 'extend' },
    interpolate: (value, inputRange, outputRange) => value,
    Easing: {
      linear: x => x,
      ease: x => x,
      quad: x => x,
      cubic: x => x,
      poly: () => x => x,
      sin: x => x,
      circle: x => x,
      exp: x => x,
      elastic: () => x => x,
      back: () => x => x,
      bounce: x => x,
      bezier: () => ({ factory: () => x => x }),
      in: fn => fn,
      out: fn => fn,
      inOut: fn => fn,
    },
    Animated: {
      View: View,
      Text: View,
      Image: View,
      ScrollView: View,
      FlatList: View,
    },
    SlideInRight: { duration: () => {} },
    SlideOutLeft: { duration: () => {} },
    FadeIn: { duration: () => {} },
    FadeOut: { duration: () => {} },
  };
});

// --- Firebase Simulation ---

// Mock firebase/app
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
}));

// Mock firebase/auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user-id', email: 'test@bookrats.com' },
    onAuthStateChanged: jest.fn((auth, callback) => {
      callback({ uid: 'test-user-id', email: 'test@bookrats.com' });
      return jest.fn(); // Unsubscribe function
    }),
  })),
  initializeAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(),
  signInWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({ user: { uid: 'test-user-id' } }),
  ),
  createUserWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({ user: { uid: 'test-user-id' } }),
  ),
  signOut: jest.fn(() => Promise.resolve()),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
}));

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  initializeFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() =>
    Promise.resolve({
      exists: () => true,
      data: () => ({ title: 'Mock Book', userId: 'test-user-id' }),
    }),
  ),
  getDocs: jest.fn(() =>
    Promise.resolve({
      forEach: callback =>
        callback({ id: '1', data: () => ({ name: 'Test' }) }),
      docs: [],
    }),
  ),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()), // Returns unsubscribe
}));

// --- Utilities & Clean Output ---

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

// --- Utilities & Clean Output ---

// Silent logs for clean test output
// jest.spyOn(console, 'log').mockImplementation(() => {});
// jest.spyOn(console, 'warn').mockImplementation(() => {});
// jest.spyOn(console, 'error').mockImplementation(() => {});

// --- MSW Lifecycle ---
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
