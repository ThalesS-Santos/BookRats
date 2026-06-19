/**
 * ImageCacheService.js — Unit tests
 *
 * All expo-image static methods are mocked so no native module is required.
 */

// ── expo-image mock ───────────────────────────────────────────────────────────
const mockPrefetch = jest.fn().mockResolvedValue(true);
const mockClearDiskCache = jest.fn().mockResolvedValue(true);
const mockClearMemoryCache = jest.fn().mockResolvedValue(true);

jest.mock('expo-image', () => ({
  Image: {
    prefetch: (...args) => mockPrefetch(...args),
    clearDiskCache: (...args) => mockClearDiskCache(...args),
    clearMemoryCache: (...args) => mockClearMemoryCache(...args),
  },
}));

import { ImageCacheService } from '@core/services/ImageCacheService';

// ── helpers ───────────────────────────────────────────────────────────────────

const GOOGLE_COVER = uri => ({ thumbnail: { uri } });
const LOCAL_COVER  = pixelBook => ({ thumbnail: pixelBook });

const REMOTE_A = 'https://books.google.com/books?id=a&zoom=1&edge=curl';
const REMOTE_B = 'https://books.google.com/books?id=b&zoom=1';
const REMOTE_C = 'https://books.google.com/books?id=c&zoom=1';

beforeEach(() => {
  jest.clearAllMocks();
});

// ── warmLibrary ───────────────────────────────────────────────────────────────
describe('ImageCacheService.warmLibrary', () => {
  it('calls Image.prefetch for each remote cover URI', async () => {
    const books = [GOOGLE_COVER(REMOTE_A), GOOGLE_COVER(REMOTE_B)];
    await ImageCacheService.warmLibrary(books);
    expect(mockPrefetch).toHaveBeenCalledTimes(2);
  });

  it('skips local static assets (PixelBook)', async () => {
    const books = [LOCAL_COVER(42), GOOGLE_COVER(REMOTE_A)];
    await ImageCacheService.warmLibrary(books);
    // Only the remote book should be prefetched
    expect(mockPrefetch).toHaveBeenCalledTimes(1);
  });

  it('deduplicates identical cover URLs', async () => {
    const books = [GOOGLE_COVER(REMOTE_A), GOOGLE_COVER(REMOTE_A)];
    await ImageCacheService.warmLibrary(books);
    expect(mockPrefetch).toHaveBeenCalledTimes(1);
  });

  it('prefetches the optimised URL (zoom=2, no edge=curl)', async () => {
    const books = [GOOGLE_COVER(REMOTE_A)]; // REMOTE_A has zoom=1 and edge=curl
    await ImageCacheService.warmLibrary(books);
    const [calledUrl] = mockPrefetch.mock.calls[0];
    expect(calledUrl).toContain('zoom=2');
    expect(calledUrl).not.toContain('edge=curl');
  });

  it('does nothing for an empty array', async () => {
    await ImageCacheService.warmLibrary([]);
    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it('does nothing for a non-array argument', async () => {
    await ImageCacheService.warmLibrary(null);
    await ImageCacheService.warmLibrary(undefined);
    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it('does nothing when all books have local covers', async () => {
    await ImageCacheService.warmLibrary([LOCAL_COVER(42), LOCAL_COVER(42)]);
    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it('continues batching even if one prefetch rejects', async () => {
    // First call fails, second succeeds
    mockPrefetch
      .mockRejectedValueOnce(new Error('net error'))
      .mockResolvedValue(true);

    const books = [GOOGLE_COVER(REMOTE_A), GOOGLE_COVER(REMOTE_B), GOOGLE_COVER(REMOTE_C)];
    // Should not throw even though one failed
    await expect(ImageCacheService.warmLibrary(books)).resolves.toBeUndefined();
    expect(mockPrefetch).toHaveBeenCalledTimes(3);
  });

  it('respects batchSize option', async () => {
    const manyBooks = Array.from({ length: 12 }, (_, i) =>
      GOOGLE_COVER(`https://books.google.com/books?id=${i}&zoom=1`),
    );
    await ImageCacheService.warmLibrary(manyBooks, { batchSize: 4 });
    // All 12 should eventually be prefetched (across 3 batches of 4)
    expect(mockPrefetch).toHaveBeenCalledTimes(12);
  });
});

// ── warmTopPriority ───────────────────────────────────────────────────────────
describe('ImageCacheService.warmTopPriority', () => {
  it('prefetches all provided books in a single parallel burst', async () => {
    const books = [GOOGLE_COVER(REMOTE_A), GOOGLE_COVER(REMOTE_B)];
    await ImageCacheService.warmTopPriority(books);
    expect(mockPrefetch).toHaveBeenCalledTimes(2);
  });

  it('does nothing for empty input', async () => {
    await ImageCacheService.warmTopPriority([]);
    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it('skips local covers', async () => {
    const books = [LOCAL_COVER(42)];
    await ImageCacheService.warmTopPriority(books);
    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it('handles prefetch failure without throwing', async () => {
    mockPrefetch.mockRejectedValueOnce(new Error('offline'));
    const books = [GOOGLE_COVER(REMOTE_A)];
    await expect(ImageCacheService.warmTopPriority(books)).resolves.toBeUndefined();
  });
});

// ── clearAll ──────────────────────────────────────────────────────────────────
describe('ImageCacheService.clearAll', () => {
  it('clears both disk and memory caches', async () => {
    await ImageCacheService.clearAll();
    expect(mockClearDiskCache).toHaveBeenCalledTimes(1);
    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1);
  });

  it('resolves even if clearDiskCache rejects', async () => {
    mockClearDiskCache.mockRejectedValueOnce(new Error('disk error'));
    await expect(ImageCacheService.clearAll()).resolves.toBeUndefined();
    // clearMemoryCache was still called
    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1);
  });
});

// ── clearMemory ───────────────────────────────────────────────────────────────
describe('ImageCacheService.clearMemory', () => {
  it('clears only the memory cache', async () => {
    await ImageCacheService.clearMemory();
    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1);
    expect(mockClearDiskCache).not.toHaveBeenCalled();
  });
});
