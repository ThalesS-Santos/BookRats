import { db } from '@core/firebase/firebase';
import { doc, updateDoc, collection, setDoc, arrayUnion, serverTimestamp, getDocs, addDoc, deleteDoc, increment, query, orderBy, where } from 'firebase/firestore';
import { calculateStreak } from '@utils/streak';
import { mapFirebaseError } from '@utils/errorMapper';

import { BOOK_STATUS } from '../constants/bookStatus';

export const deleteBook = async (uid, bookId) => {
  try {
    const bookRef = doc(db, 'users', uid, 'books', bookId);
    await deleteDoc(bookRef);
  } catch (error) {
    console.error("Error deleting book:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const getUserReadingLogs = async (uid) => {
  try {
    const logsRef = collection(db, 'users', uid, 'readingLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting reading logs:", error);
    return [];
  }
};

export const addReadingLog = async (uid, bookId, delta) => {
  if (delta === 0) return;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const logsRef = collection(db, 'users', uid, 'readingLogs');
    await addDoc(logsRef, {
      bookId,
      pagesRead: delta,
      date: todayStr,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error adding reading log:", error);
  }
};

export const addBook = async (uid, title, totalPages, id = null, description = '', extraMetadata = {}, status = BOOK_STATUS.WANT_TO_READ) => {
  // 🛡️ Validation Guard
  if (!uid || !title || totalPages === null || totalPages === undefined) {
    throw new Error("Dados inválidos: Título e número de páginas são obrigatórios.");
  }
  
  const pages = parseInt(totalPages, 10);
  if (Number.isNaN(pages) || (pages <= 0 && id === null)) {
    // If it's a manual entry, pages must be > 0. If it's from API, we might allow 0 temporarily
    throw new Error("Dados inválidos: Título e número de páginas são obrigatórios.");
  }

  try {
    const bookRef = id ? doc(db, 'users', uid, 'books', id) : doc(collection(db, 'users', uid, 'books'));
    await setDoc(bookRef, {
      title,
      totalPages: pages,
      currentPage: 0,
      description: description || 'Sinopse não disponível para esta edição.',
      author: extraMetadata.author || 'Autor Desconhecido',
      thumbnail: extraMetadata.thumbnail || null,
      categories: extraMetadata.categories || [],
      language: extraMetadata.language || 'pt',
      publishedDate: extraMetadata.publishedDate || null,
      averageRating: extraMetadata.averageRating || null,
      status: status, // Using provided status or default (Etapa 2)
      logs: [],
      createdAt: serverTimestamp()
    });
    return bookRef.id;
  } catch (error) {
    console.error("Error adding book:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const updateBookProgress = async (uid, book, newPage, timeSeconds, streakData) => {
  // 🛡️ Validation Guard
  const nPage = Number(newPage);
  const tSeconds = Number(timeSeconds);

  if (Number.isNaN(nPage) || Number.isNaN(tSeconds)) {
    throw new Error("Erro de validação: Verifique os números informados.");
  }

  // Regression Lock & Bounds Check
  if (nPage < book.currentPage || nPage > book.totalPages) {
     throw new Error("Erro de validação: Verifique os números informados.");
  }

  // Streak Data Validation
  if (typeof streakData.streak !== 'number' || typeof streakData.totalPagesRead !== 'number') {
    throw new Error("Erro de validação: Verifique os números informados.");
  }

  const { streak, lastReadDate, totalPagesRead, maxReadingSession = 0, totalBooksCompleted = 0 } = streakData;
  const todayStr = new Date().toISOString().split('T')[0];
  const newStreak = calculateStreak(lastReadDate, todayStr, streak);
  const pagesReadToday = Math.max(0, nPage - book.currentPage);
    const isCompleted = nPage >= book.totalPages;
    const wasCompleted = book.status === BOOK_STATUS.READ;
    const isRegressing = !isCompleted && wasCompleted;
    
    // Determine new status
    let newStatus = book.status;
    if (isCompleted) newStatus = BOOK_STATUS.READ;
    else if (isRegressing) newStatus = BOOK_STATUS.READING;

    try {
      // 1. Update book progress
      const bookRef = doc(db, 'users', uid, 'books', book.id);
      await updateDoc(bookRef, {
        currentPage: nPage,
        status: newStatus,
        logs: arrayUnion({
          date: todayStr,
          pagesRead: pagesReadToday,
          timeSeconds: tSeconds,
          pagesPerHour: tSeconds > 0 ? Math.round((pagesReadToday / tSeconds) * 3600) : 0
        })
      });

      // 2. Update user stats
      const userRef = doc(db, 'users', uid);
      const newMaxSession = Math.max(maxReadingSession, tSeconds);
      
      // Calculate completion increment: +1 if finishing, -1 if regressing
      const completedIncrement = (isCompleted && !wasCompleted) ? 1 : (isRegressing ? -1 : 0);
      const finalTotalPages = totalPagesRead + pagesReadToday;

      await updateDoc(userRef, {
        total_pages_read: increment(pagesReadToday),
        current_streak: newStreak,
        last_reading_date: todayStr,
        max_reading_session: newMaxSession,
        last_reading_session: tSeconds,
        total_books_completed: increment(completedIncrement),
        // 📊 Denormalized Social Summary - Atomic updates via dot notation
        'socialSummary.totalPagesRead': increment(pagesReadToday),
        'socialSummary.currentStreak': newStreak,
        'socialSummary.lastBookTitle': book.title,
        'socialSummary.lastActive': todayStr,
      });

    // 🌟 Add Global Reading Log
    await addReadingLog(uid, book.id, pagesReadToday);

    return { pagesReadToday, isCompleted };
  } catch (error) {
    console.error("Error updating progress:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const updateBook = async (uid, bookId, updates) => {
  try {
    const bookRef = doc(db, 'users', uid, 'books', bookId);
    await updateDoc(bookRef, { 
      ...updates,
      updatedAt: serverTimestamp() 
    });
  } catch (error) {
    console.error("Error updating book:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const updateBookStatus = async (uid, bookId, status) => {
  return updateBook(uid, bookId, { status });
};

export const markAsDNF = async (uid, bookId, status = BOOK_STATUS.DROPPED) => {
  return updateBookStatus(uid, bookId, status);
};

export const getUserBooks = async (uid) => {
  try {
    const booksRef = collection(db, 'users', uid, 'books');
    const snap = await getDocs(booksRef);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting user books:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const addAnnotation = async (uid, bookId, page, text, isPublic = true, userMetadata = { displayName: 'Anon', photoURL: null }, parentId = null) => {
  // 🛡️ Validation Guard
  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new Error("Erro de validação: O texto da anotação é obrigatório.");
  }

  const pageNum = Number(page);
  if (!parentId && Number.isNaN(pageNum)) {
    throw new Error("Erro de validação: Verifique a página informada.");
  }

  try {
    const annotRef = collection(db, 'users', uid, 'books', bookId, 'annotations');
    await addDoc(annotRef, {
      userId: uid,
      bookId: bookId,
      pageLocation: !parentId ? pageNum : null,
      text,
      isPublic,
      parentId,
      replyCount: 0,
      userMetadata: {
        displayName: userMetadata.displayName || 'Leitor',
        photoURL: userMetadata.photoURL || null
      },
      reactions: { claps: 0 },
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error adding annotation:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const getUserAnnotations = async (uid, bookId, onlyPublic = false) => {
  try {
    const annotRef = collection(db, 'users', uid, 'books', bookId, 'annotations');
    let q = annotRef;
    if (onlyPublic) {
      q = query(annotRef, where('isPublic', '==', true));
    }
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting annotations:", error);
    throw new Error(mapFirebaseError(error));
  }
};

