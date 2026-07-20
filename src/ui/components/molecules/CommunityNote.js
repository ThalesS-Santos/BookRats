import React from 'react';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { UserNormalizationService } from '@core/services/UserNormalizationService';

import FastAvatar from '../atoms/FastAvatar';

/**
 * 🌟 Collaborative Social Component: Community Note (Echo)
 */
const CommunityNote = ({
  note,
  onClap,
  COLORS,
  isDarkMode,
  isFrontCard = false,
  isBackgroundCard = false,
}) => {
  const { userMetadata, pageLocation, text, reactions, userId, bookId } = note;
  const palette = {
    // Neutral warm palette: front card = card token, back card = background token
    // (subtly deeper) so the deck reads as one system, never navy/slate.
    card: isDarkMode
      ? isFrontCard
        ? '#121212'
        : '#000000'
      : isFrontCard
        ? '#F5F3E7'
        : '#FDFCF5',
    border: isDarkMode ? 'rgba(38, 38, 38, 0.9)' : 'rgba(229, 231, 235, 0.9)',
    chip: isDarkMode ? 'rgba(167, 201, 167, 0.12)' : 'rgba(91, 140, 90, 0.08)',
    action: isDarkMode ? 'rgba(0, 0, 0, 0.72)' : 'rgba(253, 252, 245, 0.92)',
  };

  if (isBackgroundCard) {
    return (
      <View
        style={[
          styles.card,
          styles.backgroundCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          // No elevation/shadow here: on Android an elevated view inside the
          // deck's animated-opacity wrapper renders the shadow as a solid dark
          // rectangle ("black box"). The 1px border already defines the card.
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
      ]}>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <FastAvatar
            source={UserNormalizationService.normalizeUserAvatar(userMetadata)}
            size={28}
            style={{ marginRight: 8 }}
          />
          <View>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-micro uppercase tracking-ultra font-bold mb-0.5 opacity-50">
              {'SOBRE ESTE LIVRO'}
            </Text>
            <View className="flex-row items-center">
              <Text
                className="text-text-light dark:text-text-dark font-bold text-tiny"
                numberOfLines={1}>
                {UserNormalizationService.normalizeDisplayName(userMetadata)}
              </Text>
              {userMetadata?.isInfluencer && (
                <Ionicons
                  name="star"
                  size={8}
                  color={COLORS?.primary?.dark || '#A7C9A7'}
                  style={{ marginLeft: 3 }}
                />
              )}
            </View>
          </View>
        </View>

        <View className="flex-row items-center">
          <Text className="text-primary dark:text-primary-dark font-mono text-mini uppercase font-bold mr-2 opacity-60">
            {`Pg. ${pageLocation}`}
          </Text>
          <View style={[styles.iconChip, { backgroundColor: palette.chip }]}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={12}
              color={
                isDarkMode
                  ? 'rgba(167, 201, 167, 0.6)'
                  : 'rgba(91, 140, 90, 0.6)'
              }
            />
          </View>
        </View>
      </View>

      <Text
        className="text-text-light dark:text-text-dark font-serif italic text-xs leading-4"
        numberOfLines={2}>
        {'"'}
        {text}
        {'"'}
      </Text>

      <View className="flex-row justify-end">
        <TouchableOpacity
          onPress={() => onClap(userId, bookId, note.id)}
          style={[
            styles.clapButton,
            {
              backgroundColor: palette.action,
              borderColor: isDarkMode ? '#262626' : '#E5E7EB',
            },
          ]}>
          <Text className="mr-1 text-[10px]">🐀</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark font-bold text-mini">
            {reactions?.claps || 0}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 288,
    height: 128,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  backgroundCard: {
    padding: 0,
  },
  iconChip: {
    padding: 4,
    borderRadius: 999,
  },
  clapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-end',
  },
});

export default React.memo(CommunityNote);
