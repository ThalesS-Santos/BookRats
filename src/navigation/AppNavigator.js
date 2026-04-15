import React from 'react';
import { View } from 'react-native';
import BookLoader from '../components/BookLoader';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useBookStore } from '../store/useBookStore';

import AuthScreen from '../screens/AuthScreen';
import AddBookScreen from '../screens/AddBookScreen';
import TimerScreen from '../screens/TimerScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import TabNavigator from './TabNavigator';
import LoadingScreen from '../components/LoadingScreen';

import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();

// LoadingScreen is now exported from its own file or handled in App.js

export default function AppNavigator() {
  const user = useBookStore(state => state.user);

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'default',
        fullScreenGestureEnabled: true, // Improved swipe gesture consistency
        detachInactiveScreens: true, // Optimizes memory by detaching screens not in view
        contentStyle: { backgroundColor: COLORS.dark_blue } // Fixes "white flash" during transitions
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="AddBook" component={AddBookScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Timer" component={TimerScreen} options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="GroupChat" component={GroupChatScreen} />
          <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}
