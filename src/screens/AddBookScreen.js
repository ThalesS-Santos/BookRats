import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useBookStore } from '../store/useBookStore';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

export default function AddBookScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const addBook = useBookStore(state => state.addBook);
  const { isDarkMode } = useThemeStore();

  const handleSave = () => {
    if (!title || !totalPages) return;
    addBook(title, totalPages);
    navigation.goBack();
  };

  const accentColor = isDarkMode ? '#A7C9A7' : '#5B8C5A';
  const mutedTextColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background-light dark:bg-background-dark"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-8 mb-6"
        >
          <Ionicons name="close" size={32} color={isDarkMode ? '#E0E0E0' : '#1A1A1A'} />
        </TouchableOpacity>

        <Text className="text-text-light dark:text-text-dark text-4xl font-serif font-bold mb-2">Novo Título</Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark text-lg font-serif italic mb-10">Adicione uma nova obra à sua biblioteca pessoal.</Text>

        <View className="mb-8">
          <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 ml-2">Título do Livro</Text>
          <TextInput
            className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark p-5 rounded-2xl text-xl font-serif border border-border-light dark:border-border-dark"
            placeholder="Ex: Cem Anos de Solidão"
            placeholderTextColor={mutedTextColor}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
        </View>

        <View className="mb-12">
          <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 ml-2">Total de Páginas</Text>
          <TextInput
            className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark p-5 rounded-2xl text-xl font-mono border border-border-light dark:border-border-dark"
            placeholder="Ex: 418"
            placeholderTextColor={mutedTextColor}
            keyboardType="numeric"
            value={totalPages}
            onChangeText={setTotalPages}
          />
        </View>

        <View className="flex-1 justify-end pb-10">
          <TouchableOpacity
            className="bg-primary dark:bg-primary-dark p-5 rounded-2xl items-center shadow-xl"
            onPress={handleSave}
            style={{ opacity: (!title || !totalPages) ? 0.6 : 1 }}
            disabled={!title || !totalPages}
          >
            <Text className="text-white font-bold text-xl">Adicionar à Estante</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
