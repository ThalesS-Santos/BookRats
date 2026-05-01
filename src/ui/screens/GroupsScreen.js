import { useMainStore } from '@core/store';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Animated, Easing, InteractionManager } from 'react-native';
import { BookLoader } from '@ui/components';
import { useSocialStore } from '../../store/useSocialStore';
import { useThemeStore } from '../../store/useThemeStore';
import { usePopupStore } from '../../store/usePopupStore';
import { useIsFocused } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import { Ionicons } from '@expo/vector-icons';
import { debounce } from '../../utils/debounce';
import { FastAvatar } from '@ui/components';
import { Skeleton } from '@ui/components';

// 🎨 Memoized Animated Components for Staggered Entry
const AnimatedGroupItem = React.memo(({ item, index, navigation, accentColor, COLORS, isDarkMode, isFocused }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (isFocused && !item.isSkeleton) {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: Math.min(index, 10) * 50,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          delay: Math.min(index, 10) * 50,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isFocused, item.isSkeleton]);

  if (item.isSkeleton) {
    return (
      <View className="bg-card-light dark:bg-card-dark p-6 rounded-2xl mb-4 border border-border-light dark:border-border-dark flex-row items-center justify-between shadow-sm">
        <View className="flex-row items-center flex-1 pr-4">
          <Skeleton width={56} height={56} borderRadius={28} style={{ marginRight: 16 }} />
          <View className="flex-1">
            <Skeleton width="60%" height={20} style={{ marginBottom: 6 }} />
            <Skeleton width="30%" height={12} />
          </View>
        </View>
        <Skeleton width={20} height={20} borderRadius={10} />
      </View>
    );
  }

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        onPress={() => navigation.navigate('GroupChat', { groupId: item.id, groupName: item.name })}
        className="bg-card-light dark:bg-card-dark p-6 rounded-2xl mb-4 border border-border-light dark:border-border-dark flex-row items-center justify-between shadow-sm"
        style={{ shadowColor: COLORS.dark_blue, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
      >
        <View className="flex-row items-center flex-1 pr-4">
          <View className="w-14 h-14 bg-primary/10 dark:bg-primary-dark/10 rounded-full items-center justify-center mr-4">
            <Ionicons name="chatbubbles" size={28} color={accentColor} />
          </View>
          <View className="flex-1">
            <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-xs mt-1">
              {item.members ? `${item.members.length} membros` : '0 membros'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const AnimatedFriendItem = React.memo(({ item, index, navigation, COLORS, isDarkMode, isFocused }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (isFocused && !item.isSkeleton) {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: Math.min(index, 10) * 50,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          delay: Math.min(index, 10) * 50,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isFocused, item.isSkeleton]);

  if (item.isSkeleton) {
    return (
      <View className="bg-card-light dark:bg-card-dark p-6 rounded-2xl mb-3 flex-row items-center justify-between border border-border-light dark:border-border-dark shadow-sm">
        <View className="flex-row items-center flex-1 pr-4">
          <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 16 }} />
          <View className="flex-1">
            <Skeleton width="50%" height={18} style={{ marginBottom: 6 }} />
            <Skeleton width="30%" height={12} />
          </View>
        </View>
        <Skeleton width={20} height={20} borderRadius={10} />
      </View>
    );
  }

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity 
        onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
        className="bg-card-light dark:bg-card-dark p-6 rounded-2xl mb-3 flex-row items-center justify-between border border-border-light dark:border-border-dark shadow-sm"
        style={{ shadowColor: COLORS.dark_blue, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
      >
        <View className="flex-row items-center flex-1 pr-4">
          <FastAvatar 
            source={item.profilePic} 
            size={48} 
            style={{ marginRight: 16 }} 
          />
          <View className="flex-1">
            <Text className="text-text-light dark:text-text-dark font-bold text-lg" numberOfLines={1}>{item.username || item.email.split('@')[0]}</Text>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-xs mt-1">Ver perfil completo</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function GroupsScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState('groups'); // 'groups' | 'friends'
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const { isDarkMode } = useThemeStore();
  const user = useMainStore(state => state.user);
  const { showPopup } = usePopupStore();
  const { COLORS } = require('@constants/colors');
  
  // Optimized Social Store Selectors with useShallow
  const {
    friends,
    pendingRequests,
    sentRequests,
    groups,
    searchResults,
    loadingSearch,
    loadingSocial,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    createGroup,
    subscribeToSocialData,
    removeFriend,
    leaveGroup
  } = useSocialStore(useShallow(state => ({
    friends: state.friends,
    pendingRequests: state.pendingRequests,
    sentRequests: state.sentRequests,
    groups: state.groups,
    searchResults: state.searchResults,
    loadingSearch: state.loadingSearch,
    loadingSocial: state.loadingSocial,
    searchUsers: state.searchUsers,
    sendFriendRequest: state.sendFriendRequest,
    acceptFriendRequest: state.acceptFriendRequest,
    rejectFriendRequest: state.rejectFriendRequest,
    createGroup: state.createGroup,
    subscribeToSocialData: state.subscribeToSocialData,
    removeFriend: state.removeFriend,
    leaveGroup: state.leaveGroup
  })));

  const accentColor = isDarkMode ? '#A7C9A7' : '#5B8C5A';

  // Screen level animations
  const headerFade = useRef(new Animated.Value(0)).current;

  // Use dummy skeletons during initial load OR when not "ready"
  const groupsData = (loadingSocial && groups.length === 0) || !isReady
    ? Array(5).fill({}).map((_, i) => ({ id: `skeleton-group-${i}`, isSkeleton: true })) 
    : groups;

  const friendsData = (loadingSocial && friends.length === 0) || !isReady
    ? Array(6).fill({}).map((_, i) => ({ id: `skeleton-friend-${i}`, isSkeleton: true })) 
    : friends;

  useEffect(() => {
    // Interaction Gatekeeping
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (isFocused && !loadingSocial && isReady) {
      headerFade.setValue(0);
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      }).start();
    }
  }, [isFocused, loadingSocial]);

  useEffect(() => {
    let unsub = () => {};
    if (user?.uid) {
      unsub = subscribeToSocialData(user.uid);
    }
    return () => unsub();
  }, [user?.uid]);

  // Memoize a versão debounced da busca
  const debouncedSearch = useCallback(
    debounce((text, uid) => {
      searchUsers(text, uid);
      setIsDebouncing(false);
    }, 500),
    [searchUsers]
  );

  // Limpeza do timer ao desmontar
  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim().length >= 3) {
      setIsDebouncing(true);
      debouncedSearch(text, user.uid);
    } else {
      setIsDebouncing(false);
      debouncedSearch.cancel();
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      showPopup({ title: 'Aviso', message: 'O nome do grupo não pode ser vazio.', type: 'error' });
      return;
    }
    const groupId = await createGroup(newGroupName, user.uid, selectedFriends);
    if (groupId) {
      setModalVisible(false);
      setNewGroupName('');
      setSelectedFriends([]);
      navigation.navigate('GroupChat', { groupId, groupName: newGroupName });
    }
  };

  const toggleFriendSelection = (friendId) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(id => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  const renderGroupItem = useCallback(({ item, index }) => (
    <AnimatedGroupItem 
      item={item} 
      index={index} 
      navigation={navigation} 
      accentColor={accentColor} 
      COLORS={COLORS} 
      isDarkMode={isDarkMode} 
      isFocused={isFocused} 
    />
  ), [navigation, accentColor, COLORS, isDarkMode, isFocused]);

  const renderFriendItem = useCallback(({ item, index }) => (
    <AnimatedFriendItem 
      item={item} 
      index={index} 
      navigation={navigation} 
      COLORS={COLORS} 
      isDarkMode={isDarkMode} 
      isFocused={isFocused} 
    />
  ), [navigation, COLORS, isDarkMode, isFocused]);

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark px-6 pt-4">
      <Animated.View style={{ opacity: headerFade, transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
        <View className="mb-4">
          <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-1">Social</Text>
          <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">Sua Rede</Text>
        </View>

        {/* Tabs */}
        <View className="flex-row mb-6 bg-card-light dark:bg-card-dark p-1 rounded-xl border border-border-light dark:border-border-dark">
          <TouchableOpacity
            onPress={() => setActiveTab('groups')}
            className={`flex-1 p-3 rounded-lg items-center ${activeTab === 'groups' ? 'bg-primary dark:bg-primary-dark' : ''}`}
          >
            <Text className={`font-bold ${activeTab === 'groups' ? 'text-white' : 'text-text-muted-light dark:text-text-muted-dark'}`}>Grupos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('friends')}
            className={`flex-1 p-3 rounded-lg items-center ${activeTab === 'friends' ? 'bg-primary dark:bg-primary-dark' : ''}`}
          >
            <Text className={`font-bold ${activeTab === 'friends' ? 'text-white' : 'text-text-muted-light dark:text-text-muted-dark'}`}>Amigos</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <View className="flex-1">
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="bg-primary/10 dark:bg-primary-dark/10 p-6 rounded-2xl mb-6 border border-primary/20 dark:border-primary-dark/20 flex-row items-center justify-center"
          >
            <Ionicons name="add-circle" size={24} color={accentColor} style={{ marginRight: 8 }} />
            <Text className="text-primary dark:text-primary-dark font-bold text-lg">Criar Grupo de Leitura</Text>
          </TouchableOpacity>

          <FlatList
            data={groupsData}
            keyExtractor={item => item.id}
            renderItem={renderGroupItem}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            ListEmptyComponent={
              !loadingSocial ? (
                <Text className="text-text-muted-light dark:text-text-muted-dark text-center mt-10">Você não pertence a nenhum grupo ainda.</Text>
              ) : null
            }
          />
        </View>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Search Bar */}
          <View className="flex-row items-center bg-card-light dark:bg-card-dark p-3 rounded-xl border border-border-light dark:border-border-dark mb-4">
            <Ionicons name="search" size={20} color={isDarkMode ? '#6B7280' : '#9CA3AF'} className="mr-2" />
            <TextInput
              className="flex-1 p-1 text-text-light dark:text-text-dark"
              placeholder="Buscar por usuário..."
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              value={searchText}
              onChangeText={handleSearch}
            />
          </View>

          {/* Search Results */}
          {searchText.trim().length > 1 && (
            <View className="mb-6 bg-card-light dark:bg-card-dark p-4 rounded-2xl border border-border-light dark:border-border-dark">
              <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3">Resultados</Text>
              {(loadingSearch || isDebouncing) ? (
                <View style={{ height: 40, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#22C55E" />
                </View>
              ) : searchResults.length === 0 ? (
                <Text className="text-text-muted-light dark:text-text-muted-dark text-sm">Nenhum usuário encontrado.</Text>
              ) : (
                searchResults.map(item => {
                  const isFriend = friends.some(f => f.id === item.id);
                  const isSent = sentRequests.some(r => r.receiverId === item.id);
                  return (
                    <View key={item.id} className="flex-row items-center justify-between mb-3 border-b border-border-light/30 dark:border-border-dark/30 pb-3">
                      <View className="flex-row items-center flex-1 pr-4">
                        <FastAvatar source={item.profilePic} size={30} style={{ marginRight: 12 }} />
                        <View className="flex-1">
                          <Text className="text-text-light dark:text-text-dark font-bold" numberOfLines={1}>{item.username || item.email.split('@')[0]}</Text>
                        </View>
                      </View>
                      {isFriend ? (
                        <Text className="text-[#22C55E] text-xs font-bold">Amigo</Text>
                      ) : isSent ? (
                        <Text className="text-yellow-500 text-xs font-bold">Pendente</Text>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            sendFriendRequest(user.uid, item.id);
                            showPopup({ title: 'Sucesso', message: 'Solicitação de amizade enviada!', type: 'success' });
                          }}
                          className="bg-primary p-2 rounded-lg"
                        >
                          <Text className="text-white text-xs font-bold">Adicionar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <View className="mb-6">
              <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 ml-2">Solicitações Pendentes</Text>
              {pendingRequests.map(item => (
                <View key={item.id} className="bg-card-light dark:bg-card-dark p-4 rounded-2xl mb-2 flex-row items-center justify-between border border-border-light dark:border-border-dark shadow-sm" style={{ shadowColor: COLORS.dark_blue, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
                  <View className="flex-1 pr-4">
                    <Text className="text-text-light dark:text-text-dark font-bold" numberOfLines={1}>{item.senderName || 'Convite'}</Text>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() => acceptFriendRequest(item.id)}
                      className="bg-green-500 p-2 rounded-lg mr-2"
                    >
                      <Ionicons name="checkmark" size={16} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => rejectFriendRequest(item.id)}
                      className="bg-red-500 p-2 rounded-lg"
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Friends List */}
          <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-3 ml-2">Meus Amigos ({friends.length})</Text>
          <FlatList
            data={friendsData}
            keyExtractor={item => item.id}
            renderItem={renderFriendItem}
            scrollEnabled={false}
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            ListEmptyComponent={
              !loadingSocial ? (
                <Text className="text-text-muted-light dark:text-text-muted-dark text-sm ml-2">Você ainda não tem amigos. Comece a buscar!</Text>
              ) : null
            }
          />
        </ScrollView>
      )}

      {/* Modal Criar Grupo */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-background-light dark:bg-background-dark p-6 rounded-t-3xl border-t border-border-light dark:border-border-dark h-[80%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-text-light dark:text-text-dark text-2xl font-serif font-bold">Criar Grupo</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </View>

            <Text className="text-text-light dark:text-text-dark font-bold mb-2">Nome do Grupo</Text>
            <TextInput
              className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark text-text-light dark:text-text-dark mb-6"
              placeholder="Ex: Clube do Livro de Terror"
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />

            <Text className="text-text-light dark:text-text-dark font-bold mb-2">Convidar Amigos</Text>
            <ScrollView className="flex-1 mb-4">
              {friends.length === 0 ? (
                <Text className="text-text-muted-light dark:text-text-muted-dark text-sm">Você precisa de amigos para criar um grupo.</Text>
              ) : (
                friends.map(friend => (
                  <TouchableOpacity
                    key={friend.id}
                    onPress={() => toggleFriendSelection(friend.id)}
                    className="flex-row items-center justify-between p-3 border-b border-border-light dark:border-border-dark"
                  >
                    <Text className="text-text-light dark:text-text-dark">{friend.username}</Text>
                    <Ionicons
                      name={selectedFriends.includes(friend.id) ? "checkbox" : "square-outline"}
                      size={24}
                      color={selectedFriends.includes(friend.id) ? accentColor : (isDarkMode ? '#6B7280' : '#9CA3AF')}
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={handleCreateGroup}
              disabled={friends.length === 0}
              className={`p-4 rounded-2xl items-center ${friends.length === 0 ? 'bg-gray-400' : 'bg-primary dark:bg-primary-dark'}`}
            >
              <Text className="text-white font-bold text-lg">Criar Grupo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
