import { sanitizeEchoText } from '@utils/sanitize';
import { updateStreak, getLocalDateString } from '@utils/streak';
import {
  validateStatus,
  validatePageRange,
  validateDocumentId,
  validateUpdateFields,
} from '@utils/validators';
import {
  doc,
  updateDoc,
  collection,
  setDoc,
  arrayUnion,
  serverTimestamp,
  getDocs,
  addDoc,
  deleteDoc,
  increment,
  query,
  orderBy,
  where,
} from 'firebase/firestore';

import { db, auth } from '@core/firebase/firebase';
import { createLogger } from '@core/observability';

import { BOOK_STATUS } from '../constants/bookStatus';

const log = createLogger('core.api.books');

/**
 * 🕓 Cold-start / token-refresh guard.
 *
 * On launch (or after a token expiry) the Firestore channel can send the very
 * first write before the Firebase Auth credential finishes attaching. Firestore
 * then evaluates the rule with `request.auth == null`, so `isOwner()` is false
 * and the write is rejected with a spurious `permission-denied` — even though
 * the user is legitimately signed in.
 *
 * Awaiting `getIdToken()` forces the credential to be ready (refreshing it if
 * needed) before we write. Mirrors the same mitigation already used by the
 * social-summary repair in the library slice. Best-effort: if it throws we
 * still proceed — a genuinely invalid token surfaces via the write's own catch.
 */
const ensureAuthReady = async () => {
  try {
    if (typeof auth?.currentUser?.getIdToken === 'function') {
      await auth.currentUser.getIdToken();
    }
  } catch {
    // ignore — proceed with the write regardless
  }
};

export const deleteBook = async (uid, bookId) => {
  try {
    const bookRef = doc(db, 'users', uid, 'books', bookId);
    await deleteDoc(bookRef);
  } catch (error) {
    throw log.failure(error, {
      op: 'deleteBook',
      action: 'delete',
      resource: `users/${uid}/books/${bookId}`,
      context: { uid, bookId },
    });
  }
};

export const getUserReadingLogs = async uid => {
  try {
    const logsRef = collection(db, 'users', uid, 'readingLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    log.exception(error, {
      op: 'getUserReadingLogs',
      action: 'query',
      resource: `users/${uid}/readingLogs`,
      context: { uid },
    });
    return [];
  }
};

export const addReadingLog = async (uid, bookId, delta) => {
  if (delta <= 0) return;
  try {
    const todayStr = getLocalDateString();
    const logRef = doc(db, 'users', uid, 'readingLogs', todayStr);

    await setDoc(
      logRef,
      {
        pagesRead: increment(delta),
        lastBookId: bookId,
        date: todayStr,
        timestamp: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    log.exception(error, {
      op: 'addReadingLog',
      action: 'write',
      resource: `users/${uid}/readingLogs/${getLocalDateString()}`,
      context: { uid, bookId, delta },
    });
  }
};

export const addBook = async (
  uid,
  title,
  totalPages,
  id = null,
  description = '',
  extraMetadata = {},
  status,
) => {
  // 🛡️ Validation Guard
  if (!uid || !title || totalPages === null || totalPages === undefined) {
    throw new Error(
      'Dados inválidos: Título e número de páginas são obrigatórios.',
    );
  }

  // Validate status against VALID_STATUSES enum
  validateStatus(status);

  const pages = parseInt(totalPages, 10);
  if (Number.isNaN(pages) || (pages <= 0 && id === null)) {
    // If it's a manual entry, pages must be > 0. If it's from API, we might allow 0 temporarily
    throw new Error(
      'Dados inválidos: Título e número de páginas são obrigatórios.',
    );
  }

  try {
    const bookRef = id
      ? doc(db, 'users', uid, 'books', id)
      : doc(collection(db, 'users', uid, 'books'));
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
      createdAt: serverTimestamp(),
    });
    return bookRef.id;
  } catch (error) {
    throw log.failure(error, {
      op: 'addBook',
      action: id ? 'write' : 'create',
      resource: `users/${uid}/books/${id || '(new)'}`,
      context: { uid, bookId: id, title, totalPages: pages, status },
    });
  }
};

