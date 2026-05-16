import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay,
  withSequence,
  runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useMainStore } from '@core/store';
import { COLORS } from '@constants/colors';

const { width } = Dimensions.get('window');

/**
 * BadgeUnlockPopup
 * A premium animated popup that shows when a new achievement is unlocked.
 */
export default function BadgeUnlockPopup() {
  const lastUnlockedBadges = useMainStore(state => state.lastUnlockedBadges);
  const clearUnlockedBadges = useMainStore(state => state.clearUnlockedBadges);
  
  const currentBadge = lastUnlockedBadges.length > 0 ? lastUnlockedBadges[0] : null;

  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const hidePopup = () => {
    translateY.value = withSpring(-200, { damping: 15 });
    opacity.value = withSpring(0, {}, () => {
      runOnJS(clearUnlockedBadges)();
    });
  };

  useEffect(() => {
    if (currentBadge) {
      // Entry Animation
      translateY.value = withSpring(60, { damping: 12, stiffness: 90 });
      opacity.value = withSpring(1);

      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        hidePopup();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [currentBadge]);

  if (!currentBadge) return null;

  return (
    <Animated.View 
      style={[styles.container, animatedStyle]}
      className="bg-white dark:bg-card-dark shadow-2xl rounded-3xl border border-border-light dark:border-border-dark"
    >
      <View style={styles.content}>
        <View style={styles.iconContainer} className="bg-primary-light/10 dark:bg-primary-dark/20">
          <Ionicons name={currentBadge.icon} size={32} color={COLORS.primary.light} />
        </View>
        
        <View style={styles.textContainer}>
          <Text className="text-primary-light dark:text-primary-dark font-bold text-xs tracking-widest uppercase mb-1">
            Nova Conquista!
          </Text>
          <Text className="text-gray-900 dark:text-white font-bold text-lg">
            {currentBadge.title}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-sm">
            Parabéns! Você desbloqueou uma nova medalha.
          </Text>
        </View>

        <TouchableOpacity onPress={hidePopup} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    padding: 16,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  closeButton: {
    padding: 4,
  }
});
