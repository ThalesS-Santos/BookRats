import React, {
  useMemo,
  useEffect,
  useCallback,
  useState,
  useRef,
} from 'react';

import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Easing,
  InteractionManager,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { useMainStore } from '@core/store';
import { FastAvatar } from '@ui/components';
import { Skeleton } from '@ui/components';

import { useSocialStore } from '../../store/useSocialStore';
import { useThemeStore } from '../../store/useThemeStore';

// 🕒 Helper to format seconds to human-readable time
const formatDuration = totalSeconds => {
  if (!totalSeconds) return '---';
  const hrs = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
};

// 🎨 Memoized Ranking Item for Performance with Entry Animation
const RankingItem = React.memo(
  ({ item, index, renderMedal, onPress, isFocused }) => {
    const { COLORS } = require('@constants/colors');
    const { isDarkMode } = useThemeStore();

    // Animation Logic
    const [fadeAnim] = useState(() => new Animated.Value(0));
    const [slideAnim] = useState(() => new Animated.Value(20));

    useEffect(() => {
      if (isFocused) {
        // Reset values before starting animation to allow re-triggering
        fadeAnim.setValue(0);
        slideAnim.setValue(20);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            delay: Math.min(index, 10) * 50, // Caps delay for long lists
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            delay: Math.min(index, 10) * 50,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isFocused]);

    if (item.isSkeleton) {
      return (
        <View className="p-8 mb-6 rounded-[32px] border shadow-sm bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark">
          <View className="flex-row items-center mb-6">
            <Skeleton width={30} height={30} borderRadius={15} />
            <Skeleton
              width={56}
              height={56}
              borderRadius={28}
              style={{ marginLeft: 12, marginRight: 16 }}
            />
            <View className="flex-1 pr-4">
              <Skeleton width="70%" height={20} style={{ marginBottom: 8 }} />
              <Skeleton width="50%" height={12} />
            </View>
            <View className="items-end">
              <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
              <Skeleton width={30} height={10} />
            </View>
          </View>

          <View className="flex-row justify-between pt-4 border-t border-border-light/50 dark:border-border-dark/50">
            <View className="items-center flex-1">
              <Skeleton width={20} height={14} style={{ marginBottom: 4 }} />
              <Skeleton width={50} height={10} />
            </View>
            <View className="items-center flex-1 border-x border-border-light/30 dark:border-border-dark/30">
              <Skeleton width={40} height={14} style={{ marginBottom: 4 }} />
              <Skeleton width={50} height={10} />
            </View>
            <View className="items-center flex-1">
              <Skeleton width={40} height={14} style={{ marginBottom: 4 }} />
              <Skeleton width={50} height={10} />
            </View>
          </View>
        </View>
      );
    }

    return (
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          className={`p-8 mb-6 rounded-[32px] border shadow-sm bg-card-light dark:bg-card-dark`}
          style={{
            shadowColor: item.isMe ? COLORS.neon_green : COLORS.dark_blue,
            shadowOpacity: 0.08,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 4 },
            borderColor: item.isMe
              ? COLORS.neon_green
              : isDarkMode
                ? COLORS.border.dark
                : COLORS.border.light,
            borderWidth: item.isMe ? 2 : 1,
          }}>
          <View className="flex-row items-center mb-6">
            <View className="w-10 items-center">{renderMedal(index)}</View>
            <FastAvatar
              source={item.profilePic}
              size={56}
              isOnline={item.isOnline}
              style={{ marginLeft: 12, marginRight: 16 }}
            />
            <View className="flex-1 pr-4">
              <View className="flex-row items-center">
                <Text
                  className={`text-xl font-serif font-bold ${item.isMe ? 'text-primary dark:text-primary-dark' : 'text-text-light dark:text-text-dark'}`}
                  numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <Text
                className="text-text-muted-light dark:text-text-muted-dark text-xs uppercase tracking-tight mt-1"
                numberOfLines={1}>
                {item.currentReading
                  ? `📖 Lendo: ${item.currentReading}`
                  : 'Descansando'}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-text-light dark:text-text-dark font-mono font-bold text-2xl">
                {item.pages}
              </Text>
              <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase font-bold">
                páginas
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between pt-4 border-t border-border-light/50 dark:border-border-dark/50">
            <View className="items-center flex-1">
              <Text className="text-text-light dark:text-text-dark text-sm font-bold">
                {item.completedBooks}
              </Text>
              <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase">
                Livros Lidos
              </Text>
            </View>
            <View className="items-center flex-1 border-x border-border-light/30 dark:border-border-dark/30">
              <Text className="text-text-light dark:text-text-dark text-sm font-bold">
                {formatDuration(item.maxSession)}
              </Text>
              <Text className="text-[10px] uppercase font-bold text-primary dark:text-primary-dark">
                Recorde 🏆
              </Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-text-light dark:text-text-dark text-sm font-bold">
                {formatDuration(item.lastSession)}
              </Text>
              <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase">
                Última Vez
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  },
);
RankingItem.displayName = 'RankingItem';

export default function RankingScreen({ navigation }) {
  const { isDarkMode } = useThemeStore();
  const isFocused = useIsFocused();
  const [isReady, setIsReady] = useState(false);
  const user = useMainStore(state => state.user);

  // Optimized Social Store Selectors with useShallow
  const {
    rankingList,
    loadingRanking,
    subscribeToRanking,
    unsubscribeFromRanking,
  } = useSocialStore(
    useShallow(state => ({
      rankingList: state.rankingList,
      loadingRanking: state.loadingRanking,
      subscribeToRanking: state.subscribeToRanking,
      unsubscribeFromRanking: state.unsubscribeFromRanking,
    })),
  );

  const [refreshing, setRefreshing] = useState(false);
  const [headerFade] = useState(() => new Animated.Value(0));

  // Use dummy skeletons during initial load OR when not "ready"
  const listData =
    (loadingRanking && rankingList.length === 0) || !isReady
      ? Array(10)
          .fill({})
          .map((_, i) => ({ id: `skeleton-${i}`, isSkeleton: true }))
      : rankingList;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReady(true);
    subscribeToRanking();
    return () => unsubscribeFromRanking();
  }, []);

  useEffect(() => {
    if (isFocused && !loadingRanking && isReady) {
      headerFade.setValue(0);
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused, loadingRanking]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Real-time handles updates, but we can re-trigger subscription if needed
    unsubscribeFromRanking();
    subscribeToRanking();
    setRefreshing(false);
  };

  const myTotalPages = useMainStore(state => state.totalPagesRead);

  const rankingData = useMemo(() => {
    // 🚀 Optimistic Update & Local Re-sorting
    const mapped = listData.map(u => ({
      id: u.id,
      isSkeleton: u.isSkeleton,
      name:
        u.id === user?.uid
          ? `${UserNormalizationService.normalizeDisplayName(u)} (Você)`
          : UserNormalizationService.normalizeDisplayName(u),
      pages: u.id === user?.uid ? myTotalPages : u.total_pages_read || 0,
      isMe: u.id === user?.uid,
      isOnline: u.isOnline,
      profilePic: UserNormalizationService.normalizeUserAvatar(u),
      currentReading: u.currentReadingBook,
      maxSession: u.max_reading_session || 0,
      lastSession: u.last_reading_session || 0,
      completedBooks: u.total_books_completed || 0,
    }));

    // Re-sort only if we have real data (not skeletons)
    if (!loadingRanking && rankingList.length > 0) {
      return mapped.sort((a, b) => b.pages - a.pages);
    }

    return mapped;
  }, [listData, user, myTotalPages, loadingRanking]);

  const renderMedal = index => {
    if (index === 0) return <Text className="text-2xl">🥇</Text>;
    if (index === 1) return <Text className="text-2xl">🥈</Text>;
    if (index === 2) return <Text className="text-2xl">🥉</Text>;
    return (
      <Text className="text-text-muted-light dark:text-text-muted-dark font-mono font-bold text-lg">
        {index + 1}º
      </Text>
    );
  };

  const renderItem = useCallback(
    ({ item, index }) => (
      <RankingItem
        item={item}
        index={index}
        isFocused={isFocused}
        renderMedal={renderMedal}
        onPress={() =>
          !item.isSkeleton &&
          navigation.navigate('UserProfile', { userId: item.id })
        }
      />
    ),
    [renderMedal, navigation, isFocused],
  );

  const renderFooter = () => {
    if (!loadingRanking || (loadingRanking && rankingList.length === 0))
      return null;
    return (
      <View className="py-6 items-center">
        <ActivityIndicator
          size="small"
          color={isDarkMode ? '#A7C9A7' : '#5B8C5A'}
        />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      {/* 🚀 Sticky Main Header */}
      <Animated.View
        style={{
          opacity: loadingRanking && rankingList.length === 0 ? 1 : headerFade,
          transform: [
            {
              translateY:
                loadingRanking && rankingList.length === 0
                  ? 0
                  : headerFade.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
            },
          ],
        }}>
        <View className="px-6 pt-10 pb-4 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark z-10 w-full relative">
          <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-1">
            Global
          </Text>
          <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">
            Top Leitores
          </Text>
        </View>
      </Animated.View>

      <FlatList
        data={rankingData}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A7C9A7"
            colors={['#A7C9A7']}
          />
        }
      />
    </View>
  );
}
