/**
 * imageUtils.js — Unit tests
 *
 * Pure functions only; no React, no native modules — runs fast.
 */

import {
  DEFAULT_BOOK_BLURHASH,
  extractUri,
  isRemoteSource,
  optimizeCoverUrl,
} from '@core/utils/imageUtils';

// ── DEFAULT_BOOK_BLURHASH ─────────────────────────────────────────────────────
describe('DEFAULT_BOOK_BLURHASH', () => {
  it('is a non-empty string', () => {
    expect(typeof DEFAULT_BOOK_BLURHASH).toBe('string');
    expect(DEFAULT_BOOK_BLURHASH.length).toBeGreaterThan(10);
  });
});

// ── isRemoteSource ────────────────────────────────────────────────────────────
describe('isRemoteSource', () => {
  it('returns true for { uri: "https://..." }', () => {
    expect(isRemoteSource({ uri: 'https://example.com/cover.jpg' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isRemoteSource(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isRemoteSource(undefined)).toBe(false);
  });

  it('returns false for a static require (number)', () => {
    expect(isRemoteSource(42)).toBe(false);
  });

  it('returns false for an object without uri', () => {
    expect(isRemoteSource({ blurhash: 'abc' })).toBe(false);
  });

  it('returns false for { uri: "" } (empty string)', () => {
    expect(isRemoteSource({ uri: '' })).toBe(false);
  });

  it('returns false for a plain string', () => {
    expect(isRemoteSource('https://example.com')).toBe(false);
  });
});

// ── extractUri ────────────────────────────────────────────────────────────────
describe('extractUri', () => {
  it('returns the uri string for a remote source', () => {
    expect(extractUri({ uri: 'https://books.google.com/cover.jpg' })).toBe(
      'https://books.google.com/cover.jpg',
    );
  });

  it('returns null for a static require (number)', () => {
    expect(extractUri(42)).toBeNull();
  });

  it('returns null for null', () => {
    expect(extractUri(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(extractUri(undefined)).toBeNull();
  });
});

// ── optimizeCoverUrl ──────────────────────────────────────────────────────────
describe('optimizeCoverUrl', () => {
  const GOOGLE_URL = 'https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api';

  it('removes &edge=curl from Google Books URLs', () => {
    const result = optimizeCoverUrl({ uri: GOOGLE_URL });
    expect(result.uri).not.toContain('edge=curl');
  });

  it('upgrades zoom=1 to zoom=2', () => {
    const result = optimizeCoverUrl({ uri: GOOGLE_URL });
    expect(result.uri).toContain('zoom=2');
    expect(result.uri).not.toContain('zoom=1');
  });

  it('applies both optimisations simultaneously', () => {
    const result = optimizeCoverUrl({ uri: GOOGLE_URL });
    expect(result.uri).toContain('zoom=2');
    expect(result.uri).not.toContain('edge=curl');
  });

  it('preserves all other query parameters', () => {
    const result = optimizeCoverUrl({ uri: GOOGLE_URL });
    expect(result.uri).toContain('id=abc');
    expect(result.uri).toContain('printsec=frontcover');
    expect(result.uri).toContain('img=1');
    expect(result.uri).toContain('source=gbs_api');
  });

  it('handles URL without edge=curl gracefully (no duplication)', () => {
    const url = 'https://books.google.com/books/content?id=xyz&zoom=1';
    const result = optimizeCoverUrl({ uri: url });
    expect(result.uri).toBe('https://books.google.com/books/content?id=xyz&zoom=2');
  });

  it('handles URL without zoom parameter gracefully', () => {
    const url = 'https://example.com/cover.jpg';
    const result = optimizeCoverUrl({ uri: url });
    // No zoom param → original URL returned unchanged
    expect(result.uri).toBe(url);
  });

  it('returns same reference when no changes are needed', () => {
    const source = { uri: 'https://example.com/cover.jpg' };
    const result = optimizeCoverUrl(source);
    // Same object reference because URL was not modified
    expect(result).toBe(source);
  });

  it('returns a new object (not mutating) when URL is changed', () => {
    const source = { uri: GOOGLE_URL };
    const result = optimizeCoverUrl(source);
    expect(result).not.toBe(source); // new object
    expect(source.uri).toBe(GOOGLE_URL); // original unmodified
  });

  it('returns static asset unchanged (null/undefined/number)', () => {
    expect(optimizeCoverUrl(null)).toBeNull();
    expect(optimizeCoverUrl(undefined)).toBeUndefined();
    expect(optimizeCoverUrl(42)).toBe(42);
  });

  it('is case-insensitive for &edge=curl removal', () => {
    const url = 'https://books.google.com/books?zoom=1&EDGE=CURL';
    const result = optimizeCoverUrl({ uri: url });
    expect(result.uri).not.toContain('EDGE=CURL');
    expect(result.uri).not.toContain('edge=curl');
  });

  it('handles zoom=1 at the very end of the URL (no trailing &)', () => {
    const url = 'https://books.google.com/books?id=x&zoom=1';
    const result = optimizeCoverUrl({ uri: url });
    expect(result.uri).toContain('zoom=2');
    expect(result.uri).not.toContain('zoom=1');
  });

  it('does not double-upgrade zoom=2', () => {
    const url = 'https://books.google.com/books?id=x&zoom=2';
    const result = optimizeCoverUrl({ uri: url });
    // zoom=2 should remain zoom=2, not become zoom=22
    expect(result.uri).toContain('zoom=2');
    expect(result.uri).not.toContain('zoom=22');
  });
});
