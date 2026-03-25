import React, { useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { 
  useAnimatedScrollHandler, 
  useSharedValue, 
  useAnimatedStyle, 
  interpolate, 
  Extrapolation,
  useDerivedValue
} from 'react-native-reanimated';
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

const BookFlipPage = ({ children, index, scrollOffset }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const input = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    // Page Rotation: 
    // From left: 90 -> 0
    // To right: 0 -> -90
    const rotateY = interpolate(
      scrollOffset.value,
      input,
      [90, 0, -90],
      Extrapolation.CLAMP
    );

    // X Translation to keep pivot at spine
    const translateX = interpolate(
      scrollOffset.value,
      input,
      [SCREEN_WIDTH / 2, 0, -SCREEN_WIDTH / 2],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollOffset.value,
      input,
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [
        { perspective: 1200 },
        { translateX },
        { rotateY: `${rotateY}deg` },
        { translateX: -translateX },
      ],
    };
  });

  return (
    <Animated.View style={[styles.pageContainer, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

export default function TabNavigator() {
  const { isDarkMode } = useThemeStore();
  const scrollRef = useRef(null);
  const scrollOffset = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.x;
    },
  });

  // Sync Tab Bar active state
  useDerivedValue(() => {
    const index = Math.round(scrollOffset.value / SCREEN_WIDTH);
    // Note: We can't call setState in a worklet, so we update the UI via a listener or just rely on the UI being driven by shared values.
    // For simplicity, we'll use a standard ScrollView listener on the JS side for the index.
  });

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
      
      {/* Animated Pager with Book Flip */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        style={styles.pager}
      >
        {TABS.map((tab, index) => (
          <BookFlipPage key={tab.name} index={index} scrollOffset={scrollOffset}>
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
              <Animated.Text style={[styles.tabLabel, { color }]}>
                {tab.name}
              </Animated.Text>
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
