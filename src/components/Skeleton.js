import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';

/**
 * Reusable Skeleton Component
 * Provides a "pulsing" effect to indicate loading state.
 */
export default function Skeleton({ width, height, borderRadius = 8, style, children }) {
  const { isDarkMode } = useThemeStore();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  // Derive a solid, slightly lighter neutral color that matches the theme.
  // Using generic light/dark variants of the card backgrounds
  const baseColor = isDarkMode ? '#1E293B' : '#E2E8F0'; // Example: dark slate or light gray

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          opacity: opacityAnim,
        },
        style
      ]}
    >
      {children}
    </Animated.View>
  );
}
