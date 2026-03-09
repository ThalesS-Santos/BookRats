import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { useBookStore } from '../store/useBookStore';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const streak = useBookStore(state => state.streak);
  const books = useBookStore(state => state.books);
  const { isDarkMode } = useThemeStore();

  const readingBooks = books.filter(b => b.status === 'reading');

  const listHeader = () => (
    <View className="mb-8 mt-4 items-center bg-card-light dark:bg-card-dark p-8 rounded-[40px] border border-border-light dark:border-border-dark">
      <View className="flex-row items-center">
        <Text className="text-streak text-6xl font-bold font-mono">🔥 {streak}</Text>
      </View>
      <Text className="text-text-muted-light dark:text-text-muted-dark text-lg mt-2 font-serif">Dias de leitura</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark px-6 pt-4">
      <FlatList
        data={readingBooks}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            {listHeader()}
            <View className="flex-row justify-between items-end mb-6">
              <View>
                <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-[3px] text-xs font-bold mb-1">Biblioteca</Text>
                <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">Lendo agora</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddBook')}
                className="bg-primary dark:bg-primary-dark w-12 h-12 rounded-full items-center justify-center shadow-lg"
              >
                <Ionicons name="add" size={30} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-card-light dark:bg-card-dark p-6 rounded-3xl mb-6 border border-border-light dark:border-border-dark shadow-sm"
            onPress={() => navigation.navigate('Timer', { bookId: item.id })}
          >
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 pr-4">
                <Text className="text-text-light dark:text-text-dark text-2xl font-serif font-bold mb-1" numberOfLines={2}>{item.title}</Text>
                <Text className="text-text-muted-light dark:text-text-muted-dark font-serif italic">Sua jornada atual</Text>
              </View>
              <View className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-xl">
                <Ionicons name="book-outline" size={24} color={isDarkMode ? '#A7C9A7' : '#5B8C5A'} />
              </View>
            </View>

            <View className="mb-4">
              <View className="h-[6px] bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary dark:bg-primary-dark"
                  style={{ width: `${Math.min((item.currentPage / item.totalPages) * 100, 100)}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-2">
                <Text className="text-text-muted-light dark:text-text-muted-dark text-sm font-mono">
                  {Math.round((item.currentPage / item.totalPages) * 100)}% concluído
                </Text>
                <Text className="text-text-muted-light dark:text-text-muted-dark text-sm font-mono">
                  {item.currentPage}/{item.totalPages} págs
                </Text>
              </View>
            </View>

            <View className="flex-row justify-end">
              <View className="flex-row items-center bg-primary dark:bg-primary-dark px-4 py-2 rounded-full">
                <Text className="text-white font-bold mr-2">Ler agora</Text>
                <Ionicons name="play-circle" size={18} color="white" />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center bg-card-light dark:bg-card-dark rounded-3xl p-10 border border-dashed border-border-light dark:border-border-dark mt-4">
            <Ionicons name="cafe-outline" size={60} color={isDarkMode ? '#525252' : '#CBD5E1'} />
            <Text className="text-text-muted-light dark:text-text-muted-dark text-center text-lg mt-4 font-serif">A estante está vazia.</Text>
            <TouchableOpacity
              className="mt-6 border-b-2 border-primary dark:border-primary-dark pb-1"
              onPress={() => navigation.navigate('AddBook')}
            >
              <Text className="text-primary dark:text-primary-dark font-bold text-lg">
                Começar nova história
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
