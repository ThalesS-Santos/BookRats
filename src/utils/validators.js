import { VALID_STATUSES } from '../core/constants/bookStatus';

// ─────────────────────────────────────────────────────────────────────────────
// 📏 Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum allowed length for Echo/annotation texts */
export const MAX_ECHO_TEXT_LENGTH = 500;

/** Maximum allowed length for group/book names */
export const MAX_NAME_LENGTH = 120;

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ Validators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that the given status is one of the accepted BOOK_STATUS values.
 *
 * @param {string} status
 * @throws {Error} if status is invalid
 */
export const validateStatus = status => {
  if (!status || !VALID_STATUSES.includes(status)) {
    throw new Error(
      `Status inválido: "${status}". Valores aceitos: ${VALID_STATUSES.join(', ')}.`,
    );
  }
};

/**
 * Validates page range logic:
 *  - currentPage must be >= 0
 *  - currentPage must not exceed totalPages
 *
 * @param {number} currentPage
 * @param {number} totalPages
 * @throws {Error} if page values are invalid
 */
export const validatePageRange = (currentPage, totalPages) => {
  const page = Number(currentPage);
  const total = Number(totalPages);

  if (Number.isNaN(page) || Number.isNaN(total)) {
    throw new Error(
      'Erro de validação: currentPage e totalPages devem ser números.',
    );
  }

  if (page < 0) {
    throw new Error('Erro de validação: A página atual não pode ser negativa.');
  }

  if (total > 0 && page > total) {
    throw new Error(
      `Erro de validação: A página atual (${page}) não pode ultrapassar o total de páginas (${total}).`,
    );
  }
};

/**
 * Validates the text for an Echo (annotation / reply).
 *  - Must be a non-empty string
 *  - Must not exceed MAX_ECHO_TEXT_LENGTH characters
 *
 * @param {string} text
 * @throws {Error} if text is invalid
 */
export const validateEchoText = text => {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new Error('Erro de validação: O texto do Echo é obrigatório.');
  }

  if (text.trim().length > MAX_ECHO_TEXT_LENGTH) {
    throw new Error(
      `Erro de validação: O texto do Echo não pode ultrapassar ${MAX_ECHO_TEXT_LENGTH} caracteres.`,
    );
  }
};

/**
 * Validates that a userId is a non-empty string, guarding against
 * accidental operations with null/undefined UIDs.
 *
 * @param {string} uid
 * @param {string} [context] - Optional context label for better error messages.
 * @throws {Error} if uid is falsy
 */
export const validateUserId = (uid, context = 'operação') => {
  if (!uid || typeof uid !== 'string' || uid.trim() === '') {
    throw new Error(
      `Erro de segurança: UID do usuário ausente ou inválido para ${context}.`,
    );
  }
};

/**
 * Validates that a document ID (bookId, echoId, etc.) is a non-empty string,
 * preventing update/delete operations on undefined references.
 *
 * @param {string} id
 * @param {string} [label] - Human-readable label for error messages.
 * @throws {Error} if id is falsy
 */
export const validateDocumentId = (id, label = 'documento') => {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error(`Erro de segurança: ID do ${label} ausente ou inválido.`);
  }
};

/**
 * Validates a friend request, ensuring sender and receiver are different users.
 *
 * @param {string} senderUid
 * @param {string} receiverUid
 * @throws {Error} if uids are equal or invalid
 */
export const validateFriendRequest = (senderUid, receiverUid) => {
  validateUserId(senderUid, 'envio de pedido de amizade');
  validateUserId(receiverUid, 'envio de pedido de amizade');

  if (senderUid === receiverUid) {
    throw new Error(
      'Erro de validação: Você não pode enviar um pedido de amizade para si mesmo.',
    );
  }
};

/**
 * Validates that the current user is the intended receiver of a friend request
 * before allowing an accept operation — preventing impersonation.
 *
 * @param {string} currentUserId - The authenticated user's UID.
 * @param {string} receiverId - The UID stored in the friendship document.
 * @throws {Error} if currentUserId does not match receiverId
 */
export const validateFriendRequestReceiver = (currentUserId, receiverId) => {
  if (currentUserId !== receiverId) {
    throw new Error(
      'Erro de segurança: Apenas o destinatário pode aceitar um pedido de amizade.',
    );
  }
};

/**
 * Validates that an update object does not contain protected / read-only fields.
 *
 * @param {object} updates - The updates object to check.
 * @param {string[]} forbiddenKeys - List of field names that must not be updated directly.
 * @throws {Error} if any forbidden key is found in updates
 */
export const validateUpdateFields = (updates, forbiddenKeys = []) => {
  if (!updates || typeof updates !== 'object') {
    throw new Error('Erro de validação: O objeto de atualização é inválido.');
  }

  const found = Object.keys(updates).filter(key => forbiddenKeys.includes(key));
  if (found.length > 0) {
    throw new Error(
      `Erro de segurança: Os campos "${found.join(', ')}" não podem ser atualizados diretamente.`,
    );
  }
};
