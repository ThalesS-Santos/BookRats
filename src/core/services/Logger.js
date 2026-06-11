/**
 * Backwards-compatible Logger facade.
 *
 * The real implementation now lives in `@core/observability`. This shim keeps
 * the historical `Logger.info/warn/error(message, error?, context?)` signature
 * working for call sites that haven't been migrated yet — every call is routed
 * into the new structured pipeline.
 *
 * New code should prefer:  import { createLogger } from '@core/observability';
 */
import { createLogger } from '@core/observability';
import { redact } from '@core/observability/redact';

const legacy = createLogger('legacy');

/** Normalize a loose 2nd/3rd argument into { err, context }. */
const coerce = (a, b) => {
  let err;
  let context = {};

  const absorb = value => {
    if (value == null) return;
    if (value instanceof Error) {
      err = value;
    } else if (typeof value === 'object') {
      context = { ...context, ...value };
    } else {
      // Primitive extra (e.g. a uid string or error.message)
      context = { ...context, detail: value };
    }
  };

  absorb(a);
  absorb(b);
  return { err, context };
};

export const Logger = {
  /** Exposed for legacy callers that used Logger.sanitize directly. */
  sanitize: redact,

  info(message, context = {}) {
    legacy.info(message, { op: 'legacy', context });
  },

  warn(message, context = {}) {
    const { err, context: ctx } = coerce(context);
    if (err) {
      legacy.exception(err, {
        op: 'legacy',
        level: 'WARN',
        message,
        context: ctx,
      });
    } else {
      legacy.warn(message, { op: 'legacy', context: ctx });
    }
  },

  error(message, error, context) {
    const { err, context: ctx } = coerce(error, context);
    if (err) {
      legacy.exception(err, { op: 'legacy', message, context: ctx });
    } else {
      legacy.error(message, { op: 'legacy', context: ctx });
    }
  },
};

export default Logger;
