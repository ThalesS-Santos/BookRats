import React from 'react';
import { View, Text, Switch, TouchableOpacity, Alert } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { useBookStore } from '../store/useBookStore';

export default function ProfileScreen() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const books = useBookStore(state => state.books);
  const streak = useBookStore(state => state.streak);
  const totalPagesRead = useBookStore(state => state.totalPagesRead);
  const user = useBookStore(state => state.user);
  const signOut = useBookStore(state => state.signOut);

  const accentColor = isDarkMode ? '#A7C9A7' : '#5B8C5A';
  const completedBooks = books.filter(b => b.status === 'completed').length;

  const handleSignOut = () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const InfoRow = ({ label, value, icon }) => (
    <View className="flex-row items-center justify-between p-5 bg-card-light dark:bg-card-dark rounded-2xl mb-4 border border-border-light dark:border-border-dark">
      <View className="flex-row items-center">
        <View className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-lg mr-4">
          <Ionicons name={icon} size={22} color={accentColor} />
        </View>
        <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg">{label}</Text>
      </View>
      <Text className="text-text-muted-light dark:text-text-muted-dark font-mono font-bold text-lg">{value}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark p-6">
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

      <View>
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-4 ml-2">Estatísticas</Text>
        <InfoRow label="Livros Lidos" value={completedBooks} icon="ribbon-outline" />
        <InfoRow label="Total de Páginas" value={totalPagesRead.toLocaleString()} icon="layers-outline" />
      </View>

      <TouchableOpacity
        className="mt-auto mb-6 p-5 items-center bg-red-500/10 rounded-2xl border border-red-500/20"
        onPress={handleSignOut}
      >
        <Text className="text-red-500 font-bold text-lg">Sair da Conta</Text>
      </TouchableOpacity>
    </View>
  );
}
