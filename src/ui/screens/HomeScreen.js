import React, { useCallback, useState, useMemo, useEffect } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { BOOK_STATUS } from '@core/constants/bookStatus';
import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { useMainStore } from '@core/store';
import {
  selectReadingBooks,
  selectReadBooks,
  selectWishlistBooks,
  selectBooksByStatus,
} from '@core/store/slices/librarySlice';
import { ProgressBookCard, FastAvatar, Skeleton } from '@ui/components';
import { useHomeLogic } from '@ui/hooks/useHomeLogic';

import { useThemeStore } from '../../store/useThemeStore';
import * as Haptics from '../../utils/haptics';
import { COLORS } from '@constants/colors';

const TXT_WELCOME = 'Bem-vindo, ';
const TXT_DAILY_SUMMARY = 'Resumo Diário';
const TXT_READING_DAYS = 'Dias de leitura';
const TXT_LIBRARY = 'Biblioteca';
const TXT_RECENT_NOTES = 'Suas Anotações Recentes';
const TXT_START_STORY = 'Começar nova história';

const SKELETON_DATA = [{ id: 's1' }, { id: 's2' }, { id: 's3' }];

const BookListItem = React.memo(
  ({
    item,
    navigation,
    COLORS,
    isDarkMode,
    accentColor,
    fadeAnim,
    slideAnim,
    onConfigPress,
    onCommunityPress,
  }) => {
    if (item.id.startsWith('s')) {
      return (
        <View className="bg-card-light dark:bg-card-dark p-4 rounded-3xl mb-4 border border-border-light dark:border-border-dark shadow-sm flex-row h-32 items-center">
          <Skeleton width={60} height={90} borderRadius={8} />
          <View className="flex-1 ml-4 justify-around h-20">
            <View>
              <Skeleton width="80%" height={16} style={{ marginBottom: 6 }} />
              <Skeleton width="40%" height={10} />
            </View>
            <Skeleton width="100%" height={8} borderRadius={4} />
          </View>
        </View>
      );
    }

    return (
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ProgressBookCard
          book={item}
          onPress={() => navigation.navigate('BookDetails', { book: item })}
          onConfigPress={() => onConfigPress?.(item)}
          onCommunityPress={() => onCommunityPress?.(item)}
        />
      </Animated.View>
    );
  },
);

