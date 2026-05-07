import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { BookLoader } from '@ui/components';
import { Ionicons } from '@expo/vector-icons';
import { getUserBooks, getUserAnnotations, getUserReadingLogs } from '@core/api/books';
import { getUserDetails } from '@core/api/social';
import { useMainStore } from '../../core/store';
import { calculateStreakFromLogs } from '@utils/streak';
import { useSocialStore } from '../../store/useSocialStore';
import { useThemeStore } from '../../store/useThemeStore';
import { usePopupStore } from '../../store/usePopupStore';
import * as Haptics from '../../utils/haptics';
import { FastAvatar } from '@ui/components';
import { COLORS } from '@constants/colors';
import { ALL_BADGES } from '@constants/badges';
import { useMemo } from 'react';

const formatDuration = (totalSeconds) => {
  if (!totalSeconds) return "---";
  const hrs = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
};

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { isDarkMode } = useThemeStore();
  const { removeFriend } = useSocialStore();
  const { showPopup } = usePopupStore();
  
  const user = useMainStore(state => state.user);
  const myTotalPages = useMainStore(state => state.totalPagesRead);
  const myStreak = useMainStore(state => state.streak);

  const [loading, setLoading] = useState(true);
  const [friend, setFriend] = useState(null);
  const [books, setBooks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [logs, setLogs] = useState([]);

  const loadData = async () => {
    try {
      const userData = await getUserDetails(userId);
      setFriend(userData);
      
      const isMe = userId === user?.uid;

      // 1. Fetch Books (Now public in rules)
      try {
        const userBooks = await getUserBooks(userId);
        setBooks(userBooks);
      } catch (e) {
        console.warn("Could not load user books:", e.message);
      }

      // 2. Fetch Logs (Private - Only for Me)
      if (isMe) {
        try {
          const userLogs = await getUserReadingLogs(userId);
          setLogs(userLogs);
        } catch (e) {
          console.warn("Could not load logs:", e.message);
        }
      }

      // 3. Fetch Annotations
      try {
        // We only fetch annotations if we have books
        // Wait, for performance we should only do this if needed
        if (books.length > 0 || userId) {
          const allNotes = [];
          // Note: This loop might be slow if many books. 
          // Usually we'd use a collectionGroup query here too, but for simplicity:
          const targetBooks = books.length > 0 ? books : (await getUserBooks(userId).catch(() => []));
          
          for (const book of targetBooks) {
            try {
              const annots = await getUserAnnotations(userId, book.id, !isMe);
              allNotes.push(...annots.map(a => ({ ...a, bookTitle: book.title })));
            } catch (e) {}
          }
          allNotes.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
          setNotes(allNotes);
        }
      } catch (noteError) {
        console.warn("Could not load user notes:", noteError.message);
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

  const totalPagesRead = useMemo(() => {
    if (userId === user?.uid) return myTotalPages;
    const sum = logs.reduce((acc, log) => acc + (log.pagesRead || 0), 0);
    // Fallback to friend data if logs are empty but friend has data (legacy migration)
    return sum || friend?.total_pages_read || 0;
  }, [logs, friend, userId, user?.uid, myTotalPages]);

  const currentStreak = useMemo(() => {
    if (userId === user?.uid) return myStreak;
    const streak = calculateStreakFromLogs(logs);
    return streak || friend?.current_streak || 0;
  }, [logs, friend, userId, user?.uid, myStreak]);

  const handleRemoveFriend = () => {
    showPopup({
      title: 'Desfazer Amizade',
      message: `Tem certeza que deseja desfazer a amizade com ${friend?.username || friend?.email.split('@')[0]}?`,
      type: 'confirm',
      onConfirm: async () => {
        await removeFriend(userId);
        navigation.goBack();
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
    streak: currentStreak,
    totalPagesRead: totalPagesRead,
    completedBooks: completedBooksCount,
    readingBooks: readingBooksCount
  };

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark p-6" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => navigation.goBack()} className="mt-12 mb-4 w-10 h-10 items-center justify-center rounded-full bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#E0E0E0' : '#1A1A1A'} />
      </TouchableOpacity>

      {/* Profile Header */}
      <View className="items-center mt-12 mb-10">
        <FastAvatar 
          source={friend.profilePic} 
          size={100} 
          style={{ marginBottom: 16 }} 
          border 
        />
        <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold" numberOfLines={1}>
          {friend.username || friend.email.split('@')[0]}
        </Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">
          {friend.isOnline ? '🟢 Online' : '⚪ Offline'}
        </Text>
      </View>

      {/* Stats Cards Row 1 */}
      <View className="flex-row justify-between mb-4">
        <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex-1 mr-2 items-center">
          <Text className="text-primary font-bold text-2xl">{totalPagesRead}</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase">Páginas Totais</Text>
        </View>
        <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex-1 ml-2 items-center">
          <Text style={{ color: COLORS.streak }} className="font-bold text-2xl">{currentStreak}🔥</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase">Streak Atual</Text>
        </View>
      </View>

      {/* Stats Cards Row 2 (Performance Metrics) */}
      <View className="flex-row justify-between mb-8">
        <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex-1 mr-2 items-center">
          <Text className="text-text-light dark:text-text-dark font-bold text-xl">{friend.total_books_completed || 0}</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase font-bold">Livros Lidos</Text>
        </View>
        <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex-1 ml-2 items-center">
          <Text className="text-primary dark:text-primary-dark font-bold text-xl">{formatDuration(friend.max_reading_session)}</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase font-bold text-center">Recorde de Fôlego</Text>
        </View>
      </View>

      {/* Trophy Wall */}
      <View className="mb-8">
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-4 ml-2">Mural de Troféus</Text>
        <View className="flex-row flex-wrap justify-between">
          {ALL_BADGES.map(badge => {
            const isUnlocked = badge.check(userData);
            return (
              <TouchableOpacity 
                key={badge.id} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  showPopup({ title: badge.title, message: `Missão: ${badge.mission}`, type: isUnlocked ? 'success' : 'info' });
                }}
                className={`p-3 rounded-xl border items-center mb-2 w-[31%] ${
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

      {/* Reading Progress */}
      <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 ml-2">Livros Ativos ({books.filter(b => b.status === 'reading').length})</Text>
      {books.filter(b => b.status === 'reading').map(book => (
        <View key={book.id} className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark mb-2 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-text-light dark:text-text-dark font-bold">{book.title}</Text>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-xs">{book.currentPage} / {book.totalPages} pág.</Text>
          </View>
          <View className="bg-primary/20 p-2 rounded-lg">
            <Text className="text-primary dark:text-primary-dark font-bold text-xs">
              {book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0}%
            </Text>
          </View>
        </View>
      ))}

      {/* Public Notes */}
      <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 mt-6 ml-2">Mural de Notas ({notes.length})</Text>
      {notes.map((note, idx) => (
        <View key={idx} className="bg-card-light/40 dark:bg-card-dark/40 p-4 rounded-2xl border border-primary/20 dark:border-primary-dark/20 mb-3 shadow-sm">
          <View className="flex-row justify-between mb-2">
            <Text className="text-primary dark:text-primary-dark font-bold text-xs" numberOfLines={1}>{note.bookTitle}</Text>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px]">pág. {note.page}</Text>
          </View>
          <Text className="text-text-light dark:text-text-dark font-serif italic text-sm leading-5">"{note.text}"</Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="globe-outline" size={12} color="#6B7280" />
            <Text className="text-text-muted-light dark:text-text-muted-dark text-[9px] ml-1">Público</Text>
          </View>
        </View>
      ))}
      {notes.length === 0 && (
        <Text className="text-text-muted-light dark:text-text-muted-dark text-xs italic text-center py-4">Nenhuma nota pública disponível.</Text>
      )}

      {/* Danger Zone */}
      <TouchableOpacity 
        onPress={handleRemoveFriend}
        className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl items-center mt-8 mb-20 flex-row justify-center"
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
        <Text className="text-red-500 font-bold ml-2">Desfazer Amizade</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
