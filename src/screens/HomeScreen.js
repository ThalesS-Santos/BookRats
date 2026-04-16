import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions, Animated, Easing, InteractionManager } from 'react-native';
import { useBookStore } from '../store/useBookStore';
import { useSocialStore } from '../store/useSocialStore';
import { useThemeStore } from '../store/useThemeStore';
import { useIsFocused } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import { Ionicons } from '@expo/vector-icons';
import { getUserAnnotations } from '../api/books';
import { getPublicEchoes, addRatClap } from '../api/social';
import * as Haptics from '../utils/haptics';
import FastAvatar from '../components/FastAvatar';
import Skeleton from '../components/Skeleton';
import CommunityNote from '../components/CommunityNote';

const BookItem = React.memo(({ item, navigation, COLORS, isDarkMode, accentColor, fadeAnim, slideAnim }) => {
   const { width } = Dimensions.get('window');
   const user = useBookStore(state => state.user);

   const handleOpenGallery = () => {
     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
     navigation.navigate('EchoGallery', { 
       bookId: item.id, 
       bookTitle: item.title,
       userCurrentPage: item.currentPage 
     });
   };

   if (item.id.startsWith('s')) { // Skeleton check
     return (
      <View className="bg-card-light dark:bg-card-dark p-8 rounded-[32px] mb-8 border border-border-light dark:border-border-dark shadow-sm">
        <View className="flex-row justify-between items-start mb-6">
          <View className="flex-1 pr-6">
            <Skeleton width="80%" height={28} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={14} />
          </View>
          <Skeleton width={48} height={48} borderRadius={16} />
        </View>
        <Skeleton width="100%" height={6} style={{ marginBottom: 12, borderRadius: 3 }} />
        <View className="flex-row justify-between mb-4">
            <Skeleton width="25%" height={14} />
            <Skeleton width="25%" height={14} />
        </View>
        <View className="flex-row justify-end">
            <Skeleton width={120} height={36} borderRadius={18} />
        </View>
      </View>
     );
   }

   return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View
        className="bg-card-light dark:bg-card-dark rounded-[32px] mb-8 border border-border-light dark:border-border-dark shadow-sm"
        style={{ shadowColor: COLORS.dark_blue, shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden' }}
      >
        <TouchableOpacity
          className="p-8"
          onPress={() => navigation.navigate('Timer', { bookId: item.id })}
          activeOpacity={0.8}
        >
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-1 pr-6">
              <Text className="text-text-light dark:text-text-dark text-2xl font-serif font-bold mb-2" numberOfLines={2}>{item.title}</Text>
              <Text className="text-text-muted-light dark:text-text-muted-dark font-serif italic text-sm">Sua jornada atual</Text>
            </View>
            <View className="bg-primary/10 dark:bg-primary-dark/10 h-12 w-12 rounded-2xl items-center justify-center">
              <Ionicons name="book-outline" size={24} color={accentColor} />
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

          <View className="flex-row justify-end items-center">
            {/* Gallery Button */}
            <TouchableOpacity 
              onPress={handleOpenGallery}
              className="mr-3 p-3 bg-card-light dark:bg-card-dark rounded-full border border-border-light dark:border-border-dark"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={accentColor} />
            </TouchableOpacity>

            <View className="flex-row items-center bg-primary dark:bg-primary-dark px-6 py-3 rounded-full shadow-sm">
              <Text className="text-white font-bold mr-2 text-md">Ler agora</Text>
              <Ionicons name="play-circle" size={20} color="white" />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

export default function HomeScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [isReady, setIsReady] = useState(false);

  // Optimized Selectors with useShallow
  const { streak, books, user, loadingBooks } = useBookStore(useShallow(state => ({
    streak: state.streak,
    books: state.books,
    user: state.user,
    loadingBooks: state.loadingBooks
  })));

  // Removed global social store hook

  const { isDarkMode } = useThemeStore();
  const { COLORS } = require('../constants/colors');
  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;

  const [recentNotes, setRecentNotes] = useState([]);
  const readingBooks = books.filter(b => b.status === 'reading');

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Render dummy data when loading OR when screen is not yet "ready" after interaction
  const listData = (loadingBooks || !isReady) ? [{id: 's1'}, {id: 's2'}, {id: 's3'}] : readingBooks;

  useEffect(() => {
    // Interaction Gatekeeping: Wait for navigation animations to finish
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (isFocused && !loadingBooks && isReady) {
      // Reset values for re-triggering
      fadeAnim.setValue(0);
      slideAnim.setValue(20);

      // Trigger Entry animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isFocused, loadingBooks, isReady]);

  useEffect(() => {
    // Fetch Recent Annotations for home screen
    const fetchNotes = async () => {
      if (!user) return;
      try {
        const allNotes = [];
        // Pull notes from top 3 reading books
        for (const book of readingBooks.slice(0, 3)) {
          const annots = await getUserAnnotations(user.uid, book.id);
          allNotes.push(...annots.map(a => ({ ...a, bookTitle: book.title })));
        }
        allNotes.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setRecentNotes(allNotes.slice(0, 3));
      } catch (err) {
        console.warn("Failed to fetch fresh notes for home:", err.message);
      }
    };
    if (!loadingBooks && readingBooks.length > 0) {
      fetchNotes();
      // Global Echo fetch removed - now handled by individual BookItems
    }
  }, [user, books.length, loadingBooks, readingBooks[0]?.currentPage]);

  const listHeader = () => (
    <Animated.View 
      className="mb-8 mt-4 items-center bg-card-light dark:bg-card-dark p-8 rounded-[40px] border border-border-light dark:border-border-dark shadow-sm"
      style={{ 
        shadowColor: COLORS.dark_blue, 
        shadowOpacity: 0.05, 
        shadowRadius: 15, 
        shadowOffset: { width: 0, height: 4 },
        opacity: loadingBooks ? 1 : fadeAnim,
        transform: [{ translateY: loadingBooks ? 0 : slideAnim }]
      }}
    >
      {loadingBooks ? (
         <>
           <Skeleton width={120} height={60} style={{ marginBottom: 16 }} />
           <Skeleton width={150} height={20} />
         </>
      ) : (
         <>
          <View className="flex-row items-center">
            <Text className="text-streak text-6xl font-bold font-mono">🔥 {streak}</Text>
          </View>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-lg mt-4 font-serif">Dias de leitura</Text>
         </>
      )}
    </Animated.View>
  );

  const renderItem = useCallback(({ item, index }) => (
    <BookItem 
      item={item} 
      navigation={navigation} 
      COLORS={COLORS} 
      isDarkMode={isDarkMode} 
      accentColor={accentColor}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
    />
  ), [navigation, COLORS, isDarkMode, accentColor, fadeAnim, slideAnim]);

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark px-6 pt-4">
      <FlatList
        data={listData}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true} // Unmounts components outside of the window
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5} // Memory optimization
        ListHeaderComponent={() => (
          <Animated.View style={{ opacity: loadingBooks ? 1 : fadeAnim, transform: [{ translateY: loadingBooks ? 0 : slideAnim }] }}>
            <View className="flex-row justify-between items-center mt-6">
              <View>
                <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-1">Bem-vindo, {user?.email?.split('@')[0]}</Text>
                <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">Resumo Diário</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Perfil');
                }}
              >
                <FastAvatar 
                  source={user?.profilePic} 
                  size={50} 
                  priority="high"
                  border 
                />
              </TouchableOpacity>
            </View>
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

          </Animated.View>
        )}
        renderItem={renderItem}
        ListFooterComponent={() => (
          <View className="mb-20">
            {recentNotes.length > 0 && (
              <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 40 }}>
                <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-4 ml-2">Suas Anotações Recentes</Text>
                {recentNotes.map((note, idx) => (
                  <View 
                    key={idx} 
                    className="bg-card-light dark:bg-card-dark p-6 rounded-3xl border border-primary/20 dark:border-primary-dark/20 mb-4 shadow-sm"
                  >
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-primary dark:text-primary-dark font-bold text-xs" numberOfLines={1}>{note.bookTitle}</Text>
                      <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px]">pág. {note.page}</Text>
                    </View>
                    <Text className="text-text-light dark:text-text-dark font-serif italic text-sm leading-5">"{note.text}"</Text>
                  </View>
                ))}
              </Animated.View>
            )}
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center bg-card-light dark:bg-card-dark rounded-3xl p-10 border border-dashed border-border-light dark:border-border-dark mt-4">
            <Ionicons name="cafe-outline" size={60} color={isDarkMode ? COLORS.text.muted.dark : COLORS.text.muted.light} />
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
