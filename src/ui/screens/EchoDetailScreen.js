import { useMainStore } from '@core/store';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSocialStore } from '../../store/useSocialStore';
import { useThemeStore } from '../../store/useThemeStore';
import { getEchoReplies, replyToEcho } from '@core/api/social';
import * as Haptics from 'expo-haptics';
import { CommunityNote } from '@ui/components';
import { FastAvatar } from '@ui/components';

export default function EchoDetailScreen({ route, navigation }) {
  const { echoId, bookId, echo } = route.params;
  const insets = useSafeAreaInsets();
  
  const { user } = useMainStore();
  const { clapEcho } = useSocialStore();
  const { isDarkMode, hapticsEnabled } = useThemeStore();
  const { COLORS } = require('@constants/colors');
  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;

  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchReplies();
  }, [echoId]);

  const fetchReplies = async () => {
    setLoading(true);
    const fetched = await getEchoReplies(echo.userId, echo.bookId, echoId);
    setReplies(fetched);
    setLoading(false);
  };

  const handleSendReply = async () => {
    if (!inputText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const textToSend = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    // Optimistic Update
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const optimisticReply = {
      id: `temp-${Date.now()}`,
      userId: user.uid,
      bookId: echo.bookId,
      pageLocation: echo.pageLocation,
      text: textToSend,
      isPublic: true,
      parentId: echoId,
      replyCount: 0,
      userMetadata: {
        displayName: user.username || user.email?.split('@')[0] || 'Leitor',
        photoURL: user.profilePic || null
      },
      reactions: { claps: 0 },
      timestamp: { seconds: Date.now() / 1000 }
    };

    setReplies(prev => [optimisticReply, ...prev]);

    // Fast scroll to top to see reply
    if (flatListRef.current && replies.length > 0) {
      setTimeout(() => flatListRef.current.scrollToOffset({ offset: 0, animated: true }), 100);
    }

    try {
      await replyToEcho(
        echo.userId,
        echo.bookId,
        echoId,
        textToSend,
        { displayName: optimisticReply.userMetadata.displayName, photoURL: optimisticReply.userMetadata.photoURL },
        user.uid
      );
    } catch (error) {
      console.error("Failed to send reply:", error);
      // Revert optimistic update on error if needed
      setReplies(prev => prev.filter(r => r.id !== optimisticReply.id));
      if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = () => (
    <View style={{ marginBottom: 32, alignItems: 'center' }}>
      <View style={{ shadowColor: accentColor, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 }}>
        <CommunityNote 
          note={echo} 
          onClap={clapEcho} 
          COLORS={COLORS} 
          isDarkMode={isDarkMode} 
          isFrontCard={true} 
        />
      </View>
      <View className="w-10 h-1 rounded-full mt-6" style={{ backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }} />
    </View>
  );

  const renderReply = ({ item }) => (
    <View className="mb-6 pl-4 border-l-[3px]" style={{ borderColor: isDarkMode ? '#334155' : '#E2E8F0' }}>
      <View className="flex-row items-center mb-2">
        <FastAvatar source={item.userMetadata?.photoURL} size={24} style={{ marginRight: 8 }} />
        <Text className="text-text-light dark:text-text-dark font-bold text-xs mr-2">{item.userMetadata?.displayName}</Text>
      </View>
      <Text className="text-text-light dark:text-text-dark font-serif italic text-sm leading-5">"{item.text}"</Text>
      <View className="flex-row items-center mt-3">
         <View className="bg-card-light dark:bg-card-dark px-3 py-1 rounded-full border border-border-light dark:border-border-dark flex-row items-center">
            <Text className="text-[10px] mr-1">🐀</Text>
            <Text className="text-text-muted-light dark:text-text-muted-dark font-bold text-[10px]">{item.reactions?.claps || 0}</Text>
         </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Fixed Header */}
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 16 }} className="flex-row items-center border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark z-10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-5 w-10 h-10 items-center justify-center bg-card-light dark:bg-card-dark rounded-full shadow-sm border border-border-light dark:border-border-dark">
          <Ionicons name="arrow-back" size={20} color={isDarkMode ? 'white' : 'black'} />
        </TouchableOpacity>
        <Text className="text-text-light dark:text-text-dark font-serif font-bold text-xl">Discussão</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flatListRef}
          data={replies}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
          ListHeaderComponent={renderHeader}
          renderItem={renderReply}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading && (
              <Text className="text-text-muted-light dark:text-text-muted-dark text-center font-serif italic mt-4">
                Ninguém comentou ainda. Seja o primeiro a responder!
              </Text>
            )
          }
        />

        {/* Input Bar */}
        <View 
          className="absolute bottom-0 w-full p-4 border-t"
          style={{ 
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.2)' : 'rgba(203, 213, 225, 0.5)',
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View className="flex-row items-center">
            <TextInput
              className="flex-1 h-12 bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark px-5 rounded-full border border-border-light dark:border-border-dark mr-3"
              placeholder="Adicionar um comentário..."
              placeholderTextColor={isDarkMode ? '#94A3B8' : '#64748B'}
              value={inputText}
              onChangeText={setInputText}
              maxLength={150}
            />
            <TouchableOpacity 
              onPress={handleSendReply}
              disabled={!inputText.trim() || isSubmitting}
              className="w-12 h-12 rounded-full items-center justify-center shadow-sm"
              style={{ backgroundColor: inputText.trim() ? accentColor : (isDarkMode ? '#334155' : '#E2E8F0') }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name="send" size={16} color={inputText.trim() ? "white" : (isDarkMode ? '#64748B' : '#94A3B8')} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
