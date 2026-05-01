import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Reusable Skeleton Component
 * @param {Object} props
 */
export default function Skeleton({ width, height, borderRadius = 8, style, children }) {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

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
      className="bg-surfaceLayer-light dark:bg-surfaceLayer-dark"
      style={[
        {
          width,
          height,
          borderRadius,
          opacity: opacityAnim,
        },
        style
      ]}
    >
      {children}
    </Animated.View>
  );
}
