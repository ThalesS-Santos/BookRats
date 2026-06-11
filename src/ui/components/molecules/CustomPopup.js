import React, { useEffect, useRef } from 'react';

import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';

import { usePopupStore } from '../../../store/usePopupStore';
import { useThemeStore } from '../../../store/useThemeStore';

export default function CustomPopup() {
  const {
    visible,
    title,
    message,
    type,
    icon,
    onConfirm,
    onCancel,
    hidePopup,
  } = usePopupStore();
  const { isDarkMode } = useThemeStore();

  const slideAnim = useRef(new Animated.Value(-150)).current;

  const hideToast = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => hidePopup());
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        // Dismiss on swipe up or swipe left/right
        if (gestureState.dy < -20 || Math.abs(gestureState.dx) > 50) {
          hideToast();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible && type === 'toast') {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        hideToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, type]);

  if (!visible) return null;

  const getIcon = () => {
    if (icon) {
      return { name: icon, color: isDarkMode ? '#A78BFA' : '#8B5CF6' };
    }
    switch (type) {
      case 'error':
        return { name: 'alert-circle', color: '#EF4444' };
      case 'success':
      case 'toast':
        return { name: 'checkmark-circle', color: '#22C55E' };
      case 'confirm':
        return { name: 'help-circle', color: '#D97706' };
      default:
        return { name: 'information-circle', color: '#3B82F6' };
    }
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    hidePopup();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    hidePopup();
  };

  const iconData = getIcon();

  if (type === 'toast') {
    return (
      <Animated.View
        style={{ transform: [{ translateY: slideAnim }] }}
        className="absolute top-12 left-4 right-4 z-50"
        {...panResponder.panHandlers}>
        <View className="bg-card-light dark:bg-card-dark rounded-2xl p-4 flex-row items-center border border-border-light/50 dark:border-border-dark/50 shadow-lg elevation-5">
          <View
            className={`p-2 rounded-full ${isDarkMode ? 'bg-primary-dark/10' : 'bg-primary/10'} mr-3`}>
            <Ionicons name={iconData.name} size={24} color={iconData.color} />
          </View>
          <View className="flex-1">
            <Text className="text-text-light dark:text-text-dark font-bold text-base">
              {title}
            </Text>
            {!!message && (
              <Text className="text-text-muted-light dark:text-text-muted-dark text-sm mt-0.5">
                {message}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/70 px-6">
        <View className="bg-card-light dark:bg-card-dark w-full rounded-3xl p-6 border border-border-light dark:border-border-dark shadow-2xl">
          <View className="items-center mb-4">
            <View
              className={`p-3 rounded-full ${isDarkMode ? 'bg-primary-dark/10' : 'bg-primary/10'} mb-3`}>
              <Ionicons name={iconData.name} size={40} color={iconData.color} />
            </View>
            <Text className="text-text-light dark:text-text-dark text-xl font-serif font-bold text-center">
              {title}
            </Text>
          </View>

          <Text className="text-text-muted-light dark:text-text-muted-dark text-sm text-center mb-6 leading-5">
            {message}
          </Text>

          <View className="flex-row justify-center space-x-3 gap-2">
            {type === 'confirm' && (
              <TouchableOpacity
                onPress={handleCancel}
                className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded-xl items-center border border-border-light dark:border-border-dark">
                <Text className="text-text-muted-light dark:text-text-muted-dark font-bold">
                  Cancelar
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleConfirm}
              className={`flex-1 p-3 rounded-xl items-center ${type === 'error' ? 'bg-red-500' : 'bg-primary dark:bg-primary-dark'}`}>
              <Text className="text-white font-bold">
                {type === 'confirm' ? 'Confirmar' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
