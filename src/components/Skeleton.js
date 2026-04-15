import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Reusable Skeleton Component
 * Provides a "pulsing" effect to indicate loading state.
 */
export default function Skeleton({ width, height, borderRadius = 8, style, children }) {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  // Background color exactly as requested: #161E31 (lighter than dark_blue)
  const baseColor = '#161E31';

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 400,
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
