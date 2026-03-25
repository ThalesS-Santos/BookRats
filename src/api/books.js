import { db } from '../services/firebase';
import { doc, updateDoc, collection, setDoc, arrayUnion, serverTimestamp, getDocs, addDoc } from 'firebase/firestore';
import { calculateStreak } from '../utils/streak';

export const addBook = async (uid, title, totalPages) => {
  try {
    const bookRef = doc(collection(db, 'users', uid, 'books'));
    await setDoc(bookRef, {
      title,
      totalPages: parseInt(totalPages, 10),
      currentPage: 0,
      status: 'reading',
      logs: [],
      createdAt: serverTimestamp()
    });
    return bookRef.id;
  } catch (error) {
    console.error("Error adding book:", error);
    throw new Error("Não foi possível adicionar o livro. Tente novamente.");
  }
};

export const updateBookProgress = async (uid, book, newPage, timeSeconds, streakData) => {
  const { streak, lastReadDate, totalPagesRead } = streakData;
  const todayStr = new Date().toISOString().split('T')[0];
  const newStreak = calculateStreak(lastReadDate, todayStr, streak);
  const pagesReadToday = Math.max(0, newPage - book.currentPage);
  const isCompleted = newPage >= book.totalPages;

  try {
    // 1. Update book progress
    const bookRef = doc(db, 'users', uid, 'books', book.id);
    await updateDoc(bookRef, {
      currentPage: newPage,
      status: isCompleted ? 'completed' : book.status,
      logs: arrayUnion({
        date: todayStr,
        pagesRead: pagesReadToday,
        timeSeconds,
        pagesPerHour: timeSeconds > 0 ? Math.round((pagesReadToday / timeSeconds) * 3600) : 0
      })
    });

    // 2. Update user stats
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      total_pages_read: totalPagesRead + pagesReadToday,
      current_streak: newStreak,
      last_reading_date: todayStr
    });

    return { pagesReadToday, isCompleted };
  } catch (error) {
    console.error("Error updating progress:", error);
    throw new Error("Erro ao salvar progresso de leitura.");
  }
};

export const markAsDNF = async (uid, bookId) => {
  try {
    const bookRef = doc(db, 'users', uid, 'books', bookId);
    await updateDoc(bookRef, { status: 'dnf' });
  } catch (error) {
    console.error("Error marking as DNF:", error);
    throw new Error("Erro ao marcar como abandonado.");
  }
};

export const getUserBooks = async (uid) => {
  try {
    const booksRef = collection(db, 'users', uid, 'books');
    const snap = await getDocs(booksRef);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting user books:", error);
    throw new Error("Erro ao carregar livros do usuário.");
  }
};

export const addAnnotation = async (uid, bookId, page, text, isPublic = true) => {
  try {
    const annotRef = collection(db, 'users', uid, 'books', bookId, 'annotations');
    await addDoc(annotRef, {
      page: parseInt(page, 10),
      text,
      isPublic,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error adding annotation:", error);
    throw new Error("Erro ao salvar anotação.");
  }
};

export const getUserAnnotations = async (uid, bookId) => {
  try {
    const annotRef = collection(db, 'users', uid, 'books', bookId, 'annotations');
    const snap = await getDocs(annotRef);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting annotations:", error);
    throw new Error("Erro ao carregar anotações.");
  }
};
