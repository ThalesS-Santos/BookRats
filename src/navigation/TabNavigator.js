import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';
import { COLORS } from '../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  // Opacity: Creates a slight fade effect while swiping left/right
  const opacity = scrollX.interpolate({
    inputRange: [
        (index - 0.9) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 0.9) * SCREEN_WIDTH,
    ],
    outputRange: [0.3, 1, 0.3],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View 
      collapsable={false}
      style={[
        styles.pageContainer, 
        { 
          opacity,
        }
      ]}
    >
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {children}
      </SafeAreaView>
    </Animated.View>
  );
};

export default function TabNavigator({ navigation, route }) {
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
          keyboardShouldPersistTaps="handled"
        >
          {TABS.map((tab, index) => (
            <BookFlipPage 
              key={tab.name} 
              index={index} 
              scrollX={scrollX}
            >
              <tab.component navigation={navigation} route={route} />
            </BookFlipPage>
          ))}
        </Animated.ScrollView>

      {/* Custom Bottom Tab Bar */}
      <View style={[
        styles.tabBarContainer,
        { 
          backgroundColor: isDarkMode ? COLORS.background.dark : COLORS.background.light,
          borderTopColor: isDarkMode ? COLORS.border.dark : '#F1F1E6', // Subtler border for Light mode
          borderTopWidth: 1.5,
        }
      ]}>
        <SafeAreaView edges={['bottom']} style={styles.tabBar}>
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
        </SafeAreaView>
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
  tabBarContainer: {
    paddingBottom: 0,
    // Use a very subtle top border instead of a shadow to avoid the "boxy" look
    borderTopWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
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
