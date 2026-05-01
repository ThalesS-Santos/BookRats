import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePopupStore } from '../../../store/usePopupStore';
import { useThemeStore } from '../../../store/useThemeStore';

export default function CustomPopup() {
  const { visible, title, message, type, onConfirm, onCancel, hidePopup } = usePopupStore();
  const { isDarkMode } = useThemeStore();

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'error': return { name: 'alert-circle', color: '#EF4444' };
      case 'success': return { name: 'checkmark-circle', color: '#22C55E' };
      case 'confirm': return { name: 'help-circle', color: '#D97706' };
      default: return { name: 'information-circle', color: '#3B82F6' };
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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/70 px-6">
        <View className="bg-card-light dark:bg-card-dark w-full rounded-3xl p-6 border border-border-light dark:border-border-dark shadow-2xl">
          <View className="items-center mb-4">
            <View className={`p-3 rounded-full ${isDarkMode ? 'bg-primary-dark/10' : 'bg-primary/10'} mb-3`}>
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
                className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded-xl items-center border border-border-light dark:border-border-dark"
              >
                <Text className="text-text-muted-light dark:text-text-muted-dark font-bold">Cancelar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={handleConfirm}
              className={`flex-1 p-3 rounded-xl items-center ${type === 'error' ? 'bg-red-500' : 'bg-primary dark:bg-primary-dark'}`}
            >
              <Text className="text-white font-bold">{type === 'confirm' ? 'Confirmar' : 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
