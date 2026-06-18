import React, { useEffect, useCallback, useRef } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

import { COLORS } from '@constants/colors';
import { useMainStore } from '@core/store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TXT_NEW_ACHIEVEMENT = 'Nova Conquista!';
const TXT_CONGRATS_BADGE = 'Parabéns! Você desbloqueou uma nova medalha.';

const CONFETTI_COLORS = [
  '#4CAF50',
  '#2196F3',
  '#FFC107',
  '#E91E63',
  '#9C27B0',
  '#FF5722',
  '#00BCD4',
];
const PARTICLE_COUNT = 22;

const CONFETTI_PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  startX: (SCREEN_WIDTH / PARTICLE_COUNT) * i + (i % 4) * 12,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  duration: 1000 + (i * 55) % 700,
  delay: (i * 40) % 500,
  driftX: ((i % 9) - 4) * 22,
  size: 7 + (i % 5) * 2,
  isSquare: i % 3 !== 1,
}));

function ConfettiParticle({ startX, color, duration, delay, driftX, size, isSquare }) {
  const translateY = useSharedValue(-size);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);
  const anim = useRef({ translateY, translateX, opacity, rotate });

  useEffect(() => {
    anim.current.translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + size, { duration, easing: Easing.linear }),
    );
    anim.current.translateX.value = withDelay(
      delay,
      withTiming(driftX, { duration, easing: Easing.linear }),
    );
    anim.current.opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(duration - 400, withTiming(0, { duration: 400 })),
      ),
    );
    anim.current.rotate.value = withDelay(
      delay,
      withTiming(isSquare ? 720 : 360, { duration }),
    );
  }, [delay, driftX, duration, isSquare, size]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          backgroundColor: color,
          width: size,
          height: isSquare ? size : size * 0.55,
          borderRadius: isSquare ? 2 : size * 0.27,
        },
        animStyle,
      ]}
    />
  );
}

export default function BadgeUnlockPopup() {
  const lastUnlockedBadges = useMainStore(state => state.lastUnlockedBadges);
  const clearUnlockedBadges = useMainStore(state => state.clearUnlockedBadges);

  const currentBadge =
    lastUnlockedBadges.length > 0 ? lastUnlockedBadges[0] : null;

  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);
  const animRef = useRef({ translateY, opacity });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const hidePopup = useCallback(() => {
    animRef.current.translateY.value = withSpring(-200, { damping: 15 });
    animRef.current.opacity.value = withSpring(0, {}, () => {
      runOnJS(clearUnlockedBadges)();
    });
  }, [clearUnlockedBadges]);

  useEffect(() => {
    if (currentBadge) {
      animRef.current.translateY.value = withSpring(60, {
        damping: 12,
        stiffness: 90,
      });
      animRef.current.opacity.value = withSpring(1);

      const timer = setTimeout(() => {
        hidePopup();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [currentBadge, hidePopup]);

  if (!currentBadge) return null;

  return (
    <>
      <View pointerEvents="none" style={styles.confettiOverlay}>
        {CONFETTI_PARTICLES.map((p, i) => (
          <ConfettiParticle key={i} {...p} />
        ))}
      </View>
      <Animated.View
        style={[styles.container, animatedStyle]}
        className="bg-white dark:bg-card-dark shadow-2xl rounded-3xl border border-border-light dark:border-border-dark">
        <View style={styles.content}>
          <View
            style={styles.iconContainer}
            className="bg-primary-light/10 dark:bg-primary-dark/20">
            <Ionicons
              name={currentBadge.icon}
              size={32}
              color={COLORS.primary.light}
            />
          </View>

          <View style={styles.textContainer}>
            <Text className="text-primary-light dark:text-primary-dark font-bold text-xs tracking-widest uppercase mb-1">
              {TXT_NEW_ACHIEVEMENT}
            </Text>
            <Text className="text-gray-900 dark:text-white font-bold text-lg">
              {currentBadge.title}
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-sm">
              {TXT_CONGRATS_BADGE}
            </Text>
          </View>

          <TouchableOpacity
            testID="close-btn"
            onPress={hidePopup}
            style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  confettiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
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
  },
});
