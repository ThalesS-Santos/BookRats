/**
 * BookCover — Universal book cover image component.
 *
 * Replaces every scattered `<Image source={book.thumbnail} />` usage in the
 * app with a single, consistent component that provides:
 *
 *   • Persistent disk + memory cache via expo-image (survives app restarts)
 *   • Blurhash placeholder — a warm coloured blur fills the slot _instantly_
 *     while the real cover is fetched / read from disk; no jarring flash
 *   • Smooth cross-dissolve fade-in on first load (300 ms by default)
 *   • Priority-aware network loading — 'high' for the open book, 'low' for
 *     off-screen list items, so the foreground render is never blocked
 *   • recyclingKey prevents stale covers in virtualised FlatLists when a
 *     cell is reused for a different book during scroll
 *   • Error fallback — if the remote cover fails (404 / no network) the local
 *     PixelBook asset is shown automatically without a blank gap
 *   • URL optimisation is applied transparently on every render via
 *     `optimizeCoverUrl` from imageUtils
 */

import React, { memo, useState, useMemo } from 'react';

import { Image } from 'expo-image';

import { PixelBook } from '@ui/assets';
import { DEFAULT_BOOK_BLURHASH, isRemoteSource, optimizeCoverUrl } from '@core/utils/imageUtils';

/**
 * @param {object}  props
 * @param {any}     props.source        - `{ uri }` object or static require (book.thumbnail)
 * @param {number}  [props.width]       - Explicit pixel width (overrides style)
 * @param {number}  [props.height]      - Explicit pixel height (overrides style)
 * @param {object}  [props.style]       - Additional style for the Image element
 * @param {object}  [props.containerStyle] - Unused; reserved for future wrapper
 * @param {'cover'|'contain'|'fill'|'none'|'scale-down'} [props.contentFit='cover']
 * @param {'low'|'normal'|'high'}   [props.priority='normal']
 * @param {number}  [props.transition=300] - Cross-dissolve duration in ms
 * @param {string}  [props.recyclingKey]   - FlatList cell key; defaults to source.uri
 * @param {Function}[props.onError]     - Optional callback on network/decode error
 */
const BookCover = memo(function BookCover({
  source,
  width,
  height,
  style,
  contentFit = 'cover',
  priority = 'normal',
  transition = 300,
  recyclingKey,
  onError,
}) {
  const [hasError, setHasError] = useState(false);

  // Apply URL optimisation once per source reference change
  const optimizedSource = useMemo(
    () => (hasError ? PixelBook : optimizeCoverUrl(source) ?? PixelBook),
    [source, hasError],
  );

  const isRemote = isRemoteSource(optimizedSource);

  // Derive a stable recycling key for FlatList reuse:
  // Remote images: the URI (changes when scrolling to a new book → fresh load)
  // Local assets:  undefined (no recycling needed; no network involved)
  const resolvedRecyclingKey =
    recyclingKey ?? (isRemote ? optimizedSource.uri : undefined);

  const handleError = e => {
    setHasError(true);
    onError?.(e);
  };

  const sizeStyle = useMemo(() => {
    if (width !== undefined || height !== undefined) {
      return { width, height };
    }
    return undefined;
  }, [width, height]);

  return (
    <Image
      source={optimizedSource}
      // Blurhash shows immediately while disk/network load resolves.
      // Skipped for local assets — they're already instantaneous.
      placeholder={isRemote && !hasError ? { blurhash: DEFAULT_BOOK_BLURHASH } : undefined}
      contentFit={contentFit}
      // memory-disk: memory for instant re-display after navigation,
      // disk for persistence across app restarts — strictly better than disk-only.
      cachePolicy="memory-disk"
      priority={priority}
      transition={transition}
      recyclingKey={resolvedRecyclingKey}
      style={[sizeStyle, style]}
      onError={handleError}
    />
  );
});

export default BookCover;
