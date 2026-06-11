import { rootLogger } from './Logger';

/**
 * Installs catch-all handlers so nothing escapes the logging pipeline:
 *  - uncaught JS exceptions (React Native ErrorUtils)
 *  - unhandled promise rejections (where the host exposes a hook)
 *
 * Safe to call once at app startup; it chains any previously-installed handler.
 */
export const installGlobalHandlers = () => {
  // 1. Uncaught synchronous/async JS errors (React Native global handler).
  try {
    const errorUtils =
      typeof global !== 'undefined' ? global.ErrorUtils : undefined;
    if (errorUtils && typeof errorUtils.setGlobalHandler === 'function') {
      const previous = errorUtils.getGlobalHandler
        ? errorUtils.getGlobalHandler()
        : null;
      errorUtils.setGlobalHandler((error, isFatal) => {
        rootLogger.exception(error, {
          op: 'uncaughtException',
          message: isFatal
            ? 'Fatal uncaught JS exception'
            : 'Uncaught JS exception',
          level: isFatal ? 'FATAL' : 'ERROR',
          context: { isFatal: !!isFatal },
        });
        if (typeof previous === 'function') previous(error, isFatal);
      });
    }
  } catch (_) {
    // Never let handler installation crash startup.
  }

  // 2. Unhandled promise rejections (Node-like hosts / tests).
  try {
    if (typeof process !== 'undefined' && typeof process.on === 'function') {
      process.on('unhandledRejection', reason => {
        rootLogger.exception(reason, {
          op: 'unhandledRejection',
          message: 'Unhandled promise rejection',
          context: { source: 'process' },
        });
      });
    }
  } catch (_) {
    // ignore
  }
};
