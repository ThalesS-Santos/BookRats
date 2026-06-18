import { useState, useEffect, useRef } from 'react';

import * as Haptics from 'expo-haptics';
import { Keyboard } from 'react-native';

import { getEchoReplies, replyToEcho } from '@core/api/social';
import { createLogger } from '@core/observability';
import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { useMainStore } from '@core/store';

import { useThemeStore } from '../../store/useThemeStore';

const log = createLogger('ui.echo-detail');

export const useEchoDetail = (echo, echoId) => {
  const { user } = useMainStore();
  const { hapticsEnabled } = useThemeStore();

  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const fetched = await getEchoReplies(echo.userId, echo.bookId, echoId);
      if (active) {
        setReplies(fetched);
        setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [echo.userId, echo.bookId, echoId]);

  const handleSendReply = async () => {
    if (!inputText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const textToSend = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    if (hapticsEnabled)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const optimisticReply = {
      id: `temp-${Date.now()}`,
      userId: user.uid,
      bookId: echo.bookId,
      pageLocation: echo.pageLocation,
      text: textToSend,
      isPublic: true,
      parentId: echoId,
      replyCount: 0,
      userMetadata: {
        displayName: UserNormalizationService.normalizeDisplayName(user),
        photoURL: UserNormalizationService.normalizeUserAvatar(user),
      },
      reactions: { claps: 0 },
      timestamp: { seconds: Date.now() / 1000 },
    };

    setReplies(prev => [optimisticReply, ...prev]);

    if (flatListRef.current && replies.length > 0) {
      setTimeout(
        () => flatListRef.current.scrollToOffset({ offset: 0, animated: true }),
        100,
      );
    }

    try {
      await replyToEcho(
        echo.userId,
        echo.bookId,
        echoId,
        textToSend,
        {
          displayName: optimisticReply.userMetadata.displayName,
          photoURL: optimisticReply.userMetadata.photoURL,
        },
        user.uid,
      );
    } catch (error) {
      log.error('Failed to send reply', {
        error,
        echoId,
        bookId: echo?.bookId,
      });
      setReplies(prev => prev.filter(r => r.id !== optimisticReply.id));
      if (hapticsEnabled)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    user,
    replies,
    loading,
    inputText,
    setInputText,
    isSubmitting,
    flatListRef,
    handleSendReply,
  };
};
