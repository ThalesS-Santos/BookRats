import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
 * Componente de seleção de status em formato de Chips.
 * 
 * @param {Object} props
 * @param {string} props.currentStatus - O status atual do livro.
 * @param {function} props.onStatusChange - Callback chamado ao trocar o status.
 */
const StatusSelector = ({ currentStatus, onStatusChange }) => {
  const { isDarkMode } = useThemeStore();
  const accentColor = isDarkMode ? COLORS.primary.dark : COLORS.primary.light;

  const handleSelect = (status) => {
    if (status === currentStatus) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStatusChange(status);
  };

  return (
    <View className="flex-row flex-wrap justify-center py-2 px-1">
      {Object.entries(STATUS_LABELS).map(([status, label]) => {
        const isActive = currentStatus === status;
        
        return (
          <TouchableOpacity
            key={status}
            onPress={() => handleSelect(status)}
            activeOpacity={0.7}
            className={`m-1.5 px-4 py-2.5 rounded-2xl border ${
              isActive 
                ? 'bg-primary dark:bg-primary-dark border-primary dark:border-primary-dark shadow-sm' 
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark'
            }`}
            style={{ 
              minWidth: '28%', // Ajusta para caber 3 por linha em telas médias
              alignItems: 'center'
            }}
          >
            <Text 
              className={`text-[11px] font-bold ${
                isActive 
                  ? 'text-white' 
                  : 'text-text-muted-light dark:text-text-muted-dark'
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default StatusSelector;
