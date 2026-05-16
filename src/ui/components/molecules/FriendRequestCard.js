import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMainStore } from '@core/store';
import FastAvatar from '../atoms/FastAvatar';
import * as Haptics from '../../../utils/haptics';

/**
 * FriendRequestCard
 * Displays an incoming friend request with user info and action buttons.
 */
export default function FriendRequestCard({ request }) {
  const { acceptFriend, declineFriend } = useMainStore();
  const [loadingAction, setLoadingAction] = useState(null); // 'accept' or 'decline'

  const sender = request.sender || {};

  const handleAccept = async () => {
    setLoadingAction('accept');
    try {
      await acceptFriend(request.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDecline = async () => {
    setLoadingAction('decline');
    try {
      await declineFriend(request.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <View className="flex-row items-center justify-between bg-white dark:bg-card-dark p-4 rounded-3xl mb-3 border border-border-light dark:border-border-dark shadow-sm">
      {/* User Info */}
      <View className="flex-row items-center flex-1 mr-2">
        <FastAvatar 
          uri={sender.photoURL} 
          size={48} 
          name={sender.displayName} 
        />
        <View className="ml-3 flex-1">
          <Text className="text-gray-900 dark:text-white font-bold text-base" numberOfLines={1}>
            {sender.displayName || 'Leitor'}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-xs" numberOfLines={1}>
            @{sender.username || 'usuario'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row items-center">
        <TouchableOpacity 
          onPress={handleDecline}
          disabled={loadingAction !== null}
          className="w-10 h-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mr-2"
        >
          {loadingAction === 'decline' ? (
            <ActivityIndicator size="small" color="#999" />
          ) : (
            <Ionicons name="close-outline" size={20} color="#666" />
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleAccept}
          disabled={loadingAction !== null}
          className="flex-row items-center bg-primary-light dark:bg-primary-dark px-4 py-2.5 rounded-2xl"
        >
          {loadingAction === 'accept' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text className="text-white font-bold ml-1 text-sm">Aceitar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
