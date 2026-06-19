import React from 'react';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

import { formatDuration } from '@core/utils/statsCompute';

const METRICS = [
  { key: 'avgDuration', icon: 'time-outline', label: 'Sessão Média', format: formatDuration },
  { key: 'maxDuration', icon: 'trophy-outline', label: 'Recorde', format: formatDuration },
  { key: 'totalSessions', icon: 'book-outline', label: 'Sessões Total', format: n => String(n) },
];

function MetricCell({ icon, label, value, accentColor, isDarkMode }) {
  const bg = isDarkMode ? '#1a1a1a' : '#FFFFFF';
  const border = isDarkMode ? '#262626' : '#E5E7EB';
  const valueColor = isDarkMode ? '#E0E0E0' : '#1A1A1A';
  const labelColor = isDarkMode ? '#6B7280' : '#9CA3AF';

  return (
    <View style={[styles.cell, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}1A` }]}>
        <Ionicons name={icon} size={16} color={accentColor} />
      </View>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

function SessionInsights({ metrics, accentColor, isDarkMode }) {
  if (!metrics || metrics.totalSessions === 0) return null;

  return (
    <View style={styles.row}>
      {METRICS.map(m => (
        <MetricCell
          key={m.key}
          icon={m.icon}
          label={m.label}
          value={m.format(metrics[m.key])}
          accentColor={accentColor}
          isDarkMode={isDarkMode}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default React.memo(SessionInsights);
