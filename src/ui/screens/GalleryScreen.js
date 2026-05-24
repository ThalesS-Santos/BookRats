import React, { useEffect, useState, useRef } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { COLORS } from '@constants/colors';
import { getPublicEchoes, addRatClap } from '@core/api/social';
import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { useMainStore } from '@core/store';
import { BookLoader } from '@ui/components';
import { CommunityNote } from '@ui/components';

import { useThemeStore } from '../../store/useThemeStore';
import * as Haptics from '../../utils/haptics';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 150; // Tighter vertical height
const SPACING = 6; // Minimal gap for the 'consecutive' feel
const FULL_ITEM_HEIGHT = ITEM_HEIGHT + SPACING;

const GalleryScreen = ({ route }) => {
  const { bookId, bookTitle, userCurrentPage } = route.params;
  const navigation = useNavigation();
  const user = useMainStore(state => state.user);
  const { isDarkMode } = useThemeStore();

  const [echoes, setEchoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [scrollY] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const fetchEchoes = async () => {
      try {
        const fetched = await getPublicEchoes(
          bookId,
          userCurrentPage,
          user?.uid,
        );
        setEchoes(fetched);
      } catch (err) {
        console.error('Failed to load gallery echoes', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEchoes();
  }, [bookId, userCurrentPage]);

  const handleClap = async (targetUserId, bId, echoId) => {
    setEchoes(prev =>
      prev.map(e =>
        e.id === echoId
          ? {
              ...e,
              reactions: {
                ...e.reactions,
                claps: (e.reactions?.claps || 0) + 1,
              },
            }
          : e,
      ),
    );
    const currentUserName = UserNormalizationService.normalizeDisplayName(user);
    await addRatClap(targetUserId, bId, echoId, user?.uid, currentUserName);
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: event => {
        const offset = event.nativeEvent.contentOffset.y;
        const index = Math.round(offset / FULL_ITEM_HEIGHT);
        if (index !== currentIndex && index >= 0 && index < echoes.length) {
          setCurrentIndex(index);
          Haptics.selectionAsync();
        }
      },
    },
  );

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * FULL_ITEM_HEIGHT,
      index * FULL_ITEM_HEIGHT,
      (index + 1) * FULL_ITEM_HEIGHT,
    ];

    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [0.85, 1.1, 0.85], // Calibrated zoom
      extrapolate: 'clamp',
    });

    const opacity = scrollY.interpolate({
      inputRange,
      outputRange: [0.3, 1.0, 0.3], // Higher contrast for center focus
      extrapolate: 'clamp',
    });

    // Cylinder 'Pull' effect: cards above/below pull closer to the center
    const translateY = scrollY.interpolate({
      inputRange,
      outputRange: [25, 0, -25],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.itemWrapper,
          {
            opacity,
            transform: [{ scale }, { translateY }],
            zIndex: index === currentIndex ? 10 : 1,
          },
        ]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            navigation.navigate('EchoDetail', {
              echoId: item.id,
              bookId: item.bookId,
              echo: item,
            })
          }>
          <CommunityNote
            note={item}
            onClap={handleClap}
            COLORS={COLORS}
            isDarkMode={isDarkMode}
            isFrontCard={index === currentIndex}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) return <BookLoader isVisible={true} />;

  // Precise centering offset: Center of screen minus half item height minus header height
  const HEADER_TOTAL_HEIGHT = 120;
  const CENTER_OFFSET =
    SCREEN_HEIGHT / 2 - ITEM_HEIGHT / 2 - HEADER_TOTAL_HEIGHT;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode
            ? COLORS.background.dark
            : COLORS.background.light,
        },
      ]}>
      {/* Header */}
      <View style={[styles.header, { height: HEADER_TOTAL_HEIGHT }]}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons
            name="chevron-back"
            size={28}
            color={isDarkMode ? 'white' : 'black'}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text
            style={[
              styles.headerSubTitle,
              {
                color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              },
            ]}>
            {'ECOS DA COMUNIDADE'}
          </Text>
          <Text
            style={[
              styles.headerTitle,
              { color: isDarkMode ? 'white' : 'black' },
            ]}
            numberOfLines={1}>
            {bookTitle}
          </Text>
        </View>
      </View>

      {echoes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubble-outline"
            size={60}
            color={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}
          />
          <Text
            style={[
              styles.emptyText,
              {
                color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
              },
            ]}>
            {'Nenhum eco encontrado nesta parte do livro.'}
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          testID="echo-flatlist"
          data={echoes}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToInterval={FULL_ITEM_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<View style={{ height: CENTER_OFFSET }} />}
          ListFooterComponent={<View style={{ height: SCREEN_HEIGHT / 2 }} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerSubTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'serif',
  },
  listContent: {
    alignItems: 'center',
    paddingBottom: 100,
  },
  itemWrapper: {
    height: ITEM_HEIGHT,
    marginBottom: SPACING,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'serif',
    lineHeight: 24,
  },
});

export default GalleryScreen;
