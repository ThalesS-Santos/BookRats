import React, { useMemo } from 'react';

import { View, Text, StyleSheet } from 'react-native';

import { DAYS_PT } from '@core/utils/statsCompute';

const CELL = 12;
const GAP = 3;
const WEEKS = 8;

function getHeatColor(intensity, isDarkMode) {
  if (intensity === 0) return isDarkMode ? '#1E1E1E' : '#F3F4F6';
  if (intensity < 0.2) return isDarkMode ? '#1a3520' : '#D1FAE5';
  if (intensity < 0.45) return isDarkMode ? '#1f5c2e' : '#6EE7B7';
  if (intensity < 0.72) return isDarkMode ? '#2d7a3c' : '#10B981';
  return isDarkMode ? '#4ade80' : '#059669';
}

function HeatCalendar({ data, isDarkMode }) {
  const { weeks, maxPages } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const totalDays = WEEKS * 7;

    // Build flat array of days, oldest first
    const days = Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (totalDays - 1 - i));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      return { date: d, key, pages: (data || {})[key] || 0, dow: d.getDay() };
    });

    const max = Math.max(...days.map(d => d.pages), 1);

    // Transpose into 7 rows × WEEKS columns so cells go Sun..Sat down each column
    // weekIndex = Math.floor(i / 7), dowIndex = i % 7
    const rows = Array.from({ length: 7 }, (_, dow) =>
      Array.from({ length: WEEKS }, (__, wk) => days[wk * 7 + dow]),
    );

    return { weeks: rows, maxPages: max };
  }, [data]);

  const labelColor = isDarkMode ? '#4B5563' : '#9CA3AF';

  return (
    <View style={styles.container}>
      {weeks.map((row, dowIdx) => (
        <View key={dowIdx} style={styles.row}>
          <Text style={[styles.rowLabel, { color: labelColor }]}>
            {dowIdx % 2 === 0 ? DAYS_PT[dowIdx][0] : ''}
          </Text>
          {row.map((cell, wkIdx) => {
            const intensity = cell ? cell.pages / maxPages : 0;
            return (
              <View
                key={wkIdx}
                style={[
                  styles.cell,
                  { backgroundColor: getHeatColor(intensity, isDarkMode) },
                ]}
              />
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        <Text style={[styles.legendLabel, { color: labelColor }]}>Menos</Text>
        {[0, 0.15, 0.4, 0.7, 1].map(v => (
          <View
            key={v}
            style={[styles.legendCell, { backgroundColor: getHeatColor(v, isDarkMode) }]}
          />
        ))}
        <Text style={[styles.legendLabel, { color: labelColor }]}>Mais</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GAP,
  },
  rowLabel: {
    width: 20,
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'right',
    marginRight: 4,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
    marginRight: GAP,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 24,
    gap: 3,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginHorizontal: 2,
  },
});

export default React.memo(HeatCalendar);
