import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';
import { COLORS } from '../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import RankingScreen from '../screens/RankingScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createMaterialTopTabNavigator();

const TABS = [
  { name: 'Início', icon: 'book', component: HomeScreen },
  { name: 'Ranking', icon: 'trophy', component: RankingScreen },
  { name: 'Grupo', icon: 'chatbubbles', component: GroupsScreen },
  { name: 'Perfil', icon: 'person', component: ProfileScreen },
];

function CustomTabBar({ state, descriptors, navigation, isDarkMode }) {
  const activeColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;
  const inactiveColor = isDarkMode ? '#64748B' : '#94A3B8';

  return (
    <View style={[
      styles.tabBarContainer,
      { 
        backgroundColor: isDarkMode ? COLORS.background.dark : COLORS.background.light,
        borderTopColor: isDarkMode ? COLORS.border.dark : '#F1F1E6',
      }
    ]}>
      <SafeAreaView edges={['bottom']} style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tabConfig = TABS[index];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = isFocused ? activeColor : inactiveColor;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Ionicons name={tabConfig.icon} size={24} color={color} />
              <Text style={[styles.tabLabel, { color }]}>
                {tabConfig.name}
              </Text>
              {isFocused && (
                <View style={[styles.indicator, { backgroundColor: COLORS.neon_green }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </SafeAreaView>
    </View>
  );
}

export default function TabNavigator({ navigation, route }) {
  const { isDarkMode } = useThemeStore();

  // 🛰️ Tab Switch Listener (Handles navigation from child screens via param)
  useEffect(() => {
    const targetIdx = route.params?.tabIndex;
    if (typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < TABS.length) {
      const routeName = TABS[targetIdx].name;
      navigation.navigate(routeName);
      // Clear param to avoid re-triggering
      navigation.setParams({ tabIndex: undefined });
    }
  }, [route.params?.tabIndex]);

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <CustomTabBar {...props} isDarkMode={isDarkMode} />}
      initialRouteName="Início"
      screenOptions={{
        tabBarShowLabel: true,
        animationEnabled: true,
        swipeEnabled: true,
        lazy: true,
        tabBarPressColor: 'transparent',
        tabBarIndicatorStyle: {
          backgroundColor: COLORS.neon_green,
          height: 3,
          bottom: 0,
        },
        sceneContainerStyle: { 
          backgroundColor: COLORS.dark_blue 
        },
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen 
          key={tab.name} 
          name={tab.name} 
          component={tab.component} 
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    borderTopWidth: 1.5,
  },
  tabBar: {
    flexDirection: 'row',
    height: 65,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold',
  },
  indicator: {
    position: 'absolute',
    top: -1.5, // Align with the top border
    width: '60%',
    height: 3,
    borderRadius: 2,
  }
});
