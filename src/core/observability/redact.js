/**
 * Redaction utilities — keep secrets and PII out of logs, in both dev and prod.
 *
 * This is intentionally conservative: anything that looks like a credential is
 * fully masked, and e-mails are partially masked so they remain useful for
 * correlation without leaking the full address.
 */

/** Keys whose values are always fully masked (case-insensitive). */
const SECRET_KEYS = new Set([
  'password',
  'pass',
  'pwd',
  'secret',
  'token',
  'idtoken',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'auth',
  'apikey',
  'api_key',
  'key',
  'credential',
  'sessionid',
  'cookie',
]);

/** Keys whose values are treated as e-mails and partially masked. */
const EMAIL_KEYS = new Set(['email', 'useremail', 'mail']);

const REDACTED = '«redacted»';
const MAX_DEPTH = 6;
const MAX_STRING = 2000;

/** Mask the local part of an e-mail: "thales@gmail.com" -> "t****@gmail.com". */
export const maskEmail = value => {
  if (typeof value !== 'string' || !value.includes('@')) return value;
  const [local, domain] = value.split('@');
  if (!local) return `***@${domain}`;
  return `${local[0]}***@${domain}`;
};

/** Mask credential-looking query params inside a string (e.g. a URL). */
const maskSecretsInString = str => {
  if (typeof str !== 'string') return str;
  let out = str.replace(
    /(key|apikey|api_key|auth|token|password)=([^&\s]{6,})/gi,
    '$1=«redacted»',
  );
  if (out.length > MAX_STRING) out = `${out.slice(0, MAX_STRING)}…[truncated]`;
  return out;
};

/**
 * Deep-clone `data` while masking sensitive keys, breaking cycles and capping
 * depth. Errors are normalized to a plain object so they survive serialization.
 */
export const redact = (data, depth = 0, seen = new WeakSet()) => {
  if (data == null) return data;

  if (typeof data === 'string') return maskSecretsInString(data);
  if (typeof data === 'number' || typeof data === 'boolean') return data;
  if (typeof data === 'function')
    return `[Function ${data.name || 'anonymous'}]`;
  if (typeof data === 'bigint') return data.toString();

  if (data instanceof Error) {
    return {
      name: data.name,
      message: maskSecretsInString(data.message),
      code: data.code,
      stack: data.stack,
    };
  }

  if (depth >= MAX_DEPTH) return '[depth-limit]';
  if (typeof data === 'object') {
    if (seen.has(data)) return '[circular]';
    seen.add(data);

    if (Array.isArray(data)) {
      return data.slice(0, 100).map(item => redact(item, depth + 1, seen));
    }

    const out = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      const lower = key.toLowerCase();
      if (SECRET_KEYS.has(lower)) {
        out[key] = REDACTED;
      } else if (EMAIL_KEYS.has(lower)) {
        out[key] = maskEmail(value);
      } else {
        out[key] = redact(value, depth + 1, seen);
      }
    }
    return out;
  }

  return data;
};
