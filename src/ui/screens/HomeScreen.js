import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions, Animated } from 'react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../utils/haptics';
import { ProgressBookCard, FastAvatar, Skeleton } from '@ui/components';
import { useHomeLogic } from '@ui/hooks/useHomeLogic';
import { useMainStore } from '@core/store';

const BookListItem = React.memo(({ item, navigation, COLORS, isDarkMode, accentColor, fadeAnim, slideAnim, onConfigPress }) => {
  const handleOpenGallery = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('EchoGallery', { 
      bookId: item.id, 
      bookTitle: item.title,
      userCurrentPage: item.currentPage 
    });
  };

  if (item.id.startsWith('s')) {
    return (
      <View className="bg-card-light dark:bg-card-dark p-4 rounded-3xl mb-4 border border-border-light dark:border-border-dark shadow-sm flex-row h-32 items-center">
        <Skeleton width={60} height={90} borderRadius={8} />
        <View className="flex-1 ml-4 justify-around h-20">
          <View>
            <Skeleton width="80%" height={16} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={10} />
          </View>
          <Skeleton width="100%" height={8} borderRadius={4} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <ProgressBookCard 
        book={item}
        onPress={() => navigation.navigate('Timer', { bookId: item.id })}
        onConfigPress={() => onConfigPress?.(item)}
      />
    </Animated.View>
  );
});

export default function HomeScreen({ navigation }) {
  const { isDarkMode } = useThemeStore();
  const { COLORS } = require('@constants/colors');
  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;


  const {
    user,
    streak,
    loadingBooks,
    isReady,
    listData,
    recentNotes,
    fadeAnim,
    slideAnim
  } = useHomeLogic();

  const handleOpenConfig = useCallback((book) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('BookEdit', { book });
  }, [navigation]);

  const listHeader = () => (
    <Animated.View 
      className="mb-8 mt-4 items-center bg-card-light dark:bg-card-dark p-8 rounded-ultra border border-border-light dark:border-border-dark shadow-sm"
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
    <BookListItem 
      item={item} 
      navigation={navigation} 
      COLORS={COLORS} 
      isDarkMode={isDarkMode} 
      accentColor={accentColor}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      onConfigPress={handleOpenConfig}
    />
  ), [navigation, COLORS, isDarkMode, accentColor, fadeAnim, slideAnim, handleOpenConfig]);

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark px-6 pt-4">
      <FlatList
        data={listData}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
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
