import { useMainStore } from '@core/store';
import React from 'react';
import { View } from 'react-native';
import { BookLoader } from '@ui/components';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from '@ui/screens/AuthScreen';
import AddBookScreen from '@ui/screens/AddBookScreen';
import TimerScreen from '@ui/screens/TimerScreen';
import GroupChatScreen from '@ui/screens/GroupChatScreen';
import GroupDetailsScreen from '@ui/screens/GroupDetailsScreen';
import UserProfileScreen from '@ui/screens/UserProfileScreen';
import EchoDetailScreen from '@ui/screens/EchoDetailScreen';
import GalleryScreen from '@ui/screens/GalleryScreen';
import NotificationsScreen from '@ui/screens/NotificationsScreen';
import BookEditScreen from '@ui/screens/BookEditScreen';
import TabNavigator from './TabNavigator';
import { LoadingScreen } from '@ui/components';

import { COLORS } from '@constants/colors';

const Stack = createNativeStackNavigator();

// LoadingScreen is now exported from its own file or handled in App.js

export default function AppNavigator() {
  const user = useMainStore(state => state.user);

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
          <Stack.Screen name="EchoDetail" component={EchoDetailScreen} />
          <Stack.Screen name="EchoGallery" component={GalleryScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen 
            name="BookEdit" 
            component={BookEditScreen} 
            options={{ 
              presentation: 'transparentModal',
              animation: 'fade',
              headerShown: false
            }} 
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}
