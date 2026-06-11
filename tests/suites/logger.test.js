import {
  createLogger,
  getRecentLogs,
  clearRecentLogs,
  AppError,
  classifyError,
  toUserMessage,
  redact,
  maskEmail,
  LEVELS,
} from '@core/observability';
import { Logger as LegacyLogger } from '@core/services/Logger';

describe('Observability System', () => {
  beforeEach(() => {
    clearRecentLogs();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Structured records', () => {
    it('captures namespace, op, resource and context in the record', () => {
      const log = createLogger('core.api.test');
      log.error('Something broke', {
        op: 'doThing',
        action: 'update',
        resource: 'users/u1/books/b1',
        context: { uid: 'u1', bookId: 'b1' },
      });

      const rec = getRecentLogs().at(-1);
      expect(rec.logger).toBe('core.api.test');
      expect(rec.op).toBe('doThing');
      expect(rec.action).toBe('update');
      expect(rec.resource).toBe('users/u1/books/b1');
      expect(rec.levelName).toBe('ERROR');
      expect(rec.context).toEqual(
        expect.objectContaining({ uid: 'u1', bookId: 'b1' }),
      );
      expect(rec.seq).toEqual(expect.any(Number));
      expect(rec.ts).toEqual(expect.any(String));
    });

    it('routes ERROR records to console.error and WARN to console.warn', () => {
      const log = createLogger('routing.test');
      log.error('err msg');
      log.warn('warn msg');

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(String(console.error.mock.calls[0][0])).toContain('err msg');
      expect(String(console.warn.mock.calls[0][0])).toContain('warn msg');
    });

    it('child loggers extend the namespace and bound context', () => {
      const parent = createLogger('parent', { traceId: 'trace-1' });
      const child = parent.child('child', { requestId: 'req-9' });

      child.info('hello');
      const rec = getRecentLogs().at(-1);
      expect(rec.logger).toBe('parent.child');
      expect(rec.traceId).toBe('trace-1');
      expect(rec.context).toEqual(
        expect.objectContaining({ requestId: 'req-9' }),
      );
    });

    it('respects the minimum level gate', () => {
      const log = createLogger('gated').setMinLevel(LEVELS.ERROR);
      log.info('should be dropped');
      log.error('should pass');

      const messages = getRecentLogs().map(r => r.message);
      expect(messages).not.toContain('should be dropped');
      expect(messages).toContain('should pass');
    });
  });

  describe('failure() — classify, log and return a throwable AppError', () => {
    it('maps a Firebase code to a stable BR_* code and friendly message', () => {
      const log = createLogger('failure.test');
      const raw = Object.assign(
        new Error('Missing or insufficient permissions'),
        {
          code: 'permission-denied',
        },
      );

      const appErr = log.failure(raw, {
        op: 'updateBook',
        action: 'update',
        resource: 'users/u1/books/b1',
      });

      expect(appErr).toBeInstanceOf(AppError);
      expect(appErr.code).toBe('BR_FIRESTORE_PERMISSION_DENIED');
      expect(appErr.category).toBe('FIRESTORE');
      expect(appErr.providerCode).toBe('permission-denied');
      // UI-facing message stays friendly (popup-compatible).
      expect(appErr.message).toBe(
        'Você não tem permissão para realizar esta ação.',
      );
      expect(appErr.op).toBe('updateBook');
      expect(appErr.resource).toBe('users/u1/books/b1');
      expect(appErr.cause).toBe(raw);

      const rec = getRecentLogs().at(-1);
      expect(rec.code).toBe('BR_FIRESTORE_PERMISSION_DENIED');
      expect(rec.resource).toBe('users/u1/books/b1');
    });

    it('keeps an existing AppError intact (no double wrapping)', () => {
      const log = createLogger('failure.test');
      const first = log.failure(new Error('boom'), { op: 'first' });
      const second = AppError.from(first, { op: 'second' });
      expect(second).toBe(first);
      expect(second.op).toBe('first'); // original op preserved
    });
  });

  describe('Error catalog', () => {
    it('classifies known auth codes', () => {
      const d = classifyError({ code: 'auth/weak-password', message: 'x' });
      expect(d.code).toBe('BR_AUTH_WEAK_PASSWORD');
      expect(d.category).toBe('AUTH');
    });

    it('falls back to network heuristics from the message', () => {
      const d = classifyError(new Error('Network request timeout'));
      expect(d.code).toBe('BR_NETWORK');
      expect(d.retryable).toBe(true);
    });

    it('returns the generic message for unknown errors', () => {
      expect(toUserMessage(new Error('???'))).toBe(
        'Ocorreu um erro inesperado. Tente novamente.',
      );
    });
  });

  describe('Redaction (no secrets/PII in logs)', () => {
    it('masks secret-looking keys and partial-masks e-mails', () => {
      const out = redact({
        password: 'hunter2',
        token: 'abc123def',
        email: 'thales@gmail.com',
        safe: 'keep-me',
      });
      expect(out.password).toBe('«redacted»');
      expect(out.token).toBe('«redacted»');
      expect(out.email).toBe('t***@gmail.com');
      expect(out.safe).toBe('keep-me');
    });

    it('masks credentials embedded in URLs', () => {
      const out = redact('https://api.test.com/v1?key=SUPERSECRETKEY123&x=1');
      expect(out).not.toContain('SUPERSECRETKEY123');
      expect(out).toContain('key=«redacted»');
    });

    it('survives circular references', () => {
      const obj = { a: 1 };
      obj.self = obj;
      expect(() => redact(obj)).not.toThrow();
      expect(redact(obj).self).toBe('[circular]');
    });

    it('maskEmail handles plain strings', () => {
      expect(maskEmail('someone@test.com')).toBe('s***@test.com');
      expect(maskEmail('not-an-email')).toBe('not-an-email');
    });
  });

  describe('Legacy Logger shim (backwards compatibility)', () => {
    it('Logger.error(message, error, context) routes into the pipeline', () => {
      LegacyLogger.error('Old style call', new Error('legacy boom'), {
        extra: 1,
      });

      const rec = getRecentLogs().at(-1);
      expect(rec.logger).toBe('legacy');
      expect(rec.levelName).toBe('ERROR');
      expect(rec.context).toEqual(expect.objectContaining({ extra: 1 }));
    });

    it('Logger.warn and Logger.info still work', () => {
      LegacyLogger.warn('legacy warn', { a: 1 });
      LegacyLogger.info('legacy info', { b: 2 });

      const names = getRecentLogs().map(r => r.levelName);
      expect(names).toContain('WARN');
      expect(names).toContain('INFO');
    });

    it('legacy context with secrets is redacted', () => {
      LegacyLogger.error('with secret', null, { apiKey: 'SECRET_VALUE_12345' });
      const rec = getRecentLogs().at(-1);
      expect(JSON.stringify(rec)).not.toContain('SECRET_VALUE_12345');
    });
  });
});
