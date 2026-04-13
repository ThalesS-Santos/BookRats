import React, { useMemo, useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useBookStore } from '../store/useBookStore';
import { useSocialStore } from '../store/useSocialStore';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import FastAvatar from '../components/FastAvatar';

// 🕒 Helper to format seconds to human-readable time
const formatDuration = (totalSeconds) => {
  if (!totalSeconds) return "---";
  const hrs = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
};

// 🎨 Memoized Ranking Item for Performance
const RankingItem = React.memo(({ item, index, renderMedal, onPress }) => {
  const { COLORS } = require('../constants/colors');
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`p-6 mb-4 rounded-3xl border shadow-sm bg-card-light dark:bg-card-dark ${item.isMe ? 'border-primary dark:border-primary-dark border-2' : 'border-border-light dark:border-border-dark'}`}
      style={{ shadowColor: item.isMe ? COLORS.neon_green : COLORS.dark_blue, shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: 4 } }}
    >
      <View className="flex-row items-center mb-4">
        <View className="w-8 items-center">{renderMedal(index)}</View>
        <FastAvatar 
          source={item.profilePic} 
          size={50} 
          isOnline={item.isOnline} 
          style={{ marginLeft: 8, marginRight: 12 }} 
        />
        <View className="flex-1 pr-4">
          <View className="flex-row items-center">
            <Text 
              className={`text-lg font-serif font-bold ${item.isMe ? 'text-primary dark:text-primary-dark' : 'text-text-light dark:text-text-dark'}`}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </View>
          <Text 
            className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase tracking-tighter mt-1"
            numberOfLines={1}
          >
            {item.currentReading ? `📖 Lendo: ${item.currentReading}` : 'Descansando'}
          </Text>
        </View>
        <View className="items-end">
           <Text className="text-text-light dark:text-text-dark font-mono font-bold text-xl">{item.pages}</Text>
           <Text className="text-text-muted-light dark:text-text-muted-dark text-[8px] uppercase font-bold">páginas totais</Text>
        </View>
      </View>

      <View className="flex-row justify-between pt-3 border-t border-border-light/50 dark:border-border-dark/50">
        <View className="items-center flex-1">
          <Text className="text-text-light dark:text-text-dark text-xs font-bold">{item.completedBooks}</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[8px] uppercase">Livros Lidos</Text>
        </View>
        <View className="items-center flex-1 border-x border-border-light/30 dark:border-border-dark/30">
          <Text className="text-text-light dark:text-text-dark text-xs font-bold">{formatDuration(item.maxSession)}</Text>
          <Text className="text-[8px] uppercase font-semibold text-primary dark:text-primary-dark">Recorde 🏆</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-text-light dark:text-text-dark text-xs font-bold">{formatDuration(item.lastSession)}</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[8px] uppercase">Última Leitura</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function RankingScreen({ navigation }) {
  const { isDarkMode } = useThemeStore();
  const user = useBookStore(state => state.user);
  const { 
    rankingList, 
    fetchInitialRanking, 
    fetchMoreRanking, 
    loadingRanking, 
    hasMore 
  } = useSocialStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInitialRanking();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInitialRanking();
    setRefreshing(false);
  };

  const rankingData = useMemo(() => {
    return rankingList.map((u, index) => ({
      id: u.id,
      name: u.id === user?.uid ? `${u.username || u.email?.split('@')[0]} (Você)` : (u.username || u.email?.split('@')[0]),
      pages: u.total_pages_read || 0,
      isMe: u.id === user?.uid,
      isOnline: u.isOnline,
      profilePic: u.profilePic,
      currentReading: u.currentReadingBook,
      maxSession: u.max_reading_session || 0,
      lastSession: u.last_reading_session || 0,
      completedBooks: u.total_books_completed || 0
    }));
  }, [rankingList, user]);

  const renderMedal = useCallback((index) => {
    if (index === 0) return <Ionicons name="trophy" size={24} color="#D97706" />;
    if (index === 1) return <Ionicons name="medal" size={24} color="#94A3B8" />;
    if (index === 2) return <Ionicons name="ribbon" size={24} color="#B45309" />;
    return <Text className="text-text-muted-light dark:text-text-muted-dark font-mono font-bold">{index + 1}º</Text>;
  }, []);

  const renderItem = useCallback(({ item, index }) => (
    <RankingItem 
      item={item} 
      index={index} 
      renderMedal={renderMedal} 
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
    />
  ), [renderMedal, navigation]);

  const renderFooter = () => {
    if (!loadingRanking || refreshing) return <View className="h-20" />;
    return (
      <View className="py-8 items-center">
        <ActivityIndicator size="small" color="#A7C9A7" />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark px-6 pt-4">
      <View className="mb-6">
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-1">Leitores</Text>
        <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">Elite BookRats</Text>
      </View>


      <FlatList
        data={rankingData}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        onEndReached={fetchMoreRanking}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A7C9A7"
            colors={["#A7C9A7"]}
          />
        }
      />
    </View>
  );
}
