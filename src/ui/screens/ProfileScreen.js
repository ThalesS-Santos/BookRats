import React, { useState, useMemo } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';

import { ALL_BADGES } from '@constants/badges';
import { COLORS } from '@constants/colors'; // ✅ FIX #3: import no topo, fora do componente
import { BOOK_STATUS } from '@core/constants/bookStatus';
import { UserNormalizationService } from '@core/services/UserNormalizationService';
import { useMainStore } from '@core/store';
import { selectUnreadCount } from '@core/store/selectors';
import { FastAvatar } from '@ui/components';
import TrophyWallSection from '@ui/components/organisms/TrophyWallSection';
import { useBadgeWall } from '@ui/hooks/useBadgeWall';

import { usePopupStore } from '../../store/usePopupStore';
import { useThemeStore } from '../../store/useThemeStore';
import * as Haptics from '../../utils/haptics';

const TXT_SIGN_OUT = 'Sair da Conta';

// ✅ FIX #1: InfoRow definida FORA do ProfileScreen.
// Assim React não recria o tipo do componente a cada render,
// evitando o ciclo de desmontagem/remontagem que causava o erro de navegação.
const InfoRow = ({
  label,
  value,
  icon,
  onPress,
  accentColor,
  showCompleted,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={!onPress}
    className="flex-row items-center justify-between p-5 bg-card-light dark:bg-card-dark rounded-2xl mb-4 border border-border-light dark:border-border-dark">
    <View className="flex-row items-center">
      <View className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-lg mr-4">
        <Ionicons name={icon} size={22} color={accentColor} />
      </View>
      <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg">
        {label}
      </Text>
    </View>
    <View className="flex-row items-center">
      <Text className="text-text-muted-light dark:text-text-muted-dark font-mono font-bold text-lg mr-2">
        {value}
      </Text>
      {onPress && (
        <Ionicons
          name={showCompleted ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={accentColor}
        />
      )}
    </View>
  </TouchableOpacity>
);

export default function ProfileScreen({ navigation }) {
  const { isDarkMode, toggleTheme, hapticsEnabled, setHapticsEnabled } =
    useThemeStore();
  const [showCompleted, setShowCompleted] = useState(false);
  const books = useMainStore(state => state.books);
  const streak = useMainStore(state => state.streak);
  const totalPagesRead = useMainStore(state => state.totalPagesRead);
  const user = useMainStore(state => state.user);
  const unlockedBadges = useMainStore(state => state.unlockedBadges) || {};
  // ✅ FIX #2: seletores individuais evitam re-render em qualquer mudança do store
  const hasInfluencerBadge = useMainStore(state => state.hasInfluencerBadge);
  const unreadCount = useMainStore(selectUnreadCount);
  const totalBooksCompleted = useMainStore(state => state.totalBooksCompleted);
  const signOut = useMainStore(state => state.signOut);
  const { showPopup } = usePopupStore();

  const [showTrophyWall, setShowTrophyWall] = useState(false);

  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;
  const readingBooks = useMemo(() => {
    return (books || []).filter(b => b.status === BOOK_STATUS.READING).length;
  }, [books]);

  const completedBooksList = useMemo(() => {
    return (books || []).filter(b => b.status === BOOK_STATUS.READ);
  }, [books]);

  const userData = useMemo(
    () => ({
      streak,
      totalPagesRead,
      completedBooks: totalBooksCompleted,
      readingBooks,
    }),
    [streak, totalPagesRead, totalBooksCompleted, readingBooks],
  );

  // 🎯 Trophy-wall derived state centralized in a hook (Etapa 14). For the
  // current user we pass the persisted unlock map so ordering uses real dates.
  const {
    badgeFilter,
    badgeLimit,
    totalUnlocked,
    processedBadges,
    visibleBadges,
    selectFilter,
    showMore,
    showLess,
  } = useBadgeWall(userData, { unlockedBadges });

  const handleSignOut = () => {
    showPopup({
      title: 'Sair da Conta',
      message: 'Deseja realmente sair do BookRats?',
      type: 'confirm',
      onConfirm: signOut,
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-background-light dark:bg-background-dark p-6"
      showsVerticalScrollIndicator={false}>
      {/* Top Header Row for Notifications */}
      <View className="flex-row justify-end items-center mb-2 z-10">
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          className="p-3 bg-card-light dark:bg-card-dark rounded-full border border-border-light dark:border-border-dark relative">
          <Ionicons
            name="notifications-outline"
            size={24}
            color={isDarkMode ? '#E0E0E0' : '#1A1A1A'}
          />
          {unreadCount > 0 && (
            <View
              className="absolute top-2 right-2 w-3 h-3 rounded-full bg-neon-green border-2 border-background-light dark:border-background-dark"
              style={{ backgroundColor: COLORS.neon_green }}
            />
          )}
        </TouchableOpacity>
      </View>

      <View className="items-center mt-2 mb-10">
        <FastAvatar
          source={UserNormalizationService.normalizeUserAvatar(user)}
          size={100}
          style={{ marginBottom: 16 }}
          border
        />
        <View className="flex-row items-center">
          <Text
            className="text-text-light dark:text-text-dark text-3xl font-serif font-bold"
            numberOfLines={1}>
            {UserNormalizationService.normalizeDisplayName(user)}
          </Text>
          {(hasInfluencerBadge || user?.isInfluencer) && (
            <Ionicons
              name="star"
              size={24}
              color={COLORS.neon_green}
              style={{ marginLeft: 8 }}
            />
          )}
        </View>
        <View className="flex-row items-center mt-2">
          <Ionicons name="flame" size={18} color={COLORS.streak} />
          <Text className="text-streak font-bold font-mono ml-1">
            Streak: {streak} dias
          </Text>
        </View>
      </View>

      <View className="mb-10">
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-4 ml-2">
          Personalização
        </Text>
        <View className="flex-row items-center justify-between p-5 bg-card-light dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark">
          <View className="flex-row items-center">
            <View className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-lg mr-4">
              <Ionicons
                name={isDarkMode ? 'moon' : 'sunny'}
                size={22}
                color={accentColor}
              />
            </View>
            <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg">
              Modo Escuro
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{
              false: isDarkMode ? '#262626' : '#E5E7EB',
              true: accentColor,
            }}
            thumbColor={'#ffffff'}
          />
        </View>

        <View className="flex-row items-center justify-between p-5 bg-card-light dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark mt-4">
          <View className="flex-row items-center">
            <View className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-lg mr-4">
              <Ionicons name="pulse-outline" size={22} color={accentColor} />
            </View>
            <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg">
              Feedback Tátil
            </Text>
          </View>
          <Switch
            value={hapticsEnabled}
            onValueChange={setHapticsEnabled}
            trackColor={{
              false: isDarkMode ? '#262626' : '#E5E7EB',
              true: accentColor,
            }}
            thumbColor={'#ffffff'}
          />
        </View>
      </View>

      {/* Botão Expandível - Meus Troféus */}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowTrophyWall(!showTrophyWall);
        }}
        className="flex-row items-center justify-between p-5 bg-card-light dark:bg-card-dark rounded-2xl mb-4 border border-border-light dark:border-border-dark">
        <View className="flex-row items-center">
          <View className="bg-primary/10 dark:bg-primary-dark/10 p-2 rounded-lg mr-4">
            <Ionicons name="trophy-outline" size={22} color={accentColor} />
          </View>
          <Text className="text-text-light dark:text-text-dark font-serif font-bold text-lg">
            Meus Troféus
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-text-muted-light dark:text-text-muted-dark font-mono font-bold text-lg mr-2">
            {totalUnlocked} / {ALL_BADGES.length}
          </Text>
          <Ionicons
            name={showTrophyWall ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={accentColor}
          />
        </View>
      </TouchableOpacity>

      {/* Seção Expandida do Mural de Troféus */}
      {showTrophyWall && (
        <TrophyWallSection
          badgeFilter={badgeFilter}
          badgeLimit={badgeLimit}
          processedBadges={processedBadges}
          visibleBadges={visibleBadges}
          selectFilter={selectFilter}
          showMore={showMore}
          showLess={showLess}
          showPopup={showPopup}
        />
      )}

      <View>
        <Text className="text-text-muted-light dark:text-text-muted-dark uppercase tracking-widest text-xs font-bold mb-4 ml-2">
          Estatísticas
        </Text>
        <InfoRow
          label="Livros Lidos"
          value={totalBooksCompleted}
          icon="ribbon-outline"
          onPress={() => setShowCompleted(!showCompleted)}
          accentColor={accentColor}
          showCompleted={showCompleted}
        />

        {showCompleted && (
          <View className="mb-4 bg-background-light dark:bg-background-dark p-4 rounded-2xl border border-border-light dark:border-border-dark -mt-2">
            {completedBooksList.map((b, idx, arr) => (
              <View
                key={b.id}
                className={`flex-row justify-between items-center py-2 ${idx !== arr.length - 1 ? 'border-b border-border-light dark:border-border-dark' : ''}`}>
                <Text className="text-text-light dark:text-text-dark font-bold text-sm flex-1 mr-2">
                  {b.title}
                </Text>
                <Text className="text-text-muted-light dark:text-text-muted-dark text-xs">
                  {b.totalPages} pág.
                </Text>
              </View>
            ))}
            {totalBooksCompleted === 0 && (
              <Text className="text-text-muted-light dark:text-text-muted-dark text-sm text-center">
                Nenhum livro lido ainda.
              </Text>
            )}
          </View>
        )}

        <InfoRow
          label="Total de Páginas"
          value={totalPagesRead.toLocaleString()}
          icon="layers-outline"
          accentColor={accentColor}
          showCompleted={showCompleted}
        />
      </View>

      <TouchableOpacity
        className="mt-8 mb-6 p-5 items-center bg-red-500/10 rounded-2xl border border-red-500/20"
        onPress={handleSignOut}>
        <Text className="text-red-500 font-bold text-lg">{TXT_SIGN_OUT}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
