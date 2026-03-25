import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getGroupDetails, updateGroupDetails, removeGroupMember, searchUsers, addGroupMember } from '../api/social';
import { useSocialStore } from '../store/useSocialStore';
import { useBookStore } from '../store/useBookStore';
import { useThemeStore } from '../store/useThemeStore';
import { usePopupStore } from '../store/usePopupStore';
import { Modal, TextInput as RNTextInput } from 'react-native';

export default function GroupDetailsScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { isDarkMode } = useThemeStore();
  const { leaveGroup } = useSocialStore();
  const user = useBookStore(state => state.user);
  const { showPopup } = usePopupStore();
  
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  // Add Member State
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const isAdmin = group?.adminId === user?.uid;

  const loadDetails = async () => {
    try {
      const data = await getGroupDetails(groupId);
      setGroup(data);
      setEditName(data?.name || '');
      setEditDescription(data?.description || '');
    } catch (error) {
      showPopup({ title: 'Erro', message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [groupId]);

  const handleLeaveGroup = () => {
    showPopup({
      title: 'Sair do Grupo',
      message: `Tem certeza que deseja sair de "${group?.name}"?`,
      type: 'confirm',
      onConfirm: async () => {
        await leaveGroup(groupId);
        navigation.navigate('MainTabs', { screen: 'Grupo' });
      }
    });
  };

  const handleUpdateGroup = async () => {
    if (!editName.trim()) {
      showPopup({ title: 'Aviso', message: 'O nome do grupo não pode ser vazio.', type: 'error' });
      return;
    }
    setUpdating(true);
    try {
      await updateGroupDetails(groupId, editName, editDescription);
      setIsEditing(false);
      loadDetails(); // Refresh
      showPopup({ title: 'Sucesso', message: 'Grupo atualizado!', type: 'success' });
    } catch (error) {
      showPopup({ title: 'Erro', message: error.message, type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveMember = (memberId, memberName) => {
    showPopup({
      title: 'Remover Membro',
      message: `Tem certeza que deseja remover ${memberName} do grupo?`,
      type: 'confirm',
      onConfirm: async () => {
        try {
          await removeGroupMember(groupId, memberId);
          loadDetails(); // Refresh
          showPopup({ title: 'Sucesso', message: 'Membro removido!', type: 'success' });
        } catch (error) {
          showPopup({ title: 'Erro', message: error.message, type: 'error' });
        }
      }
    });
  };

  const handleSearchUsers = async (text) => {
    setSearchQuery(text);
    if (text.trim().length > 1) {
      setSearching(true);
      try {
        const users = await searchUsers(text);
        // Filtra para remover quem já está no grupo
        const filtered = users.filter(u => !(group?.members || []).some(m => m.id === u.id));
        setSearchResults(filtered);
      } catch (error) {
        console.error(error);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await addGroupMember(groupId, userId);
      loadDetails(); // Refresh
      showPopup({ title: 'Sucesso', message: 'Membro adicionado!', type: 'success' });
    } catch (error) {
      showPopup({ title: 'Erro', message: error.message, type: 'error' });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background-light dark:bg-background-dark justify-center items-center">
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  if (!group) return null;

  // Sort members by total pages read
  const rankedMembers = [...(group.members || [])].sort((a, b) => (b.total_pages_read || 0) - (a.total_pages_read || 0));

  const renderMember = ({ item, index }) => {
    const isFirst = index === 0;
    const isSelf = item.id === user?.uid;
    return (
      <View 
        key={item.id}
        className={`bg-card-light dark:bg-card-dark p-4 rounded-2xl mb-2 flex-row items-center justify-between border ${
          isFirst 
            ? 'border-primary dark:border-primary-dark shadow-sm border-2' 
            : 'border-border-light dark:border-border-dark'
        }`}
      >
        <View className="flex-row items-center flex-1">
          <Text className={`font-bold mr-3 ${isFirst ? 'text-primary dark:text-primary-dark text-lg' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
            #{index + 1}
          </Text>
          <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center mr-3">
            <Ionicons name="person" size={20} color="#22C55E" />
          </View>
          <View className="flex-1">
            <Text className="text-text-light dark:text-text-dark font-bold">
              {item.username || item.email.split('@')[0]}
            </Text>
            {isFirst && (
              <Text className="text-xs text-primary dark:text-primary-dark">👑 Top Reader</Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center">
          {isAdmin && !isSelf && (
            <TouchableOpacity 
              onPress={() => handleRemoveMember(item.id, item.username || item.email.split('@')[0])}
              className="mr-2 p-1 bg-red-500/10 rounded-lg border border-red-500/20"
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
          <Text className="text-text-light dark:text-text-dark font-mono bg-primary/10 px-2 py-1 rounded-lg text-xs">
            {item.total_pages_read || 0} pág
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark p-6">
      <View className="flex-row justify-between items-center mt-12 mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={isDarkMode ? '#E0E0E0' : '#1A1A1A'} />
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity 
            onPress={() => {
              if (isEditing) handleUpdateGroup();
              else setIsEditing(true);
            }} 
            disabled={updating}
            className="p-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark"
          >
            {updating ? (
              <ActivityIndicator size="small" color="#22C55E" />
            ) : (
              <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={22} color="#22C55E" />
            )}
          </TouchableOpacity>
        )}
      </View>

      <View className="items-center mb-8">
        <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-3">
          <Ionicons name="chatbubbles" size={40} color="#22C55E" />
        </View>
        {isEditing ? (
          <RNTextInput
            className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark p-3 rounded-xl border border-border-light dark:border-border-dark text-2xl font-bold text-center w-full"
            value={editName}
            onChangeText={setEditName}
            placeholder="Nome do Grupo"
            placeholderTextColor="#6B7280"
          />
        ) : (
          <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">{group.name}</Text>
        )}
        <Text className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">
          {group.members?.length || 0} participantes
        </Text>
      </View>

      <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark mb-6">
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-2">Descrição</Text>
        {isEditing ? (
          <RNTextInput
            className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark p-3 rounded-lg border border-border-light dark:border-border-dark text-sm"
            value={editDescription}
            onChangeText={setEditDescription}
            placeholder="Adicione uma descrição..."
            placeholderTextColor="#6B7280"
            multiline
          />
        ) : (
          <Text className="text-text-light dark:text-text-dark">
            {group.description || 'Nenhuma descrição fornecida.'}
          </Text>
        )}
      </View>

      <View className="flex-row justify-between items-center mb-3 ml-2">
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold">Ranking do Grupo</Text>
        {isAdmin && (
          <TouchableOpacity onPress={() => setShowAddModal(true)} className="flex-row items-center">
            <Ionicons name="person-add-outline" size={16} color="#22C55E" />
            <Text className="text-primary dark:text-primary-dark font-bold text-xs ml-1">Adicionar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="mb-8">
        {rankedMembers.map((item, index) => renderMember({ item, index }))}
      </View>

      <TouchableOpacity 
        onPress={handleLeaveGroup}
        className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl items-center mb-12 flex-row justify-center"
      >
        <Ionicons name="exit-outline" size={20} color="#EF4444" className="mr-2" />
        <Text className="text-red-500 font-bold">Sair do Grupo</Text>
      </TouchableOpacity>

      {/* Add Member Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-background-light dark:bg-background-dark p-6 rounded-t-3xl h-[60%] border-t border-border-light dark:border-border-dark">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-text-light dark:text-text-dark text-xl font-bold">Adicionar Membro</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center bg-card-light dark:bg-card-dark p-3 rounded-xl border border-border-light dark:border-border-dark mb-4">
              <Ionicons name="search" size={20} color="#6B7280" className="mr-2" />
              <RNTextInput
                className="flex-1 text-text-light dark:text-text-dark"
                placeholder="Buscar usuário..."
                placeholderTextColor="#6B7280"
                value={searchQuery}
                onChangeText={handleSearchUsers}
              />
            </View>

            {searching ? (
              <ActivityIndicator size="small" color="#22C55E" />
            ) : (
              <ScrollView>
                {searchResults.map(u => (
                  <TouchableOpacity 
                    key={u.id} 
                    onPress={() => { handleAddMember(u.id); setShowAddModal(false); }}
                    className="flex-row items-center justify-between p-3 border-b border-border-light dark:border-border-dark"
                  >
                    <Text className="text-text-light dark:text-text-dark">{u.username || u.email.split('@')[0]}</Text>
                    <Ionicons name="add-circle-outline" size={24} color="#22C55E" />
                  </TouchableOpacity>
                ))}
                {searchQuery.trim().length > 1 && searchResults.length === 0 && (
                  <Text className="text-text-muted-light dark:text-text-muted-dark text-center mt-4">Nenhum resultado.</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
