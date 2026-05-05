/**
 * Enum for book statuses in the library.
 * Use these constants to avoid typos and ensure consistency across the app.
 * 
 * @typedef {'quero_ler' | 'lendo' | 'lido' | 'lista_desejos' | 'comprado' | 'recomendado'} BookStatus
 */
export const BOOK_STATUS = {
  WANT_TO_READ: 'quero_ler',
  READING: 'lendo',
  READ: 'lido',
  WISH_LIST: 'lista_desejos',
  BOUGHT: 'comprado',
  RECOMMENDED: 'recomendado',
  DROPPED: 'abandonado',
};

/**
 * Helper to get all valid status values as an array.
 */
export const VALID_STATUSES = Object.values(BOOK_STATUS);
