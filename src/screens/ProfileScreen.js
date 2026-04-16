import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/useThemeStore';
import { useBookStore } from '../store/useBookStore';
import { useUserStore } from '../store/useUserStore';
import { usePopupStore } from '../store/usePopupStore';
import { ALL_BADGES } from '../constants/badges';
import * as Haptics from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import FastAvatar from '../components/FastAvatar';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme, hapticsEnabled, setHapticsEnabled } = useThemeStore();
  const [showCompleted, setShowCompleted] = useState(false);
  const books = useBookStore(state => state.books);
  const streak = useBookStore(state => state.streak);
  const totalPagesRead = useBookStore(state => state.totalPagesRead);
  const user = useBookStore(state => state.user);
  const { hasInfluencerBadge, unreadCount } = useUserStore();
  const signOut = useBookStore(state => state.signOut);
  const { showPopup } = usePopupStore();
  const { COLORS } = require('../constants/colors');

  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;
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
      
      {/* Top Header Row for Notifications */}
      <View className="flex-row justify-end items-center mb-2 z-10">
        <TouchableOpacity 
          onPress={() => navigation.navigate('Notifications')}
          className="p-3 bg-card-light dark:bg-card-dark rounded-full shadow-sm border border-border-light dark:border-border-dark relative"
        >
          <Ionicons name="notifications-outline" size={24} color={isDarkMode ? 'white' : 'black'} />
          {unreadCount > 0 && (
            <View className="absolute top-2 right-2 w-3 h-3 rounded-full bg-neon-green border-2 border-background-light dark:border-background-dark" style={{ backgroundColor: COLORS.neon_green }} />
          )}
        </TouchableOpacity>
      </View>

      <View className="items-center mt-2 mb-10">
        <FastAvatar 
          source={user?.profilePic} 
          size={100} 
          style={{ marginBottom: 16 }} 
          border 
        />
        <View className="flex-row items-center">
          <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold" numberOfLines={1}>
            {user?.email?.split('@')[0] || 'Leitor Rat'}
          </Text>
          {(hasInfluencerBadge || user?.isInfluencer) && (
            <Ionicons name="star" size={24} color={COLORS.neon_green} style={{ marginLeft: 8 }} />
          )}
        </View>
        <View className="flex-row items-center mt-2">
          <Ionicons name="flame" size={18} color={COLORS.streak} />
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

        <View className="flex-row items-center justify-between p-5 bg-card-light dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark mt-4 shadow-sm">
          <View className="flex-row items-center">
            <View className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-lg mr-4">
              <Ionicons name="pulse-outline" size={22} color={accentColor} />
            </View>
            <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg">Feedback Tátil</Text>
          </View>
          <Switch
            value={hapticsEnabled}
            onValueChange={setHapticsEnabled}
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  showPopup({ title: badge.title, message: `Missão: ${badge.mission}`, type: isUnlocked ? 'success' : 'info' });
                }}
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
