import React from 'react';
import { View, Text, Image } from 'react-native';

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-background justify-center items-center p-4">
      <View className="mb-6 items-center">
        <View className="h-32 w-32 rounded-full border-4 border-primary align-center justify-center items-center bg-card">
          <Text className="text-4xl">📚</Text>
        </View>
        <Text className="text-white text-3xl font-bold mt-4">Leitor Voraz</Text>
        <Text className="text-primary text-md">@leitor_mock</Text>
      </View>

      <View className="bg-card w-full rounded-2xl p-6 mt-4 flex-row justify-around">
        <View className="items-center">
          <Text className="text-gray-400 text-sm">Páginas Lidas</Text>
          <Text className="text-white text-2xl font-bold">1,240</Text>
        </View>
        <View className="items-center">
          <Text className="text-gray-400 text-sm">Livros</Text>
          <Text className="text-white text-2xl font-bold">4</Text>
        </View>
      </View>

      <View className="w-full mt-4 flex-row justify-center items-center">
         <Text className="text-streak font-bold text-xl mr-2">🔥 Streak:</Text>
         <Text className="text-white text-xl">5 dias</Text>
      </View>
    </View>
  );
}
