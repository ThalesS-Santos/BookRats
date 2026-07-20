import React, { useEffect, useRef } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';

const MAX_HEIGHT = 110;

function Bar({ pages, maxPages, label, isDarkMode, delay, accentColor }) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const target = maxPages > 0 ? (pages / maxPages) * MAX_HEIGHT : 0;
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: target,
        duration: 550,
        delay,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pages, maxPages, delay, heightAnim, opacityAnim]);

  const isEmpty = pages === 0;
  const barColor = isEmpty ? (isDarkMode ? '#262626' : '#E5E7EB') : accentColor;
  const labelColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const valueColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  return (
    <Animated.View style={[styles.barWrapper, { opacity: opacityAnim }]}>
      {!isEmpty && (
        <Text style={[styles.valueLabel, { color: valueColor }]}>
          {pages >= 1000 ? `${(pages / 1000).toFixed(1)}K` : pages}
        </Text>
      )}
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.bar,
            {
              height: heightAnim,
              backgroundColor: barColor,
              borderRadius: isEmpty ? 4 : 6,
            },
          ]}
        />
      </View>
      <Text style={[styles.barLabel, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

function BarChart({ data, isDarkMode, accentColor }) {
  const maxPages = Math.max(...(data || []).map(d => d.pages), 1);

  if (!data || data.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {data.map((item, i) => (
        <Bar
          key={`${item.label}-${i}`}
          pages={item.pages}
          maxPages={maxPages}
          label={item.shortLabel || item.label}
          isDarkMode={isDarkMode}
          delay={i * 40}
          accentColor={accentColor}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingRight: 4,
    gap: 6,
  },
  barWrapper: {
    alignItems: 'center',
    width: 36,
  },
  valueLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 3,
  },
  barTrack: {
    width: 28,
    height: MAX_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default React.memo(BarChart);
