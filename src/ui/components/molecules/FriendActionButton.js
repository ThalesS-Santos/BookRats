import React, { useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

import { COLORS } from '@constants/colors';
import { useMainStore } from '@core/store';

import * as Haptics from '../../../utils/haptics';

/**
 * FriendActionButton
 * Handles the logic and UI for adding/pending/friend states.
 *
 * @param {string} targetUserId - The ID of the user to interact with
 * @param {string} initialStatus - 'none', 'pending', 'accepted'
 */
export default function FriendActionButton({
  targetUserId,
  initialStatus = 'none',
  containerStyle,
}) {
  const { sendFriendRequest, sentRequests, friends } = useMainStore();
  const [loading, setLoading] = useState(false);

  // Determine current status based on store data (real-time sync)
  const isFriend = friends.some(f => f.id === targetUserId);
  const hasSentRequest = sentRequests.some(
    r => r.receiverId === targetUserId && r.status === 'pending',
  );

  const status = isFriend
    ? 'accepted'
    : hasSentRequest
      ? 'pending'
      : initialStatus;

  const handlePress = async () => {
    if (status !== 'none' || loading) return;

    setLoading(true);
    try {
      await sendFriendRequest(targetUserId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Action error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'accepted') {
    return (
      <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
        <Text className="ml-1.5 text-gray-600 dark:text-gray-300 font-medium text-xs">
          Amigos
        </Text>
      </View>
    );
  }

  if (status === 'pending') {
    return (
      <View className="flex-row items-center bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-full border border-dashed border-gray-300 dark:border-gray-600">
        <Ionicons name="time-outline" size={16} color="#9ca3af" />
        <Text className="ml-1.5 text-gray-400 dark:text-gray-500 font-medium text-xs">
          Pendente
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={loading}
      className={`flex-row items-center px-4 py-2 rounded-full ${loading ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary-light dark:bg-primary-dark'}`}
      style={containerStyle}>
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name="person-add-outline" size={16} color="#fff" />
          <Text className="ml-2 text-white font-bold text-xs">Adicionar</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