export const updateBookProgress = async (
  uid,
  book,
  newPage,
  timeSeconds,
  streakData,
) => {
  // 🛡️ Validation Guard
  const nPage = Number(newPage);
  const tSeconds = Number(timeSeconds);

  if (Number.isNaN(nPage) || Number.isNaN(tSeconds)) {
    throw new Error('Erro de validação: Verifique os números informados.');
  }

  // Regression Lock & Bounds Check
  if (nPage < book.currentPage || nPage > book.totalPages) {
    throw new Error('Erro de validação: Verifique os números informados.');
  }

  // Streak Data Validation
  if (
    typeof streakData.streak !== 'number' ||
    typeof streakData.totalPagesRead !== 'number'
  ) {
    throw new Error('Erro de validação: Verifique os números informados.');
  }

  const {
    streak,
    lastReadDate,
    maxReadingSession = 0,
    totalPagesRead = 0,
    totalBooksCompleted = 0,
  } = streakData;
  const todayStr = getLocalDateString();
  const newStreak = updateStreak(lastReadDate, streak);
  const pagesReadToday = Math.max(0, nPage - book.currentPage);
  const isCompleted = nPage >= book.totalPages;
  const wasCompleted = book.status === BOOK_STATUS.READ;
  const isRegressing = !isCompleted && wasCompleted;

  // Determine new status
  let newStatus = book.status;
  if (isCompleted) newStatus = BOOK_STATUS.READ;
  else if (isRegressing) newStatus = BOOK_STATUS.READING;

  try {
    // 🕓 Make sure the auth token is attached before writing (cold-start guard).
    await ensureAuthReady();

    // 1. Update book progress
    const bookRef = doc(db, 'users', uid, 'books', book.id);
    await updateDoc(bookRef, {
      currentPage: nPage,
      status: newStatus,
      logs: arrayUnion({
        date: todayStr,
        pagesRead: pagesReadToday,
        timeSeconds: tSeconds,
        pagesPerHour:
          tSeconds > 0 ? Math.round((pagesReadToday / tSeconds) * 3600) : 0,
      }),
    });

    // 2. Update user stats
    const userRef = doc(db, 'users', uid);
    const newMaxSession = Math.max(maxReadingSession, tSeconds);

    // Calculate completion increment: +1 if finishing, -1 if regressing
    const completedIncrement =
      isCompleted && !wasCompleted ? 1 : isRegressing ? -1 : 0;

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

    const justCompleted = isCompleted && !wasCompleted;
    return {
      pagesReadToday,
      isCompleted,
      wasCompleted,
      justCompleted,
      sessionSeconds: tSeconds,
      newStreak,
      // Post-update lifetime totals (store value updates async via listener,
      // so we derive them here for immediate milestone evaluation).
      newTotalPagesRead: totalPagesRead + pagesReadToday,
      newTotalBooksCompleted:
        totalBooksCompleted + (justCompleted ? 1 : isRegressing ? -1 : 0),
    };
  } catch (error) {
    throw log.failure(error, {
      op: 'updateBookProgress',
      action: 'update',
      resource: `users/${uid}/books/${book.id}`,
      context: { uid, bookId: book.id, newPage: nPage, pagesReadToday },
    });
  }
};

/** Fields that cannot be updated directly by the client to avoid ranking manipulation. */
const PROTECTED_BOOK_FIELDS = ['createdAt', 'userId'];

export const updateBook = async (uid, bookId, updates) => {
  // 🛡️ Validation Guard
  validateDocumentId(bookId, 'livro');
  validateUpdateFields(updates, PROTECTED_BOOK_FIELDS);

  try {
    // 🕓 Make sure the auth token is attached before writing (cold-start guard).
    await ensureAuthReady();

    const bookRef = doc(db, 'users', uid, 'books', bookId);
    await updateDoc(bookRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw log.failure(error, {
      op: 'updateBook',
      action: 'update',
      resource: `users/${uid}/books/${bookId}`,
      context: { uid, bookId, fields: Object.keys(updates || {}) },
    });
  }
};

export const updateBookStatus = async (uid, bookId, status) => {
  // 🛡️ Validate status before delegating
  validateStatus(status);
  return updateBook(uid, bookId, { status });
};

export const markAsDNF = async (uid, bookId, status = BOOK_STATUS.DROPPED) => {
  return updateBookStatus(uid, bookId, status);
};

export const getUserBooks = async uid => {
  try {
    const booksRef = collection(db, 'users', uid, 'books');
    const snap = await getDocs(booksRef);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw log.failure(error, {
      op: 'getUserBooks',
      action: 'query',
      resource: `users/${uid}/books`,
      context: { uid },
    });
  }
};

export const addAnnotation = async (
  uid,
  bookId,
  page,
  text,
  isPublic = true,
  userMetadata = { displayName: 'Anon', photoURL: null },
  parentId = null,
) => {
  // 🛡️ Validation Guard
  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new Error('Erro de validação: O texto da anotação é obrigatório.');
  }

  const pageNum = Number(page);
  if (!parentId && Number.isNaN(pageNum)) {
    throw new Error('Erro de validação: Verifique a página informada.');
  }

  if (!parentId) {
    validatePageRange(pageNum, Infinity); // Validates non-negative
  }

  try {
    const annotRef = collection(
      db,
      'users',
      uid,
      'books',
      bookId,
      'annotations',
    );
    // 🧹 Sanitize text before persisting
    const cleanText = sanitizeEchoText(text);

    await addDoc(annotRef, {
      userId: uid,
      bookId: bookId,
      pageLocation: !parentId ? pageNum : null,
      text: cleanText,
      isPublic,
      parentId,
      replyCount: 0,
      userMetadata: {
        displayName: userMetadata.displayName || 'Leitor',
        photoURL: userMetadata.photoURL || null,
      },
      reactions: { claps: 0 },
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    throw log.failure(error, {
      op: 'addAnnotation',
      action: 'create',
      resource: `users/${uid}/books/${bookId}/annotations`,
      context: { uid, bookId, page: pageNum, isPublic, isReply: !!parentId },
    });
  }
};

export const getUserAnnotations = async (uid, bookId, onlyPublic = false) => {
  try {
    const annotRef = collection(
      db,
      'users',
      uid,
      'books',
      bookId,
      'annotations',
    );
    let q = annotRef;
    if (onlyPublic) {
      q = query(annotRef, where('isPublic', '==', true));
    }
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw log.failure(error, {
      op: 'getUserAnnotations',
      action: 'query',
      resource: `users/${uid}/books/${bookId}/annotations`,
      context: { uid, bookId, onlyPublic },
    });
  }
};
