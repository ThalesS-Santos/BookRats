import { interpolate, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

/**
 * PageFlipInterpolator
 * Logic to be used in useAnimatedStyle for screen transitions.
 * @param {SharedValue} progress - 0 to 1 transition progress
 * @param {boolean} isEntering - Whether the screen is coming into view
 * @param {number} direction - 1 (left to right) or -1 (right to left)
 */
export const getPageFlipStyles = (progress, isEntering, direction = 1) => {
  'worklet';
  
  const perspective = 1200;
  const PAGE_WIDTH = 400; // Expected screen width roughly

  // Rotation: 
  // Entering: 90 to 0
  // Exiting: 0 to -90
  const rotation = isEntering 
    ? interpolate(progress.value, [0, 1], [direction * 90, 0])
    : interpolate(progress.value, [0, 1], [0, -direction * 90]);

  // Opacity: Fade in/out at the start/end
  const opacity = interpolate(progress.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);

  // Pivot Point: The center spine
  // Need to shift the screen so it rotates around the center
  const translateX = isEntering 
    ? interpolate(progress.value, [0, 1], [PAGE_WIDTH / 2, 0])
    : interpolate(progress.value, [0, 1], [0, -PAGE_WIDTH / 2]);

  return {
    opacity,
    transform: [
      { perspective },
      { translateX },
      { rotateY: `${rotation}deg` },
      { translateX: isEntering ? -translateX : translateX },
    ],
  };
};

export const COLORS = {
    PAGE: '#F0EAD6',
    COVER: '#EBCB8B',
    BG: '#BF616A',
};
