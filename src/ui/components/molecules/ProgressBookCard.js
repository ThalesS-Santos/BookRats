import React, { memo } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity } from 'react-native';

import { COLORS } from '@constants/colors';
import BookCover from '@ui/components/atoms/BookCover';

import { useThemeStore } from '../../../store/useThemeStore';
import * as Haptics from '../../../utils/haptics';

/**
 * ProgressBookCard Molecule
 * A stylized card for the library gallery showing book cover and reading progress.
 *
 * @param {Object} book - Normalized book data.
 * @param {Function} onPress - Action when the card is pressed.
 * @param {Function} onLongPress - Action for quick update.
 */
const ProgressBookCard = memo(
  ({ book, onPress, onConfigPress, onCommunityPress }) => {
    const { isDarkMode } = useThemeStore();
    const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;

    const progress = Math.min(
      (book.currentPage / (book.totalPages || 1)) * 100,
      100,
    );

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(book);
    };

    return (
      <TouchableOpacity
        testID={`book-card-${book.id}`}
        activeOpacity={0.9}
        onPress={handlePress}
        className="mb-4">
        <View
          className="bg-card-light dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden h-32 flex-row"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 2 },
          }}>
          {/* Left: Small Cover Image */}
          <View className="w-20 bg-border-light dark:bg-border-dark items-center justify-center overflow-hidden">
            <BookCover
              source={book.thumbnail}
              recyclingKey={book.id}
              priority="low"
              style={{ width: '100%', height: '100%' }}
            />
          </View>

          {/* Right: Info Area */}
          <View className="flex-1 p-4 justify-between">
            <View>
              <Text
                className="text-text-light dark:text-text-dark text-lg font-serif font-bold"
                numberOfLines={1}>
                {book.title}
              </Text>
              <Text
                className="text-text-muted-light dark:text-text-muted-dark text-xs font-serif italic"
                numberOfLines={1}>
                {book.author || 'Autor Desconhecido'}
              </Text>
            </View>

            {/* Progress Section */}
            <View>
              <View className="h-1.5 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary dark:bg-primary-dark"
                  style={{ width: `${progress}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] font-mono font-bold">
                  {book.currentPage} / {book.totalPages || '??'} pgs
                </Text>
                <Text className="text-primary dark:text-primary-dark text-[10px] font-bold font-mono">
                  {Math.round(progress)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Right Edge: Quick Actions */}
          <View className="px-3 items-center justify-center border-l border-border-light/50 dark:border-border-dark/50 gap-y-2">
            <TouchableOpacity
              testID="community-btn"
              onPress={e => {
                e.stopPropagation();
                onCommunityPress?.(book);
              }}
              className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-full">
              <Ionicons name="share-social" size={18} color={accentColor} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="settings-btn"
              onPress={e => {
                e.stopPropagation();
                onConfigPress?.(book);
              }}
              className="bg-secondary/10 dark:border-secondary-dark/10 p-2 rounded-full">
              <Ionicons name="settings-outline" size={18} color={accentColor} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePress}
              className="bg-primary dark:bg-primary-dark p-2 rounded-full shadow-sm">
              <Ionicons name="play" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

ProgressBookCard.displayName = 'ProgressBookCard';

export default ProgressBookCard;
