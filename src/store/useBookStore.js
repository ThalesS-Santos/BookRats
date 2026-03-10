import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper for streak logic
const calculateStreak = (lastDateStr, newDateStr, currentStreak) => {
  if (!lastDateStr) return 1;
  const lastDate = new Date(lastDateStr);
  const newDate = new Date(newDateStr);

  // Normalize to ms differences
  const diffTime = Math.abs(newDate.setHours(0, 0, 0, 0) - lastDate.setHours(0, 0, 0, 0));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return currentStreak + 1; // Leitura consecutiva
  if (diffDays === 0) return currentStreak; // Já leu hoje, mantém.
  return 1; // Pulou dia, reseta para 1.
};

export const useBookStore = create(
  persist(
    (set, get) => ({
      books: [],
      streak: 0,
      lastReadDate: null,

      addBook: (title, totalPages) => set((state) => ({
        books: [
          ...state.books,
          {
            id: Date.now().toString(),
            title,
            totalPages: parseInt(totalPages, 10),
            currentPage: 0,
            status: 'reading', // reading, completed, dnf
            logs: [] // { date, pagesRead, timeSeconds }
          }
        ]
      })),

      updateProgress: (bookId, newPage, timeSeconds) => set((state) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const newStreak = calculateStreak(state.lastReadDate, todayStr, state.streak);

        const updatedBooks = state.books.map((book) => {
          if (book.id === bookId) {
            const pagesReadToday = Math.max(0, newPage - book.currentPage);
            const isCompleted = newPage >= book.totalPages;

            return {
              ...book,
              currentPage: newPage,
              status: isCompleted ? 'completed' : book.status,
              logs: [
                ...book.logs,
                {
                  date: todayStr,
                  pagesRead: pagesReadToday,
                  timeSeconds,
                  pagesPerHour: timeSeconds > 0 ? Math.round((pagesReadToday / timeSeconds) * 3600) : 0
                }
              ]
            };
          }
          return book;
        });

        return {
          books: updatedBooks,
          streak: newStreak,
          lastReadDate: todayStr
        };
      }),

      markAsDNF: (bookId) => set((state) => ({
        books: state.books.map(b => b.id === bookId ? { ...b, status: 'dnf' } : b)
      })),

    }),
    {
      name: 'bookrats-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
