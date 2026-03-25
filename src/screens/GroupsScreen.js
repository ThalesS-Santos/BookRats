import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSocialStore } from '../store/useSocialStore';
import { useBookStore } from '../store/useBookStore';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

export default function GroupsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('groups'); // 'groups' | 'friends'
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);

  const { isDarkMode } = useThemeStore();
  const user = useBookStore(state => state.user);
  
  const {
    friends,
    pendingRequests,
    sentRequests,
    groups,
    searchResults,
    loadingSearch,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    createGroup,
    subscribeToSocialData,
    removeFriend,
    leaveGroup
  } = useSocialStore();

  const accentColor = isDarkMode ? '#A7C9A7' : '#5B8C5A';

  useEffect(() => {
    let unsub = () => {};
    if (user?.uid) {
      unsub = subscribeToSocialData(user.uid);
    }
    return () => unsub();
  }, [user?.uid]);

  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim().length > 1) {
      searchUsers(text, user.uid);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Erro', 'O nome do grupo não pode ser vazio.');
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

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('GroupChat', { groupId: item.id, groupName: item.name })}
      className="bg-card-light dark:bg-card-dark p-5 rounded-2xl mb-3 border border-border-light dark:border-border-dark flex-row items-center justify-between"
    >
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 bg-primary/10 dark:bg-primary-dark/10 rounded-full items-center justify-center mr-4">
          <Ionicons name="chatbubbles" size={24} color={accentColor} />
        </View>
        <View className="flex-1">
          <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-xs">
            {item.members ? `${item.members.length} membros` : '0 membros'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
    </TouchableOpacity>
  );

  const renderFriendItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
      className="bg-card-light dark:bg-card-dark p-4 rounded-2xl mb-2 flex-row items-center justify-between border border-border-light dark:border-border-dark"
    >
      <View className="flex-row items-center">
        <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center mr-3">
          <Ionicons name="person" size={20} color={accentColor} />
        </View>
        <Text className="text-text-light dark:text-text-dark font-bold">{item.username || item.email.split('@')[0]}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark px-6 pt-4">
      <View className="mb-4">
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-1">Social</Text>
        <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">Comunidade</Text>
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

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <View className="flex-1">
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="bg-primary/10 dark:bg-primary-dark/10 p-5 rounded-2xl mb-4 border border-primary/20 dark:border-primary-dark/20 flex-row items-center justify-center"
          >
            <Ionicons name="add-circle" size={24} color={accentColor} className="mr-2" />
            <Text className="text-primary dark:text-primary-dark font-bold text-lg">Criar Grupo de Leitura</Text>
          </TouchableOpacity>

          <FlatList
            data={groups}
            keyExtractor={item => item.id}
            renderItem={renderGroupItem}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text className="text-text-muted-light dark:text-text-muted-dark text-center mt-10">Você não pertence a nenhum grupo ainda.</Text>
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
              {loadingSearch ? (
                <ActivityIndicator size="small" color={accentColor} />
              ) : searchResults.length === 0 ? (
                <Text className="text-text-muted-light dark:text-text-muted-dark text-sm">Nenhum usuário encontrado.</Text>
              ) : (
                searchResults.map(item => {
                  const isFriend = friends.some(f => f.id === item.id);
                  const isSent = sentRequests.some(r => r.receiverId === item.id);
                  return (
                    <View key={item.id} className="flex-row items-center justify-between mb-2">
                      <Text className="text-text-light dark:text-text-dark font-bold">{item.username || item.email.split('@')[0]}</Text>
                      {isFriend ? (
                        <Text className="text-[#22C55E] text-xs font-bold">Amigo</Text>
                      ) : isSent ? (
                        <Text className="text-yellow-500 text-xs font-bold">Pendente</Text>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            sendFriendRequest(user.uid, item.id);
                            Alert.alert('Sucesso', 'Solicitação de amizade enviada!');
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
                <View key={item.id} className="bg-card-light dark:bg-card-dark p-4 rounded-2xl mb-2 flex-row items-center justify-between border border-border-light dark:border-border-dark">
                  <Text className="text-text-light dark:text-text-dark font-bold">{item.senderName || 'Convite'}</Text>
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
            data={friends}
            keyExtractor={item => item.id}
            renderItem={renderFriendItem}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text className="text-text-muted-light dark:text-text-muted-dark text-sm ml-2">Você ainda não tem amigos. Comece a buscar!</Text>
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
