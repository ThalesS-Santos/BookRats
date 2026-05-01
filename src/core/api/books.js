import { db } from '@core/firebase/firebase';
import { doc, updateDoc, collection, setDoc, arrayUnion, serverTimestamp, getDocs, addDoc } from 'firebase/firestore';
import { calculateStreak } from '@utils/streak';
import { mapFirebaseError } from '@utils/errorMapper';

export const addBook = async (uid, title, totalPages, id = null) => {
  // 🛡️ Validation Guard
  if (!uid || !title || totalPages === null || totalPages === undefined) {
    throw new Error("Dados inválidos: Título e número de páginas são obrigatórios.");
  }
  
  const pages = parseInt(totalPages, 10);
  if (Number.isNaN(pages) || pages <= 0) {
    throw new Error("Dados inválidos: Título e número de páginas são obrigatórios.");
  }

  try {
    const bookRef = id ? doc(db, 'users', uid, 'books', id) : doc(collection(db, 'users', uid, 'books'));
    await setDoc(bookRef, {
      title,
      totalPages: pages,
      currentPage: 0,
      status: 'reading',
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
  const previouslyCompleted = book.status === 'completed';

  try {
    // 1. Update book progress
    const bookRef = doc(db, 'users', uid, 'books', book.id);
    await updateDoc(bookRef, {
      currentPage: nPage,
      status: isCompleted ? 'completed' : book.status,
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
    const completedIncrement = (isCompleted && !previouslyCompleted) ? 1 : 0;

    await updateDoc(userRef, {
      total_pages_read: totalPagesRead + pagesReadToday,
      current_streak: newStreak,
      last_reading_date: todayStr,
      max_reading_session: newMaxSession,
      last_reading_session: tSeconds,
      total_books_completed: totalBooksCompleted + completedIncrement,
      // 📊 Denormalized Social Summary for O(1) rendering
      socialSummary: {
        totalPagesRead: totalPagesRead + pagesReadToday,
        currentStreak: newStreak,
        lastBookTitle: book.title,
        lastActive: todayStr,
        // profilePic is handled elsewhere or preserved if already there
      }
    });

    return { pagesReadToday, isCompleted };
  } catch (error) {
    console.error("Error updating progress:", error);
    throw new Error(mapFirebaseError(error));
  }
};

export const markAsDNF = async (uid, bookId) => {
  try {
    const bookRef = doc(db, 'users', uid, 'books', bookId);
    await updateDoc(bookRef, { status: 'dnf' });
  } catch (error) {
    console.error("Error marking as DNF:", error);
    throw new Error(mapFirebaseError(error));
  }
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

export const getUserAnnotations = async (uid, bookId) => {
  try {
    const annotRef = collection(db, 'users', uid, 'books', bookId, 'annotations');
    const snap = await getDocs(annotRef);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting annotations:", error);
    throw new Error(mapFirebaseError(error));
  }
};

