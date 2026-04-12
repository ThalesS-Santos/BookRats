import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const FALLBACK_AVATAR = require('../../assets/pixel-avatar-fallback.png');

export default function FastAvatar({ 
  source, 
  size = 48, 
  priority = 'normal', 
  style,
  border = false,
  isOnline = false 
}) {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(91, 140, 90, 0.1)', // Light version of primary/10
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: border ? 2 : 0,
    borderColor: '#5B8C5A',
  };

  return (
    <View style={[containerStyle, style]}>
      <Image
        source={source ? { uri: source } : FALLBACK_AVATAR}
        placeholder={FALLBACK_AVATAR}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        priority={priority}
        style={{ width: '100%', height: '100%' }}
      />
      {isOnline && (
        <View 
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: size / 4,
            height: size / 4,
            borderRadius: size / 8,
            backgroundColor: '#22C55E',
            borderWidth: 2,
            borderColor: 'white',
          }}
        />
      )}
    </View>
  );
}
