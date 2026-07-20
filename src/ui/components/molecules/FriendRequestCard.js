import React, { useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

import { Logger } from '@core/services/Logger';
import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { useMainStore } from '@core/store';

import * as Haptics from '../../../utils/haptics';
import FastAvatar from '../atoms/FastAvatar';

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
      Logger.error('Friend request accept action failed', error, {
        requestId: request?.id,
      });
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
      Logger.error('Friend request decline action failed', error, {
        requestId: request?.id,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <View className="flex-row items-center justify-between bg-card-light dark:bg-card-dark p-4 rounded-3xl mb-3 border border-border-light dark:border-border-dark">
      {/* User Info */}
      <View className="flex-row items-center flex-1 mr-2">
        <FastAvatar
          source={UserNormalizationService.normalizeUserAvatar(sender)}
          size={48}
        />
        <View className="ml-3 flex-1">
          <Text
            className="text-text-light dark:text-text-dark font-bold text-base"
            numberOfLines={1}>
            {UserNormalizationService.normalizeDisplayName(sender)}
          </Text>
          <Text
            className="text-text-muted-light dark:text-text-muted-dark text-xs"
            numberOfLines={1}>
            @
            {sender.username ||
              UserNormalizationService.normalizeDisplayName(
                sender,
              ).toLowerCase()}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row items-center">
        <TouchableOpacity
          testID="decline-btn"
          onPress={handleDecline}
          disabled={loadingAction !== null}
          className="w-10 h-10 items-center justify-center rounded-full bg-background-light dark:bg-border-dark mr-2">
          {loadingAction === 'decline' ? (
            <ActivityIndicator size="small" color="#9CA3AF" />
          ) : (
            <Ionicons name="close-outline" size={20} color="#9CA3AF" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          testID="accept-btn"
          onPress={handleAccept}
          disabled={loadingAction !== null}
          className="flex-row items-center bg-primary-light dark:bg-primary-dark px-4 py-2.5 rounded-2xl">
          {loadingAction === 'accept' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text className="text-white font-bold ml-1 text-sm">
                {'Aceitar'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
