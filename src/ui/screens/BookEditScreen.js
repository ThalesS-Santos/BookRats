import React, { useState, useEffect } from 'react';

import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';

import { BOOK_STATUS } from '../../core/constants/bookStatus';
import { useMainStore } from '../../core/store';
import { usePopupStore } from '../../store/usePopupStore';
import { useThemeStore } from '../../store/useThemeStore';
import * as Haptics from '../../utils/haptics';
import { StatusSelector } from '../components';
import { COLORS } from '../constants/colors';

/**
 * BookEditScreen
 * Tela de edição rápida de metadados do livro, apresentada como um modal transparente.
 */
const BookEditScreen = ({ navigation, route }) => {
  const { book } = route.params || {};
  const { isDarkMode } = useThemeStore();
  const updateBook = useMainStore(state => state.updateBook);
  const removeBook = useMainStore(state => state.removeBook);
  const showPopup = usePopupStore(state => state.showPopup);

  const [tempTitle, setTempTitle] = useState(book?.title || '');
  const [tempPage, setTempPage] = useState(
    book?.currentPage?.toString() || '0',
  );
  const [tempStatus, setTempStatus] = useState(book?.status || '');

  const handleDelete = () => {
    Alert.alert(
      'Excluir Livro',
      `Tem certeza que deseja remover "${book.title}" da sua biblioteca? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await removeBook(book.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const nPage = parseInt(tempPage, 10) || 0;
    const updates = {
      title: tempTitle,
      currentPage: nPage,
      status: tempStatus,
    };

    // Bounds Check
    if (book && updates.currentPage > book.totalPages)
      updates.currentPage = book.totalPages;
    if (updates.currentPage < 0) updates.currentPage = 0;

    const isFinishing =
      (updates.currentPage >= book.totalPages ||
        updates.status === BOOK_STATUS.READ) &&
      book.status !== BOOK_STATUS.READ;

    if (book?.id) {
      await updateBook(book.id, updates);

      if (isFinishing) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showPopup({
          title: '🎉 Parabéns!',
          message: `Você concluiu a leitura de "${book.title}"! Que tal começar outro?`,
          type: 'success',
        });
      }
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
        className="bg-background-light dark:bg-background-dark rounded-t-[40px] p-6 pb-10 shadow-2xl">
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-text-light dark:text-text-dark text-2xl font-serif font-bold">
            Configurar Livro
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-card-light dark:bg-card-dark p-2 rounded-full">
            <Ionicons
              name="close"
              size={24}
              color={isDarkMode ? '#FFF' : '#000'}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Edit Title */}
          <View className="mb-6">
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-[10px] font-bold mb-2 ml-1">
              Título Customizado
            </Text>
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
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-[10px] font-bold mb-2 ml-1">
              Página Atual (Total: {book.totalPages})
            </Text>
            <TextInput
              testID="pages-read-input"
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
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-[10px] font-bold mb-2 ml-1">
              Mudar Categoria
            </Text>
            <StatusSelector
              currentStatus={tempStatus}
              onStatusChange={setTempStatus}
            />
          </View>

          {/* Action Buttons */}
          <View className="space-y-4 gap-4">
            <TouchableOpacity
              testID="save-book-progress-btn"
              onPress={handleSave}
              className="bg-primary dark:bg-primary-dark p-5 rounded-2xl items-center shadow-lg"
              style={{ backgroundColor: accentColor }}>
              <Text className="text-white font-bold text-lg uppercase tracking-widest">
                Salvar Alterações
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              className="p-5 rounded-2xl items-center border border-red-500/30">
              <Text className="text-red-500 font-bold uppercase tracking-widest">
                Excluir Livro
              </Text>
            </TouchableOpacity>
          </View>

          <View className="h-4" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default BookEditScreen;
