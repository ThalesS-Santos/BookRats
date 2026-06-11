import { AppError } from './AppError';
import {
  LEVELS,
  LEVEL_NAMES,
  DEFAULT_MIN_LEVEL,
  IS_DEV,
  toLevelValue,
} from './levels';
import { redact } from './redact';
import { ConsoleTransport, MemoryTransport } from './transports';

// ---- Shared, app-wide logging pipeline ----------------------------------
const transports = [];
let SEQ = 0;
const SESSION_ID = `sess-${Math.random().toString(36).slice(2, 8)}`;

let appContext = {
  env: IS_DEV ? 'development' : 'production',
  platform: 'unknown',
  release: null,
};

/** Set global app metadata attached to every record (call once at startup). */
export const configureObservability = (cfg = {}) => {
  appContext = { ...appContext, ...cfg };
};

export const addTransport = transport => {
  transports.push(transport);
  return transport;
};

export const removeTransport = transport => {
  const i = transports.indexOf(transport);
  if (i >= 0) transports.splice(i, 1);
};

export const getTransports = () => transports;

const pad = (n, len = 2) => String(n).padStart(len, '0');
const localTime = d =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
    d.getMilliseconds(),
    3,
  )}`;

const dispatch = record => {
  for (const transport of transports) {
    try {
      if (transport.shouldHandle(record)) transport.handle(record);
    } catch (_) {
      // A faulty transport must never break the app or other transports.
    }
  }
};

/**
 * Logger — a namespaced, structured logger. Create one per module via
 * `createLogger('core.api.books')`; derive request-scoped loggers with
 * `.child(namespace, boundContext)`.
 */
export class Logger {
  constructor({
    namespace = 'app',
    boundContext = {},
    minLevel = DEFAULT_MIN_LEVEL,
  } = {}) {
    this.namespace = namespace;
    this.boundContext = boundContext;
    this.minLevel = toLevelValue(minLevel);
  }

  /** Derive a logger with a sub-namespace and/or extra bound context fields. */
  child(namespace, boundContext = {}) {
    return new Logger({
      namespace: namespace ? `${this.namespace}.${namespace}` : this.namespace,
      boundContext: { ...this.boundContext, ...boundContext },
      minLevel: this.minLevel,
    });
  }

  setMinLevel(level) {
    this.minLevel = toLevelValue(level);
    return this;
  }

  _log(levelInput, message, fields = {}) {
    const level = toLevelValue(levelInput);
    if (level < this.minLevel) return; // cheap early gate

    const now = new Date();
    const record = {
      ts: now.toISOString(),
      time: localTime(now),
      level,
      levelName: LEVEL_NAMES[level],
      logger: this.namespace,
      op: fields.op ?? null,
      message: message == null ? '' : String(message),
      code: fields.code ?? null,
      category: fields.category ?? null,
      action: fields.action ?? null,
      resource: fields.resource ?? null,
      providerCode: fields.providerCode ?? null,
      retryable: fields.retryable,
      context: redact({ ...this.boundContext, ...(fields.context || {}) }),
      err: fields.err ? redact(fields.err) : undefined,
      traceId: fields.traceId ?? this.boundContext.traceId ?? SESSION_ID,
      seq: (SEQ += 1),
      durationMs: fields.durationMs,
      app: appContext,
    };

    dispatch(record);
    return record;
  }

  debug(message, fields) {
    return this._log(LEVELS.DEBUG, message, fields);
  }

  info(message, fields) {
    return this._log(LEVELS.INFO, message, fields);
  }

  warn(message, fields) {
    return this._log(LEVELS.WARN, message, fields);
  }

  error(message, fields) {
    return this._log(LEVELS.ERROR, message, fields);
  }

  fatal(message, fields) {
    return this._log(LEVELS.FATAL, message, fields);
  }

  /**
   * Log an Error/exception with full structured context, returning the
   * resulting AppError (useful when you still want to inspect it).
   */
  exception(error, meta = {}) {
    const appErr = AppError.from(error, meta);
    this._log(
      meta.level || appErr.severity,
      meta.message || appErr.technicalMessage,
      {
        op: meta.op || appErr.op,
        action: meta.action || appErr.action,
        resource: meta.resource || appErr.resource,
        code: appErr.code,
        category: appErr.category,
        providerCode: appErr.providerCode,
        retryable: appErr.retryable,
        context: meta.context,
        err: error,
      },
    );
    return appErr;
  }

  /**
   * THE call-site helper: classify + log a failure at its proper severity and
   * return a ready-to-throw AppError (whose `.message` is the friendly text).
   *
   *   throw log.failure(error, {
   *     op: 'updateBookProgress',
   *     action: 'update',
   *     resource: `users/${uid}/books/${bookId}`,
   *     context: { uid, bookId, newPage },
   *   });
   */
  failure(error, meta = {}) {
    const appErr = AppError.from(error, meta);
    this._log(appErr.severity, appErr.technicalMessage, {
      op: appErr.op,
      action: appErr.action,
      resource: appErr.resource,
      code: appErr.code,
      category: appErr.category,
      providerCode: appErr.providerCode,
      retryable: appErr.retryable,
      context: meta.context,
      err: error instanceof Error ? error : appErr,
    });
    return appErr;
  }

  /** Returns a stop() function that, when called, logs the elapsed duration. */
  startTimer(message, meta = {}) {
    const start = Date.now();
    return (extra = {}) => {
      const durationMs = Date.now() - start;
      this._log(meta.level || LEVELS.INFO, message, {
        ...meta,
        ...extra,
        durationMs,
      });
      return durationMs;
    };
  }
}

// ---- Root pipeline & factory --------------------------------------------
const memoryTransport = new MemoryTransport({ capacity: 200 });
addTransport(new ConsoleTransport({}));
addTransport(memoryTransport);

/** Last N structured records (for crash reports / "export logs"). */
export const getRecentLogs = () => memoryTransport.getRecords();
export const clearRecentLogs = () => memoryTransport.clear();

/** The default root logger. */
export const rootLogger = new Logger({ namespace: 'app' });

/** Create a namespaced logger for a module, e.g. createLogger('core.api.books'). */
export const createLogger = (namespace, boundContext = {}) =>
  new Logger({ namespace, boundContext });
