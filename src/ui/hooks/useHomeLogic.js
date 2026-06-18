import { useState, useEffect, useMemo } from 'react';

import { useIsFocused } from '@react-navigation/native';
import { Animated, Easing, InteractionManager } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { BOOK_STATUS } from '@core/constants/bookStatus';
import { BookService } from '@core/services/BookService';
import { useMainStore } from '@core/store';
import {
  selectWishlistBooks,
  selectBooksByStatus,
  selectCountsByStatus,
} from '@core/store/selectors';

const SKELETON_DATA = [{ id: 's1' }, { id: 's2' }, { id: 's3' }];

/**
 * Custom Hook para gerenciar o estado e lógica da HomeScreen.
 * Isola chamadas de side-effects, timers, e animações para manter a UI declarativa.
 */
export const useHomeLogic = () => {
  const isFocused = useIsFocused();
  const [isReady, setIsReady] = useState(false);
  const [recentNotes, setRecentNotes] = useState([]);
  const [activeFilter, setActiveFilter] = useState(BOOK_STATUS.READING);

  // 🎯 Assinaturas escalares + lista de livros num único seletor com useShallow.
  const { streak, books, user, loadingBooks } = useMainStore(
    useShallow(state => ({
      streak: state.streak,
      books: state.books || [],
      user: state.user,
      loadingBooks: state.loadingBooks,
    })),
  );

  // ⚠️ `counts` PRECISA de sua própria assinatura com useShallow. Aninhá-lo no
  // seletor acima quebra o useShallow (que só compara um nível): selectCountsByStatus
  // retorna um objeto novo a cada chamada, então o snapshot externo nunca seria
  // igual → loop infinito ("getSnapshot should be cached"). Com seu próprio
  // useShallow, a comparação é feita sobre os VALORES (primitivos) das contagens.
  const counts = useMainStore(useShallow(selectCountsByStatus));

  const readingBooks = useMemo(() => {
    return books.filter(b => b.status === BOOK_STATUS.READING);
  }, [books]);

  // 🎯 Dados derivados estáveis e prontos para renderizar
  const filteredBooks = useMemo(() => {
    if (loadingBooks || !isReady) return SKELETON_DATA;
    if (activeFilter === 'shopping') {
      return selectWishlistBooks({ books });
    }
    return selectBooksByStatus(activeFilter)({ books });
  }, [books, activeFilter, loadingBooks, isReady]);

  // Valores de Animação
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(20));

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
        }),
      ]).start();
    }
  }, [isFocused, loadingBooks, isReady, fadeAnim, slideAnim]);

  // Delegação da Busca de Dados para a Camada de Serviço
  useEffect(() => {
    let mounted = true;
    const fetchNotes = async () => {
      if (!user) return;
      const notes = await BookService.getRecentAnnotations(
        user.uid,
        readingBooks,
      );
      if (mounted) setRecentNotes(notes);
    };

    if (!loadingBooks && readingBooks.length > 0) {
      fetchNotes();
    }

    return () => {
      mounted = false;
    };
  }, [user, loadingBooks, readingBooks]);

  return {
    user,
    streak,
    loadingBooks,
    isReady,
    recentNotes,
    fadeAnim,
    slideAnim,
    activeFilter,
    setActiveFilter,
    counts,
    filteredBooks,
  };
};
