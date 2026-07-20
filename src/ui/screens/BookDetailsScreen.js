import React, { useMemo, useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
  Image as RNImage,
} from 'react-native';

import { COLORS } from '@constants/colors';
import { BOOK_STATUS } from '@core/constants/bookStatus';
import { useMainStore } from '@core/store';

import { usePopupStore } from '../../store/usePopupStore';
import { useThemeStore } from '../../store/useThemeStore';
import * as Haptics from '../../utils/haptics';
import { StatusSelector } from '../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 450;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 100 : 80;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

/**
 * Helper to strip HTML tags from strings.
 */
const stripHtml = html => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Metadata Card Component
 */
const InfoCard = React.memo(({ icon, label, value, color }) => (
  <View className="bg-card-light dark:bg-card-dark p-4 rounded-3xl border border-border-light dark:border-border-dark shadow-sm items-center justify-center min-w-[85px] mr-3">
    <Ionicons name={icon} size={20} color={color} />
    <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase font-bold mt-2">
      {label}
    </Text>
    <Text
      className="text-text-light dark:text-text-dark text-xs font-bold mt-1"
      numberOfLines={1}>
      {value}
    </Text>
  </View>
));

InfoCard.displayName = 'InfoCard';

export default function BookDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDarkMode } = useThemeStore();
  const books = useMainStore(state => state.books);
  const addBook = useMainStore(state => state.addBook);

  const initialBook = route.params?.book;

  // 🛰️ Sync with Library State
  const bookInLibrary = useMemo(() => {
    return books.find(
      b =>
        b.id === initialBook?.id ||
        (b.title === initialBook?.title && b.author === initialBook?.author),
    );
  }, [books, initialBook]);

  const book = bookInLibrary || initialBook;
  const isInLibrary = !!bookInLibrary;

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(
    BOOK_STATUS.WANT_TO_READ,
  );
  const [scrollY] = useState(() => new Animated.Value(0));

  if (!book) return null;

  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;
  const cleanDescription = stripHtml(
    book.description || 'Este livro ainda não possui uma sinopse disponível.',
  );

  // 📈 Progress Calculations
  const progress = Math.min(
    (book.currentPage / (book.totalPages || 1)) * 100,
    100,
  );
  const pagesLeft = Math.max(
    0,
    (book.totalPages || 0) - (book.currentPage || 0),
  );

  const handleCTA = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isInLibrary) {
      // Go to Timer or Progress update
      navigation.navigate('Timer', { bookId: book.id });
    } else {
      // Add to Library logic
      try {
        await addBook(
          book.title,
          book.totalPages,
          book.id,
          book.description,
          {
            author: book.author,
            thumbnail: book.thumbnail,
            categories: book.categories,
            language: book.language,
            publishedDate: book.publishedDate,
            averageRating: book.averageRating,
          },
          selectedStatus,
        );

        usePopupStore.getState().showPopup({
          title: 'Adicionado!',
          message: `"${book.title}" já está na sua estante.`,
          type: 'success',
        });

        // Navigate to Library (Início tab) and set filter
        navigation.navigate('MainTabs', {
          screen: 'Início',
          params: { filter: selectedStatus },
        });
      } catch (error) {
        // Error is handled in the store slice, but we could catch here if needed
        console.error('Error adding book from details:', error);
      }
    }
  };

  // 🎨 Animation Interpolations
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-HEADER_MAX_HEIGHT, 0, HEADER_SCROLL_DISTANCE],
    outputRange: [2, 1, 1],
    extrapolate: 'clamp',
  });

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE - 40, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      {/* 🏙️ Parallax Header */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ translateY: headerTranslateY }],
            backgroundColor: isDarkMode
              ? COLORS.background.dark
              : COLORS.background.light,
          },
        ]}>
        <Animated.View
          style={[styles.headerBackground, { opacity: imageOpacity }]}>
          <RNImage
            source={
              typeof book.thumbnail === 'string'
                ? { uri: book.thumbnail }
                : book.thumbnail
            }
            style={StyleSheet.absoluteFill}
            blurRadius={30}
            resizeMode="cover"
          />
          <View
            style={[
              styles.overlay,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(0,0,0,0.6)'
                  : 'rgba(255,255,255,0.4)',
              },
            ]}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.headerContent,
            { opacity: imageOpacity, transform: [{ scale: imageScale }] },
          ]}>
          <View
            style={
              Platform.OS === 'ios'
                ? {
                    shadowColor: '#000',
                    shadowOpacity: 0.35,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: 10 },
                  }
                : null
            }>
            <Image
              source={book.thumbnail}
              style={styles.mainCover}
              contentFit="contain"
            />
          </View>
        </Animated.View>
      </Animated.View>

      {/* Floating Header Bar (Fixed) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-3 rounded-full bg-black/40">
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Animated.Text
          style={[
            styles.headerTitle,
            {
              opacity: headerTitleOpacity,
              color: isDarkMode ? 'white' : 'black',
            },
          ]}
          numberOfLines={1}>
          {book.title}
        </Animated.Text>
        <View className="w-12" />
      </View>

      <Animated.ScrollView
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT }}>
        <View className="p-6">
          {/* Title & Author */}
          <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold text-center mb-1">
            {book.title}
          </Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-lg font-serif italic text-center mb-8">
            {book.author || 'Autor Desconhecido'}
          </Text>

          {/* Metadata Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-8"
            contentContainerStyle={{ paddingHorizontal: 4 }}>
            <InfoCard
              icon="book-outline"
              label="Páginas"
              value={book.totalPages || '??'}
              color={accentColor}
            />
            <InfoCard
              icon="calendar-outline"
              label="Publicação"
              value={
                book.publishedDate ? book.publishedDate.split('-')[0] : 'N/A'
              }
              color={accentColor}
            />
            <InfoCard
              icon="globe-outline"
              label="Idioma"
              value={
                book.language?.toUpperCase() === 'PT'
                  ? 'Português'
                  : book.language?.toUpperCase() || 'N/A'
              }
              color={accentColor}
            />
            {book.averageRating && (
              <InfoCard
                icon="star"
                label="Rating"
                value={book.averageRating.toString()}
                color="#FBBF24"
              />
            )}
          </ScrollView>

          {/* Category Chips */}
          {book.categories && book.categories.length > 0 && (
            <View className="flex-row flex-wrap mb-8">
              {book.categories.map((cat, i) => (
                <View
                  key={i}
                  className="bg-primary/10 dark:bg-primary-dark/10 px-4 py-2 rounded-full mr-2 mb-2 border border-primary/20 dark:border-primary-dark/20">
                  <Text className="text-primary dark:text-primary-dark text-xs font-bold uppercase">
                    {cat}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Progress Section (If Reading) */}
          {isInLibrary && book.status === BOOK_STATUS.READING && (
            <View className="bg-card-light dark:bg-card-dark p-6 rounded-3xl border border-primary/20 dark:border-primary-dark/20 mb-8 shadow-sm">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg">
                  Seu Progresso
                </Text>
                <Text className="text-primary dark:text-primary-dark font-mono font-bold">
                  {Math.round(progress)}%
                </Text>
              </View>
              <View className="h-3 bg-border-light dark:bg-border-dark rounded-full overflow-hidden mb-3">
                <View
                  className="h-full bg-primary dark:bg-primary-dark"
                  style={{ width: `${progress}%` }}
                />
              </View>
              <Text className="text-text-muted-light dark:text-text-muted-dark text-xs italic text-center">
                Você leu {book.currentPage} de {book.totalPages} páginas. Faltam{' '}
                {pagesLeft} para concluir!
              </Text>
            </View>
          )}

          {/* Status Selection (Only if NOT in library) */}
          {!isInLibrary && (
            <View className="mb-8">
              <Text className="text-text-light dark:text-text-dark font-serif font-bold text-xl mb-4">
                Onde colocar este livro?
              </Text>
              <View className="bg-card-light dark:bg-card-dark p-4 rounded-3xl border border-border-light dark:border-border-dark">
                <StatusSelector
                  currentStatus={selectedStatus}
                  onStatusChange={setSelectedStatus}
                />
              </View>
            </View>
          )}

          {/* Synopsis Engine */}
          <View className="mb-24">
            <Text className="text-text-light dark:text-text-dark font-serif font-bold text-xl mb-4">
              Sinopse
            </Text>
            <Text
              className="text-text-muted-light dark:text-text-muted-dark text-base leading-7 text-justify"
              numberOfLines={isExpanded ? undefined : 6}>
              {cleanDescription}
            </Text>
            {cleanDescription.length > 200 && (
              <TouchableOpacity
                onPress={() => setIsExpanded(!isExpanded)}
                className="mt-4 flex-row items-center justify-center border-t border-border-light/30 dark:border-border-dark/30 pt-4">
                <Text className="text-primary dark:text-primary-dark font-bold mr-1">
                  {isExpanded ? 'VER MENOS' : 'LER TUDO'}
                </Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={accentColor}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* 🚀 Sticky Action Bar */}
      <View
        style={styles.footer}
        className="bg-background-light/95 dark:bg-background-dark/95 border-t border-border-light dark:border-border-dark">
        <TouchableOpacity
          testID="start-reading-btn"
          onPress={handleCTA}
          className="bg-primary dark:bg-primary-dark p-5 rounded-2xl flex-row items-center justify-center"
          style={{ backgroundColor: accentColor }}>
          <Ionicons
            name={isInLibrary ? 'play-circle' : 'add-circle'}
            size={24}
            color="white"
          />
          <Text className="text-white font-bold text-lg ml-2 uppercase tracking-widest">
            {isInLibrary ? 'Registrar Progresso' : 'Adicionar à Estante'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MAX_HEIGHT,
    overflow: 'hidden',
    zIndex: 10,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  mainCover: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: 12,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
});
