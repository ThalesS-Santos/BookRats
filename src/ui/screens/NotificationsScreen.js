import { useMainStore } from '@core/store';
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/useThemeStore';
import { FastAvatar } from '@ui/components';
import { COLORS } from '@constants/colors';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { notifications, markAsRead, markAllAsRead } = useMainStore();
  const { isDarkMode } = useThemeStore();
  const { user } = useMainStore();

  const handleNotificationPress = (notif) => {
    if (!notif.read && user) markAsRead(user.uid, notif.id);
    
    // In order for EchoDetailScreen to work, it expects the `echo` object. 
    // We pass a skeleton here so it can fetch the replies, though the header display might be missing full text
    // A robust app would fetch the full original echo, but passing the IDs lets it fetch replies.
    navigation.navigate('EchoDetail', { 
      echoId: notif.echoId, 
      bookId: notif.bookId, 
      echo: { 
        id: notif.echoId, 
        bookId: notif.bookId, 
        userId: user?.uid,
        userMetadata: { displayName: user?.displayName || user?.username } 
      } 
    });
  };

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity 
        onPress={() => handleNotificationPress(item)}
        className={`flex-row p-4 mb-4 rounded-2xl border ${!item.read ? 'bg-card-light dark:bg-card-dark border-primary/30 dark:border-primary-dark/30 shadow-sm' : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark opacity-70'}`}
      >
        <FastAvatar source={item.fromUser?.photoURL} size={40} style={{ marginRight: 16 }} />
        <View className="flex-1 justify-center">
          <Text className="text-text-light dark:text-text-dark font-serif text-[15px] leading-5">
            <Text className="font-bold">{item.fromUser?.displayName || 'Alguém'} </Text>
            {item.type === 'clap' ? 'aplaudiu seu Echo!' : 'respondeu ao seu Echo.'}
          </Text>
        </View>
        {!item.read && (
          <View style={styles.neonDot} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-5 w-10 h-10 items-center justify-center bg-card-light dark:bg-card-dark rounded-full shadow-sm border border-border-light dark:border-border-dark">
            <Ionicons name="arrow-back" size={20} color={isDarkMode ? 'white' : 'black'} />
          </TouchableOpacity>
          <Text className="text-xl font-serif font-bold text-text-light dark:text-text-dark">Notificações</Text>
        </View>
        <TouchableOpacity onPress={() => user && markAllAsRead(user.uid)} className="p-2">
          <Ionicons name="checkmark-done-circle-outline" size={28} color={COLORS.neon_green} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 24, paddingTop: 16 }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Ionicons name="notifications-off-outline" size={48} color={isDarkMode ? '#334155' : '#CBD5E1'} />
            <Text className="text-center mt-4 font-serif italic text-text-muted-light dark:text-text-muted-dark">
              Tranquilo por aqui. Sem novas notificações.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
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
    shadowColor: COLORS.neon_green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4
  }
});
