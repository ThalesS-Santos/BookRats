import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FastAvatar from './FastAvatar';

/**
 * 🌟 Collaborative Social Component: Community Note (Echo)
 * Style: Speech Bubble with Glassmorphism
 */
const CommunityNote = ({ note, onClap, COLORS, isDarkMode, isFrontCard = false, isBackgroundCard = false }) => {
  const { userMetadata, pageLocation, text, reactions, userId, bookId } = note;
  
  const bgColor = isFrontCard 
    ? (isDarkMode ? '#0F172A' : '#FFFFFF') // Solid slate-900 or Pure White
    : (isDarkMode ? '#1E293B' : '#F1F5F9'); // Card layers

  if (isBackgroundCard) {
    return (
      <View 
        style={[
          styles.container,
          { 
            backgroundColor: bgColor,
            borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.4)' : 'rgba(203, 213, 225, 0.6)',
            shadowColor: COLORS.neon_green,
            shadowOpacity: isDarkMode ? 0.1 : 0.05,
            shadowRadius: 10,
          }
        ]}
        className="w-72 h-32 rounded-[24px] border"
      />
    );
  }

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: bgColor,
          borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.4)' : 'rgba(203, 213, 225, 0.6)',
          shadowColor: COLORS.neon_green,
          shadowOpacity: isFrontCard ? 0.2 : 0,
          shadowRadius: 15,
          elevation: isFrontCard ? 5 : 0,
        }
      ]}
      className="p-4 rounded-[24px] w-72 h-32 justify-between border"
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <FastAvatar 
            source={userMetadata?.photoURL} 
            size={28} 
            style={{ marginRight: 8 }}
          />
          <View>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-[7px] uppercase tracking-[2px] font-bold mb-0.5 opacity-50">
              SOBRE ESTE LIVRO
            </Text>
            <View className="flex-row items-center">
              <Text className="text-text-light dark:text-text-dark font-bold text-[11px]" numberOfLines={1}>
                {userMetadata?.displayName}
              </Text>
              {userMetadata?.isInfluencer && (
                <Ionicons name="star" size={8} color={COLORS.neon_green} style={{ marginLeft: 3 }} />
              )}
            </View>
          </View>
        </View>
        
        <View className="flex-row items-center">
          <Text className="text-primary dark:text-primary-dark font-mono text-[9px] uppercase font-bold mr-2 opacity-60">
            Pg. {pageLocation}
          </Text>
          <View className="bg-primary/5 dark:bg-primary-dark/5 p-1 rounded-full">
              <Ionicons name="chatbubble-ellipses-outline" size={12} color={isDarkMode ? 'rgba(167, 201, 167, 0.6)' : 'rgba(91, 140, 90, 0.6)'} />
          </View>
        </View>
      </View>

      <Text 
        className="text-text-light dark:text-text-dark font-serif italic text-[12px] leading-4" 
        numberOfLines={2}
      >
        "{text}"
      </Text>

      <View className="flex-row justify-end">
        <TouchableOpacity 
          onPress={() => onClap(userId, bookId, note.id)}
          className="flex-row items-center bg-background-light dark:bg-background-dark/50 px-2 py-1 rounded-full border border-border-light dark:border-border-dark"
        >
          <Text className="mr-1 text-[10px]">🐀</Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark font-bold text-[9px]">
            {reactions?.claps || 0}
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
