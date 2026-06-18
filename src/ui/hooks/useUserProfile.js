import { useState, useEffect, useCallback, useMemo } from 'react';

import { calculateStreakFromLogs } from '@utils/streak';

import {
  getUserBooks,
  getUserAnnotations,
  getUserReadingLogs,
} from '@core/api/books';
import { getUserDetails } from '@core/api/social';
import { BOOK_STATUS } from '@core/constants/bookStatus';
import { createLogger } from '@core/observability';
import { useMainStore } from '@core/store';

import { usePopupStore } from '../../store/usePopupStore';

const log = createLogger('ui.user-profile');

export const useUserProfile = userId => {
  const { showPopup } = usePopupStore();
  const user = useMainStore(state => state.user);
  const myTotalPages = useMainStore(state => state.totalPagesRead);
  const myStreak = useMainStore(state => state.streak);

  const [loading, setLoading] = useState(true);
  const [friend, setFriend] = useState(null);
  const [books, setBooks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [logs, setLogs] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const userData = await getUserDetails(userId);
      setFriend(userData);

      const isMe = userId === user?.uid;

      try {
        const userBooks = await getUserBooks(userId);
        setBooks(userBooks);
      } catch (e) {
        log.warn('Could not load user books', { userId, error: e?.message });
      }

      if (isMe) {
        try {
          const userLogs = await getUserReadingLogs(userId);
          setLogs(userLogs);
        } catch (e) {
          log.warn('Could not load logs', { userId, error: e?.message });
        }
      }

      try {
        if (userId) {
          const allNotes = [];
          const targetBooks =
            books.length > 0
              ? books
              : await getUserBooks(userId).catch(() => []);

          for (const book of targetBooks) {
            try {
              const annots = await getUserAnnotations(userId, book.id, !isMe);
              allNotes.push(
                ...annots.map(a => ({ ...a, bookTitle: book.title })),
              );
            } catch (e) {
              /* ignore */
            }
          }
          allNotes.sort(
            (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0),
          );
          setNotes(allNotes);
        }
      } catch (noteError) {
        log.warn('Could not load user notes', {
          userId,
          error: noteError?.message,
        });
      }
    } catch (error) {
      showPopup({
        title: 'Erro',
        message: 'Falha ao carregar perfil.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, user, books, showPopup]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [userId, loadData]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMe = userId === user?.uid;

  const totalPagesRead = useMemo(() => {
    if (isMe) return myTotalPages;
    const sum = logs.reduce((acc, l) => acc + (l.pagesRead || 0), 0);
    return sum || friend?.total_pages_read || 0;
  }, [isMe, myTotalPages, logs, friend]);

  const streak = useMemo(() => {
    if (isMe) return myStreak;
    if (logs.length > 0) return calculateStreakFromLogs(logs);
    return friend?.streak || 0;
  }, [isMe, myStreak, logs, friend]);

  const completedBooks = useMemo(
    () => books.filter(b => b.status === BOOK_STATUS.READ).length,
    [books],
  );

  return {
    user,
    loading,
    friend,
    books,
    notes,
    logs,
    isMe,
    totalPagesRead,
    streak,
    completedBooks,
    loadData,
  };
};
