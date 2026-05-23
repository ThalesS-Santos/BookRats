import { MAX_ECHO_TEXT_LENGTH, MAX_NAME_LENGTH } from './validators';

// ─────────────────────────────────────────────────────────────────────────────
// 🧹 Sanitizers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitizes a generic text string:
 *  1. Converts to string (safety)
 *  2. Trims leading/trailing whitespace
 *  3. Collapses multiple consecutive spaces/newlines into a single space
 *  4. Truncates to the given maxLength
 *
 * @param {string} text - Raw user input.
 * @param {number} [maxLength=MAX_ECHO_TEXT_LENGTH] - Maximum allowed length.
 * @returns {string} Sanitized text.
 */
export const sanitizeText = (text, maxLength = MAX_ECHO_TEXT_LENGTH) => {
  if (text === null || text === undefined) return '';

  const str = String(text)
    .trim()
    .replace(/\s{2,}/g, ' '); // collapse consecutive whitespace

  return str.slice(0, maxLength);
};

/**
 * Sanitizes a short name (group name, book title override, etc.):
 *  1. Trims
 *  2. Collapses multiple spaces
 *  3. Truncates to MAX_NAME_LENGTH
 *
 * @param {string} name - Raw name input.
 * @returns {string} Sanitized name.
 */
export const sanitizeName = name => {
  return sanitizeText(name, MAX_NAME_LENGTH);
};

/**
 * Sanitizes a username for storage:
 *  1. Converts to lowercase
 *  2. Trims
 *  3. Removes all characters that are not alphanumeric, dots, underscores, or hyphens
 *  4. Truncates to 30 characters
 *
 * @param {string} username - Raw username input.
 * @returns {string} Sanitized username.
 */
export const sanitizeUsername = username => {
  if (!username) return '';

  return String(username)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 30);
};

/**
 * Sanitizes Echo/annotation text:
 *  - Same as sanitizeText but uses the echo-specific max length.
 *
 * @param {string} text - Raw echo text.
 * @returns {string} Sanitized echo text.
 */
export const sanitizeEchoText = text => {
  return sanitizeText(text, MAX_ECHO_TEXT_LENGTH);
};
