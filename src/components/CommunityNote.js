import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FastAvatar from './FastAvatar';

/**
 * 🌟 Collaborative Social Component: Community Note (Echo)
 * Style: Speech Bubble with Glassmorphism
 */
const CommunityNote = ({ note, onClap, COLORS, isDarkMode }) => {
  const { userMetadata, pageLocation, text, reactions, userId, bookId } = note;
  
  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'
        }
      ]}
      className="p-5 rounded-3xl mr-4 w-72 h-40 justify-between shadow-sm border"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <FastAvatar 
            source={userMetadata?.photoURL} 
            size={32} 
            style={{ marginRight: 8 }}
          />
          <View>
            <Text className="text-text-light dark:text-text-dark font-bold text-xs" numberOfLines={1}>
              {userMetadata?.displayName}
            </Text>
            <Text className="text-primary dark:text-primary-dark font-mono text-[10px] uppercase font-bold">
              Página {pageLocation}
            </Text>
          </View>
        </View>
        
        <View className="bg-primary/10 dark:bg-primary-dark/10 px-2 py-1 rounded-full">
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={isDarkMode ? '#A7C9A7' : '#5B8C5A'} />
        </View>
      </View>

      <Text 
        className="text-text-light dark:text-text-dark font-serif italic text-sm leading-5" 
        numberOfLines={3}
      >
        "{text}"
      </Text>

      <View className="flex-row justify-end mt-2">
        <TouchableOpacity 
          onPress={() => onClap(userId, bookId, note.id)}
          className="flex-row items-center bg-card-light dark:bg-card-dark px-3 py-1.5 rounded-full border border-border-light dark:border-border-dark"
        >
          <Text className="mr-2 text-xs">🐀</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark font-bold text-xs">
            {reactions?.claps || 0} claps
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Glassmorphism effect
    backdropFilter: 'blur(10px)', // For web support if needed
  }
});

export default React.memo(CommunityNote);
