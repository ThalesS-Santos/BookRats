import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BOOK_STATUS } from '../../../core/constants/bookStatus';
import { useThemeStore } from '../../../store/useThemeStore';
import { COLORS } from '../../constants/colors';
import * as Haptics from '../../../utils/haptics';

/**
 * Mapeamento de Status para labels amigáveis ao usuário.
 */
const STATUS_LABELS = {
  [BOOK_STATUS.WANT_TO_READ]: 'Quero ler',
  [BOOK_STATUS.READING]: 'Lendo',
  [BOOK_STATUS.READ]: 'Lido',
  [BOOK_STATUS.WISH_LIST]: 'Desejo',
  [BOOK_STATUS.BOUGHT]: 'Comprado',
  [BOOK_STATUS.RECOMMENDED]: 'Recomendado',
  [BOOK_STATUS.DROPPED]: 'Abandonei',
};

/**
 * StatusSelector Molecule
 * Componente de seleção de status isolado de contexto de navegação.
 * Utiliza StyleSheet puro para evitar conflitos com CSS-Interop durante transições.
 */
const StatusSelector = ({ currentStatus, onStatusChange }) => {
  const { isDarkMode } = useThemeStore();

  const handleSelect = (status) => {
    if (status === currentStatus) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStatusChange(status);
  };

  const statusChips = useMemo(() => {
    return Object.entries(STATUS_LABELS).map(([status, label]) => {
      const isActive = currentStatus === status;
      
      return (
        <TouchableOpacity
          key={status}
          onPress={() => handleSelect(status)}
          activeOpacity={0.7}
          style={[
            styles.chip,
            isActive ? styles.chipActive : styles.chipInactive,
            { 
              backgroundColor: isActive 
                ? (isDarkMode ? COLORS.primary.dark : COLORS.primary.light)
                : (isDarkMode ? COLORS.card.dark : COLORS.white),
              borderColor: isActive
                ? (isDarkMode ? COLORS.primary.dark : COLORS.primary.light)
                : (isDarkMode ? COLORS.border.dark : COLORS.border.light)
            }
          ]}
        >
          <Text 
            style={[
              styles.chipText,
              isActive ? styles.textActive : styles.textInactive,
              {
                color: isActive 
                  ? '#FFFFFF' 
                  : (isDarkMode ? COLORS.text.muted.dark : COLORS.text.muted.light)
              }
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      );
    });
  }, [currentStatus, isDarkMode]);

  return (
    <View style={styles.container}>
      {statusChips}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  chip: {
    margin: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: '28%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chipActive: {
    // Cores dinâmicas via prop style
  },
  chipInactive: {
    // Cores dinâmicas via prop style
  },
  chipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  textActive: {
    color: '#FFFFFF',
  },
  textInactive: {
    // Cor dinâmica via prop style
  }
});

export default StatusSelector;
