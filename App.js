import './global.css';
import React, { useEffect } from 'react';

import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useNavigationContainerRef,
} from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useColorScheme } from 'nativewind';
import { Platform, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { COLORS } from '@constants/colors';
import { auth } from '@core/firebase/firebase';
import BadgeListenerService from '@core/services/BadgeListenerService';
import { useMainStore } from '@core/store';
import {
  CustomPopup,
  LoadingScreen,
  ErrorBoundary,
  BadgeUnlockPopup,
} from '@ui/components';
import AppNavigator from '@ui/navigation/AppNavigator';

import { useThemeStore } from './src/store/useThemeStore';

const BookLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background.light,
    card: COLORS.background.light,
    text: COLORS.text.light,
    primary: COLORS.primary.light,
    border: COLORS.border.light,
  },
};
const BookDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background.dark,
    card: COLORS.background.dark,
    text: COLORS.text.dark,
    primary: COLORS.primary.dark,
    border: COLORS.border.dark,
  },
};

export default function App() {
  const { isDarkMode } = useThemeStore();
  const { user, loading, setAuthUser } = useMainStore();
  const { setColorScheme } = useColorScheme();
  const navigationRef = useNavigationContainerRef();
  const [currentRouteName, setCurrentRouteName] = React.useState('unknown');

  useEffect(() => {
    setColorScheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, setColorScheme]);

  useEffect(() => {
    BadgeListenerService.initialize();

    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setAuthUser(user);
    });
    return unsubscribe;
  }, [setAuthUser]);

  // Removed misplaced import and comments

  useEffect(() => {
    if (!user) return;
    const currentUid = user.uid;

    const updateStatus = status => {
      useMainStore.getState().updatePresence(status, currentUid);
    };

    updateStatus(true); // Online on mount

    const subscription = AppState.addEventListener('change', nextAppState => {
      updateStatus(nextAppState === 'active');
    });

    // 🌟 Start Notifications Listener
    const unsubNotifs = useMainStore
      .getState()
      .startNotificationsListener(currentUid);

    return () => {
      subscription.remove();
      updateStatus(false); // Offline on unmount/cleanup
      if (unsubNotifs) unsubNotifs();
    };
  }, [user]);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {loading ? (
        <LoadingScreen />
      ) : (
        <NavigationContainer
          ref={navigationRef}
          theme={isDarkMode ? BookDarkTheme : BookLightTheme}
          onReady={() => {
            setCurrentRouteName(
              navigationRef.getCurrentRoute()?.name || 'unknown',
            );
          }}
          onStateChange={() => {
            setCurrentRouteName(
              navigationRef.getCurrentRoute()?.name || 'unknown',
            );
          }}>
          <ErrorBoundary screenName={currentRouteName}>
            <AppNavigator />
            <CustomPopup />
            <BadgeUnlockPopup />
          </ErrorBoundary>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
