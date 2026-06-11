import { toUserMessage } from '@core/observability';

/**
 * Maps any Firebase/Firestore/app error to a friendly message (Portuguese).
 *
 * Backed by the central error catalog in `@core/observability` so the user
 * message stays consistent with the structured code/category used in logs.
 * Pure: it does not log (the logging happens at the failure call site).
 *
 * @param {Object} error - The error captured in a catch block.
 * @returns {string} - Friendly message ready for display.
 */
export const mapFirebaseError = error => toUserMessage(error);
