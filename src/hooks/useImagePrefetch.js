/**
 * useImagePrefetch — React hook for proactive cover cache warming.
 *
 * Triggers a background prefetch of book covers whenever the `books` array
 * reference changes (e.g., on screen focus or after library data loads).
 * The prefetch is fire-and-forget: it never blocks the render cycle and
 * failures are silently discarded.
 *
 * Usage:
 *   function LibraryScreen() {
 *     const books = useMainStore(s => s.books);
 *     useImagePrefetch(books);   // <-- single line; warms the cache quietly
 *     return <BookList books={books} />;
 *   }
 */

import { useEffect } from 'react';

import { ImageCacheService } from '@core/services/ImageCacheService';

/**
 * @param {Array} books   - Array of book objects (each with a `thumbnail` field)
 * @param {object} [opts]
 * @param {number} [opts.batchSize=6]  - Parallel prefetch per batch
 */
export function useImagePrefetch(books, { batchSize = 6 } = {}) {
  useEffect(() => {
    if (!books?.length) return;
    // Fire-and-forget; errors are silently swallowed
    ImageCacheService.warmLibrary(books, { batchSize }).catch(() => {});
  }, [books, batchSize]);
}
