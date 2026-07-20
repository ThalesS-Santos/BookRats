import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { getGroupAdmins, isGroupAdmin } from '@utils/groupRoles';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  TextInput as RNTextInput,
} from 'react-native';

import {
  getGroupDetails,
  updateGroupDetails,
  removeGroupMember,
  addGroupMember,
  promoteToAdmin,
} from '@core/api/social';
import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { useMainStore } from '@core/store';
import { BookLoader } from '@ui/components';

import { usePopupStore } from '../../store/usePopupStore';
import { useSocialStore } from '../../store/useSocialStore';
import { useThemeStore } from '../../store/useThemeStore';
import { debounce } from '../../utils/debounce';

const TXT_LEAVE_GROUP = 'Sair do Grupo';

export default function GroupDetailsScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { isDarkMode } = useThemeStore();
  const accentColor = isDarkMode ? '#A7C9A7' : '#5B8C5A';
  const mutedColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const {
    leaveGroup,
    searchUsers,
    searchResults: storeSearchResults,
    loadingSearch,
  } = useSocialStore();
  const user = useMainStore(state => state.user);
  const { showPopup } = usePopupStore();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Add Member State
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = isGroupAdmin(group, user?.uid);
  const adminIds = getGroupAdmins(group);

  const loadDetails = useCallback(async () => {
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
  }, [groupId, showPopup]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDetails();
  }, [loadDetails]);

  const handleLeaveGroup = () => {
    showPopup({
      title: 'Sair do Grupo',
      message: `Tem certeza que deseja sair de "${group?.name}"?`,
      type: 'confirm',
      onConfirm: async () => {
        await leaveGroup(groupId);
        navigation.navigate('MainTabs', { screen: 'Grupo' });
      },
    });
  };

  const handleUpdateGroup = async () => {
    if (!editName.trim()) {
      showPopup({
        title: 'Aviso',
        message: 'O nome do grupo não pode ser vazio.',
        type: 'error',
      });
      return;
    }
    setUpdating(true);
    try {
      await updateGroupDetails(groupId, editName, editDescription);
      setIsEditing(false);
      await loadDetails(); // Refresh
      showPopup({
        title: 'Sucesso',
        message: 'Grupo atualizado!',
        type: 'success',
      });
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
        setUpdating(true);
        try {
          await removeGroupMember(groupId, memberId);
          await loadDetails(); // Refresh
          showPopup({
            title: 'Sucesso',
            message: 'Membro removido!',
            type: 'success',
          });
        } catch (error) {
          showPopup({ title: 'Erro', message: error.message, type: 'error' });
        } finally {
          setUpdating(false);
        }
      },
    });
  };

  const handlePromoteMember = (memberId, memberName) => {
    showPopup({
      title: 'Promover a Admin',
      message: `Tornar ${memberName} administrador(a) do grupo? Admins podem convidar, expulsar e promover membros.`,
      type: 'confirm',
      onConfirm: async () => {
        setUpdating(true);
        try {
          await promoteToAdmin(groupId, memberId);
          await loadDetails(); // Refresh
          showPopup({
            title: 'Sucesso',
            message: 'Novo administrador promovido!',
            type: 'success',
          });
        } catch (error) {
          showPopup({ title: 'Erro', message: error.message, type: 'error' });
        } finally {
          setUpdating(false);
        }
      },
    });
  };

  const filteredSearchResults = useMemo(() => {
    return storeSearchResults.filter(
      u => !(group?.members || []).some(m => m.id === u.id),
    );
  }, [storeSearchResults, group?.members]);

  const debouncedSearch = useMemo(
    () =>
      debounce(text => {
        searchUsers(text, user.uid);
        setIsDebouncing(false);
      }, 500),
    [searchUsers, user.uid],
  );

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const handleSearchUsers = text => {
    setSearchQuery(text);
    if (text.trim().length >= 3) {
      setIsDebouncing(true);
      debouncedSearch(text);
    } else {
      setIsDebouncing(false);
      debouncedSearch.cancel();
    }
  };

  const handleAddMember = async userId => {
    setUpdating(true);
    try {
      await addGroupMember(groupId, userId);
      await loadDetails(); // Refresh
      showPopup({
        title: 'Sucesso',
        message: 'Membro adicionado!',
        type: 'success',
      });
    } catch (error) {
      showPopup({ title: 'Erro', message: error.message, type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <BookLoader isVisible={loading} />;
  }

  if (!group) return null;

  // Sort members by total pages read
  const rankedMembers = [...(group.members || [])].sort(
    (a, b) => (b.total_pages_read || 0) - (a.total_pages_read || 0),
  );

  const renderMember = ({ item, index }) => {
    const isFirst = index === 0;
    const isSelf = item.id === user?.uid;
    const memberIsAdmin = adminIds.includes(item.id);
    return (
      <View
        key={item.id}
        className={`bg-card-light dark:bg-card-dark p-4 rounded-2xl mb-2 flex-row items-center justify-between border ${
          isFirst
            ? 'border-primary dark:border-primary-dark border-2'
            : 'border-border-light dark:border-border-dark'
        }`}>
        <View className="flex-row items-center flex-1">
          <Text
            className={`font-bold mr-3 ${isFirst ? 'text-primary dark:text-primary-dark text-lg' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
            #{index + 1}
          </Text>
          <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center mr-3">
            <Ionicons name="person" size={20} color={accentColor} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-text-light dark:text-text-dark font-bold">
                {UserNormalizationService.normalizeDisplayName(item)}
              </Text>
              {memberIsAdmin && (
                <View className="ml-2 px-1.5 py-0.5 bg-primary/15 dark:bg-primary-dark/15 rounded-md flex-row items-center">
                  <Ionicons
                    name="shield-checkmark"
                    size={10}
                    color={accentColor}
                  />
                  <Text className="text-[9px] text-primary dark:text-primary-dark font-bold ml-1">
                    Admin
                  </Text>
                </View>
              )}
            </View>
            {isFirst && (
              <Text className="text-xs text-primary dark:text-primary-dark">
                👑 Top Reader
              </Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center">
          {isAdmin && !isSelf && !memberIsAdmin && (
            <TouchableOpacity
              onPress={() =>
                handlePromoteMember(
                  item.id,
                  UserNormalizationService.normalizeDisplayName(item),
                )
              }
              className="mr-2 p-1 bg-primary/10 rounded-lg border border-primary/20">
              <Ionicons name="shield-outline" size={16} color={accentColor} />
            </TouchableOpacity>
          )}
          {isAdmin && !isSelf && (
            <TouchableOpacity
              onPress={() =>
                handleRemoveMember(
                  item.id,
                  UserNormalizationService.normalizeDisplayName(item),
                )
              }
              className="mr-2 p-1 bg-red-500/10 rounded-lg border border-red-500/20">
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      className="flex-1 bg-background-light dark:bg-background-dark">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
          <View className="flex-row justify-between items-center mt-12 mb-6">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDarkMode ? '#E0E0E0' : '#1A1A1A'}
              />
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => {
                  if (isEditing) handleUpdateGroup();
                  else setIsEditing(true);
                }}
                disabled={updating}
                className="p-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark">
                {updating ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : (
                  <Ionicons
                    name={isEditing ? 'checkmark' : 'create-outline'}
                    size={22}
                    color={accentColor}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>

          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-3">
              <Ionicons name="chatbubbles" size={40} color={accentColor} />
            </View>
            {isEditing ? (
              <RNTextInput
                className="bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark p-3 rounded-xl border border-border-light dark:border-border-dark text-2xl font-bold text-center w-full"
                value={editName}
                onChangeText={setEditName}
                placeholder="Nome do Grupo"
                placeholderTextColor={mutedColor}
              />
            ) : (
              <Text className="text-text-light dark:text-text-dark text-3xl font-serif font-bold">
                {group.name}
              </Text>
            )}
            <Text className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">
              {group.members?.length || 0} participantes
            </Text>
          </View>

          <View className="bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark mb-6">
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-2">
              Descrição
            </Text>
            {isEditing ? (
              <RNTextInput
                className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark p-3 rounded-lg border border-border-light dark:border-border-dark text-sm"
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Adicione uma descrição..."
                placeholderTextColor={mutedColor}
                multiline
              />
            ) : (
              <Text className="text-text-light dark:text-text-dark">
                {group.description || 'Nenhuma descrição fornecida.'}
              </Text>
            )}
          </View>

          <View className="flex-row justify-between items-center mb-3 ml-2">
            <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold">
              Ranking do Grupo
            </Text>
            {/* Convidar: permitido a QUALQUER membro (admin ou comum). */}
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              className="flex-row items-center">
              <Ionicons
                name="person-add-outline"
                size={16}
                color={accentColor}
              />
              <Text className="text-primary dark:text-primary-dark font-bold text-xs ml-1">
                Convidar
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mb-8">
            {rankedMembers.map((item, index) => renderMember({ item, index }))}
          </View>

          <TouchableOpacity
            onPress={handleLeaveGroup}
            className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl items-center mb-12 flex-row justify-center">
            <Ionicons
              name="exit-outline"
              size={20}
              color="#EF4444"
              style={{ marginRight: 8 }}
            />
            <Text className="text-red-500 font-bold">{TXT_LEAVE_GROUP}</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Add Member Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 justify-end bg-black/60">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
              className="bg-background-light dark:bg-background-dark p-6 rounded-t-3xl h-[60%] border-t border-border-light dark:border-border-dark">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-text-light dark:text-text-dark text-xl font-bold">
                  Adicionar Membro
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddModal(false);
                    setSearchQuery('');
                  }}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDarkMode ? '#E0E0E0' : '#1A1A1A'}
                  />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center bg-card-light dark:bg-card-dark p-3 rounded-xl border border-border-light dark:border-border-dark mb-4">
                <Ionicons
                  name="search"
                  size={20}
                  color={mutedColor}
                  style={{ marginRight: 8 }}
                />
                <RNTextInput
                  className="flex-1 text-text-light dark:text-text-dark"
                  placeholder="Buscar usuário..."
                  placeholderTextColor={mutedColor}
                  value={searchQuery}
                  onChangeText={handleSearchUsers}
                />
              </View>

              {loadingSearch || isDebouncing ? (
                <View
                  style={{
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                  <ActivityIndicator size="small" color={accentColor} />
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {filteredSearchResults.map(u => (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => {
                        handleAddMember(u.id);
                        setShowAddModal(false);
                      }}
                      className="flex-row items-center justify-between p-3 border-b border-border-light dark:border-border-dark">
                      <Text className="text-text-light dark:text-text-dark">
                        {UserNormalizationService.normalizeDisplayName(u)}
                      </Text>
                      <Ionicons
                        name="add-circle-outline"
                        size={24}
                        color={accentColor}
                      />
                    </TouchableOpacity>
                  ))}
                  {searchQuery.trim().length >= 3 &&
                    filteredSearchResults.length === 0 && (
                      <Text className="text-text-muted-light dark:text-text-muted-dark text-center mt-4">
                        Nenhum resultado.
                      </Text>
                    )}
                </ScrollView>
              )}
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Full-screen Loading Overlay for Updates */}
      <BookLoader isVisible={updating} />
    </KeyboardAvoidingView>
  );
}
