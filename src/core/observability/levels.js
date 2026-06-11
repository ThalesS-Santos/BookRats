/**
 * Severity levels, modeled on the RFC 5424 / Google Cloud Logging ordering.
 * Numeric values let transports filter by a minimum threshold cheaply.
 */
export const LEVELS = Object.freeze({
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50,
});

export const LEVEL_NAMES = Object.freeze({
  10: 'DEBUG',
  20: 'INFO',
  30: 'WARN',
  40: 'ERROR',
  50: 'FATAL',
});

/** Short glyphs used by the pretty console formatter. */
export const LEVEL_GLYPHS = Object.freeze({
  DEBUG: '·',
  INFO: 'ℹ',
  WARN: '⚠',
  ERROR: '⛔',
  FATAL: '💀',
});

/** True when running a development build (RN/Expo sets the __DEV__ global). */
export const IS_DEV =
  typeof __DEV__ !== 'undefined'
    ? !!__DEV__
    : typeof process !== 'undefined' && process.env
      ? process.env.NODE_ENV !== 'production'
      : true;

/** Default minimum level: verbose in dev, INFO and above in production. */
export const DEFAULT_MIN_LEVEL = IS_DEV ? LEVELS.DEBUG : LEVELS.INFO;

/** Resolve a level name ('error', 'ERROR') or numeric value to a number. */
export const toLevelValue = level => {
  if (typeof level === 'number') return level;
  if (typeof level === 'string')
    return LEVELS[level.toUpperCase()] ?? LEVELS.INFO;
  return LEVELS.INFO;
};
