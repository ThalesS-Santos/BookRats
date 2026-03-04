import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useBookStore } from '../store/useBookStore';

export default function AddBookScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const addBook = useBookStore(state => state.addBook);

  const handleSave = () => {
    if (!title || !totalPages) return;
    addBook(title, totalPages);
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-background p-6 justify-center">
      <Text className="text-white text-3xl font-bold mb-8 text-center">Novo Livro</Text>

      <View className="mb-6">
        <Text className="text-gray-400 mb-2 ml-2">Título do Livro</Text>
        <TextInput
          className="bg-card text-white p-4 rounded-xl text-lg"
          placeholder="Ex: O Hobbit"
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View className="mb-8">
        <Text className="text-gray-400 mb-2 ml-2">Total de Páginas</Text>
        <TextInput
          className="bg-card text-white p-4 rounded-xl text-lg"
          placeholder="Ex: 320"
          placeholderTextColor="#64748B"
          keyboardType="numeric"
          value={totalPages}
          onChangeText={setTotalPages}
        />
      </View>

      <TouchableOpacity 
        className="bg-primary p-4 rounded-xl items-center shadow-lg shadow-primary/30"
        onPress={handleSave}
      >
        <Text className="text-background font-bold text-xl uppercase tracking-wider">
          Adicionar
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        className="p-4 mt-2 items-center"
        onPress={() => navigation.goBack()}
      >
        <Text className="text-gray-400 font-bold text-lg">Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}
