import React from 'react';

import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@constants/colors';
import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { CommunityNote, FastAvatar } from '@ui/components';
import { useEchoDetail } from '@ui/hooks/useEchoDetail';

import { useSocialStore } from '../../store/useSocialStore';
import { useThemeStore } from '../../store/useThemeStore';

const TXT_DISCUSSION = 'Discussão';
const TXT_NO_COMMENTS = 'Ninguém comentou ainda. Seja o primeiro a responder!';

export default function EchoDetailScreen({ route, navigation }) {
  const { echoId, echo } = route.params;
  const insets = useSafeAreaInsets();

  const { clapEcho } = useSocialStore();
  const { isDarkMode } = useThemeStore();
  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;

  const {
    replies,
    loading,
    inputText,
    setInputText,
    isSubmitting,
    flatListRef,
    handleSendReply,
  } = useEchoDetail(echo, echoId);

  const renderHeader = () => (
    <View style={{ marginBottom: 32, alignItems: 'center' }}>
      <View>
        <CommunityNote
          note={echo}
          onClap={clapEcho}
          COLORS={COLORS}
          isDarkMode={isDarkMode}
          isFrontCard={true}
        />
      </View>
      <View
        className="w-10 h-1 rounded-full mt-6"
        style={{ backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }}
      />
    </View>
  );

  const renderReply = ({ item }) => (
    <View
      className="mb-6 pl-4 border-l-[3px]"
      style={{ borderColor: isDarkMode ? '#334155' : '#E2E8F0' }}>
      <View className="flex-row items-center mb-2">
        <FastAvatar
          source={UserNormalizationService.normalizeUserAvatar(
            item.userMetadata,
          )}
          size={24}
          style={{ marginRight: 8 }}
        />
        <Text className="text-text-light dark:text-text-dark font-bold text-xs mr-2">
          {UserNormalizationService.normalizeDisplayName(item.userMetadata)}
        </Text>
      </View>
      <Text className="text-text-light dark:text-text-dark font-serif italic text-sm leading-5">
        {'"'}
        {item.text}
        {'"'}
      </Text>
      <View className="flex-row items-center mt-3">
        <View className="bg-card-light dark:bg-card-dark px-3 py-1 rounded-full border border-border-light dark:border-border-dark flex-row items-center">
          <Text className="text-[10px] mr-1">🐀</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark font-bold text-[10px]">
            {item.reactions?.claps || 0}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Fixed Header */}
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 24,
          paddingBottom: 16,
        }}
        className="flex-row items-center border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark z-10">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mr-5 w-10 h-10 items-center justify-center bg-card-light dark:bg-card-dark rounded-full shadow-sm border border-border-light dark:border-border-dark">
          <Ionicons
            name="arrow-back"
            size={20}
            color={isDarkMode ? 'white' : 'black'}
          />
        </TouchableOpacity>
        <Text className="text-text-light dark:text-text-dark font-serif font-bold text-xl">
          {TXT_DISCUSSION}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
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
                {TXT_NO_COMMENTS}
              </Text>
            )
          }
        />

        {/* Input Bar */}
        <View
          className="absolute bottom-0 w-full p-4 border-t"
          style={{
            backgroundColor: isDarkMode
              ? 'rgba(15, 23, 42, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDarkMode
              ? 'rgba(71, 85, 105, 0.2)'
              : 'rgba(203, 213, 225, 0.5)',
            paddingBottom: insets.bottom + 16,
          }}>
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
              style={{
                backgroundColor: inputText.trim()
                  ? accentColor
                  : isDarkMode
                    ? '#334155'
                    : '#E2E8F0',
              }}>
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons
                  name="send"
                  size={16}
                  color={
                    inputText.trim()
                      ? 'white'
                      : isDarkMode
                        ? '#64748B'
                        : '#94A3B8'
                  }
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
