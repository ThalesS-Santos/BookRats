import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useBookStore } from '../store/useBookStore';

export default function GroupsScreen() {
  const [activeTab, setActiveTab] = useState('ranking'); // ranking or feed
  const books = useBookStore(state => state.books);
  
  // Calculate user total pages this week (mocked as all logs since we don't have date filtering in MVP)
  const userTotalPages = books.reduce((acc, book) => {
    return acc + book.logs.reduce((logAcc, log) => logAcc + log.pagesRead, 0);
  }, 0);

  // Mocked Ranking Data
  const rankingData = [
    { id: '1', name: '@leitor_mock (Você)', pages: userTotalPages, isMe: true },
    { id: '2', name: 'Sarah_Reads', pages: 124 },
    { id: '3', name: 'Alex_Nerd', pages: 89 },
    { id: '4', name: 'JohnDoe', pages: 45 },
  ].sort((a, b) => b.pages - a.pages);

  // Mocked Feed Data combined with user logs
  const userLogs = books.flatMap(book => book.logs.map((log, index) => ({
    id: `log-${book.id}-${index}`,
    userName: '@leitor_mock',
    bookTitle: book.title,
    pagesRead: log.pagesRead,
    timeMins: Math.round(log.timeSeconds / 60),
    hypeCount: 2
  })));
  
  const feedData = [
    ...userLogs,
    { id: 'mock-1', userName: 'Sarah_Reads', bookTitle: 'Duna', pagesRead: 50, timeMins: 45, hypeCount: 12 },
    { id: 'mock-2', userName: 'Alex_Nerd', bookTitle: 'Senhor dos Anéis', pagesRead: 15, timeMins: 20, hypeCount: 5 }
  ].sort(() => Math.random() - 0.5); // Randomize for feed

  const renderMedal = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}º`;
  };

  return (
    <View className="flex-1 bg-background pt-8 px-4">
      {/* Tabs */}
      <View className="flex-row justify-around mb-6 bg-card rounded-full p-2">
        <TouchableOpacity 
          className={`px-8 py-3 rounded-full ${activeTab === 'ranking' ? 'bg-primary' : 'bg-transparent'}`}
          onPress={() => setActiveTab('ranking')}
        >
          <Text className={`${activeTab === 'ranking' ? 'text-background' : 'text-gray-400'} font-bold`}>Ranking</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className={`px-8 py-3 rounded-full ${activeTab === 'feed' ? 'bg-primary' : 'bg-transparent'}`}
          onPress={() => setActiveTab('feed')}
        >
          <Text className={`${activeTab === 'feed' ? 'text-background' : 'text-gray-400'} font-bold`}>Feed</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'ranking' ? (
        <View className="flex-1">
          <Text className="text-white text-2xl font-bold mb-4 ml-2">Ranking da Semana</Text>
          <FlatList
            data={rankingData}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => (
              <View className={`flex-row items-center p-4 mb-3 rounded-2xl ${item.isMe ? 'bg-primary/20 border border-primary' : 'bg-card'}`}>
                <Text className="text-2xl w-10 text-center">{renderMedal(index)}</Text>
                <Text className={`text-lg font-bold ml-4 flex-1 ${item.isMe ? 'text-primary' : 'text-white'}`}>
                  {item.name}
                </Text>
                <Text className="text-white font-bold text-xl">{item.pages} <Text className="text-gray-400 text-sm font-normal">pgs</Text></Text>
              </View>
            )}
          />
        </View>
      ) : (
        <View className="flex-1">
          <Text className="text-white text-2xl font-bold mb-4 ml-2">Atividade do Squad</Text>
          <FlatList
            data={feedData}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View className="bg-card p-5 rounded-2xl mb-4">
                <Text className="text-primary font-bold mb-1">{item.userName}</Text>
                <Text className="text-white text-lg mb-4">
                  Leu <Text className="font-bold">{item.pagesRead} páginas</Text> de {item.bookTitle} em {item.timeMins > 0 ? `${item.timeMins} min` : 'alguns segundos'}.
                </Text>
                
                <View className="flex-row items-center border-t border-background pt-3">
                  <TouchableOpacity className="flex-row items-center bg-background px-4 py-2 rounded-full">
                    <Text className="text-xl mr-2">🔥</Text>
                    <Text className="text-white font-bold">Hype! ({item.hypeCount})</Text>
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
