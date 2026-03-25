import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';

import HomeScreen from '../screens/HomeScreen';
import RankingScreen from '../screens/RankingScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ProfileScreen from '../screens/ProfileScreen';

import { COLORS } from '../constants/colors';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { isDarkMode } = useThemeStore();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { 
          backgroundColor: isDarkMode ? COLORS.background.dark : COLORS.background.light, 
          borderBottomColor: isDarkMode ? COLORS.border.dark : COLORS.border.light 
        },
        tabBarStyle: { 
          backgroundColor: isDarkMode ? COLORS.background.dark : COLORS.background.light, 
          borderTopColor: isDarkMode ? COLORS.border.dark : COLORS.border.light, 
          height: 60, 
          paddingBottom: 10 
        },
        tabBarActiveTintColor: isDarkMode ? COLORS.primary.dark : COLORS.primary.light,
        tabBarIcon: ({ color }) => {
          let iconName = 'book';
          if (route.name === 'Início') iconName = 'book';
          else if (route.name === 'Ranking') iconName = 'trophy';
          else if (route.name === 'Grupo') iconName = 'chatbubbles';
          else if (route.name === 'Perfil') iconName = 'person';
          
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Ranking" component={RankingScreen} />
      <Tab.Screen name="Grupo" component={GroupsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
