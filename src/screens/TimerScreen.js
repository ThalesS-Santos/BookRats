import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { useBookStore } from '../store/useBookStore';
import { useThemeStore } from '../store/useThemeStore';

const { width } = Dimensions.get('window');

export default function TimerScreen({ route, navigation }) {
  useKeepAwake();
  const { bookId } = route.params;
  const { isDarkMode } = useThemeStore();

  const books = useBookStore(state => state.books);
  const updateProgress = useBookStore(state => state.updateProgress);
  const markAsDNF = useBookStore(state => state.markAsDNF);

  const book = books.find(b => b.id === bookId);

  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [endPage, setEndPage] = useState(book ? book.currentPage.toString() : '0');

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

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
    setIsActive(false);
    setShowFinishForm(true);
  };

  const handleSaveProgress = () => {
    const newPage = parseInt(endPage, 10);
    if (isNaN(newPage) || newPage < book.currentPage || newPage > book.totalPages) {
      Alert.alert('Erro', `Insira uma página válida (entre ${book.currentPage} e ${book.totalPages}).`);
      return;
    }
    updateProgress(bookId, newPage, seconds);
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
      className="flex-1 bg-background-light dark:bg-background-dark p-6"
    >
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
              onPress={() => setIsActive(!isActive)}
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
                Alert.alert('Zerar', 'Deseja realmente zerar o cronômetro?', [
                  { text: 'Não', style: 'cancel' },
                  { text: 'Sim', onPress: () => setSeconds(0) }
                ]);
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
            className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark p-5 rounded-2xl text-2xl font-bold border border-border-light dark:border-border-dark mb-10"
            keyboardType="numeric"
            value={endPage}
            onChangeText={setEndPage}
            placeholder={`Pág. ${book.currentPage}`}
            placeholderTextColor={mutedTextColor}
            autoFocus
          />

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
    </KeyboardAvoidingView>
  );
}
