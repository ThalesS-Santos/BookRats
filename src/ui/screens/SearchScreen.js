import React, { useState, useCallback } from 'react';

import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { COLORS } from '@constants/colors';

import { useBookSearch } from '../../hooks/useBookSearch';
import { useThemeStore } from '../../store/useThemeStore';
import { SearchPreview } from '../components';

const SUBJECTS = [
  { id: 'fiction', label: 'Ficção', icon: 'rocket-outline' },
  { id: 'fantasy', label: 'Fantasia', icon: 'sparkles-outline' },
  { id: 'magic', label: 'Magia', icon: 'flash-outline' },
  { id: 'adventure', label: 'Aventura', icon: 'compass-outline' },
  { id: 'mystery', label: 'Mistério', icon: 'search-outline' },
  { id: 'horror', label: 'Terror', icon: 'skull-outline' },
  { id: 'romance', label: 'Romance', icon: 'heart-outline' },
  { id: 'biography', label: 'Biografia', icon: 'person-outline' },
  { id: 'history', label: 'História', icon: 'library-outline' },
  { id: 'science', label: 'Ciência', icon: 'flask-outline' },
  { id: 'philosophy', label: 'Filosofia', icon: 'bulb-outline' },
  { id: 'psychology', label: 'Psicologia', icon: 'headset-outline' },
  { id: 'business', label: 'Negócios', icon: 'briefcase-outline' },
  { id: 'tech', label: 'Tech', icon: 'code-working-outline' },
  { id: 'art', label: 'Arte', icon: 'brush-outline' },
  { id: 'poetry', label: 'Poesia', icon: 'color-filter-outline' },
  { id: 'comics', label: 'HQs/Mangá', icon: 'images-outline' },
  { id: 'cooking', label: 'Culinária', icon: 'restaurant-outline' },
  { id: 'travel', label: 'Viagem', icon: 'airplane-outline' },
  { id: 'health', label: 'Saúde', icon: 'medkit-outline' },
  { id: 'education', label: 'Educação', icon: 'school-outline' },
];

