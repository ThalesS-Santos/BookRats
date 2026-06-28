import React from 'react';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity } from 'react-native';

import { COLORS } from '@constants/colors';

import { useThemeStore } from '../../../store/useThemeStore';
import * as Haptics from '../../../utils/haptics';

const FILTER_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'unlocked', label: 'Conquistados' },
  { id: 'locked', label: 'Bloqueados' },
  { id: 'recent', label: 'Recentes' },
];

export default function TrophyWallSection({
  badgeFilter,
  badgeLimit,
  processedBadges,
  visibleBadges,
  selectFilter,
  showMore,
  showLess,
  showPopup,
}) {
  const { isDarkMode } = useThemeStore();
  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;

  return (
    <View className="mb-10 bg-card-light/40 dark:bg-card-dark/40 p-4 rounded-2xl border border-border-light dark:border-border-dark -mt-2">
      {/* Filter Pills */}
      <View className="flex-row justify-between mb-4 bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-border-light dark:border-border-dark">
        {FILTER_TABS.map(tab => {
          const isActive = badgeFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                selectFilter(tab.id);
              }}
              className={`py-2 rounded-xl flex-1 items-center ${isActive ? 'bg-primary dark:bg-primary-dark' : ''}`}>
              <Text
                className={`text-[10px] font-bold ${isActive ? 'text-white font-serif' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Badge Grid */}
      {visibleBadges.length > 0 ? (
        <View className="flex-row flex-wrap justify-between">
          {visibleBadges.map(badge => (
            <TouchableOpacity
              key={badge.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                showPopup({
                  title: badge.title,
                  message: `Missão: ${badge.mission}`,
                  type: badge.isUnlocked ? 'success' : 'info',
                });
              }}
              className={`p-3 rounded-xl border items-center mb-2 w-[31%] ${
                badge.isUnlocked
                  ? 'bg-card-light dark:bg-card-dark border-primary/20 dark:border-primary-dark/20'
                  : 'bg-card-light dark:bg-card-dark border-dashed border-gray-400 dark:border-gray-600 opacity-40'
              }`}>
              <View className="relative">
                <Ionicons
                  name={badge.icon}
                  size={28}
                  color={badge.isUnlocked ? '#D97706' : '#4B5563'}
                />
                {!badge.isUnlocked && (
                  <View className="absolute -top-1 -right-1 bg-background-light dark:bg-background-dark rounded-full p-0.5">
                    <Ionicons name="lock-closed" size={10} color="#EF4444" />
                  </View>
                )}
              </View>
              <Text
                className={`text-[10px] font-bold mt-1 text-center ${badge.isUnlocked ? 'text-text-light dark:text-text-dark font-serif' : 'text-text-muted-light dark:text-text-muted-dark'}`}
                numberOfLines={1}>
                {badge.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View className="py-6 items-center">
          <Text className="text-text-muted-light dark:text-text-muted-dark text-xs italic">
            Nenhum troféu nesta categoria.
          </Text>
        </View>
      )}

      {/* Botões Mais / Menos */}
      <View className="flex-row justify-between mt-2">
        {processedBadges.length > badgeLimit && (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              showMore();
            }}
            className="flex-1 p-4 rounded-xl border border-primary/30 dark:border-primary-dark/30 bg-primary/5 dark:bg-primary-dark/5 flex-row justify-center items-center mr-1">
            <Ionicons
              name="chevron-down"
              size={16}
              color={accentColor}
              style={{ marginRight: 6 }}
            />
            <Text className="text-primary dark:text-primary-dark font-bold text-xs uppercase tracking-wider">
              Mais Troféus
            </Text>
          </TouchableOpacity>
        )}
        {badgeLimit > 9 && (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              showLess();
            }}
            className="flex-1 p-4 rounded-xl border border-gray-400/30 bg-gray-400/5 flex-row justify-center items-center ml-1">
            <Ionicons
              name="chevron-up"
              size={16}
              color={isDarkMode ? '#A1A1AA' : '#71717A'}
              style={{ marginRight: 6 }}
            />
            <Text className="text-text-muted-light dark:text-text-muted-dark font-bold text-xs uppercase tracking-wider">
              Menos Troféus
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
