import React, { useState, useEffect } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';

import { addAnnotation } from '@core/api/books';
import { BOOK_STATUS } from '@core/constants/bookStatus';
import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { useMainStore } from '@core/store';

import { useTimer } from '../../hooks/useTimer';
import { usePopupStore } from '../../store/usePopupStore';
import { useThemeStore } from '../../store/useThemeStore';
import * as Haptics from '../../utils/haptics';
import { formatTime } from '../../utils/time';

export default function TimerScreen({ route, navigation }) {
  const { width } = Dimensions.get('window');
  useKeepAwake();
  const { bookId } = route.params;
  const { isDarkMode } = useThemeStore();
  const books = useMainStore(state => state.books);
  const { showPopup } = usePopupStore();
  const user = useMainStore(state => state.user);
  const updateProgress = useMainStore(state => state.updateProgress);
  const updateReadingStatus = useMainStore(state => state.updateReadingStatus);

  const book = books.find(b => b.id === bookId);

  const { seconds, setSeconds, isActive, setIsActive } = useTimer(true);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [endPage, setEndPage] = useState(
    book ? book.currentPage.toString() : '0',
  );
  const [annotation, setAnnotation] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (isActive && book) {
      updateReadingStatus(book.title);
    } else {
      updateReadingStatus(null);
    }
    return () => {
      updateReadingStatus(null);
    };
  }, [isActive, book, updateReadingStatus]);

  const [neonPulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (isPublic && showFinishForm) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(neonPulse, {
            toValue: 1.5,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(neonPulse, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      neonPulse.setValue(1);
    }
  }, [isPublic, showFinishForm, neonPulse]);

  const handlePublicToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPublic(!isPublic);
  };

  const handleFinish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsActive(false);
    setShowFinishForm(true);
  };

  const handlePageInputChange = text => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 1 && cleaned.startsWith('0')) {
      cleaned = cleaned.replace(/^0+/, '');
    }
    const numericValue = parseInt(cleaned, 10);
    if (!isNaN(numericValue) && numericValue > book.totalPages) {
      cleaned = book.totalPages.toString();
    }
    setEndPage(cleaned);
  };

  const handleSaveProgress = async (forceComplete = false) => {
    let newPage = parseInt(endPage, 10);

    if (forceComplete && book.totalPages > 0) {
      newPage = book.totalPages;
    }

    if (
      isNaN(newPage) ||
      newPage < book.currentPage ||
      (newPage === book.currentPage && newPage !== book.totalPages)
    ) {
      showPopup({
        title: 'Valor Inválido',
        message: 'Insira a página atual para salvar o progresso.',
        type: 'error',
      });
      return;
    }

    if (annotation.trim() && user?.uid) {
      try {
        const userMetadata = {
          displayName: UserNormalizationService.normalizeDisplayName(user),
          photoURL: UserNormalizationService.normalizeUserAvatar(user),
        };
        await addAnnotation(
          user.uid,
          bookId,
          newPage,
          annotation.trim(),
          isPublic,
          userMetadata,
        );
      } catch (error) {
        console.error('Erro ao salvar anotação:', error);
      }
    }

    if (forceComplete) {
      await useMainStore.getState().updateBook(bookId, {
        status: BOOK_STATUS.READ,
        currentPage: newPage,
        completedAt: new Date().toISOString(),
      });
      showPopup({
        title: 'Parabéns! 🎉',
        message: `Você concluiu a leitura de "${book.title}". O livro foi movido para sua lista de Lidos.`,
        type: 'success',
      });
    } else {
      updateProgress(bookId, newPage, seconds);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const calculateSpeed = () => {
    const pages = parseInt(endPage, 10) - book.currentPage;
    if (pages <= 0 || seconds < 60) return '---';
    const pagesPerMin = (pages / (seconds / 60)).toFixed(1);
    return `${pagesPerMin} pág/min`;
  };

  if (!book) return null;

  const accentColor = isDarkMode ? '#A7C9A7' : '#5B8C5A';
  const textColor = isDarkMode ? '#E0E0E0' : '#1A1A1A';
  const mutedTextColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background-light dark:bg-background-dark">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-12 pb-10">
            {/* Header Navigation */}
            <View className="flex-row justify-between items-center mb-8">
              <TouchableOpacity
                testID="back-btn"
                onPress={() => navigation.goBack()}
                className="p-2 -ml-2">
                <Ionicons name="chevron-down" size={32} color={textColor} />
              </TouchableOpacity>
              <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-[4px] text-[10px] font-black">
                {showFinishForm ? 'Sessão Finalizada' : 'Lendo Agora'}
              </Text>
              <View className="w-10" />
            </View>

            {!showFinishForm ? (
              /* --- TIMER VIEW --- */
              <View className="flex-1 justify-around">
                <View className="items-center mb-10">
                  <Text className="text-primary dark:text-primary-dark font-serif text-xl mb-3">
                    Mergulhado em
                  </Text>
                  <Text className="text-text-light dark:text-text-dark text-4xl font-serif font-black text-center leading-tight">
                    {book.title}
                  </Text>
                  <Text className="text-text-muted-light dark:text-text-muted-dark mt-2 font-medium">
                    por {book.author}
                  </Text>
                </View>

                <View className="items-center py-10">
                  <View
                    className="rounded-full items-center justify-center border-[6px]"
                    style={{
                      width: width * 0.8,
                      height: width * 0.8,
                      borderColor: isActive
                        ? accentColor
                        : isDarkMode
                          ? '#262626'
                          : '#F3F4F6',
                      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
                      shadowColor: accentColor,
                      shadowOpacity: isActive ? 0.3 : 0,
                      shadowRadius: 20,
                      elevation: isActive ? 10 : 0,
                    }}>
                    <Text className="text-text-light dark:text-text-dark text-7xl font-mono tracking-tighter font-black">
                      {formatTime(seconds)}
                    </Text>
                    <View
                      className={`mt-4 px-4 py-1.5 rounded-full ${isActive ? 'bg-primary/10' : 'bg-amber-500/10'}`}>
                      <Text
                        className={`uppercase tracking-widest text-[10px] font-black ${isActive ? 'text-primary' : 'text-amber-600'}`}>
                        {isActive ? 'Foco Ativo' : 'Pausado'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row justify-between items-center mt-10 px-4">
                  <TouchableOpacity
                    testID="pause-play-btn"
                    className="w-20 h-20 rounded-full items-center justify-center bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-sm"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsActive(!isActive);
                    }}>
                    <Ionicons
                      name={isActive ? 'pause' : 'play'}
                      size={32}
                      color={isActive ? '#D97706' : accentColor}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 h-20 mx-6 rounded-3xl items-center justify-center bg-primary dark:bg-primary-dark shadow-xl"
                    onPress={handleFinish}>
                    <Text className="text-white font-black text-xl tracking-wider uppercase">
                      Finalizar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="reset-btn"
                    className="w-20 h-20 rounded-full items-center justify-center bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-sm"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      showPopup({
                        title: 'Reiniciar?',
                        message: 'Deseja zerar o tempo desta sessão?',
                        type: 'confirm',
                        onConfirm: () => setSeconds(0),
                      });
                    }}>
                    <Ionicons name="refresh" size={28} color={mutedTextColor} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* --- FINISH FORM VIEW --- */
              <View className="flex-1">
                <Text className="text-text-light dark:text-text-dark text-5xl font-serif font-black mb-2">
                  Belo Esforço!
                </Text>
                <Text className="text-text-muted-light dark:text-text-muted-dark text-lg mb-8 font-medium">
                  Sua mente agradece por este momento.
                </Text>

                {/* Stats Cards Row */}
                <View className="flex-row space-x-4 mb-8">
                  <View className="flex-1 bg-card-light dark:bg-card-dark p-6 rounded-[32px] border border-border-light dark:border-border-dark items-center">
                    <Ionicons
                      name="time-outline"
                      size={24}
                      color={accentColor}
                    />
                    <Text className="text-text-light dark:text-text-dark font-black text-xl mt-2">
                      {formatTime(seconds)}
                    </Text>
                    <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase font-bold mt-1">
                      Duração
                    </Text>
                  </View>
                  <View className="flex-1 bg-card-light dark:bg-card-dark p-6 rounded-[32px] border border-border-light dark:border-border-dark items-center">
                    <Ionicons
                      name="speedometer-outline"
                      size={24}
                      color="#6366F1"
                    />
                    <Text className="text-text-light dark:text-text-dark font-black text-xl mt-2">
                      {calculateSpeed()}
                    </Text>
                    <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] uppercase font-bold mt-1">
                      Velocidade
                    </Text>
                  </View>
                </View>

                {/* Progress Input Section */}
                <View className="mb-8">
                  <View className="flex-row justify-between items-end mb-3 px-2">
                    <Text className="text-text-muted-light dark:text-text-muted-dark text-xs uppercase font-black tracking-widest">
                      Onde você parou?
                    </Text>
                    <Text className="text-primary dark:text-primary-dark text-[10px] font-bold">
                      LIVRO TEM {book.totalPages} PÁGS
                    </Text>
                  </View>
                  <View className="bg-card-light dark:bg-card-dark rounded-3xl border-2 border-border-light dark:border-border-dark overflow-hidden">
                    <TextInput
                      testID="pages-read-input"
                      className="text-text-light dark:text-text-dark p-6 text-3xl font-black text-center"
                      keyboardType="numeric"
                      value={endPage}
                      onChangeText={handlePageInputChange}
                      placeholder={`Pág. ${book.currentPage}`}
                      placeholderTextColor={mutedTextColor}
                    />
                    <View className="bg-primary/5 dark:bg-primary-dark/5 py-3 items-center border-t border-border-light/50 dark:border-border-dark/50">
                      <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] font-bold">
                        ESTAVA NA PÁGINA {book.currentPage}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Annotation Section */}
                <View className="mb-8">
                  <Text className="text-text-muted-light dark:text-text-muted-dark text-xs uppercase font-black tracking-widest mb-3 px-2">
                    Ecos desta leitura
                  </Text>
                  <View className="bg-card-light dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-5">
                    <TextInput
                      testID="echo-text-input"
                      className="text-text-light dark:text-text-dark text-lg font-serif italic leading-7"
                      value={annotation}
                      onChangeText={setAnnotation}
                      placeholder="Algum pensamento ou insight valioso hoje?"
                      placeholderTextColor={mutedTextColor}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                {/* Privacy Toggle */}
                <TouchableOpacity
                  onPress={handlePublicToggle}
                  className="bg-card-light dark:bg-card-dark flex-row items-center p-5 rounded-[24px] border border-border-light dark:border-border-dark mb-10">
                  <View
                    className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${isPublic ? 'bg-primary' : 'bg-zinc-500'}`}>
                    <Ionicons
                      name={isPublic ? 'globe' : 'lock-closed'}
                      size={22}
                      color="white"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-light dark:text-text-dark font-black text-sm uppercase tracking-wider">
                      {isPublic ? 'Público (Ecoando)' : 'Privado (Só Eu)'}
                    </Text>
                    <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] font-medium mt-1">
                      {isPublic
                        ? 'Outros leitores verão seu insight nesta página'
                        : 'Esta nota ficará guardada apenas para você'}
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isPublic ? 'border-primary' : 'border-zinc-500'}`}>
                    {isPublic && (
                      <View className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Action Buttons */}
                <View className="space-y-4">
                  <TouchableOpacity
                    testID="publish-echo-btn"
                    className="bg-primary dark:bg-primary-dark h-20 rounded-[28px] items-center justify-center shadow-lg"
                    onPress={() => handleSaveProgress(false)}>
                    <Text className="text-white font-black text-xl tracking-widest uppercase">
                      Salvar Sessão
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-amber-500 h-20 rounded-[28px] items-center justify-center shadow-xl border-b-4 border-amber-700"
                    onPress={() => handleSaveProgress(true)}>
                    <View className="flex-row items-center">
                      <Ionicons name="trophy" size={24} color="white" />
                      <Text className="text-white font-black text-xl tracking-widest uppercase ml-3">
                        TERMINEI ESTA JORNADA!
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="py-6 items-center"
                    onPress={() => setShowFinishForm(false)}>
                    <Text className="text-text-muted-light dark:text-text-muted-dark font-bold uppercase tracking-widest text-[10px]">
                      Ainda não terminei, voltar ao foco
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
