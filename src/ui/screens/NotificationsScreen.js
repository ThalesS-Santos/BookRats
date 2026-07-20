import React, { useEffect } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@constants/colors';
import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { useMainStore } from '@core/store';
import { FastAvatar, FriendRequestCard } from '@ui/components';

import { useThemeStore } from '../../store/useThemeStore';

const TXT_NOTIFICATIONS = 'Notificações';
const TXT_FRIEND_REQUESTS = 'Pedidos de Amizade (';
const TXT_NO_NOTIFICATIONS =
  'Tranquilo por aqui. Sem novas notificações ou pedidos pendentes.';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { notifications, markAsRead, markAllAsRead, user, receivedRequests } =
    useMainStore();
  const { isDarkMode } = useThemeStore();

  // ℹ️ Social/notification listeners are already wired globally on login
  // (authSlice.setAuthUser). Starting them again here created duplicate
  // Firestore subscriptions, so this screen just reads the shared state.

  const handleNotificationPress = notif => {
    if (!notif.read && user) markAsRead(user.uid, notif.id);

    if (notif.type === 'FRIEND_ACCEPT') {
      navigation.navigate('Ranking'); // Navigate to social/ranking to see friends
      return;
    }

    // Navigating to EchoDetail
    navigation.navigate('EchoDetail', {
      echoId: notif.relatedId,
      bookId: notif.bookId,
      echo: {
        id: notif.relatedId,
        bookId: notif.bookId,
        userId: user?.uid,
        userMetadata: { displayName: user?.displayName || user?.username },
      },
    });
  };

  useEffect(() => {
    // 🧹 Auto-mark as read when entering the screen
    if (user && notifications.some(n => !n.read)) {
      const timer = setTimeout(() => {
        markAllAsRead(user.uid);
      }, 2000); // Wait 2s to give user time to see them
      return () => clearTimeout(timer);
    }
  }, [user, notifications, markAllAsRead]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderItem = ({ item }) => {
    const isUnread = !item.read;
    const icon =
      item.type === 'FRIEND_ACCEPT'
        ? 'people'
        : item.type === 'CLAP_ECHO'
          ? 'heart'
          : 'chatbubble-ellipses';

    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        className={`flex-row p-4 mb-4 rounded-3xl border ${isUnread ? 'bg-card-light dark:bg-card-dark border-primary/30 dark:border-primary-dark/30' : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark opacity-70'}`}>
        <FastAvatar
          source={UserNormalizationService.normalizeUserAvatar({
            photoURL: item.senderAvatar,
            profilePic: item.senderAvatar,
            senderAvatar: item.senderAvatar,
          })}
          name={UserNormalizationService.normalizeDisplayName({
            displayName: item.senderName,
            username: item.senderName,
            senderName: item.senderName,
          })}
          size={42}
          style={{ marginRight: 12 }}
        />
        <View className="flex-1 justify-center">
          <View className="flex-row items-center mb-0.5">
            <Ionicons
              name={icon}
              size={12}
              color={isDarkMode ? COLORS.primary.dark : COLORS.primary.light}
              style={{ marginRight: 4 }}
            />
            <Text className="text-[10px] font-bold text-primary dark:text-primary-dark uppercase tracking-widest">
              {item.type.replace('_', ' ')}
            </Text>
          </View>
          <Text className="text-text-light dark:text-text-dark font-serif text-[15px] leading-5">
            <Text className="font-bold">
              {UserNormalizationService.normalizeDisplayName({
                displayName: item.senderName,
                username: item.senderName,
                senderName: item.senderName,
              })}{' '}
            </Text>
            {item.message ||
              (item.type === 'CLAP_ECHO'
                ? 'curtiu seu Echo!'
                : 'interagiu com você.')}
          </Text>
        </View>
        {isUnread && <View style={styles.neonDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View
      className="flex-1 bg-background-light dark:bg-background-dark"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-5 w-10 h-10 items-center justify-center bg-card-light dark:bg-card-dark rounded-full border border-border-light dark:border-border-dark">
            <Ionicons
              name="arrow-back"
              size={20}
              color={isDarkMode ? '#E0E0E0' : '#1A1A1A'}
            />
          </TouchableOpacity>
          <Text className="text-xl font-serif font-bold text-text-light dark:text-text-dark">
            {TXT_NOTIFICATIONS}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => user && markAllAsRead(user.uid)}
          className="p-2">
          <Ionicons
            name="checkmark-done-circle-outline"
            size={28}
            color={COLORS.neon_green}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        contentContainerStyle={{ padding: 24, paddingTop: 16 }}
        ListHeaderComponent={
          receivedRequests.length > 0 ? (
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={isDarkMode ? '#9CA3AF' : '#6B7280'}
                />
                <Text className="ml-2 text-sm font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest">
                  {TXT_FRIEND_REQUESTS}
                  {receivedRequests.length})
                </Text>
              </View>
              {receivedRequests.map(req => (
                <FriendRequestCard key={req.id} request={req} />
              ))}
              <View className="h-[1px] bg-border-light dark:bg-border-dark w-full my-4" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color={isDarkMode ? '#262626' : '#E5E7EB'}
            />
            <Text className="text-center mt-4 font-serif italic text-text-muted-light dark:text-text-muted-dark px-10">
              {TXT_NO_NOTIFICATIONS}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  neonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.neon_green,
    alignSelf: 'center',
    marginLeft: 12,
  },
});
