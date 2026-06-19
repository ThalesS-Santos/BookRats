/**
 * BookCover.js — Component unit tests
 *
 * expo-image is mocked as a pass-through React Native Image so the component
 * renders in the test environment without native bindings.
 * Static asset imports are mocked so require() returns a stable number.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── expo-image mock ───────────────────────────────────────────────────────────
// Expose props on testID so assertions can inspect them
jest.mock('expo-image', () => {
  const React = require('react');
  const { Image: RNImage } = require('react-native');
  return {
    Image: ({
      source,
      style,
      contentFit,
      cachePolicy,
      priority,
      transition,
      recyclingKey,
      placeholder,
      onError,
      testID,
      ...rest
    }) =>
      React.createElement(RNImage, {
        testID: testID || 'book-cover-image',
        source,
        style,
        resizeMode: contentFit || 'cover',
        // Attach extra props as data-* so tests can verify them
        accessibilityLabel: [
          cachePolicy,
          priority,
          recyclingKey,
          placeholder ? 'has-placeholder' : 'no-placeholder',
        ]
          .filter(Boolean)
          .join('|'),
        onError,
        ...rest,
      }),
  };
});

// ── asset mock ────────────────────────────────────────────────────────────────
jest.mock('@ui/assets', () => ({
  PixelBook: 1,
  FallbackAvatar: 2,
  AppIcon: 3,
  SplashIcon: 4,
  Favicon: 5,
}));

import BookCover from '@ui/components/atoms/BookCover';

// ── fixtures ──────────────────────────────────────────────────────────────────
const REMOTE = { uri: 'https://books.google.com/books?id=abc&zoom=1&edge=curl' };
const LOCAL  = 1; // static require() simulation (PixelBook)

// ── helpers ───────────────────────────────────────────────────────────────────
function renderCover(props = {}) {
  return render(<BookCover source={REMOTE} {...props} />);
}

function getLabel(wrapper) {
  return wrapper.getByTestId('book-cover-image').props.accessibilityLabel;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BookCover — rendering', () => {
  it('renders without crashing for a remote source', () => {
    const { getByTestId } = renderCover();
    expect(getByTestId('book-cover-image')).toBeTruthy();
  });

  it('renders without crashing for a local static asset', () => {
    const { getByTestId } = render(<BookCover source={LOCAL} />);
    expect(getByTestId('book-cover-image')).toBeTruthy();
  });

  it('renders when source is null (falls back to PixelBook)', () => {
    const { getByTestId } = render(<BookCover source={null} />);
    expect(getByTestId('book-cover-image')).toBeTruthy();
  });

  it('renders when source is undefined', () => {
    const { getByTestId } = render(<BookCover source={undefined} />);
    expect(getByTestId('book-cover-image')).toBeTruthy();
  });
});

describe('BookCover — cache policy', () => {
  it('always uses memory-disk cache policy for remote sources', () => {
    const { getByTestId } = renderCover();
    expect(getByTestId('book-cover-image').props.accessibilityLabel).toContain(
      'memory-disk',
    );
  });

  it('uses memory-disk cache policy for local assets too', () => {
    const { getByTestId } = render(<BookCover source={LOCAL} />);
    expect(getByTestId('book-cover-image').props.accessibilityLabel).toContain(
      'memory-disk',
    );
  });
});

describe('BookCover — priority', () => {
  it('defaults priority to "normal"', () => {
    const { getByTestId } = renderCover();
    expect(getByTestId('book-cover-image').props.accessibilityLabel).toContain(
      'normal',
    );
  });

  it('accepts priority="high"', () => {
    const { getByTestId } = renderCover({ priority: 'high' });
    expect(getByTestId('book-cover-image').props.accessibilityLabel).toContain(
      'high',
    );
  });

  it('accepts priority="low"', () => {
    const { getByTestId } = renderCover({ priority: 'low' });
    expect(getByTestId('book-cover-image').props.accessibilityLabel).toContain(
      'low',
    );
  });
});

describe('BookCover — recyclingKey', () => {
  it('derives recyclingKey from source.uri for remote sources', () => {
    // The optimized URI (zoom=2, no edge=curl)
    const { getByTestId } = renderCover();
    const label = getByTestId('book-cover-image').props.accessibilityLabel;
    // Recycling key contains the optimized URI fragment
    expect(label).toContain('zoom=2');
  });

  it('accepts an explicit recyclingKey override', () => {
    const { getByTestId } = renderCover({ recyclingKey: 'book-42' });
    expect(getByTestId('book-cover-image').props.accessibilityLabel).toContain(
      'book-42',
    );
  });

  it('does not set recyclingKey for local assets', () => {
    const { getByTestId } = render(<BookCover source={LOCAL} />);
    const label = getByTestId('book-cover-image').props.accessibilityLabel;
    // None of the parts of accessibilityLabel should be the local asset key
    // (recyclingKey portion is undefined, so not present in the joined string)
    expect(label).not.toContain('book-cover');
  });
});

describe('BookCover — blurhash placeholder', () => {
  it('attaches a placeholder for remote sources', () => {
    const { getByTestId } = renderCover();
    expect(getByTestId('book-cover-image').props.accessibilityLabel).toContain(
      'has-placeholder',
    );
  });

  it('does NOT attach a placeholder for local static assets', () => {
    const { getByTestId } = render(<BookCover source={LOCAL} />);
    expect(getByTestId('book-cover-image').props.accessibilityLabel).toContain(
      'no-placeholder',
    );
  });
});

describe('BookCover — URL optimisation', () => {
  it('strips &edge=curl from the rendered source URI', () => {
    const { getByTestId } = renderCover({ source: REMOTE });
    const src = getByTestId('book-cover-image').props.source;
    expect(src.uri).not.toContain('edge=curl');
  });

  it('upgrades zoom=1 to zoom=2 in the rendered source URI', () => {
    const { getByTestId } = renderCover({ source: REMOTE });
    const src = getByTestId('book-cover-image').props.source;
    expect(src.uri).toContain('zoom=2');
  });

  it('leaves local asset sources untouched', () => {
    const { getByTestId } = render(<BookCover source={LOCAL} />);
    expect(getByTestId('book-cover-image').props.source).toBe(1); // PixelBook number
  });
});

describe('BookCover — error fallback', () => {
  it('falls back to PixelBook when onError fires', () => {
    const { getByTestId } = renderCover({ source: REMOTE });
    const img = getByTestId('book-cover-image');

    // Simulate a network/decode error
    fireEvent(img, 'error', { nativeEvent: { error: 'Failed to load' } });

    // After error, source should switch to PixelBook (1)
    expect(getByTestId('book-cover-image').props.source).toBe(1);
  });

  it('calls the caller-provided onError callback', () => {
    const onError = jest.fn();
    const { getByTestId } = renderCover({ onError });
    fireEvent(getByTestId('book-cover-image'), 'error', {});
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('hides the blurhash placeholder after error (shows PixelBook directly)', () => {
    const { getByTestId } = renderCover({ source: REMOTE });
    fireEvent(getByTestId('book-cover-image'), 'error', {});
    // After error, no-placeholder because source is now PixelBook
    expect(getByTestId('book-cover-image').props.accessibilityLabel).toContain(
      'no-placeholder',
    );
  });
});

describe('BookCover — size props', () => {
  it('applies explicit width and height to the style', () => {
    const { getByTestId } = renderCover({ width: 80, height: 120 });
    const style = getByTestId('book-cover-image').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    expect(flat.width).toBe(80);
    expect(flat.height).toBe(120);
  });

  it('merges additional style prop', () => {
    const { getByTestId } = renderCover({
      width: 100,
      height: 150,
      style: { borderRadius: 8 },
    });
    const style = getByTestId('book-cover-image').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    expect(flat.borderRadius).toBe(8);
  });
});

describe('BookCover — contentFit', () => {
  it('defaults contentFit to "cover"', () => {
    const { getByTestId } = renderCover();
    expect(getByTestId('book-cover-image').props.resizeMode).toBe('cover');
  });

  it('passes contentFit="contain" to the underlying image', () => {
    const { getByTestId } = renderCover({ contentFit: 'contain' });
    expect(getByTestId('book-cover-image').props.resizeMode).toBe('contain');
  });
});
