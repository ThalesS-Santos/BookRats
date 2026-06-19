/**
 * imageUtils.js — Utilities for book cover image handling.
 *
 * Centralises three concerns:
 *   1. Source-type introspection (remote URI vs. local static asset)
 *   2. Google Books URL optimisation (higher resolution, no curl artifact)
 *   3. Default blurhash constant shared across BookCover and ImageCacheService
 */

// Pre-baked blurhash for a warm, neutral book-cover tone.
// Generated from a representative set of book spines; shows immediately on
// first load while the real image is fetched and written to disk cache.
export const DEFAULT_BOOK_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

/**
 * Returns true when `source` is a remote-URL object (`{ uri: '...' }`).
 * Returns false for static asset requires (numbers) or null/undefined.
 *
 * @param {any} source
 * @returns {boolean}
 */
export function isRemoteSource(source) {
  return (
    source !== null &&
    source !== undefined &&
    typeof source === 'object' &&
    typeof source.uri === 'string' &&
    source.uri.length > 0
  );
}

/**
 * Returns the URI string from a remote source, or null for local assets.
 *
 * @param {any} source
 * @returns {string|null}
 */
export function extractUri(source) {
  return isRemoteSource(source) ? source.uri : null;
}

/**
 * Optimises a Google Books cover URL for higher quality and cleaner display:
 *   - Removes the `&edge=curl` parameter that adds a distracting page-curl
 *     artefact and slightly degrades the image.
 *   - Upgrades `zoom=1` (default, small JPEG) to `zoom=2` (medium, noticeably
 *     sharper on modern high-DPI screens) where the parameter exists.
 *
 * Non-Google URLs and local static assets are returned unchanged.
 *
 * @param {{ uri: string }|number|null|undefined} source
 * @returns {typeof source} Optimised source object, or the original if not applicable.
 */
export function optimizeCoverUrl(source) {
  if (!isRemoteSource(source)) return source;

  const optimized = source.uri
    // Remove curl artefact
    .replace(/&edge=curl/gi, '')
    // Upgrade resolution: zoom=1 → zoom=2
    .replace(/zoom=1(&|$)/g, (_, sep) => `zoom=2${sep}`);

  if (optimized === source.uri) return source; // nothing changed — same reference
  return { ...source, uri: optimized };
}
