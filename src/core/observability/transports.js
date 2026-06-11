import { LEVELS, LEVEL_GLYPHS, IS_DEV, toLevelValue } from './levels';
import { redact } from './redact';

/**
 * A transport is a sink for log records. It decides whether to handle a record
 * (based on its own minimum level) and how to emit it.
 *
 * All transports share the same record shape produced by Logger.
 */
export class BaseTransport {
  constructor({ minLevel = LEVELS.DEBUG } = {}) {
    this.minLevel = toLevelValue(minLevel);
  }

  shouldHandle(record) {
    return record.level >= this.minLevel;
  }

  // eslint-disable-next-line no-unused-vars
  handle(record) {
    throw new Error('Transport.handle() must be implemented');
  }
}

const compact = value => {
  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
};

const isEmpty = obj =>
  !obj || (typeof obj === 'object' && Object.keys(obj).length === 0);

/**
 * Renders a record as a readable, multi-line block (development) — clean text,
 * no ANSI escapes (so it never shows up as garbage in the Metro terminal).
 */
export const formatPretty = record => {
  const glyph = LEVEL_GLYPHS[record.levelName] || '•';
  const head = `${glyph} ${record.levelName} ${record.time}  ${record.logger}${
    record.op ? ` › ${record.op}` : ''
  }${record.code ? `  [${record.code}]` : ''}`;

  const rows = [];
  if (record.message) rows.push(['message', record.message]);

  if (record.resource || record.action || record.providerCode) {
    const parts = [];
    if (record.resource) parts.push(record.resource);
    if (record.action) parts.push(`action=${record.action}`);
    if (record.providerCode) parts.push(`firebase=${record.providerCode}`);
    if (record.retryable) parts.push('retryable');
    rows.push(['resource', parts.join(' · ')]);
  }

  if (!isEmpty(record.context)) rows.push(['context', compact(record.context)]);

  const traceParts = [];
  if (record.traceId) traceParts.push(record.traceId);
  if (record.seq != null) traceParts.push(`#${record.seq}`);
  if (record.durationMs != null) traceParts.push(`${record.durationMs}ms`);
  if (traceParts.length) rows.push(['trace', traceParts.join(' · ')]);

  let out = head;
  for (const [label, value] of rows) {
    out += `\n   ${label.padEnd(9)}${value}`;
  }

  if (record.err && record.err.stack && record.level >= LEVELS.ERROR) {
    const stack = String(record.err.stack)
      .split('\n')
      .slice(0, 8)
      .map(l => `     ${l.trim()}`)
      .join('\n');
    out += `\n   stack\n${stack}`;
  }

  return out;
};

/** Renders a record as a single JSON line (production / log ingestion). */
export const formatJson = record => compact(record);

/**
 * ConsoleTransport — routes each record to the matching console method and
 * formats it prettily in dev, as JSON in production.
 */
export class ConsoleTransport extends BaseTransport {
  constructor({ minLevel, pretty = IS_DEV } = {}) {
    super({ minLevel });
    this.pretty = pretty;
  }

  handle(record) {
    const line = this.pretty ? formatPretty(record) : formatJson(record);
    if (record.level >= LEVELS.ERROR) {
      console.error(line);
    } else if (record.level >= LEVELS.WARN) {
      console.warn(line);
    } else if (record.level >= LEVELS.INFO) {
      console.info(line);
    } else {
      console.log(line);
    }
  }
}

/**
 * MemoryTransport — keeps the last N records in a ring buffer so they can be
 * attached to a crash report or exported for debugging ("what happened right
 * before this error?").
 */
export class MemoryTransport extends BaseTransport {
  constructor({ minLevel = LEVELS.DEBUG, capacity = 200 } = {}) {
    super({ minLevel });
    this.capacity = capacity;
    this.buffer = [];
  }

  handle(record) {
    this.buffer.push(record);
    if (this.buffer.length > this.capacity) {
      this.buffer.shift();
    }
  }

  /** Snapshot of buffered records (oldest first). */
  getRecords() {
    return [...this.buffer];
  }

  clear() {
    this.buffer = [];
  }
}

/**
 * RemoteTransport — pluggable sink for an external service (Sentry, Firebase
 * Crashlytics, a custom HTTP collector, …). No-op by default; provide a
 * `send(record)` function to wire one up without touching call sites.
 *
 *   logger.addTransport(new RemoteTransport({
 *     minLevel: LEVELS.WARN,
 *     send: (rec) => Sentry.captureMessage(rec.message, { extra: rec }),
 *   }));
 */
export class RemoteTransport extends BaseTransport {
  constructor({ minLevel = LEVELS.WARN, send = null } = {}) {
    super({ minLevel });
    this._send = send;
  }

  handle(record) {
    if (typeof this._send !== 'function') return; // no-op until wired
    try {
      // Redact again defensively before anything leaves the device.
      this._send(redact(record));
    } catch (_) {
      // A telemetry sink must never crash the app.
    }
  }
}
