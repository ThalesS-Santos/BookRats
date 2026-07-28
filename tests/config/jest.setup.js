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
    interpolate: value => value,
    // Devolve a primeira cor do range: basta para o teste renderizar sem erro,
    // já que asserções visuais de cor não são feitas em unit test.
    interpolateColor: (value, input, output) =>
      Array.isArray(output) ? output[0] : output,
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

// Presença dos módulos nativos do RevenueCat. `core/api/monetization.js` faz uma
// checagem de capacidade em `NativeModules` (mesma dos SDKs) para virar NO-OP em
// Expo Go/web; sob o Jest o bridge é vazio, então declaramos os módulos como
// presentes para que os testes exercitem o caminho "suportado" (mesma intenção do
// mock de expo-constants forçando ambiente standalone).
const { NativeModules } = require('react-native');
NativeModules.RNPurchases = NativeModules.RNPurchases || {};
NativeModules.RNPaywalls = NativeModules.RNPaywalls || {};
NativeModules.RNCustomerCenter = NativeModules.RNCustomerCenter || {};

// Mock RevenueCat SDK (native module — no bridge available under Jest)
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    logIn: jest.fn(() =>
      Promise.resolve({
        customerInfo: { entitlements: { active: {} } },
        created: false,
      }),
    ),
    logOut: jest.fn(() => Promise.resolve()),
    getCustomerInfo: jest.fn(() =>
      Promise.resolve({ entitlements: { active: {} } }),
    ),
    getOfferings: jest.fn(() => Promise.resolve({ current: null, all: {} })),
    purchasePackage: jest.fn(() =>
      Promise.resolve({ customerInfo: { entitlements: { active: {} } } }),
    ),
    restorePurchases: jest.fn(() =>
      Promise.resolve({ entitlements: { active: {} } }),
    ),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' },
}));

jest.mock('react-native-purchases-ui', () => ({
  __esModule: true,
  default: {
    presentPaywall: jest.fn(() => Promise.resolve('NOT_PRESENTED')),
    presentPaywallIfNeeded: jest.fn(() => Promise.resolve('NOT_PRESENTED')),
    presentCustomerCenter: jest.fn(() => Promise.resolve()),
    CustomerCenterView: 'CustomerCenterView',
    Paywall: 'Paywall',
  },
  PAYWALL_RESULT: {
    NOT_PRESENTED: 'NOT_PRESENTED',
    ERROR: 'ERROR',
    CANCELLED: 'CANCELLED',
    PURCHASED: 'PURCHASED',
    RESTORED: 'RESTORED',
  },
}));

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
