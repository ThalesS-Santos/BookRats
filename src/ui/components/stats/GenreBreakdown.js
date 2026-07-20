import React, { useEffect, useRef } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';

// 80 label + 20 count + 16 gaps + 32 screen padding + 36 section padding
const MAX_BAR_WIDTH = Dimensions.get('window').width - 184;

const GENRE_COLORS = [
  '#5B8C5A',
  '#2196F3',
  '#FF9800',
  '#9C27B0',
  '#E91E63',
  '#00BCD4',
  '#795548',
];

function GenreBar({ genre, count, maxCount, isDarkMode, index, delay }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const target = maxCount > 0 ? (count / maxCount) * MAX_BAR_WIDTH : 0;
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: target,
        duration: 600,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [count, maxCount, delay, widthAnim, opacityAnim]);

  const color = GENRE_COLORS[index % GENRE_COLORS.length];
  const labelColor = isDarkMode ? '#E0E0E0' : '#1A1A1A';
  const countColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const trackColor = isDarkMode ? '#262626' : '#E5E7EB';

  return (
    <Animated.View style={[styles.row, { opacity: opacityAnim }]}>
      <Text style={[styles.genreName, { color: labelColor }]} numberOfLines={1}>
        {genre}
      </Text>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[styles.bar, { width: widthAnim, backgroundColor: color }]}
        />
      </View>
      <Text style={[styles.count, { color: countColor }]}>{count}</Text>
    </Animated.View>
  );
}

function GenreBreakdown({ data, isDarkMode }) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <View style={styles.container}>
      {data.map((item, i) => (
        <GenreBar
          key={item.genre}
          genre={item.genre}
          count={item.count}
          maxCount={maxCount}
          isDarkMode={isDarkMode}
          index={i}
          delay={i * 60}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genreName: {
    width: 80,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  count: {
    width: 20,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
});

export default React.memo(GenreBreakdown);
