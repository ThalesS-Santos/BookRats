import React, { useMemo, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useBookStore } from '../store/useBookStore';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

export default function RankingScreen() {
  const { isDarkMode } = useThemeStore();
  const user = useBookStore(state => state.user);
  const users = useBookStore(state => state.users) || [];
  const subscribeToUsers = useBookStore(state => state.subscribeToUsers);
  const rankingError = useBookStore(state => state.rankingError);

  useEffect(() => {
    const unsubUsers = subscribeToUsers();
    return () => {
      if (unsubUsers) unsubUsers();
    };
  }, [subscribeToUsers]);

  const rankingData = useMemo(() => {
    return users.map(u => ({
      id: u.id,
      name: u.id === user?.uid ? `${u.displayName || u.email?.split('@')[0]} (Você)` : (u.displayName || u.email?.split('@')[0]),
      pages: u.total_pages_read || 0,
      isMe: u.id === user?.uid,
      isOnline: u.isOnline,
      currentReading: u.currentReadingBook
    })).sort((a, b) => b.pages - a.pages);
  }, [users, user]);

  const renderMedal = (index) => {
    if (index === 0) return <Ionicons name="trophy" size={24} color="#D97706" />;
    if (index === 1) return <Ionicons name="medal" size={24} color="#94A3B8" />;
    if (index === 2) return <Ionicons name="ribbon" size={24} color="#B45309" />;
    return <Text className="text-text-muted-light dark:text-text-muted-dark font-mono font-bold">{index + 1}º</Text>;
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark px-6 pt-4">
      <View className="mb-6">
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-1">Leitores</Text>
        <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">Resumo da Semana</Text>
      </View>

      {rankingError && (
        <View className="bg-red-500/10 p-4 rounded-2xl mb-4 border border-red-500/20">
          <Text className="text-red-500 font-bold text-sm">⚠️ Erro: {rankingError}</Text>
        </View>
      )}

      <FlatList
        data={rankingData}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View
            className={`flex-row items-center p-5 mb-4 rounded-3xl border ${item.isMe ? 'bg-primary/5 dark:bg-primary-dark/5 border-primary dark:border-primary-dark' : 'bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark'}`}
          >
            <View className="w-8 items-center">{renderMedal(index)}</View>
            <View className="ml-4 flex-1">
              <View className="flex-row items-center">
                <Text className={`text-lg font-serif font-bold ${item.isMe ? 'text-primary dark:text-primary-dark' : 'text-text-light dark:text-text-dark'}`}>
                  {item.name}
                </Text>
                {item.isOnline && (
                  <View className="w-2.5 h-2.5 bg-green-500 rounded-full ml-2" />
                )}
              </View>
              <Text className="text-text-muted-light dark:text-text-muted-dark text-xs uppercase tracking-tighter">
                {item.currentReading ? `📖 Lendo: ${item.currentReading}` : 'Descansando'}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-text-light dark:text-text-dark font-mono font-bold text-xl">{item.pages}</Text>
              <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase font-bold">páginas</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
