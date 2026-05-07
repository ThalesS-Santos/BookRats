import { useState, useEffect, useRef } from 'react';
import { Animated, Easing, InteractionManager } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useMainStore } from '@core/store';
import { useShallow } from 'zustand/react/shallow';
import { BookService } from '@core/services/BookService';
import { BOOK_STATUS } from '@core/constants/bookStatus';

/**
 * Custom Hook para gerenciar o estado e lógica da HomeScreen.
 * Isola chamadas de side-effects, timers, e animações para manter a UI declarativa.
 */
export const useHomeLogic = () => {
  const isFocused = useIsFocused();
  const [isReady, setIsReady] = useState(false);
  const [recentNotes, setRecentNotes] = useState([]);

  // Store Selectors otimizados com useShallow
  const { streak, books, user, loadingBooks } = useMainStore(useShallow(state => ({
    streak: state.streak,
    books: state.books,
    user: state.user,
    loadingBooks: state.loadingBooks
  })));

  const readingBooks = books.filter(b => b.status === BOOK_STATUS.READING);

  // Valores de Animação
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Gerenciamento de Interação (evita travamentos na navegação)
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  // Lógica de Animações de Entrada
  useEffect(() => {
    if (isFocused && !loadingBooks && isReady) {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isFocused, loadingBooks, isReady, fadeAnim, slideAnim]);

  // Delegação da Busca de Dados para a Camada de Serviço
  useEffect(() => {
    let mounted = true;
    const fetchNotes = async () => {
      if (!user) return;
      const notes = await BookService.getRecentAnnotations(user.uid, readingBooks);
      if (mounted) setRecentNotes(notes);
    };

    if (!loadingBooks && readingBooks.length > 0) {
      fetchNotes();
    }

    return () => { mounted = false; };
  }, [user, books.length, loadingBooks, readingBooks[0]?.currentPage]);

  // Preparação de dados finais para a UI (com placeholders de esqueleto)
  const listData = (loadingBooks || !isReady) ? [{id: 's1'}, {id: 's2'}, {id: 's3'}] : readingBooks;

  return {
    user,
    streak,
    loadingBooks,
    isReady,
    books, // Return raw books for dynamic filtering
    listData,
    recentNotes,
    fadeAnim,
    slideAnim
  };
};
