import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';
import { COLORS } from '../constants/colors';

import HomeScreen from '../screens/HomeScreen';
import RankingScreen from '../screens/RankingScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = [
  { name: 'Início', icon: 'book', component: HomeScreen },
  { name: 'Ranking', icon: 'trophy', component: RankingScreen },
  { name: 'Grupo', icon: 'chatbubbles', component: GroupsScreen },
  { name: 'Perfil', icon: 'person', component: ProfileScreen },
];

const BookFlipPage = ({ children, index, scrollX }) => {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const rotateY = scrollX.interpolate({
    inputRange,
    outputRange: ['90deg', '0deg', '-90deg'],
    extrapolate: 'clamp',
  });

  const translateX = scrollX.interpolate({
    inputRange,
    outputRange: [SCREEN_WIDTH / 2, 0, -SCREEN_WIDTH / 2],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[
      styles.pageContainer, 
      { 
        opacity,
        transform: [
          { perspective: 1200 },
          { translateX },
          { rotateY },
          { translateX: translateX.interpolate({
            inputRange: [-1000, 1000],
            outputRange: [1000, -1000] // Negates the translation for the center pivot
          })},
        ] 
      }
    ]}>
      {children}
    </Animated.View>
  );
};

export default function TabNavigator() {
  const { isDarkMode } = useThemeStore();
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const onTabPress = (index) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setActiveIndex(index);
  };

  const handleScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? COLORS.background.dark : COLORS.background.light }]}>
      
      {/* Animated ScrollView based Pager (Standard Animated API) */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        style={styles.pager}
      >
        {TABS.map((tab, index) => (
          <BookFlipPage key={tab.name} index={index} scrollX={scrollX}>
            <tab.component />
          </BookFlipPage>
        ))}
      </Animated.ScrollView>

      {/* Custom Bottom Tab Bar */}
      <View style={[
        styles.tabBar, 
        { 
          backgroundColor: isDarkMode ? COLORS.background.dark : COLORS.background.light,
          borderTopColor: isDarkMode ? COLORS.border.dark : COLORS.border.light 
        }
      ]}>
        {TABS.map((tab, index) => {
          const isActive = activeIndex === index;
          const color = isActive 
            ? (isDarkMode ? COLORS.primary.dark : COLORS.primary.light)
            : (isDarkMode ? '#64748B' : '#94A3B8');

          return (
            <TouchableOpacity 
              key={tab.name} 
              onPress={() => onTabPress(index)}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon} size={24} color={color} />
              <Text style={[styles.tabLabel, { color }]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    backfaceVisibility: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    height: 65,
    borderTopWidth: 1,
    paddingBottom: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold',
  },
});
