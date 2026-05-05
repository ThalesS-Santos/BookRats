import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/useThemeStore';
import { useMainStore } from '../../core/store';
import { COLORS } from '../constants/colors';
import { StatusSelector } from '../components';
import * as Haptics from '../../utils/haptics';

/**
 * BookEditScreen
 * Tela de edição rápida de metadados do livro, apresentada como um modal transparente.
 */
const BookEditScreen = ({ navigation, route }) => {
  const { book } = route.params || {};
  const { isDarkMode } = useThemeStore();
  const updateBook = useMainStore(state => state.updateBook);
  
  const [tempTitle, setTempTitle] = useState(book?.title || '');
  const [tempPage, setTempPage] = useState(book?.currentPage?.toString() || '0');
  const [tempStatus, setTempStatus] = useState(book?.status || '');

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const updates = {
      title: tempTitle,
      currentPage: parseInt(tempPage, 10) || 0,
      status: tempStatus
    };

    // Validações básicas
    if (book && updates.currentPage > book.totalPages) updates.currentPage = book.totalPages;
    if (updates.currentPage < 0) updates.currentPage = 0;

    if (book?.id) {
      await updateBook(book.id, updates);
    }
    navigation.goBack();
  };

  if (!book) {
    navigation.goBack();
    return null;
  }

  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;

  return (
    <View className="flex-1 justify-end bg-black/60">
      {/* Background click listener to close */}
      <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
        <View className="absolute inset-0" />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="bg-background-light dark:bg-background-dark rounded-t-[40px] p-6 pb-10 shadow-2xl"
      >
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-text-light dark:text-text-dark text-2xl font-serif font-bold">Configurar Livro</Text>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="bg-card-light dark:bg-card-dark p-2 rounded-full"
          >
            <Ionicons name="close" size={24} color={isDarkMode ? '#FFF' : '#000'} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Edit Title */}
          <View className="mb-6">
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-[10px] font-bold mb-2 ml-1">Título Customizado</Text>
            <TextInput
              className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark p-4 rounded-2xl border border-border-light dark:border-border-dark font-serif"
              value={tempTitle}
              onChangeText={setTempTitle}
              placeholder="Nome do livro..."
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* Edit Progress */}
          <View className="mb-6">
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-[10px] font-bold mb-2 ml-1">Página Atual (Total: {book.totalPages})</Text>
            <TextInput
              className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark p-4 rounded-2xl border border-border-light dark:border-border-dark font-mono text-xl"
              value={tempPage}
              onChangeText={setTempPage}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* Edit Status */}
          <View className="mb-8">
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-[10px] font-bold mb-2 ml-1">Mudar Categoria</Text>
            <StatusSelector 
              currentStatus={tempStatus}
              onStatusChange={setTempStatus}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            className="bg-primary dark:bg-primary-dark p-5 rounded-2xl items-center shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            <Text className="text-white font-bold text-lg uppercase tracking-widest">Salvar Alterações</Text>
          </TouchableOpacity>
          
          <View className="h-4" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default BookEditScreen;
