import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Dimensions, TouchableWithoutFeedback, Keyboard, Animated, Easing } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useBookStore } from '../store/useBookStore';
import { useThemeStore } from '../store/useThemeStore';
import { addAnnotation } from '../api/books';
import { useTimer } from '../hooks/useTimer';
import { usePopupStore } from '../store/usePopupStore';

const { width } = Dimensions.get('window');

export default function TimerScreen({ route, navigation }) {
  useKeepAwake();
  const { bookId } = route.params;
  const { isDarkMode, hapticsEnabled } = useThemeStore();
  const books = useBookStore(state => state.books);
  const { showPopup } = usePopupStore();
  const user = useBookStore(state => state.user);
  const updateProgress = useBookStore(state => state.updateProgress);
  const markAsDNF = useBookStore(state => state.markAsDNF);
  const updateReadingStatus = useBookStore(state => state.updateReadingStatus);

  const book = books.find(b => b.id === bookId);

  const { seconds, setSeconds, isActive, setIsActive, resetTimer } = useTimer(true);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [endPage, setEndPage] = useState(book ? book.currentPage.toString() : '0');
  const [annotation, setAnnotation] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Update Reading Status in Firestore
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

  // 🌟 Social Layer: Neon Pulse Animation
  const neonPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPublic && showFinishForm) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(neonPulse, {
            toValue: 1.5,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(neonPulse, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      neonPulse.setValue(1);
    }
  }, [isPublic, showFinishForm]);

  const handlePublicToggle = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPublic(!isPublic);
  };

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const min = Math.floor((totalSeconds % 3600) / 60);
    const sec = totalSeconds % 60;

    if (hrs > 0) {
      return `${hrs}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsActive(false);
    setShowFinishForm(true);
  };

  const handlePageInputChange = (text) => {
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

  const handleSaveProgress = async () => {
    const newPage = parseInt(endPage, 10);
    if (isNaN(newPage) || newPage < book.currentPage || (newPage === book.currentPage && newPage !== book.totalPages)) {
      showPopup({ 
        title: 'Valor Inválido', 
        message: 'Insira a página atual para salvar o progresso.', 
        type: 'error' 
      });
      return;
    }
    
    if (annotation.trim() && user?.uid) {
      try {
        const userMetadata = {
          displayName: user.displayName || user.username || user.email.split('@')[0],
          photoURL: user.photoURL || user.profilePic || null
        };
        await addAnnotation(user.uid, bookId, newPage, annotation.trim(), isPublic, userMetadata);
      } catch (error) {
        console.error("Erro ao salvar anotação:", error);
      }
    }

    updateProgress(bookId, newPage, seconds);
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const calculateSpeed = () => {
    const pages = parseInt(endPage, 10) - book.currentPage;
    if (pages <= 0 || seconds < 60) return "---";
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      className="flex-1 bg-background-light dark:bg-background-dark"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1 p-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mt-12 mb-4"
          >
            <Ionicons name="chevron-down" size={32} color={textColor} />
          </TouchableOpacity>

          {!showFinishForm ? (
            <View className="flex-1 justify-between py-12">
              <View className="items-center">
                <Text className="text-primary dark:text-primary-dark font-serif text-lg mb-2">Lendo agora</Text>
                <Text className="text-text-light dark:text-text-dark text-3xl font-bold text-center px-4" numberOfLines={2}>
                  {book.title}
                </Text>
              </View>

              <View className="items-center">
                <View
                  className="border-4 border-primary dark:border-primary-dark rounded-full items-center justify-center"
                  style={{ width: width * 0.7, height: width * 0.7 }}
                >
                  <Text className="text-text-light dark:text-text-dark text-6xl font-mono tracking-tighter">
                    {formatTime(seconds)}
                  </Text>
                  <Text className="text-text-muted-light dark:text-text-muted-dark mt-2 uppercase tracking-widest text-xs">
                    {isActive ? 'Sessão Ativa' : 'Pausado'}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-center space-x-12 items-center">
                <TouchableOpacity
                  className="w-16 h-16 rounded-full items-center justify-center bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark"
                  onPress={() => {
                    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsActive(!isActive);
                  }}
                >
                  <Ionicons
                    name={isActive ? "pause" : "play"}
                    size={28}
                    color={isActive ? "#D97706" : accentColor}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  className="w-24 h-24 rounded-full items-center justify-center bg-primary dark:bg-primary-dark shadow-xl"
                  onPress={handleFinish}
                >
                  <Text className="text-white font-bold text-lg">Finalizar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="w-16 h-16 rounded-full items-center justify-center bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark"
                  onPress={() => {
                    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    showPopup({
                      title: 'Zerar',
                      message: 'Deseja realmente zerar o cronômetro?',
                      type: 'confirm',
                      onConfirm: () => setSeconds(0)
                    });
                  }}
                >
                  <Ionicons name="refresh" size={24} color={mutedTextColor} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="flex-1 justify-center px-4">
              <Text className="text-text-light dark:text-text-dark text-4xl font-serif font-bold mb-8">Belo esforço!</Text>

              <View className="bg-card-light dark:bg-card-dark p-6 rounded-3xl border border-border-light dark:border-border-dark mb-8">
                <View className="flex-row justify-between mb-4">
                  <Text className="text-text-muted-light dark:text-text-muted-dark">Tempo total</Text>
                  <Text className="text-text-light dark:text-text-dark font-bold">{formatTime(seconds)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-text-muted-light dark:text-text-muted-dark">Velocidade est.</Text>
                  <Text className="text-text-light dark:text-text-dark font-bold">{calculateSpeed()}</Text>
                </View>
              </View>

              <Text className="text-text-muted-light dark:text-text-muted-dark mb-3 ml-2">Página atual:</Text>
              <TextInput
                className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark p-4 rounded-2xl text-xl font-bold border border-border-light dark:border-border-dark mb-4"
                keyboardType="numeric"
                value={endPage}
                onChangeText={handlePageInputChange}
                placeholder={`Pág. ${book.currentPage}`}
                placeholderTextColor={mutedTextColor}
              />

              <Text className="text-text-muted-light dark:text-text-muted-dark mb-3 ml-2">Anotação / Pensamento:</Text>
              <TextInput
                className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark p-4 rounded-2xl text-sm border border-border-light dark:border-border-dark mb-4 font-serif italic"
                value={annotation}
                onChangeText={setAnnotation}
                placeholder="O que você achou dessa leitura?"
                placeholderTextColor={mutedTextColor}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity 
                onPress={handlePublicToggle} 
                className="flex-row items-center mb-6 ml-2"
              >
                <Animated.View 
                  style={{ 
                    opacity: isPublic ? neonPulse : 1,
                    transform: [{ scale: isPublic ? neonPulse : 1 }],
                    shadowColor: '#22C55E', // Green-500
                    shadowOpacity: isPublic ? 0.8 : 0,
                    shadowRadius: 10,
                  }}
                  className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${isPublic ? 'bg-primary dark:bg-primary-dark shadow-lg shadow-primary' : 'bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark'}`}
                >
                  <Ionicons name={isPublic ? "globe-outline" : "lock-closed-outline"} size={14} color="white" />
                </Animated.View>
                <View>
                  <Text className={`text-sm font-bold ${isPublic ? 'text-primary dark:text-primary-dark' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                    {isPublic ? 'Deixando um rastro na página...' : 'Privada (Só eu)'}
                  </Text>
                  {isPublic && (
                    <Text className="text-[10px] text-text-muted-light dark:text-text-muted-dark italic">Sua nota ficará visível para outros leitores deste livro</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-primary dark:bg-primary-dark p-5 rounded-2xl items-center shadow-lg"
                onPress={handleSaveProgress}
              >
                <Text className="text-white font-bold text-lg">Salvar Sessão</Text>
              </TouchableOpacity>

              <TouchableOpacity className="mt-8 items-center" onPress={() => setShowFinishForm(false)}>
                <Text className="text-text-muted-light dark:text-text-muted-dark">Voltar ao cronômetro</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
