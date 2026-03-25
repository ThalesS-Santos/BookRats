import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { useBookStore } from '../store/useBookStore';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

export default function GroupChatScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef(null);

  const { isDarkMode } = useThemeStore();
  const user = useBookStore(state => state.user);
  const messages = useBookStore(state => state.messages) || [];
  const subscribeToGroupMessages = useBookStore(state => state.subscribeToGroupMessages);
  const sendMessage = useBookStore(state => state.sendMessage);
  const chatError = useBookStore(state => state.chatError);

  const accentColor = isDarkMode ? '#A7C9A7' : '#5B8C5A';

  useEffect(() => {
    const unsubMessages = subscribeToGroupMessages(groupId);
    return () => {
      if (unsubMessages) unsubMessages();
    };
  }, [subscribeToGroupMessages, groupId]);

  const handleSendMessage = () => {
    if (messageText.trim() === '') return;
    sendMessage(groupId, messageText.trim());
    setMessageText('');
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark px-6 pt-4">
      {/* Custom Header */}
      <View className="flex-row items-center mb-4 mt-8">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark mr-4"
        >
          <Ionicons name="arrow-back" size={20} color={isDarkMode ? '#E1E1E1' : '#1A1A1A'} />
        </TouchableOpacity>
        <TouchableOpacity 
          className="flex-1" 
          onPress={() => navigation.navigate('GroupDetails', { groupId })}
        >
          <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-1">Grupo de Leitura</Text>
          <Text className="text-text-light dark:text-text-dark text-xl font-serif font-bold" numberOfLines={1}>
            {groupName || 'Chat'}
          </Text>
        </TouchableOpacity>
      </View>

      {chatError && (
        <View className="bg-red-500/10 p-4 rounded-2xl mb-4 border border-red-500/20">
          <Text className="text-red-500 font-bold text-sm mb-1">⚠️ Erro de Permissão no Chat</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-xs">
            {chatError}. Para corrigir, atualize as Regras do Firestore no Firebase Console para permitir leitura na coleção 'groups'.
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.uid;
          const isSystem = item.type === 'system_notification';

          if (isSystem) {
            return (
              <View className="items-center my-3 px-4">
                <Text className="text-[#22C55E] font-bold text-center text-sm leading-5">
                  {String(item.text || '')}
                </Text>
              </View>
            );
          }

          return (
            <View className={`mb-3 ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && (
                <Text className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1 ml-2">
                  {String(item.senderName || '')}
                </Text>
              )}
              <View
                className={`p-3 rounded-2xl max-w-[80%] ${
                  isMe
                    ? 'bg-primary dark:bg-primary-dark rounded-tr-none'
                    : 'bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-tl-none'
                }`}
              >
                <Text className={`${isMe ? 'text-white' : 'text-text-light dark:text-text-dark'}`}>
                  {String(item.text || '')}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View className="flex-row items-center p-2 bg-card-light dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark mb-6">
        <TextInput
          className="flex-1 p-3 text-text-light dark:text-text-dark"
          placeholder="Envie uma mensagem..."
          placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
          value={messageText}
          onChangeText={setMessageText}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          className="p-3 bg-primary dark:bg-primary-dark rounded-xl"
        >
          <Ionicons name="send" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
