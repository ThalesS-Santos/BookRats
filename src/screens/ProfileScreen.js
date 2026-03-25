import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { useBookStore } from '../store/useBookStore';
import { ALL_BADGES } from '../constants/badges';
import { usePopupStore } from '../store/usePopupStore';

export default function ProfileScreen() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [showCompleted, setShowCompleted] = useState(false);
  const books = useBookStore(state => state.books);
  const streak = useBookStore(state => state.streak);
  const totalPagesRead = useBookStore(state => state.totalPagesRead);
  const user = useBookStore(state => state.user);
  const signOut = useBookStore(state => state.signOut);
  const { showPopup } = usePopupStore();

  const accentColor = isDarkMode ? '#A7C9A7' : '#5B8C5A';
  const completedBooks = books.filter(b => b.status === 'completed').length;
  const readingBooks = books.filter(b => b.status === 'reading').length;

  const userData = {
    streak,
    totalPagesRead,
    completedBooks,
    readingBooks
  };

  const handleSignOut = () => {
    showPopup({
      title: 'Sair da Conta',
      message: 'Deseja realmente sair do BookRats?',
      type: 'confirm',
      onConfirm: signOut
    });
  };

  const InfoRow = ({ label, value, icon, onPress }) => (
    <TouchableOpacity 
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center justify-between p-5 bg-card-light dark:bg-card-dark rounded-2xl mb-4 border border-border-light dark:border-border-dark"
    >
      <View className="flex-row items-center">
        <View className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-lg mr-4">
          <Ionicons name={icon} size={22} color={accentColor} />
        </View>
        <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg">{label}</Text>
      </View>
      <View className="flex-row items-center">
        <Text className="text-text-muted-light dark:text-text-muted-dark font-mono font-bold text-lg mr-2">{value}</Text>
        {onPress && (
          <Ionicons name={showCompleted ? "chevron-up" : "chevron-down"} size={16} color={accentColor} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark p-6" showsVerticalScrollIndicator={false}>
      <View className="items-center mt-12 mb-12">
        <View className="w-24 h-24 bg-primary dark:bg-primary-dark rounded-full items-center justify-center shadow-xl mb-4">
          <Ionicons name="person" size={50} color="white" />
        </View>
        <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold" numberOfLines={1}>
          {user?.email?.split('@')[0] || 'Leitor Rat'}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="flame" size={18} color="#D97706" />
          <Text className="text-streak font-bold font-mono ml-1">Streak: {streak} dias</Text>
        </View>
      </View>

      <View className="mb-10">
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-4 ml-2">Personalização</Text>
        <View className="flex-row items-center justify-between p-5 bg-card-light dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
          <View className="flex-row items-center">
            <View className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-lg mr-4">
              <Ionicons name={isDarkMode ? "moon" : "sunny"} size={22} color={accentColor} />
            </View>
            <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg">Modo Escuro</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: '#CBD5E1', true: accentColor }}
            thumbColor={'#ffffff'}
          />
        </View>
      </View>

      <View className="mb-10">
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-4 ml-2">Mural de Troféus</Text>
        <View className="flex-row flex-wrap">
          {ALL_BADGES.map(badge => {
            const isUnlocked = badge.check(userData);
            return (
              <TouchableOpacity 
                key={badge.id} 
                onPress={() => showPopup({ title: badge.title, message: `Missão: ${badge.mission}`, type: isUnlocked ? 'success' : 'info' })}
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

      <View>
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-4 ml-2">Estatísticas</Text>
        <InfoRow 
          label="Livros Lidos" 
          value={completedBooks} 
          icon="ribbon-outline" 
          onPress={() => setShowCompleted(!showCompleted)} 
        />
        
        {showCompleted && (
          <View className="mb-4 bg-background-light dark:bg-background-dark p-4 rounded-2xl border border-border-light dark:border-border-dark -mt-2">
            {books.filter(b => b.status === 'completed').map((b, idx, arr) => (
              <View key={b.id} className={`flex-row justify-between items-center py-2 ${idx !== arr.length - 1 ? 'border-b border-border-light dark:border-border-dark' : ''}`}>
                <Text className="text-text-light dark:text-text-dark font-bold text-sm flex-1 mr-2">{b.title}</Text>
                <Text className="text-text-muted-light dark:text-text-muted-dark text-xs">{b.totalPages} pág.</Text>
              </View>
            ))}
            {completedBooks === 0 && (
              <Text className="text-text-muted-light dark:text-text-muted-dark text-sm text-center">Nenhum livro lido ainda.</Text>
            )}
          </View>
        )}

        <InfoRow label="Total de Páginas" value={totalPagesRead.toLocaleString()} icon="layers-outline" />
      </View>

      <TouchableOpacity
        className="mt-8 mb-6 p-5 items-center bg-red-500/10 rounded-2xl border border-red-500/20"
        onPress={handleSignOut}
      >
        <Text className="text-red-500 font-bold text-lg">Sair da Conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
