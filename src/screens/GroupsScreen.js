import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { useBookStore } from '../store/useBookStore';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function GroupsScreen() {
  const [activeTab, setActiveTab] = useState('ranking');
  const books = useBookStore(state => state.books) || [];
  const { isDarkMode } = useThemeStore();

  // Safety check for userTotalPages
  const userTotalPages = useMemo(() => {
    return books.reduce((acc, book) => {
      const logs = book.logs || [];
      return acc + logs.reduce((logAcc, log) => logAcc + (log.pagesRead || 0), 0);
    }, 0);
  }, [books]);

  const rankingData = useMemo(() => {
    return [
      { id: '1', name: '@leitor_mock (Você)', pages: userTotalPages, isMe: true },
      { id: '2', name: 'Sarah_Reads', pages: 124 },
      { id: '3', name: 'Alex_Nerd', pages: 89 },
      { id: '4', name: 'JohnDoe', pages: 45 },
    ].sort((a, b) => b.pages - a.pages);
  }, [userTotalPages]);

  // Robust feed data calculation using forEach instead of flatMap for better compatibility
  const userLogsData = useMemo(() => {
    const logs = [];
    books.forEach(book => {
      if (book && Array.isArray(book.logs)) {
        book.logs.forEach((log, index) => {
          logs.push({
            id: `log-${book.id}-${index}`,
            userName: '@leitor_mock',
            bookTitle: book.title || 'Livro sem título',
            pagesRead: log.pagesRead || 0,
            timeMins: Math.round((log.timeSeconds || 0) / 60),
            hypeCount: 2
          });
        });
      }
    });
    return logs;
  }, [books]);

  const feedData = useMemo(() => {
    return [
      { id: 'mock-1', userName: 'Sarah_Reads', bookTitle: 'Duna', pagesRead: 50, timeMins: 45, hypeCount: 12 },
      { id: 'mock-2', userName: 'Alex_Nerd', bookTitle: 'Senhor dos Anéis', pagesRead: 15, timeMins: 20, hypeCount: 5 },
      ...userLogsData
    ];
    // Removed random sort to ensure stable rendering and avoid potential sort-related engine crashes
  }, [userLogsData]);

  const renderMedal = (index) => {
    if (index === 0) return <Ionicons name="trophy" size={24} color="#D97706" />;
    if (index === 1) return <Ionicons name="medal" size={24} color="#94A3B8" />;
    if (index === 2) return <Ionicons name="ribbon" size={24} color="#B45309" />;
    return <Text className="text-text-muted-light dark:text-text-muted-dark font-mono font-bold">{index + 1}º</Text>;
  };

  const accentColor = isDarkMode ? '#A7C9A7' : '#5B8C5A';

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark px-6 pt-4">
      <View className="flex-row mb-8 bg-card-light dark:bg-card-dark rounded-2xl p-1 border border-border-light dark:border-border-dark shadow-sm">
        <TouchableOpacity
          className={`flex-1 py-3 rounded-[14px] items-center ${activeTab === 'ranking' ? 'bg-primary dark:bg-primary-dark shadow-sm' : 'bg-transparent'}`}
          onPress={() => setActiveTab('ranking')}
        >
          <Text className={`font-bold font-serif ${activeTab === 'ranking' ? 'text-white' : 'text-text-muted-light dark:text-text-muted-dark'}`}>Ranking</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 rounded-[14px] items-center ${activeTab === 'feed' ? 'bg-primary dark:bg-primary-dark shadow-sm' : 'bg-transparent'}`}
          onPress={() => setActiveTab('feed')}
        >
          <Text className={`font-bold font-serif ${activeTab === 'feed' ? 'text-white' : 'text-text-muted-light dark:text-text-muted-dark'}`}>Feed</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'ranking' ? (
        <View className="flex-1">
          <View className="mb-6">
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-1">Leitores</Text>
            <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">Resumo da Semana</Text>
          </View>
          <FlatList
            data={rankingData}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View
                className={`flex-row items-center p-5 mb-4 rounded-3xl border ${item.isMe ? 'bg-primary/5 dark:bg-primary-dark/5 border-primary dark:border-primary-dark' : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark'}`}
              >
                <View className="w-8 items-center">{renderMedal(index)}</View>
                <View className="ml-4 flex-1">
                  <Text className={`text-lg font-serif font-bold ${item.isMe ? 'text-primary dark:text-primary-dark' : 'text-text-light dark:text-text-dark'}`}>
                    {item.name}
                  </Text>
                  <Text className="text-text-muted-light dark:text-text-muted-dark text-xs uppercase tracking-tighter">Entusiasta de clássicos</Text>
                </View>
                <View className="items-end">
                  <Text className="text-text-light dark:text-text-dark font-mono font-bold text-xl">{item.pages}</Text>
                  <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase font-bold">páginas</Text>
                </View>
              </View>
            )}
          />
        </View>
      ) : (
        <View className="flex-1">
          <View className="mb-6">
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-1">Squad</Text>
            <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">Atividade</Text>
          </View>
          <FlatList
            data={feedData}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View className="bg-card-light dark:bg-card-dark p-6 rounded-3xl mb-6 border border-border-light dark:border-border-dark shadow-sm">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 bg-primary/20 dark:bg-primary-dark/20 rounded-full items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color={accentColor} />
                  </View>
                  <View>
                    <Text className="text-text-light dark:text-text-dark font-bold font-serif">{item.userName}</Text>
                    <Text className="text-text-muted-light dark:text-text-muted-dark text-xs font-mono">há 2 horas</Text>
                  </View>
                </View>

                <Text className="text-text-light dark:text-text-dark text-lg font-serif mb-6 leading-6">
                  Mergulhou em <Text className="font-bold font-serif italic">{item.bookTitle}</Text> e conquistou <Text className="text-primary dark:text-primary-dark font-bold">{item.pagesRead} páginas</Text> em {item.timeMins > 0 ? `${item.timeMins} min` : 'alguns instantes'}.
                </Text>

                <View className="flex-row items-center justify-between border-t border-border-light dark:border-border-dark pt-4">
                  <TouchableOpacity className="flex-row items-center">
                    <Ionicons name="heart-outline" size={24} color={accentColor} />
                    <Text className="text-text-muted-light dark:text-text-muted-dark font-bold ml-2">{item.hypeCount}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Ionicons name="share-social-outline" size={22} color={accentColor} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}
