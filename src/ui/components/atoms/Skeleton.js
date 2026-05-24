import React, { useEffect, useState } from 'react';

import { Animated, Easing } from 'react-native';

/**
 * Reusable Skeleton Component
 * @param {Object} props
 */
export default function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
  children,
  testID,
}) {
  const [opacityAnim] = useState(() => new Animated.Value(0.3));

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
        }),
      ]),
    ).start();
  }, [opacityAnim]);

  return (
    <Animated.View
      testID={testID}
      className="bg-surfaceLayer-light dark:bg-surfaceLayer-dark"
      style={[
        {
          width,
          height,
          borderRadius,
          opacity: opacityAnim,
        },
        style,
      ]}>
      {children}
    </Animated.View>
  );
}
