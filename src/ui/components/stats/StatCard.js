import React, { useEffect, useRef, useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

import { formatNumber } from '@core/utils/statsCompute';

function StatCard({
  icon,
  label,
  rawValue,
  displayValue,
  unit,
  accentColor,
  isDarkMode,
}) {
  const [counted, setCounted] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, scaleAnim]);

  useEffect(() => {
    const target = typeof rawValue === 'number' ? rawValue : 0;
    const anim = new Animated.Value(0);
    animRef.current = anim;
    const id = anim.addListener(({ value }) => {
      setCounted(Math.round(value));
    });
    Animated.timing(anim, {
      toValue: target,
      duration: target > 0 ? 900 : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      anim.removeListener(id);
      animRef.current = null;
    };
  }, [rawValue]);

  const cardBg = isDarkMode ? '#121212' : '#F5F3E7';
  const labelColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const valueColor = isDarkMode ? '#E0E0E0' : '#1A1A1A';

  const resolvedDisplay =
    displayValue !== undefined ? displayValue : formatNumber(counted);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: isDarkMode ? '#262626' : '#E5E7EB',
        },
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}1A` }]}>
        <Ionicons name={icon} size={20} color={accentColor} />
      </View>
      <Text style={[styles.value, { color: valueColor }]}>
        {resolvedDisplay}
      </Text>
      {unit ? (
        <Text style={[styles.unit, { color: accentColor }]}>{unit}</Text>
      ) : null}
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
    minHeight: 110,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: -4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default React.memo(StatCard);
