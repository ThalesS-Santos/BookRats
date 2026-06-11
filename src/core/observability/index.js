/**
 * BookRats Observability
 * ----------------------
 * A small, production-grade structured logging + error-taxonomy layer.
 *
 * Quick start:
 *   import { createLogger } from '@core/observability';
 *   const log = createLogger('core.api.books');
 *
 *   try { ...firestore... }
 *   catch (e) {
 *     throw log.failure(e, {
 *       op: 'updateBookProgress',
 *       action: 'update',
 *       resource: `users/${uid}/books/${bookId}`,
 *       context: { uid, bookId, newPage },
 *     });
 *   }
 *
 * Wiring a remote sink later (no call-site changes):
 *   import { addTransport, RemoteTransport, LEVELS } from '@core/observability';
 *   addTransport(new RemoteTransport({ minLevel: LEVELS.WARN, send: rec => Sentry.captureMessage(rec.message, { extra: rec }) }));
 */

export {
  Logger,
  rootLogger,
  createLogger,
  configureObservability,
  addTransport,
  removeTransport,
  getTransports,
  getRecentLogs,
  clearRecentLogs,
} from './Logger';

export { AppError } from './AppError';

export {
  CATEGORY,
  classifyError,
  toUserMessage,
  lookupByCode,
} from './errorCatalog';

export { LEVELS, LEVEL_NAMES, IS_DEV } from './levels';

export {
  BaseTransport,
  ConsoleTransport,
  MemoryTransport,
  RemoteTransport,
  formatPretty,
  formatJson,
} from './transports';

export { redact, maskEmail } from './redact';

export { installGlobalHandlers } from './globalHandlers';
