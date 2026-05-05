import { useMainStore } from '@core/store';
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  ActivityIndicator
} from 'react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { useBookSearch } from '../../hooks/useBookSearch';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@constants/colors';
import { SearchPreview, StatusSelector } from '../components';
import { BOOK_STATUS } from '@core/constants/bookStatus';

export default function AddBookScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [description, setDescription] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [extraMetadata, setExtraMetadata] = useState({});
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [status, setStatus] = useState(BOOK_STATUS.WANT_TO_READ);
  
  const addBook = useMainStore(state => state.addBook);
  const { isDarkMode } = useThemeStore();
  
  // Live Search Hook
  const { query, setQuery, results, loading, clearSearch } = useBookSearch();

  const handleSave = () => {
    if (!title || (!totalPages && !selectedId)) return;
    // Pass status to the store (Etapa 2)
    addBook(title, totalPages || '0', selectedId, description, extraMetadata, status);
    navigation.goBack();
  };

  const handleSelectBook = (book) => {
    setTitle(book.title);
    setTotalPages(book.totalPages === 0 ? '' : book.totalPages.toString());
    setDescription(book.description);
    setSelectedId(book.id);
    setExtraMetadata({
      author: book.author,
      thumbnail: book.thumbnail,
      categories: book.categories,
      language: book.language,
      publishedDate: book.publishedDate,
      averageRating: book.averageRating
    });
    setShowFullDesc(false);
    clearSearch();
  };

  const accentColor = isDarkMode ? '#22C55E' : COLORS.primary.light;
  const mutedTextColor = isDarkMode ? '#94A3B8' : '#64748B';

  // Truncation logic (Step 1.7)
  const MAX_DESC_LENGTH = 150;
  const isLongDesc = description.length > MAX_DESC_LENGTH;
  const displayDesc = (isLongDesc && !showFullDesc) 
    ? `${description.substring(0, MAX_DESC_LENGTH)}...` 
    : description;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background-light dark:bg-background-dark"
    >
      <ScrollView 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }} 
        className="p-6"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-8 mb-6"
        >
          <Ionicons name="close" size={32} color={isDarkMode ? '#E0E0E0' : '#1A1A1A'} />
        </TouchableOpacity>

        <Text className="text-text-light dark:text-text-dark text-4xl font-serif font-bold mb-2">Novo Título</Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark text-lg font-serif italic mb-10">Busque na nuvem ou adicione manualmente.</Text>

        {/* Search Input */}
        <View className="mb-2">
          <View className="flex-row items-center bg-card-light dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark px-4">
            <Ionicons name="search" size={20} color={mutedTextColor} />
            <TextInput
              className="flex-1 text-text-light dark:text-text-dark p-5 text-lg font-serif"
              placeholder="Pesquisar por título..."
              placeholderTextColor={mutedTextColor}
              value={query}
              onChangeText={setQuery}
            />
            {loading && <ActivityIndicator color={accentColor} />}
            {query.length > 0 && !loading && (
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={20} color={mutedTextColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Results Preview Molecule */}
        <SearchPreview 
          query={query}
          results={results}
          loading={loading}
          onSelect={handleSelectBook}
        />

        <View className="h-8" />

        {/* Selected Book Details (Synopsis) */}
        {description ? (
          <View className="mb-8 p-5 bg-primary/5 dark:bg-primary-dark/5 rounded-2xl border border-primary/10 dark:border-primary-dark/10">
            <Text className="text-primary dark:text-primary-light font-bold text-xs uppercase tracking-widest mb-2">Sinopse</Text>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-sm leading-6 italic">
              {displayDesc}
            </Text>
            {isLongDesc && (
              <TouchableOpacity 
                onPress={() => setShowFullDesc(!showFullDesc)}
                className="mt-2"
              >
                <Text className="text-primary dark:text-primary-light font-bold text-xs">
                  {showFullDesc ? 'VER MENOS' : 'LER MAIS'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Manual Form */}
        <View className="mb-8">
          <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 ml-2">Título Selecionado</Text>
          <TextInput
            className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark p-5 rounded-2xl text-xl font-serif border border-border-light dark:border-border-dark"
            placeholder="Ex: Cem Anos de Solidão"
            placeholderTextColor={mutedTextColor}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View className="mb-12">
          <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 ml-2">Total de Páginas</Text>
          <TextInput
            className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark p-5 rounded-2xl text-xl font-mono border border-border-light dark:border-border-dark"
            placeholder={selectedId ? "Páginas não informadas" : "Ex: 418"}
            placeholderTextColor={mutedTextColor}
            keyboardType="numeric"
            value={totalPages}
            onChangeText={setTotalPages}
          />
          {selectedId && !totalPages && (
            <Text className="text-amber-500 text-[10px] mt-2 ml-2 font-bold italic">
              ⚠️ Este livro não informou o total de páginas. Digite manualmente para acompanhar o progresso.
            </Text>
          )}
        </View>

        {/* Status Selector (Etapa 2) */}
        <View className="mb-12">
          <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 ml-2">Onde colocar este livro?</Text>
          <StatusSelector 
            currentStatus={status}
            onStatusChange={setStatus}
          />
        </View>

        <View className="flex-1 justify-end pb-10">
          <TouchableOpacity
            className="bg-primary dark:bg-primary-dark p-5 rounded-2xl items-center shadow-xl"
            onPress={handleSave}
            style={{ opacity: (!title || !totalPages) ? 0.6 : 1, backgroundColor: accentColor }}
            disabled={!title || !totalPages}
          >
            <Text className="text-white font-bold text-xl uppercase tracking-widest">Adicionar à Estante</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