export default function SearchScreen({ navigation }) {
  const { isDarkMode } = useThemeStore();
  const {
    query,
    setQuery,
    filters,
    updateFilters,
    results,
    loading,
    clearSearch,
  } = useBookSearch();
  const [showFilters, setShowFilters] = useState(false);

  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;
  const mutedTextColor = isDarkMode
    ? COLORS.text.muted.dark
    : COLORS.text.muted.light;

  const handleSelectBook = useCallback(
    book => {
      navigation.navigate('BookDetails', { book });
    },
    [navigation],
  );

  const toggleSubject = id => {
    const current = filters.subjects;
    if (current.includes(id)) {
      updateFilters({ subjects: current.filter(s => s !== id) });
    } else {
      updateFilters({ subjects: [...current, id] });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background-light dark:bg-background-dark">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        className="p-6">
        <View className="flex-row justify-between items-center mt-8 mb-6">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons
              name="close"
              size={32}
              color={isDarkMode ? '#E0E0E0' : '#1A1A1A'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-full flex-row items-center ${showFilters ? 'bg-primary' : 'bg-card-light dark:bg-card-dark'}`}>
            <Ionicons
              name="options-outline"
              size={18}
              color={showFilters ? 'white' : accentColor}
            />
            <Text
              className={`ml-2 font-bold text-xs ${showFilters ? 'text-white' : 'text-text-light dark:text-text-dark'}`}>
              FILTROS{' '}
              {filters.subjects.length > 0
                ? `(${filters.subjects.length})`
                : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-text-light dark:text-text-dark text-4xl font-serif font-bold mb-2">
          Descobrir
        </Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark text-lg font-serif italic mb-6">
          Encontre sua próxima grande aventura.
        </Text>

        {/* Advanced Filter Panel */}
        {showFilters && (
          <View className="bg-card-light dark:bg-card-dark rounded-3xl p-5 mb-6 border border-border-light dark:border-border-dark shadow-md">
            {/* Author Input */}
            <View className="flex-row justify-between items-center mb-3 ml-1">
              <Text className="text-text-light dark:text-text-dark font-bold text-[10px] uppercase tracking-widest">
                Autor Específico
              </Text>
              {filters.author.length > 0 && (
                <TouchableOpacity onPress={() => updateFilters({ author: '' })}>
                  <Text className="text-primary dark:text-primary-dark text-[10px] font-bold">
                    LIMPAR
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View className="flex-row items-center bg-background-light dark:bg-background-dark rounded-2xl px-4 mb-6 border border-border-light/50 dark:border-border-dark/50">
              <Ionicons name="at-outline" size={18} color={accentColor} />
              <TextInput
                className="flex-1 text-text-light dark:text-text-dark p-4 font-serif"
                placeholder="Ex: J.K. Rowling"
                placeholderTextColor={mutedTextColor}
                value={filters.author}
                onChangeText={val => updateFilters({ author: val })}
              />
            </View>

            {/* Print Type & Order */}
            <View className="flex-row justify-between mb-6">
              <View className="flex-1 mr-2">
                <Text className="text-text-light dark:text-text-dark font-bold text-[10px] uppercase tracking-widest mb-3 ml-1">
                  Tipo de Conteúdo
                </Text>
                <View className="flex-row bg-background-light dark:bg-background-dark rounded-2xl p-1 border border-border-light/50 dark:border-border-dark/50">
                  <TouchableOpacity
                    onPress={() => updateFilters({ printType: 'all' })}
                    className={`flex-1 py-3 items-center rounded-xl ${filters.printType === 'all' ? 'bg-primary' : ''}`}>
                    <Text
                      className={`text-[10px] font-bold ${filters.printType === 'all' ? 'text-white' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                      TUDO
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => updateFilters({ printType: 'books' })}
                    className={`flex-1 py-3 items-center rounded-xl ${filters.printType === 'books' ? 'bg-primary' : ''}`}>
                    <Text
                      className={`text-[10px] font-bold ${filters.printType === 'books' ? 'text-white' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                      LIVROS
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-1 ml-2">
                <Text className="text-text-light dark:text-text-dark font-bold text-[10px] uppercase tracking-widest mb-3 ml-1">
                  Ordenação API
                </Text>
                <View className="flex-row bg-background-light dark:bg-background-dark rounded-2xl p-1 border border-border-light/50 dark:border-border-dark/50">
                  <TouchableOpacity
                    onPress={() => updateFilters({ orderBy: 'relevance' })}
                    className={`flex-1 py-3 items-center rounded-xl ${filters.orderBy === 'relevance' ? 'bg-primary' : ''}`}>
                    <Text
                      className={`text-[10px] font-bold ${filters.orderBy === 'relevance' ? 'text-white' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                      RELEV.
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => updateFilters({ orderBy: 'newest' })}
                    className={`flex-1 py-3 items-center rounded-xl ${filters.orderBy === 'newest' ? 'bg-primary' : ''}`}>
                    <Text
                      className={`text-[10px] font-bold ${filters.orderBy === 'newest' ? 'text-white' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                      NOVO
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Subjects Scroll */}
            <View className="flex-row justify-between items-center mb-3 ml-1">
              <Text className="text-text-light dark:text-text-dark font-bold text-[10px] uppercase tracking-widest">
                Categorias (Multi-seleção)
              </Text>
              {filters.subjects.length > 0 && (
                <TouchableOpacity
                  onPress={() => updateFilters({ subjects: [] })}>
                  <Text className="text-primary dark:text-primary-dark text-[10px] font-bold">
                    LIMPAR TUDO
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
              contentContainerStyle={{ paddingBottom: 5 }}>
              {SUBJECTS.map(s => {
                const isActive = filters.subjects.includes(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => toggleSubject(s.id)}
                    className={`flex-row items-center px-4 py-3 rounded-2xl mr-2 border ${isActive ? 'bg-primary border-primary' : 'bg-background-light dark:bg-background-dark border-border-light/50 dark:border-border-dark/50'}`}>
                    <Ionicons
                      name={s.icon}
                      size={16}
                      color={isActive ? 'white' : accentColor}
                    />
                    <Text
                      className={`ml-2 text-xs font-bold ${isActive ? 'text-white' : 'text-text-light dark:text-text-dark'}`}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Search Input */}
        <View className="mb-2">
          <View className="flex-row items-center bg-card-light dark:bg-card-dark rounded-2xl border-2 border-primary/20 dark:border-primary-dark/20 px-4 shadow-sm">
            <Ionicons name="search" size={24} color={accentColor} />
            <TextInput
              testID="search-input"
              className="flex-1 text-text-light dark:text-text-dark p-5 text-xl font-serif"
              placeholder={
                filters.author
                  ? `Obras de ${filters.author}...`
                  : 'O que vamos ler hoje?'
              }
              placeholderTextColor={mutedTextColor}
              autoFocus={!showFilters}
              value={query}
              onChangeText={setQuery}
            />
            {loading && <ActivityIndicator color={accentColor} size="small" />}
            {(query.length > 0 ||
              filters.author.length > 0 ||
              filters.subjects.length > 0) &&
              !loading && (
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons
                    name="close-circle"
                    size={22}
                    color={mutedTextColor}
                  />
                </TouchableOpacity>
              )}
          </View>
        </View>

        {/* Results Feedback */}
        {results.length > 0 && !loading && (
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase font-bold tracking-widest mb-4 ml-1">
            {results.length} resultados encontrados
          </Text>
        )}

        <SearchPreview
          query={
            query ||
            filters.author ||
            (filters.subjects.length > 0 ? 'Filtros Ativos' : '')
          }
          results={results}
          loading={loading}
          onSelect={handleSelectBook}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
