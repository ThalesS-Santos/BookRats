import React, { useState, useMemo } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

import { ALL_BADGES } from '@constants/badges';
import { COLORS } from '@constants/colors';
import { BOOK_STATUS } from '@core/constants/bookStatus';
import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { BookLoader, FastAvatar } from '@ui/components';
import TrophyWallSection from '@ui/components/organisms/TrophyWallSection';
import { useBadgeWall } from '@ui/hooks/useBadgeWall';
import { useUserProfile } from '@ui/hooks/useUserProfile';

import { usePopupStore } from '../../store/usePopupStore';
import { useSocialStore } from '../../store/useSocialStore';
import { useThemeStore } from '../../store/useThemeStore';
import * as Haptics from '../../utils/haptics';

const formatDuration = totalSeconds => {
  if (!totalSeconds) return '---';
  const hrs = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
};

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { isDarkMode } = useThemeStore();
  const { removeFriend } = useSocialStore();
  const { showPopup } = usePopupStore();

  const {
    loading,
    friend,
    books,
    notes,
    totalPagesRead,
    streak: currentStreak,
    completedBooks: completedBooksCount,
  } = useUserProfile(userId);

  const readingBooksCount = books.filter(
    b => b.status === BOOK_STATUS.READING,
  ).length;

  const userData = useMemo(
    () => ({
      streak: currentStreak,
      totalPagesRead,
      completedBooks: completedBooksCount,
      readingBooks: readingBooksCount,
    }),
    [currentStreak, totalPagesRead, completedBooksCount, readingBooksCount],
  );

  const [showTrophyWall, setShowTrophyWall] = useState(false);

  // 🎯 Trophy-wall derived state centralized in a hook (Etapa 14). No persisted
  // unlock map for other users, so ordering falls back to badge index.
  const {
    badgeFilter,
    badgeLimit,
    totalUnlocked,
    processedBadges,
    visibleBadges,
    selectFilter,
    showMore,
    showLess,
  } = useBadgeWall(userData);

  const handleRemoveFriend = () => {
    showPopup({
      title: 'Desfazer Amizade',
      message: `Tem certeza que deseja desfazer a amizade com ${friend?.username || friend?.email.split('@')[0]}?`,
      type: 'confirm',
      onConfirm: async () => {
        await removeFriend(userId);
        navigation.goBack();
      },
    });
  };

  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;

  if (loading) {
    return <BookLoader isVisible={loading} />;
  }

  if (!friend) return null;

  return (
    <ScrollView
      className="flex-1 bg-background-light dark:bg-background-dark p-6"
      showsVerticalScrollIndicator={false}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="mt-12 mb-4 w-10 h-10 items-center justify-center rounded-full bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <Ionicons
          name="chevron-back"
          size={24}
          color={isDarkMode ? '#E0E0E0' : '#1A1A1A'}
        />
      </TouchableOpacity>

      {/* Profile Header */}
      <View className="items-center mt-12 mb-10">
        <FastAvatar
          source={UserNormalizationService.normalizeUserAvatar(friend)}
          size={100}
          style={{ marginBottom: 16 }}
          border
        />
        <Text
          className="text-text-light dark:text-text-dark text-3xl font-serif font-bold"
          numberOfLines={1}>
          {UserNormalizationService.normalizeDisplayName(friend)}
        </Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">
          {friend.isOnline ? '🟢 Online' : '⚪ Offline'}
        </Text>
      </View>

      {/* Stats Cards Row 1 */}
      <View className="flex-row justify-between mb-4">
        <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex-1 mr-2 items-center">
          <Text className="text-primary dark:text-primary-dark font-bold text-2xl">
            {totalPagesRead}
          </Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase">
            {'Páginas Totais'}
          </Text>
        </View>
        <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex-1 ml-2 items-center">
          <Text style={{ color: COLORS.streak }} className="font-bold text-2xl">
            {currentStreak}🔥
          </Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase">
            {'Streak Atual'}
          </Text>
        </View>
      </View>

      {/* Stats Cards Row 2 (Performance Metrics) */}
      <View className="flex-row justify-between mb-8">
        <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex-1 mr-2 items-center">
          <Text className="text-text-light dark:text-text-dark font-bold text-xl">
            {friend.total_books_completed || 0}
          </Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase font-bold">
            {'Livros Lidos'}
          </Text>
        </View>
        <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex-1 ml-2 items-center">
          <Text className="text-primary dark:text-primary-dark font-bold text-xl">
            {formatDuration(friend.max_reading_session)}
          </Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase font-bold text-center">
            {'Recorde de Fôlego'}
          </Text>
        </View>
      </View>

      {/* Botão Expandível - Troféus do Usuário */}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowTrophyWall(!showTrophyWall);
        }}
        className="flex-row items-center justify-between p-5 bg-card-light dark:bg-card-dark rounded-2xl mb-4 border border-border-light dark:border-border-dark">
        <View className="flex-row items-center">
          <View className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-lg mr-4">
            <Ionicons name="trophy-outline" size={22} color={accentColor} />
          </View>
          <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg">
            {'Troféus'}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-text-muted-light dark:text-text-muted-dark font-mono font-bold text-lg mr-2">
            {totalUnlocked} / {ALL_BADGES.length}
          </Text>
          <Ionicons
            name={showTrophyWall ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={accentColor}
          />
        </View>
      </TouchableOpacity>

      {/* Seção Expandida do Mural de Troféus */}
      {showTrophyWall && (
        <TrophyWallSection
          badgeFilter={badgeFilter}
          badgeLimit={badgeLimit}
          processedBadges={processedBadges}
          visibleBadges={visibleBadges}
          selectFilter={selectFilter}
          showMore={showMore}
          showLess={showLess}
          showPopup={showPopup}
        />
      )}

      {/* Reading Progress */}
      <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 ml-2">{`Livros Ativos (${books.filter(b => b.status === BOOK_STATUS.READING).length})`}</Text>
      {books
        .filter(b => b.status === BOOK_STATUS.READING)
        .map(book => (
          <View
            key={book.id}
            className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark mb-2 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-text-light dark:text-text-dark font-bold">
                {book.title}
              </Text>
              <Text className="text-text-muted-light dark:text-text-muted-dark text-xs">
                {book.currentPage} / {book.totalPages} pág.
              </Text>
            </View>
            <View className="bg-primary/20 dark:bg-primary-dark/20 p-2 rounded-lg">
              <Text className="text-primary dark:text-primary-dark font-bold text-xs">
                {book.totalPages
                  ? Math.round((book.currentPage / book.totalPages) * 100)
                  : 0}
                %
              </Text>
            </View>
          </View>
        ))}

      {/* Public Notes */}
      <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 mt-6 ml-2">{`Mural de Notas (${notes.length})`}</Text>
      {notes.map((note, idx) => (
        <View
          key={idx}
          className="bg-card-light dark:bg-card-dark p-4 rounded-2xl border border-primary/20 dark:border-primary-dark/20 mb-3">
          <View className="flex-row justify-between mb-2">
            <Text
              className="text-primary dark:text-primary-dark font-bold text-xs"
              numberOfLines={1}>
              {note.bookTitle}
            </Text>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px]">
              pág. {note.page}
            </Text>
          </View>
          <Text className="text-text-light dark:text-text-dark font-serif italic text-sm leading-5">
            &quot;{note.text}&quot;
          </Text>
          <View className="flex-row items-center mt-2">
            <Ionicons
              name="globe-outline"
              size={12}
              color={isDarkMode ? '#9CA3AF' : '#6B7280'}
            />
            <Text className="text-text-muted-light dark:text-text-muted-dark text-[9px] ml-1">
              {'Público'}
            </Text>
          </View>
        </View>
      ))}
      {notes.length === 0 && (
        <Text className="text-text-muted-light dark:text-text-muted-dark text-xs italic text-center py-4">
          {'Nenhuma nota pública disponível.'}
        </Text>
      )}

      {/* Danger Zone */}
      <TouchableOpacity
        onPress={handleRemoveFriend}
        className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl items-center mt-8 mb-20 flex-row justify-center">
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
        <Text className="text-red-500 font-bold ml-2">
          {'Desfazer Amizade'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
