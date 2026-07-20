import React from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { COLORS } from '@constants/colors';
import { useMainStore } from '@core/store';
import AuthScreen from '@ui/screens/AuthScreen';
import BookDetailsScreen from '@ui/screens/BookDetailsScreen';
import BookEditScreen from '@ui/screens/BookEditScreen';
import EchoDetailScreen from '@ui/screens/EchoDetailScreen';
import GalleryScreen from '@ui/screens/GalleryScreen';
import GroupChatScreen from '@ui/screens/GroupChatScreen';
import GroupDetailsScreen from '@ui/screens/GroupDetailsScreen';
import NotificationsScreen from '@ui/screens/NotificationsScreen';
import SearchScreen from '@ui/screens/SearchScreen';
import TimerScreen from '@ui/screens/TimerScreen';
import UserProfileScreen from '@ui/screens/UserProfileScreen';

import TabNavigator from './TabNavigator';
import { useThemeStore } from '../../store/useThemeStore';

const Stack = createNativeStackNavigator();

// LoadingScreen is now exported from its own file or handled in App.js

export default function AppNavigator() {
  const user = useMainStore(state => state.user);
  const isDarkMode = useThemeStore(state => state.isDarkMode);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'default',
        fullScreenGestureEnabled: true, // Improved swipe gesture consistency
        detachInactiveScreens: true, // Optimizes memory by detaching screens not in view
        // Theme-aware solid background: prevents "white flash" during transitions
        // without tinting the dark theme navy (was COLORS.dark_blue #020617).
        contentStyle: {
          backgroundColor: isDarkMode
            ? COLORS.background.dark
            : COLORS.background.light,
        },
      }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="Timer"
            component={TimerScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="GroupChat" component={GroupChatScreen} />
          <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="EchoDetail" component={EchoDetailScreen} />
          <Stack.Screen name="EchoGallery" component={GalleryScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen
            name="BookEdit"
            component={BookEditScreen}
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
              headerShown: false,
              // Override the opaque screen background so the modal is truly transparent.
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen name="BookDetails" component={BookDetailsScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}
