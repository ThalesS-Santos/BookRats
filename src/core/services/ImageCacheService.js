/**
 * ImageCacheService — Proactive cover cache warming and cache management.
 *
 * Rationale:
 *   expo-image caches images _after_ the first render. On a slow connection the
 *   first time a cover is seen it still flickers briefly. This service
 *   prefetches URLs in the background—before any component tries to render
 *   them—so the disk cache is already warm. On revisit (or after an app
 *   restart) covers appear instantly with zero network round-trip.
 *
 * Usage:
 *   // On library screen mount:
 *   await ImageCacheService.warmLibrary(books);
 *
 *   // On app startup (non-blocking):
 *   ImageCacheService.warmTopPriority(currentlyReadingBooks).catch(() => {});
 *
 *   // User-triggered cache clear (settings screen):
 *   await ImageCacheService.clearAll();
 */

import { Image } from 'expo-image';

import { extractUri, optimizeCoverUrl } from '@core/utils/imageUtils';

/**
 * Extracts and optimises the cover URI from a book object.
 * Returns null for books with local-asset covers (PixelBook fallback).
 *
 * @param {{ thumbnail: any }} book
 * @returns {string|null}
 */
function coverUriFor(book) {
  const optimized = optimizeCoverUrl(book?.thumbnail);
  return extractUri(optimized);
}

/**
 * Prefetch a list of URLs in parallel batches.
 * Each batch is awaited before the next starts to avoid saturating the
 * network interface (important on mobile connections).
 *
 * Failures inside a batch are silently swallowed via `allSettled` so one bad
 * URL never aborts the rest.
 *
 * @param {string[]} urls
 * @param {number}   batchSize
 */
async function prefetchBatched(urls, batchSize) {
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(url => Image.prefetch(url)));
  }
}

export const ImageCacheService = {
  /**
   * Warms the cache for a full book collection (e.g., entire library).
   *
   * Strategy:
   *   1. Extract valid remote URIs; skip local PixelBook assets
   *   2. Deduplicate (same cover may appear under different statuses)
   *   3. Prefetch in batches of `batchSize` to respect mobile bandwidth
   *
   * @param {Array}  books
   * @param {object} [options]
   * @param {number} [options.batchSize=6]  Concurrent prefetch per batch
   * @returns {Promise<void>}
   */
  async warmLibrary(books, { batchSize = 6 } = {}) {
    if (!Array.isArray(books) || books.length === 0) return;

    const seen = new Set();
    const urls = [];
    for (const book of books) {
      const uri = coverUriFor(book);
      if (uri && !seen.has(uri)) {
        seen.add(uri);
        urls.push(uri);
      }
    }

    if (urls.length === 0) return;
    await prefetchBatched(urls, batchSize);
  },

  /**
   * Immediately prefetches a small, high-priority subset (e.g., the one or
   * two books the user is currently reading). This runs in a single parallel
   * burst because the list is intentionally short.
   *
   * @param {Array} books  Typically just the READING-status books
   * @returns {Promise<void>}
   */
  async warmTopPriority(books) {
    if (!Array.isArray(books) || books.length === 0) return;

    const urls = books.map(coverUriFor).filter(Boolean);
    if (urls.length === 0) return;

    await Promise.allSettled(urls.map(url => Image.prefetch(url)));
  },

  /**
   * Clears both the memory and disk caches.
   * Useful from a "Free Storage" setting or after a sign-out.
   *
   * @returns {Promise<void>}
   */
  async clearAll() {
    await Promise.allSettled([
      Image.clearMemoryCache(),
      Image.clearDiskCache(),
    ]);
  },

  /**
   * Clears only the in-memory cache.
   * Lighter operation — does not touch disk; useful under memory pressure.
   *
   * @returns {Promise<void>}
   */
  async clearMemory() {
    await Image.clearMemoryCache();
  },
};