export default function HomeScreen({ navigation }) {
  const { isDarkMode } = useThemeStore();
  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;

  const [activeFilter, setActiveFilter] = useState(BOOK_STATUS.READING);

  const {
    user,
    streak,
    loadingBooks,
    isReady,
    books,
    fadeAnim,
    slideAnim,
    recentNotes,
  } = useHomeLogic();

  const route = useRoute();

  useEffect(() => {
    if (route.params?.filter) {
      setActiveFilter(route.params.filter);
    }
  }, [route.params?.filter]);

  const FILTERS = [
    { id: BOOK_STATUS.READING, label: 'Lendo Agora', icon: 'book' },
    { id: BOOK_STATUS.WANT_TO_READ, label: 'Quero Ler', icon: 'bookmark' },
    { id: BOOK_STATUS.READ, label: 'Lidos', icon: 'checkmark-done' },
    { id: 'shopping', label: 'Comprados / Desejos', icon: 'cart' },
  ];

  const readingBooks = useMainStore(useShallow(selectReadingBooks));
  const readBooks = useMainStore(useShallow(selectReadBooks));
  const wishlistBooks = useMainStore(useShallow(selectWishlistBooks));

  const counts = useMemo(
    () => ({
      [BOOK_STATUS.READING]: readingBooks.length,
      [BOOK_STATUS.WANT_TO_READ]: wishlistBooks.filter(
        b => b.status === BOOK_STATUS.WANT_TO_READ,
      ).length,
      [BOOK_STATUS.READ]: readBooks.length,
      shopping: wishlistBooks.length,
    }),
    [readingBooks.length, readBooks.length, wishlistBooks.length],
  );

  const filteredBooks = useMainStore(
    useShallow(state => {
      if (loadingBooks || !isReady) return SKELETON_DATA;
      if (activeFilter === 'shopping') return selectWishlistBooks(state);
      return selectBooksByStatus(activeFilter)(state);
    }),
  );

  const handleOpenConfig = useCallback(
    book => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('BookEdit', { book });
    },
    [navigation],
  );

  const handleOpenCommunity = useCallback(
    book => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('EchoGallery', {
        bookId: book.id,
        bookTitle: book.title,
        userCurrentPage: book.currentPage || 0,
      });
    },
    [navigation],
  );

  const renderHeader = useCallback(
    () => (
      <Animated.View
        style={{
          opacity: loadingBooks ? 1 : fadeAnim,
          transform: [{ translateY: loadingBooks ? 0 : slideAnim }],
        }}>
        <View className="flex-row justify-between items-center mt-6">
          <View>
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-1">
              {TXT_WELCOME}
              {UserNormalizationService.normalizeDisplayName(user)}
            </Text>
            <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">
              {TXT_DAILY_SUMMARY}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Perfil');
            }}>
            <FastAvatar
              source={UserNormalizationService.normalizeUserAvatar(user)}
              size={50}
              priority="high"
              border
            />
          </TouchableOpacity>
        </View>

        <View
          className="mb-8 mt-4 items-center bg-card-light dark:bg-card-dark p-8 rounded-ultra border border-border-light dark:border-border-dark shadow-sm"
          style={{
            shadowColor: COLORS.dark_blue,
            shadowOpacity: 0.05,
            shadowRadius: 15,
            shadowOffset: { width: 0, height: 4 },
          }}>
          {loadingBooks ? (
            <>
              <Skeleton width={120} height={60} style={{ marginBottom: 16 }} />
              <Skeleton width={150} height={20} />
            </>
          ) : (
            <>
              <View className="flex-row items-center">
                <Text className="text-streak text-6xl font-bold font-mono">
                  🔥 {streak}
                </Text>
              </View>
              <Text className="text-text-muted-light dark:text-text-muted-dark text-lg mt-4 font-serif">
                {TXT_READING_DAYS}
              </Text>
            </>
          )}
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-[3px] text-xs font-bold mb-1">
              {TXT_LIBRARY}
            </Text>
          </View>
          <TouchableOpacity
            testID="add-book-trigger"
            onPress={() => navigation.navigate('Search')}
            className="bg-primary dark:bg-primary-dark w-10 h-10 rounded-full items-center justify-center shadow-lg">
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-8"
          contentContainerStyle={{ paddingRight: 20 }}>
          {FILTERS.map(filter => {
            const isActive = activeFilter === filter.id;
            const fId = filter.id;
            let count = 0;
            if (
              typeof fId === 'string' &&
              fId !== '__proto__' &&
              fId !== 'constructor' &&
              fId !== 'prototype'
            ) {
              count = Object.prototype.hasOwnProperty.call(counts, fId)
                ? counts[fId]
                : 0;
            }
            const isEmpty = count === 0;

            return (
              <TouchableOpacity
                testID={`filter-${filter.id}`}
                key={filter.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveFilter(filter.id);
                }}
                className={`flex-row items-center px-6 py-3 rounded-2xl mr-3 border ${
                  isActive
                    ? 'bg-primary dark:bg-primary-dark border-primary dark:border-primary-dark shadow-md'
                    : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark'
                } ${isEmpty && !isActive ? 'opacity-50' : 'opacity-100'}`}>
                <Ionicons
                  name={filter.icon}
                  size={18}
                  color={
                    isActive
                      ? 'white'
                      : isDarkMode
                        ? COLORS.text.muted.dark
                        : COLORS.text.muted.light
                  }
                />
                <Text
                  className={`ml-2 font-bold text-xs ${
                    isActive
                      ? 'text-white'
                      : 'text-text-muted-light dark:text-text-muted-dark'
                  }`}>
                  {filter.label} {count > 0 ? `(${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    ),
    [
      user,
      streak,
      loadingBooks,
      activeFilter,
      counts,
      COLORS,
      isDarkMode,
      fadeAnim,
      slideAnim,
    ],
  );

  const getEmptyMessage = () => {
    switch (activeFilter) {
      case BOOK_STATUS.READ:
        return 'Você ainda não terminou nenhum livro. Continue lendo! 🚀';
      case BOOK_STATUS.WANT_TO_READ:
        return 'Sua lista de espera está vazia. Que tal um título novo?';
      case 'shopping':
        return 'Nada no carrinho ou nos desejos por enquanto.';
      default:
        return 'A estante está vazia.';
    }
  };

  const renderItem = useCallback(
    ({ item }) => (
      <BookListItem
        item={item}
        navigation={navigation}
        COLORS={COLORS}
        isDarkMode={isDarkMode}
        accentColor={accentColor}
        fadeAnim={fadeAnim}
        slideAnim={slideAnim}
        onConfigPress={handleOpenConfig}
        onCommunityPress={handleOpenCommunity}
      />
    ),
    [
      navigation,
      COLORS,
      isDarkMode,
      accentColor,
      fadeAnim,
      slideAnim,
      handleOpenConfig,
      handleOpenCommunity,
    ],
  );

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark px-6 pt-4">
      <FlatList
        data={filteredBooks}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        ListFooterComponent={() => (
          <View className="mb-20">
            {recentNotes.length > 0 && activeFilter === BOOK_STATUS.READING && (
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                  marginBottom: 40,
                }}>
                <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-4 ml-2">
                  {TXT_RECENT_NOTES}
                </Text>
                {recentNotes.map((note, idx) => (
                  <View
                    key={idx}
                    className="bg-card-light dark:bg-card-dark p-6 rounded-3xl border border-primary/20 dark:border-primary-dark/20 mb-4 shadow-sm">
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
                  </View>
                ))}
              </Animated.View>
            )}
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center bg-card-light dark:bg-card-dark rounded-ultra p-12 border border-dashed border-border-light dark:border-border-dark mt-4">
            <Ionicons
              name="cafe-outline"
              size={60}
              color={
                isDarkMode ? COLORS.text.muted.dark : COLORS.text.muted.light
              }
            />
            <Text className="text-text-muted-light dark:text-text-muted-dark text-center text-lg mt-6 font-serif px-4">
              {getEmptyMessage()}
            </Text>
            <TouchableOpacity
              className="mt-8 border-b-2 border-primary dark:border-primary-dark pb-1"
              onPress={() => navigation.navigate('Search')}>
              <Text className="text-primary dark:text-primary-dark font-bold text-lg">
                {TXT_START_STORY}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
