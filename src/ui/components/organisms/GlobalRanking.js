import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useMainStore } from '@core/store';
import FastAvatar from '../atoms/FastAvatar';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@constants/colors';

/**
 * RankingRow
 * Individual row for the ranking list.
 */
const RankingRow = React.memo(({ user, index, isCurrentUser }) => {
  const position = index + 1;
  
  const getMedal = () => {
    if (position === 1) return <Text style={{ fontSize: 24 }}>🥇</Text>;
    if (position === 2) return <Text style={{ fontSize: 24 }}>🥈</Text>;
    if (position === 3) return <Text style={{ fontSize: 24 }}>🥉</Text>;
    return <Text className="text-gray-400 dark:text-gray-500 font-bold text-lg">{position}</Text>;
  };

  return (
    <View 
      className={`flex-row items-center px-4 py-4 border-b border-border-light dark:border-border-dark ${isCurrentUser ? 'bg-primary-light/10 dark:bg-primary-dark/20 border-l-4 border-l-primary-light dark:border-l-primary-dark' : 'bg-white dark:bg-card-dark'}`}
    >
      {/* Position */}
      <View className="w-12 items-center justify-center">
        {getMedal()}
      </View>

      {/* Leitor */}
      <View className="flex-1 flex-row items-center ml-2">
        <FastAvatar 
          uri={user.photoURL} 
          size={40} 
          name={user.displayName} 
        />
        <View className="ml-3 flex-1">
          <Text 
            className={`font-bold text-base ${isCurrentUser ? 'text-primary-light dark:text-primary-dark' : 'text-gray-900 dark:text-white'}`}
            numberOfLines={1}
          >
            {user.displayName || 'Leitor'}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-xs" numberOfLines={1}>
            @{user.username || 'usuario'}
          </Text>
        </View>
      </View>

      {/* Pages */}
      <View className="w-20 items-center">
        <Text className="text-gray-900 dark:text-white font-bold text-sm">
          {user.total_pages_read || 0}
        </Text>
        <Text className="text-gray-400 dark:text-gray-500 text-[10px] uppercase">Páginas</Text>
      </View>

      {/* Claps */}
      <View className="w-16 items-center">
        <View className="flex-row items-center">
          <Ionicons name="heart" size={12} color={COLORS.neon_green} />
          <Text className="ml-1 text-gray-900 dark:text-white font-bold text-sm">
            {user.total_claps_received || 0}
          </Text>
        </View>
        <Text className="text-gray-400 dark:text-gray-500 text-[10px] uppercase">Claps</Text>
      </View>
    </View>
  );
});

/**
 * GlobalRanking
 * Organism that displays the global leaderboard with infinite scroll.
 */
export default function GlobalRanking() {
  const [activeScope, setActiveScope] = React.useState('global'); // 'global' | 'amigos'
  
  const { 
    fetchRanking, 
    fetchNextRankingPage, 
    rankingLoading, 
    loadingMoreRanking,
    hasMoreRanking,
    user: currentUser,
    selectFilteredRanking
  } = useMainStore();

  const rankingList = useMainStore(selectFilteredRanking(activeScope));

  useEffect(() => {
    fetchRanking();
  }, []);

  const renderItem = useCallback(({ item, index }) => (
    <RankingRow 
      user={item} 
      index={index} 
      isCurrentUser={item.id === currentUser?.uid} 
    />
  ), [currentUser?.uid]);

  const renderHeader = () => (
    <View>
      {/* Scope Toggle */}
      <View className="flex-row p-4 bg-white dark:bg-background-dark">
        <View className="flex-row flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
          <TouchableOpacity 
            onPress={() => setActiveScope('global')}
            className={`flex-1 py-3 rounded-xl items-center justify-center ${activeScope === 'global' ? 'bg-white dark:bg-card-dark shadow-sm' : ''}`}
          >
            <Text className={`font-bold ${activeScope === 'global' ? 'text-primary-light dark:text-primary-dark' : 'text-gray-500'}`}>
              Global
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveScope('amigos')}
            className={`flex-1 py-3 rounded-xl items-center justify-center ${activeScope === 'amigos' ? 'bg-white dark:bg-card-dark shadow-sm' : ''}`}
          >
            <Text className={`font-bold ${activeScope === 'amigos' ? 'text-primary-light dark:text-primary-dark' : 'text-gray-500'}`}>
              Amigos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Table Header */}
      <View className="flex-row items-center px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-border-light dark:border-border-dark">
        <Text className="w-12 text-center text-[10px] font-bold text-gray-400 uppercase">#</Text>
        <Text className="flex-1 ml-2 text-[10px] font-bold text-gray-400 uppercase">Leitor</Text>
        <Text className="w-20 text-center text-[10px] font-bold text-gray-400 uppercase">Páginas</Text>
        <Text className="w-16 text-center text-[10px] font-bold text-gray-400 uppercase">Interação</Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (activeScope === 'amigos') return <View className="h-20" />;
    if (!loadingMoreRanking) return <View className="h-20" />;
    return (
      <View className="py-10 items-center">
        <ActivityIndicator color={COLORS.primary.light} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (rankingLoading) return null;

    if (activeScope === 'amigos') {
      return (
        <View className="items-center mt-20 px-10">
          <Ionicons name="people-outline" size={60} color="#cbd5e1" />
          <Text className="text-center mt-4 text-gray-900 dark:text-white font-bold text-lg">
            Sua rede está crescendo!
          </Text>
          <Text className="text-center mt-2 text-gray-500 dark:text-gray-400 font-serif italic">
            Você ainda não possui amigos adicionados. Que tal convidar alguém para ler junto?
          </Text>
          <TouchableOpacity 
            className="mt-6 bg-primary-light dark:bg-primary-dark px-6 py-3 rounded-2xl"
            onPress={() => {/* Navigate to Search/Discovery */}}
          >
            <Text className="text-white font-bold">Descobrir Leitores</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="items-center mt-20 px-10">
        <Ionicons name="trophy-outline" size={60} color="#cbd5e1" />
        <Text className="text-center mt-4 text-gray-500 dark:text-gray-400 font-serif italic">
          O ranking está sendo calculado. Junte-se à elite dos leitores!
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-background-dark">
      {renderHeader()}
      <FlatList
        data={rankingList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={() => activeScope === 'global' && fetchNextRankingPage()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshing={rankingLoading}
        onRefresh={() => fetchRanking()}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
