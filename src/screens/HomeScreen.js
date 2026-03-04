import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useBookStore } from '../store/useBookStore';

export default function HomeScreen({ navigation }) {
  const streak = useBookStore(state => state.streak);
  const books = useBookStore(state => state.books);
  
  const readingBooks = books.filter(b => b.status === 'reading');

  return (
    <View className="flex-1 bg-background p-4">
      <View className="mb-8 mt-4 items-center">
        <Text className="text-streak text-7xl font-bold font-mono">🔥 {streak}</Text>
        <Text className="text-gray-300 text-lg mt-2">Dias Consecutivos</Text>
      </View>

      <View className="flex-row justify-between items-center mb-4 px-2">
        <Text className="text-white text-xl font-bold">Lendo Atualmente</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddBook')}>
          <Text className="text-primary text-lg font-bold">+ Adicionar</Text>
        </TouchableOpacity>
      </View>

      {readingBooks.length === 0 ? (
        <View className="flex-1 justify-center items-center bg-card rounded-2xl p-6">
          <Text className="text-gray-400 text-center text-lg mb-6">Nenhuma leitura ativa no momento.</Text>
          <TouchableOpacity 
            className="bg-primary px-8 py-4 rounded-full shadow-lg shadow-primary/50"
            onPress={() => navigation.navigate('AddBook')}
          >
            <Text className="text-background font-bold text-lg uppercase tracking-wider">
              Começar um Livro
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={readingBooks}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="bg-card p-5 rounded-2xl mb-4 border border-card"
              onPress={() => navigation.navigate('Timer', { bookId: item.id })}
            >
              <Text className="text-white text-2xl font-bold mb-2">{item.title}</Text>
              
              <View className="h-2 bg-background rounded-full mb-3 overflow-hidden">
                 <View 
                   className="h-full bg-primary" 
                   style={{ width: `${Math.min((item.currentPage / item.totalPages) * 100, 100)}%` }} 
                 />
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-gray-400">Pág. {item.currentPage} / {item.totalPages}</Text>
                <View className="bg-primary/20 px-4 py-2 rounded-full">
                  <Text className="text-primary font-bold">Continuar ▶</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
