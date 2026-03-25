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

import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return <BookLoader isVisible={true} />;
}

export default function AppNavigator() {
  const { user, loading } = useBookStore();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
