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
import { Platform, AppState, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { COLORS } from '@constants/colors';
import { auth } from '@core/firebase/firebase';
import {
  configureObservability,
  installGlobalHandlers,
} from '@core/observability';
import BadgeListenerService from '@core/services/BadgeListenerService';
import PushNotificationService from '@core/services/PushNotificationService';
import { useMainStore } from '@core/store';
import {
  CustomPopup,
  LoadingScreen,
  ErrorBoundary,
  BadgeUnlockPopup,
} from '@ui/components';
import AppNavigator from '@ui/navigation/AppNavigator';

import { useThemeStore } from './src/store/useThemeStore';

// 🔇 Silencia avisos de depreciação vindos de DEPENDÊNCIAS (não do nosso
// código): algum pacote ainda importa SafeAreaView do react-native. É só ruído
// de desenvolvimento — LogBox é no-op em produção.
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

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
    // 🛰️ Observability: tag every log with platform/env and route uncaught
    // errors + unhandled rejections into the structured logging pipeline.
    configureObservability({ platform: Platform.OS });
    installGlobalHandlers();

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

    // ℹ️ Notification & social listeners are wired exactly once in
    // authSlice.setAuthUser (and torn down on logout). Do NOT start them here
    // too — that produced duplicate Firestore subscriptions and double popups.

    return () => {
      subscription.remove();
      updateStatus(false); // Offline on unmount/cleanup
    };
  }, [user]);

  // 🔔 Local notifications (engajamento): pede permissão (diálogo nativo do SO)
  // e agenda os lembretes de leitura quando o usuário loga. Re-ancora os
  // lembretes ao voltar ao app e cancela tudo no logout. Notificações de meta
  // (badges) e "livro concluído" são disparadas pelo BadgeListenerService /
  // librarySlice. Tudo local — sem FCM.
  useEffect(() => {
    if (!user) {
      PushNotificationService.cancelAll();
      return;
    }

    let active = true;
    const armReminders = () => {
      const s = useMainStore.getState();
      PushNotificationService.refreshReminders({
        streak: s.streak,
        lastReadDate: s.lastReadDate,
      });
    };

    PushNotificationService.configure().then(granted => {
      if (active && granted) armReminders();
    });

    // Reentrou no app → re-ancora os lembretes (ex: marca que leu hoje).
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') armReminders();
    });

    return () => {
      active = false;
      sub.remove();
    };
  }, [user]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
