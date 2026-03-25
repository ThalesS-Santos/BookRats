import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import BookLoader from '../components/BookLoader';
import { Ionicons } from '@expo/vector-icons';
import { getUserBooks, getUserAnnotations } from '../api/books';
import { getUserDetails } from '../api/social';
import { useSocialStore } from '../store/useSocialStore';
import { useThemeStore } from '../store/useThemeStore';
import { usePopupStore } from '../store/usePopupStore';
import { COLORS } from '../constants/colors';
import { ALL_BADGES } from '../constants/badges';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { isDarkMode } = useThemeStore();
  const { removeFriend } = useSocialStore();
  const { showPopup } = usePopupStore();
  const [loading, setLoading] = useState(true);
  const [friend, setFriend] = useState(null);
  const [books, setBooks] = useState([]);
  const [notes, setNotes] = useState([]);

  const loadData = async () => {
    try {
      const userData = await getUserDetails(userId);
      setFriend(userData);
      
      try {
        const userBooks = await getUserBooks(userId);
        setBooks(userBooks);

        // Fetch Annotations for each book
        const allNotes = [];
        for (const book of userBooks) {
          const annots = await getUserAnnotations(userId, book.id);
          // Filtra Notas Públicas se não for você mesmo (ou se quiser seguir isPublic)
          const publicAnnots = annots.filter(a => a.isPublic === true);
          allNotes.push(...publicAnnots.map(a => ({ ...a, bookTitle: book.title })));
        }
        // Ordena por timestamp se houver
        allNotes.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setNotes(allNotes);
      } catch (bookError) {
        console.warn("Could not load user books (Permission/Privacy):", bookError.message);
      }
    } catch (error) {
      showPopup({ title: 'Erro', message: "Falha ao carregar perfil.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleRemoveFriend = () => {
    showPopup({
      title: 'Desfazer Amizade',
      message: `Tem certeza que deseja desfazer a amizade com ${friend?.username || friend?.email.split('@')[0]}?`,
      type: 'confirm',
      onConfirm: async () => {
        await removeFriend(userId);
        navigation.navigate('MainTabs', { screen: 'Grupo' });
      }
    });
  };

  if (loading) {
    return <BookLoader isVisible={loading} />;
  }

  if (!friend) return null;

  const completedBooksCount = books.filter(b => b.status === 'completed').length;
  const readingBooksCount = books.filter(b => b.status === 'reading').length;

  const userData = {
    streak: friend.current_streak || 0,
    totalPagesRead: friend.total_pages_read || 0,
    completedBooks: completedBooksCount,
    readingBooks: readingBooksCount
  };

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark p-6">
      <TouchableOpacity onPress={() => navigation.goBack()} className="mt-12 mb-4">
        <Ionicons name="chevron-back" size={28} color={isDarkMode ? '#E0E0E0' : '#1A1A1A'} />
      </TouchableOpacity>

      {/* Profile Header */}
      <View className="items-center mb-8">
        <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-4 border-2 border-primary">
          <Ionicons name="person" size={48} color="#22C55E" />
        </View>
        <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">
          {friend.username || friend.email.split('@')[0]}
        </Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">
          {friend.isOnline ? '🟢 Online' : '⚪ Offline'}
        </Text>
      </View>

      {/* Stats Cards */}
      <View className="flex-row justify-between mb-8">
        <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex-1 mr-2 items-center">
          <Text className="text-primary font-bold text-2xl">{friend.total_pages_read || 0}</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-xs uppercase">Páginas</Text>
        </View>
        <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex-1 ml-2 items-center">
          <Text style={{ color: COLORS.streak }} className="font-bold text-2xl">{friend.current_streak || 0}🔥</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-xs uppercase">Streak</Text>
        </View>
      </View>

      {/* Trophy Wall (Badges) */}
      <View className="mb-8">
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 ml-2">Mural de Troféus</Text>
        <View className="flex-row flex-wrap">
          {ALL_BADGES.map(badge => {
            const isUnlocked = badge.check(userData);
            return (
              <TouchableOpacity 
                key={badge.id} 
                onPress={() => Alert.alert(badge.title, `Missão: ${badge.mission}`)}
                className={`p-3 rounded-xl border items-center mr-2 mb-2 w-[30%] ${
                  isUnlocked 
                    ? 'bg-card-light dark:bg-card-dark border-primary/20 dark:border-primary-dark/20' 
                    : 'bg-card-light dark:bg-card-dark border-dashed border-gray-400 dark:border-gray-600 opacity-40'
                }`}
              >
                <View className="relative">
                  <Ionicons name={badge.icon} size={28} color={isUnlocked ? "#D97706" : "#4B5563"} />
                  {!isUnlocked && (
                    <View className="absolute -top-1 -right-1 bg-background-light dark:bg-background-dark rounded-full p-0.5">
                      <Ionicons name="lock-closed" size={10} color="#EF4444" />
                    </View>
                  )}
                </View>
                <Text className={`text-[10px] font-bold mt-1 text-center ${isUnlocked ? 'text-text-light dark:text-text-dark' : 'text-text-muted-light dark:text-text-muted-dark'}`} numberOfLines={1}>{badge.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Books List */}
      <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 ml-2">Livros lendo ({books.filter(b => b.status === 'reading').length})</Text>
      {books.filter(b => b.status === 'reading').map(book => (
        <View key={book.id} className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark mb-2 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-text-light dark:text-text-dark font-bold">{book.title}</Text>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-xs">{book.currentPage} / {book.totalPages} pág.</Text>
          </View>
          <View className="bg-primary/20 p-1.5 rounded-lg">
            <Text className="text-primary dark:text-primary-dark font-bold text-xs">
              {book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0}%
            </Text>
          </View>
        </View>
      ))}

      {/* Mural de Anotações (Post-it Style) */}
      <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 mt-6 ml-2">Mural de Notas ({notes.length})</Text>
      {notes.map(note => (
        <View key={note.id} className="bg-card-light/40 dark:bg-card-dark/40 p-4 rounded-2xl border border-primary/20 dark:border-primary-dark/20 mb-3 shadow-sm">
          <View className="flex-row justify-between mb-2">
            <Text className="text-primary dark:text-primary-dark font-bold text-xs" numberOfLines={1}>{note.bookTitle}</Text>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px]">pág. {note.page}</Text>
          </View>
          <Text className="text-text-light dark:text-text-dark font-serif italic text-sm leading-5">"{note.text}"</Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="globe-outline" size={12} color="#6B7280" className="mr-1" />
            <Text className="text-text-muted-light dark:text-text-muted-dark text-[9px]">Pública</Text>
          </View>
        </View>
      ))}
      {notes.length === 0 && (
        <Text className="text-text-muted-light dark:text-text-muted-dark text-xs ml-2">Nenhuma anotação pública.</Text>
      )}

      {/* Danger Zone */}
      <TouchableOpacity 
        onPress={handleRemoveFriend}
        className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl items-center mt-8 mb-12 flex-row justify-center"
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" className="mr-2" />
        <Text className="text-red-500 font-bold">Desfazer Amizade</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
