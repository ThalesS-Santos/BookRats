import './global.css';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';

import HomeScreen from './src/screens/HomeScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AddBookScreen from './src/screens/AddBookScreen';
import TimerScreen from './src/screens/TimerScreen';
import { useThemeStore } from './src/store/useThemeStore';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const BookLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FDFCF5',
    card: '#FDFCF5',
    text: '#1A1A1A',
    primary: '#5B8C5A',
    border: '#E5E7EB',
  },
};

const BookDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    card: '#000000',
    text: '#E0E0E0',
    primary: '#A7C9A7',
    border: '#262626',
  },
};

function TabNavigator() {
  const { isDarkMode } = useThemeStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: isDarkMode ? '#000000' : '#FDFCF5',
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#262626' : '#E5E7EB',
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
        },
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#000000' : '#FDFCF5',
          borderTopColor: isDarkMode ? '#262626' : '#E5E7EB',
          height: 60,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: isDarkMode ? '#A7C9A7' : '#5B8C5A',
        tabBarInactiveTintColor: isDarkMode ? '#525252' : '#9CA3AF',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Início') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Grupos') {
            iconName = focused ? 'library' : 'library-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Grupos" component={GroupsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { isDarkMode } = useThemeStore();
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavigationContainer theme={isDarkMode ? BookDarkTheme : BookLightTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="AddBook" component={AddBookScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Timer" component={TimerScreen} options={{ presentation: 'fullScreenModal' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
