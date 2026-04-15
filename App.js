import './global.css';
import React, { useEffect } from 'react';
import { View, Platform, AppState } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { onAuthStateChanged } from 'firebase/auth';

import AppNavigator from './src/navigation/AppNavigator';
import { useThemeStore } from './src/store/useThemeStore';
import { useBookStore } from './src/store/useBookStore';
import { auth } from './src/services/firebase';

import { COLORS } from './src/constants/colors';
import CustomPopup from './src/components/CustomPopup';
import LoadingScreen from './src/components/LoadingScreen';

const BookLightTheme = { 
  ...DefaultTheme, 
  colors: { 
    ...DefaultTheme.colors, 
    background: COLORS.background.light, 
    card: COLORS.background.light, 
    text: COLORS.text.light, 
    primary: COLORS.primary.light, 
    border: COLORS.border.light 
  } 
};
const BookDarkTheme = { 
  ...DarkTheme, 
  colors: { 
    ...DarkTheme.colors, 
    background: COLORS.background.dark, 
    card: COLORS.background.dark, 
    text: COLORS.text.dark, 
    primary: COLORS.primary.dark, 
    border: COLORS.border.dark 
  } 
};

export default function App() {
  const { isDarkMode } = useThemeStore();
  const { user, loading, setAuthUser } = useBookStore();
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync("hidden");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const currentUid = user.uid;

    const updateStatus = (status) => {
      useBookStore.getState().updatePresence(status, currentUid);
    };

    updateStatus(true); // Online on mount

    const subscription = AppState.addEventListener('change', nextAppState => {
      // Deixa offline se não estiver 'active' (funciona para background e inactive)
      updateStatus(nextAppState === 'active');
    });

    return () => {
      subscription.remove();
      updateStatus(false); // Offline on unmount/cleanup
    };
  }, [user]);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {loading ? (
        <LoadingScreen />
      ) : (
        <View style={{ flex: 1, backgroundColor: COLORS.dark_blue }}>
          <NavigationContainer theme={isDarkMode ? BookDarkTheme : BookLightTheme}>
            <AppNavigator />
            <CustomPopup />
          </NavigationContainer>
        </View>
      )}
    </SafeAreaProvider>
  );
}
