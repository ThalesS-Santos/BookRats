import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { FallbackAvatar } from '@ui/assets';

const FALLBACK_AVATAR = FallbackAvatar;

/**
 * @param {Object} props
 * @param {string} props.source
 * @param {number} props.size
 */
export default function FastAvatar({ 
  source, 
  size = 48, 
  priority = 'normal', 
  style,
  border = false,
  isOnline = false 
}) {
  return (
    <View 
      className={`justify-center items-center overflow-hidden bg-primary/10 dark:bg-primary-dark/10 border-primary dark:border-primary-dark ${border ? 'border-2' : ''}`}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
    >
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
          className="absolute bottom-0.5 right-0.5 bg-green-500 border-2 border-white dark:border-surface-dark"
          style={{ width: size / 4, height: size / 4, borderRadius: size / 8 }}
        />
      )}
    </View>
  );
}
