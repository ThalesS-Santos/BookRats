import React, { useState, useEffect } from 'react';
import { useMemo } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { calculateStreakFromLogs } from '@utils/streak';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

import { ALL_BADGES } from '@constants/badges';
import { COLORS } from '@constants/colors';
import {
  getUserBooks,
  getUserAnnotations,
  getUserReadingLogs,
} from '@core/api/books';
import { getUserDetails } from '@core/api/social';
import { BOOK_STATUS } from '@core/constants/bookStatus';
import { Logger } from '@core/services/Logger';
import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { BookLoader } from '@ui/components';
import { FastAvatar } from '@ui/components';

import { useMainStore } from '../../core/store';
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

  const user = useMainStore(state => state.user);
  const myTotalPages = useMainStore(state => state.totalPagesRead);
  const myStreak = useMainStore(state => state.streak);

  const [loading, setLoading] = useState(true);
  const [friend, setFriend] = useState(null);
  const [books, setBooks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [logs, setLogs] = useState([]);

  const loadData = async () => {
    try {
      const userData = await getUserDetails(userId);
      setFriend(userData);

      const isMe = userId === user?.uid;

      // 1. Fetch Books (Now public in rules)
      try {
        const userBooks = await getUserBooks(userId);
        setBooks(userBooks);
      } catch (e) {
        Logger.warn('Could not load user books', { userId, error: e?.message });
      }

      // 2. Fetch Logs (Private - Only for Me)
      if (isMe) {
        try {
          const userLogs = await getUserReadingLogs(userId);
          setLogs(userLogs);
        } catch (e) {
          Logger.warn('Could not load logs', { userId, error: e?.message });
        }
      }

      // 3. Fetch Annotations
      try {
        // We only fetch annotations if we have books
        // Wait, for performance we should only do this if needed
        if (books.length > 0 || userId) {
          const allNotes = [];
          // Note: This loop might be slow if many books.
          // Usually we'd use a collectionGroup query here too, but for simplicity:
          const targetBooks =
            books.length > 0
              ? books
              : await getUserBooks(userId).catch(() => []);

          for (const book of targetBooks) {
            try {
              const annots = await getUserAnnotations(userId, book.id, !isMe);
              allNotes.push(
                ...annots.map(a => ({ ...a, bookTitle: book.title })),
              );
            } catch (e) {}
          }
          allNotes.sort(
            (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0),
          );
          setNotes(allNotes);
        }
      } catch (noteError) {
        Logger.warn('Could not load user notes', {
          userId,
          error: noteError?.message,
        });
      }
    } catch (error) {
      showPopup({
        title: 'Erro',
        message: 'Falha ao carregar perfil.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const totalPagesRead = useMemo(() => {
    if (userId === user?.uid) return myTotalPages;
    const sum = logs.reduce((acc, log) => acc + (log.pagesRead || 0), 0);
    // Fallback to friend data if logs are empty but friend has data (legacy migration)
    return sum || friend?.total_pages_read || 0;
  }, [logs, friend, userId, user?.uid, myTotalPages]);

  const currentStreak = useMemo(() => {
    if (userId === user?.uid) return myStreak;
    const streak = calculateStreakFromLogs(logs);
    return streak || friend?.current_streak || 0;
  }, [logs, friend, userId, user?.uid, myStreak]);

  const completedBooksCount = books.filter(
    b => b.status === BOOK_STATUS.READ,
  ).length;
  const readingBooksCount = books.filter(
    b => b.status === BOOK_STATUS.READING,
  ).length;

  const userData = useMemo(
    () => ({
      streak: currentStreak,
      totalPagesRead: totalPagesRead,
      completedBooks: completedBooksCount,
      readingBooks: readingBooksCount,
    }),
    [currentStreak, totalPagesRead, completedBooksCount, readingBooksCount],
  );

  const [badgeFilter, setBadgeFilter] = useState('all'); // 'all', 'unlocked', 'locked', 'recent'
  const [badgeLimit, setBadgeLimit] = useState(9);
  const [showTrophyWall, setShowTrophyWall] = useState(false);

  const totalUnlocked = useMemo(() => {
    return ALL_BADGES.filter(badge => badge.check(userData)).length;
  }, [userData]);

  const processedBadges = useMemo(() => {
    const badgesWithStatus = ALL_BADGES.map((badge, index) => {
      const isUnlocked = badge.check(userData);
      return {
        ...badge,
        isUnlocked,
        dateUnlocked: isUnlocked ? index : 0,
      };
    });

    let filtered = badgesWithStatus;
    if (badgeFilter === 'unlocked') {
      filtered = badgesWithStatus.filter(b => b.isUnlocked);
    } else if (badgeFilter === 'locked') {
      filtered = badgesWithStatus.filter(b => !b.isUnlocked);
    } else if (badgeFilter === 'recent') {
      filtered = badgesWithStatus.filter(b => b.isUnlocked);
    }

    if (badgeFilter === 'all') {
      filtered.sort((a, b) => {
        if (a.isUnlocked && !b.isUnlocked) return -1;
        if (!a.isUnlocked && b.isUnlocked) return 1;

        // If both are unlocked, sort by index desc (newer badges first)
        if (a.isUnlocked && b.isUnlocked) {
          return b.dateUnlocked - a.dateUnlocked;
        }
        return 0;
      });
    } else if (badgeFilter === 'recent' || badgeFilter === 'unlocked') {
      filtered.sort((a, b) => b.dateUnlocked - a.dateUnlocked);
    }

    return filtered;
  }, [badgeFilter, userData]);

  const visibleBadges = useMemo(() => {
    return processedBadges.slice(0, badgeLimit);
  }, [processedBadges, badgeLimit]);

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
          <Text className="text-primary font-bold text-2xl">
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
        <View className="mb-10 bg-card-light/40 dark:bg-card-dark/40 p-4 rounded-2xl border border-border-light dark:border-border-dark -mt-2">
          {/* Filter Pills */}
          <View className="flex-row justify-between mb-4 bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-border-light dark:border-border-dark">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'unlocked', label: 'Conquistados' },
              { id: 'locked', label: 'Bloqueados' },
              { id: 'recent', label: 'Recentes' },
            ].map(tab => {
              const isActive = badgeFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setBadgeFilter(tab.id);
                    setBadgeLimit(9); // Reset to 3x3 matrix on change
                  }}
                  className={`py-2 rounded-xl flex-1 items-center ${isActive ? 'bg-primary dark:bg-primary-dark shadow-sm' : ''}`}>
                  <Text
                    className={`text-[10px] font-bold ${isActive ? 'text-white font-serif' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {visibleBadges.length > 0 ? (
            <View className="flex-row flex-wrap justify-between">
              {visibleBadges.map(badge => {
                return (
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
                          <Ionicons
                            name="lock-closed"
                            size={10}
                            color="#EF4444"
                          />
                        </View>
                      )}
                    </View>
                    <Text
                      className={`text-[10px] font-bold mt-1 text-center ${badge.isUnlocked ? 'text-text-light dark:text-text-dark font-serif' : 'text-text-muted-light dark:text-text-muted-dark'}`}
                      numberOfLines={1}>
                      {badge.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="py-6 items-center">
              <Text className="text-text-muted-light dark:text-text-muted-dark text-xs italic">
                {'Nenhum troféu nesta categoria.'}
              </Text>
            </View>
          )}

          {/* Botões de Paginação - Mais / Menos Troféus */}
          <View className="flex-row justify-between mt-2">
            {processedBadges.length > badgeLimit && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setBadgeLimit(prev => prev + 9);
                }}
                className="flex-1 p-4 rounded-xl border border-primary/30 dark:border-primary-dark/30 bg-primary/5 dark:bg-primary-dark/5 flex-row justify-center items-center mr-1">
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={accentColor}
                  style={{ marginRight: 6 }}
                />
                <Text className="text-primary dark:text-primary-dark font-bold text-xs uppercase tracking-wider">
                  {'Mais Troféus'}
                </Text>
              </TouchableOpacity>
            )}

            {badgeLimit > 9 && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setBadgeLimit(prev => Math.max(9, prev - 9));
                }}
                className="flex-1 p-4 rounded-xl border border-gray-400/30 bg-gray-400/5 flex-row justify-center items-center ml-1">
                <Ionicons
                  name="chevron-up"
                  size={16}
                  color={isDarkMode ? '#A1A1AA' : '#71717A'}
                  style={{ marginRight: 6 }}
                />
                <Text className="text-text-muted-light dark:text-text-muted-dark font-bold text-xs uppercase tracking-wider">
                  {'Menos Troféus'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
            <View className="bg-primary/20 p-2 rounded-lg">
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
          className="bg-card-light/40 dark:bg-card-dark/40 p-4 rounded-2xl border border-primary/20 dark:border-primary-dark/20 mb-3 shadow-sm">
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
            "{note.text}"
          </Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="globe-outline" size={12} color="#6B7280" />
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
