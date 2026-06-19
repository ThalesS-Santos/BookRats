import React, { useEffect, useRef } from 'react';

import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const SEGMENTS = [
  { key: 'reading', label: 'Lendo', color: '#5B8C5A' },
  { key: 'read', label: 'Lidos', color: '#2196F3' },
  { key: 'wantToRead', label: 'Quero Ler', color: '#FF9800' },
  { key: 'dropped', label: 'Abandonados', color: '#EF4444' },
  { key: 'bought', label: 'Comprados', color: '#8B5CF6' },
  { key: 'recommended', label: 'Indicados', color: '#EC4899' },
];

function AnimatedSegment({ flex, color, delay, isFirst, isLast }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 500,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [flex, delay, scaleAnim]);

  const borderRadius = {
    borderTopLeftRadius: isFirst ? 8 : 0,
    borderBottomLeftRadius: isFirst ? 8 : 0,
    borderTopRightRadius: isLast ? 8 : 0,
    borderBottomRightRadius: isLast ? 8 : 0,
  };

  return (
    <Animated.View
      style={[
        styles.segment,
        borderRadius,
        { flex, backgroundColor: color, transform: [{ scaleX: scaleAnim }] },
      ]}
    />
  );
}

function LibrarySnapshot({ snapshot, isDarkMode }) {
  const active = SEGMENTS.filter(s => (snapshot[s.key] || 0) > 0);
  const total = active.reduce((sum, s) => sum + snapshot[s.key], 0);
  const textColor = isDarkMode ? '#E0E0E0' : '#1A1A1A';
  const mutedColor = isDarkMode ? '#6B7280' : '#9CA3AF';

  if (total === 0) {
    return (
      <Text style={[styles.empty, { color: mutedColor }]}>
        Adicione livros à biblioteca para ver a distribuição.
      </Text>
    );
  }

  return (
    <View>
      <View style={styles.bar}>
        {active.map((seg, i) => (
          <AnimatedSegment
            key={seg.key}
            flex={snapshot[seg.key]}
            color={seg.color}
            delay={i * 80}
            isFirst={i === 0}
            isLast={i === active.length - 1}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {active.map(seg => (
          <View key={seg.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text style={[styles.legendCount, { color: textColor }]}>{snapshot[seg.key]}</Text>
            <Text style={[styles.legendLabel, { color: mutedColor }]}>{seg.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.total, { color: mutedColor }]}>{total} livros na biblioteca</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    gap: 2,
  },
  segment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  total: {
    fontSize: 11,
    marginTop: 10,
  },
  empty: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
});

export default React.memo(LibrarySnapshot);
