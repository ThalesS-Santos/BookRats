import React, { useMemo, useEffect, useCallback, useState } from 'react';

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
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { useMainStore } from '@core/store';
import { buildFriendsRanking } from '@core/store/selectors';
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

    // Animation Logic - Only animate first visible items to control costs (Step 19)
    const [fadeAnim] = useState(() => new Animated.Value(index < 6 ? 0 : 1));
    const [slideAnim] = useState(() => new Animated.Value(index < 6 ? 20 : 0));

    useEffect(() => {
      if (isFocused && index < 6) {
        // Reset values before starting animation to allow re-triggering
        fadeAnim.setValue(0);
        slideAnim.setValue(20);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            delay: index * 50, // Staggers delay
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            delay: index * 50,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isFocused, fadeAnim, slideAnim, index]);

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

    const handlePress = () => {
      if (!item.isSkeleton && onPress) {
        onPress(item.id);
      }
    };

    return (
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
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

// 🎨 Componente Header Separado e Memoizado (Etapa 20)
const RankingHeader = React.memo(
  ({
    isFriendsScope,
    loadingRanking,
    rankingList,
    headerFade,
    onScopeChange,
  }) => {
    return (
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
            {isFriendsScope ? 'Amigos' : 'Global'}
          </Text>
          <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold mb-4">
            Top Leitores
          </Text>

          {/* 🏷️ Scope Toggle: Global vs Amigos */}
          <View className="flex-row bg-gray-100 dark:bg-gray-800/60 rounded-2xl p-1 border border-border-light dark:border-border-dark">
            <TouchableOpacity
              testID="ranking-scope-global"
              onPress={() => onScopeChange('global')}
              // ⚠️ Sem shadow-* condicional aqui: no NativeWind, shadow-sm define
              // variáveis CSS; ganhar essa classe após o 1º render dispara o
              // "upgrade warning" do css-interop, que crasha em dev (stringify
              // recursivo atinge getters do react-navigation).
              className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                !isFriendsScope ? 'bg-card-light dark:bg-card-dark' : ''
              }`}>
              <Text
                className={`font-bold text-sm ${
                  !isFriendsScope
                    ? 'text-primary dark:text-primary-dark'
                    : 'text-text-muted-light dark:text-text-muted-dark'
                }`}>
                Global
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="ranking-scope-amigos"
              onPress={() => onScopeChange('amigos')}
              className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                isFriendsScope ? 'bg-card-light dark:bg-card-dark' : ''
              }`}>
              <Text
                className={`font-bold text-sm ${
                  isFriendsScope
                    ? 'text-primary dark:text-primary-dark'
                    : 'text-text-muted-light dark:text-text-muted-dark'
                }`}>
                Amigos
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  },
);
RankingHeader.displayName = 'RankingHeader';

export default function RankingScreen({ navigation }) {
  const { isDarkMode } = useThemeStore();
  const isFocused = useIsFocused();
  const [isReady, setIsReady] = useState(false);
  const [activeScope, setActiveScope] = useState('global'); // 'global' | 'amigos'
  const user = useMainStore(state => state.user);

  // Optimized Social Store Selectors with useShallow
  const {
    rankingList,
    loadingRanking,
    friends,
    subscribeToRanking,
    unsubscribeFromRanking,
  } = useSocialStore(
    useShallow(state => ({
      rankingList: state.rankingList,
      loadingRanking: state.loadingRanking,
      friends: state.friends,
      subscribeToRanking: state.subscribeToRanking,
      unsubscribeFromRanking: state.unsubscribeFromRanking,
    })),
  );

  // Current user's own stats, used both to seed the friends ranking and to keep
  // the user's row optimistically up to date in the global list.
  const myStats = useMainStore(
    useShallow(state => ({
      totalPagesRead: state.totalPagesRead,
      totalClaps: state.totalClaps,
      maxReadingSession: state.maxReadingSession,
      lastReadingSession: state.lastReadingSession,
      totalBooksCompleted: state.totalBooksCompleted,
    })),
  );
  const myTotalPages = myStats.totalPagesRead;

  const isFriendsScope = activeScope === 'amigos';

  // 🎯 Friends ranking is DERIVED here via useMemo (stable reference), never as a
  // live store selector — that is what prevents the infinite-render crash.
  const friendsRanking = useMemo(
    () => buildFriendsRanking(user, friends, myStats),
    [user, friends, myStats],
  );

  const [refreshing, setRefreshing] = useState(false);
  const [headerFade] = useState(() => new Animated.Value(0));

  // Global scope shows skeletons during the initial load; friends scope is local
  // derived data, so it renders immediately.
  const showSkeletons =
    !isFriendsScope &&
    ((loadingRanking && rankingList.length === 0) || !isReady);

  const listData = showSkeletons
    ? Array(10)
        .fill({})
        .map((_, i) => ({ id: `skeleton-${i}`, isSkeleton: true }))
    : isFriendsScope
      ? friendsRanking
      : rankingList;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReady(true);
    subscribeToRanking();
    return () => unsubscribeFromRanking();
  }, [subscribeToRanking, unsubscribeFromRanking]);

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
  }, [isFocused, loadingRanking, isReady, headerFade]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Real-time handles updates, but we can re-trigger subscription if needed
    unsubscribeFromRanking();
    subscribeToRanking();
    setRefreshing(false);
  };

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

    // Re-sort only when showing real data (not skeleton placeholders).
    if (!showSkeletons && mapped.length > 0) {
      return mapped.sort((a, b) => b.pages - a.pages);
    }

    return mapped;
  }, [listData, user, myTotalPages, showSkeletons]);

  const renderMedal = useCallback(index => {
    if (index === 0) return <Text className="text-2xl">🥇</Text>;
    if (index === 1) return <Text className="text-2xl">🥈</Text>;
    if (index === 2) return <Text className="text-2xl">🥉</Text>;
    return (
      <Text className="text-text-muted-light dark:text-text-muted-dark font-mono font-bold text-lg">
        {index + 1}º
      </Text>
    );
  }, []);

  const handlePressUser = useCallback(
    userId => {
      navigation.navigate('UserProfile', { userId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <RankingItem
        item={item}
        index={index}
        isFocused={isFocused}
        renderMedal={renderMedal}
        onPress={handlePressUser}
      />
    ),
    [renderMedal, handlePressUser, isFocused],
  );

  const renderFooter = () => {
    // Friends scope: nudge the user to add friends when it's just them.
    if (isFriendsScope) {
      if (friendsRanking.length <= 1) {
        return (
          <View className="py-10 items-center px-10">
            <Text className="text-4xl mb-3">🤝</Text>
            <Text className="text-center font-serif italic text-text-muted-light dark:text-text-muted-dark">
              Você ainda não adicionou amigos. Convide outros leitores para
              competir aqui!
            </Text>
          </View>
        );
      }
      return null;
    }

    // Global scope: spinner while paginating/refreshing.
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

  const handleScopeChange = useCallback(scope => {
    setActiveScope(scope);
  }, []);

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      {/* 🚀 Sticky Main Header */}
      <RankingHeader
        isFriendsScope={isFriendsScope}
        loadingRanking={loadingRanking}
        rankingList={rankingList}
        headerFade={headerFade}
        onScopeChange={handleScopeChange}
      />

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
