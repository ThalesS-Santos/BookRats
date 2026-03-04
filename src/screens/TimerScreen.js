import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useBookStore } from '../store/useBookStore';

export default function TimerScreen({ route, navigation }) {
  useKeepAwake(); // Mantenha a tela ligada
  const { bookId } = route.params;
  
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
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (totalSeconds) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
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

  const handleDNF = () => {
    Alert.alert('Desistir', 'Tem certeza que deseja desistir de ler este livro? O histórico será salvo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sim', style: 'destructive', onPress: () => { markAsDNF(bookId); navigation.goBack(); } }
    ]);
  };

  if (!book) return null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-background justify-center p-6">
      {!showFinishForm ? (
        <View className="items-center flex-1 justify-center">
          <Text className="text-gray-400 text-lg mb-2">{book.title}</Text>
          <Text className="text-white text-7xl font-bold font-mono mb-12">
            {formatTime(seconds)}
          </Text>
          
          <View className="flex-row space-x-6">
            <TouchableOpacity 
              className={`w-20 h-20 rounded-full items-center justify-center ${isActive ? 'bg-orange-500' : 'bg-primary'}`}
              onPress={() => setIsActive(!isActive)}
            >
              <Text className="text-white font-bold text-lg">{isActive ? 'Pausar' : 'Zerar'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="w-20 h-20 rounded-full items-center justify-center bg-red-500"
              onPress={handleFinish}
            >
              <Text className="text-white font-bold text-lg">Parar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-1 justify-center">
          <Text className="text-white text-3xl font-bold text-center mb-8">Sessão Finalizada!</Text>
          <Text className="text-primary text-center text-xl mb-4">Tempo: {formatTime(seconds)}</Text>
          
          <Text className="text-gray-400 mb-2 ml-2">Em qual página você parou?</Text>
          <TextInput
            className="bg-card text-white p-4 rounded-xl text-xl text-center mb-8"
            keyboardType="numeric"
            value={endPage}
            onChangeText={setEndPage}
            autoFocus
          />
          
          <TouchableOpacity className="bg-primary p-4 rounded-xl items-center mb-4" onPress={handleSaveProgress}>
            <Text className="text-background font-bold text-xl uppercase">Salvar Progresso</Text>
          </TouchableOpacity>

          <TouchableOpacity className="p-4 items-center" onPress={handleDNF}>
            <Text className="text-red-500 font-bold text-lg">Desistir do Livro (DNF)</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
