/**
 * Error catalog — the single source of truth that turns a raw provider error
 * (Firebase Auth, Firestore, Cloud Functions, Storage, network) into a stable,
 * identifiable BookRats error: a code, a category, a user-facing message, a
 * retryable flag and a severity.
 *
 * This is what answers "we know it's Firebase, but WHERE/WHAT?": every failure
 * resolves to a precise `BR_*` code plus the provider's own code.
 */

export const CATEGORY = Object.freeze({
  AUTH: 'AUTH',
  FIRESTORE: 'FIRESTORE',
  FUNCTIONS: 'FUNCTIONS',
  STORAGE: 'STORAGE',
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  RATE_LIMIT: 'RATE_LIMIT',
  UNKNOWN: 'UNKNOWN',
});

// descriptor: { code, category, userMessage, retryable, severity }
const D = (
  code,
  category,
  userMessage,
  retryable = false,
  severity = 'ERROR',
) => ({
  code,
  category,
  userMessage,
  retryable,
  severity,
});

const GENERIC_USER_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente.';

/**
 * Maps a provider error code (the `error.code` string) to a descriptor.
 * Keys are the raw codes Firebase emits.
 */
const REGISTRY = {
  // ---- Firebase Auth ----
  'auth/network-request-failed': D(
    'BR_AUTH_NETWORK',
    CATEGORY.NETWORK,
    'Erro de conexão. Verifique sua internet.',
    true,
    'WARN',
  ),
  'auth/user-not-found': D(
    'BR_AUTH_INVALID_CREDENTIALS',
    CATEGORY.AUTH,
    'E-mail não cadastrado ou senha incorreta. Se não tem uma conta, cadastre-se!',
  ),
  'auth/wrong-password': D(
    'BR_AUTH_INVALID_CREDENTIALS',
    CATEGORY.AUTH,
    'E-mail não cadastrado ou senha incorreta. Se não tem uma conta, cadastre-se!',
  ),
  'auth/invalid-credential': D(
    'BR_AUTH_INVALID_CREDENTIALS',
    CATEGORY.AUTH,
    'E-mail não cadastrado ou senha incorreta. Se não tem uma conta, cadastre-se!',
  ),
  'auth/invalid-email': D(
    'BR_AUTH_INVALID_EMAIL',
    CATEGORY.AUTH,
    'E-mail inválido.',
  ),
  'auth/email-already-in-use': D(
    'BR_AUTH_EMAIL_IN_USE',
    CATEGORY.AUTH,
    'Este e-mail já está em uso.',
  ),
  'auth/weak-password': D(
    'BR_AUTH_WEAK_PASSWORD',
    CATEGORY.AUTH,
    'A senha é muito fraca.',
  ),
  'auth/user-disabled': D(
    'BR_AUTH_USER_DISABLED',
    CATEGORY.AUTH,
    'Esta conta foi desativada.',
  ),
  'auth/too-many-requests': D(
    'BR_AUTH_TOO_MANY_REQUESTS',
    CATEGORY.RATE_LIMIT,
    'Muitas tentativas. Aguarde um momento e tente novamente.',
    true,
    'WARN',
  ),
  'auth/requires-recent-login': D(
    'BR_AUTH_REQUIRES_RECENT_LOGIN',
    CATEGORY.AUTH,
    'Por segurança, faça login novamente para continuar.',
  ),

  // ---- Firestore (gRPC status codes) ----
  'permission-denied': D(
    'BR_FIRESTORE_PERMISSION_DENIED',
    CATEGORY.FIRESTORE,
    'Você não tem permissão para realizar esta ação.',
  ),
  unauthenticated: D(
    'BR_FIRESTORE_UNAUTHENTICATED',
    CATEGORY.AUTH,
    'Usuário não autenticado. Por favor, faça login novamente.',
  ),
  unavailable: D(
    'BR_FIRESTORE_UNAVAILABLE',
    CATEGORY.NETWORK,
    'O serviço está temporariamente indisponível. Verifique sua conexão.',
    true,
    'WARN',
  ),
  'not-found': D(
    'BR_FIRESTORE_NOT_FOUND',
    CATEGORY.FIRESTORE,
    'O recurso solicitado não foi encontrado.',
  ),
  'already-exists': D(
    'BR_FIRESTORE_ALREADY_EXISTS',
    CATEGORY.FIRESTORE,
    'Este item já existe.',
  ),
  'failed-precondition': D(
    'BR_FIRESTORE_FAILED_PRECONDITION',
    CATEGORY.FIRESTORE,
    'Não foi possível completar a operação (índice ausente ou pré-condição não atendida).',
  ),
  aborted: D(
    'BR_FIRESTORE_ABORTED',
    CATEGORY.FIRESTORE,
    'A operação foi interrompida por um conflito. Tente novamente.',
    true,
    'WARN',
  ),
  'deadline-exceeded': D(
    'BR_FIRESTORE_DEADLINE_EXCEEDED',
    CATEGORY.NETWORK,
    'Tempo limite da operação excedido. Tente novamente.',
    true,
    'WARN',
  ),
  cancelled: D(
    'BR_FIRESTORE_CANCELLED',
    CATEGORY.FIRESTORE,
    'A operação foi cancelada.',
    true,
    'WARN',
  ),
  'invalid-argument': D(
    'BR_FIRESTORE_INVALID_ARGUMENT',
    CATEGORY.VALIDATION,
    'Dados inválidos enviados ao servidor.',
  ),
  'out-of-range': D(
    'BR_FIRESTORE_OUT_OF_RANGE',
    CATEGORY.VALIDATION,
    'Valor fora do intervalo permitido.',
  ),
  internal: D(
    'BR_FIRESTORE_INTERNAL',
    CATEGORY.FIRESTORE,
    'Erro interno do servidor. Tente novamente mais tarde.',
    true,
  ),
  'data-loss': D(
    'BR_FIRESTORE_DATA_LOSS',
    CATEGORY.FIRESTORE,
    'Erro grave de dados. Tente novamente mais tarde.',
    false,
    'FATAL',
  ),
  'resource-exhausted': D(
    'BR_FIRESTORE_RESOURCE_EXHAUSTED',
    CATEGORY.RATE_LIMIT,
    'Limite de uso atingido. Tente novamente mais tarde.',
    true,
    'WARN',
  ),
  'firestore/resource-exhausted': D(
    'BR_FIRESTORE_QUOTA_EXCEEDED',
    CATEGORY.RATE_LIMIT,
    'Limite diário atingido. Tente novamente amanhã.',
    false,
    'WARN',
  ),

  // ---- Cloud Functions ----
  'functions/quota-exceeded': D(
    'BR_FUNCTIONS_QUOTA_EXCEEDED',
    CATEGORY.RATE_LIMIT,
    'Limite diário atingido. Tente novamente amanhã.',
    false,
    'WARN',
  ),
  'functions/deadline-exceeded': D(
    'BR_FUNCTIONS_DEADLINE_EXCEEDED',
    CATEGORY.NETWORK,
    'Tempo limite excedido. Tente novamente.',
    true,
    'WARN',
  ),
  'functions/unavailable': D(
    'BR_FUNCTIONS_UNAVAILABLE',
    CATEGORY.NETWORK,
    'O serviço está temporariamente indisponível.',
    true,
    'WARN',
  ),

  // ---- Cloud Storage ----
  'storage/unauthorized': D(
    'BR_STORAGE_UNAUTHORIZED',
    CATEGORY.STORAGE,
    'Você não tem permissão para acessar este arquivo.',
  ),
  'storage/canceled': D(
    'BR_STORAGE_CANCELED',
    CATEGORY.STORAGE,
    'Upload cancelado.',
    true,
    'WARN',
  ),
  'storage/quota-exceeded': D(
    'BR_STORAGE_QUOTA_EXCEEDED',
    CATEGORY.RATE_LIMIT,
    'Limite de armazenamento atingido.',
    false,
    'WARN',
  ),
  'storage/retry-limit-exceeded': D(
    'BR_STORAGE_RETRY_LIMIT',
    CATEGORY.NETWORK,
    'Falha ao enviar o arquivo. Verifique sua conexão.',
    true,
    'WARN',
  ),
};

export const UNKNOWN_DESCRIPTOR = D(
  'BR_UNKNOWN',
  CATEGORY.UNKNOWN,
  GENERIC_USER_MESSAGE,
);

const VALIDATION_DESCRIPTOR = D(
  'BR_VALIDATION',
  CATEGORY.VALIDATION,
  'Dados inválidos. Verifique as informações.',
  false,
  'WARN',
);

const NETWORK_DESCRIPTOR = D(
  'BR_NETWORK',
  CATEGORY.NETWORK,
  'Erro de conexão. Verifique sua internet.',
  true,
  'WARN',
);

/** Look up a descriptor by a raw provider code. Returns null if unknown. */
export const lookupByCode = code => (code ? REGISTRY[code] || null : null);

/**
 * Classify ANY thrown value into a descriptor. Inspects `error.code` first,
 * then falls back to message heuristics (network/validation), then UNKNOWN.
 *
 * @param {*} error
 * @returns {{code:string, category:string, userMessage:string, retryable:boolean, severity:string, providerCode: (string|null)}}
 */
export const classifyError = error => {
  const providerCode = error && error.code ? String(error.code) : null;

  const byCode = lookupByCode(providerCode);
  if (byCode) return { ...byCode, providerCode };

  const message = (error && (error.message || error.toString?.())) || '';
  const lower = String(message).toLowerCase();

  if (
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('failed to fetch') ||
    lower.includes('econnreset') ||
    lower.includes('offline')
  ) {
    return { ...NETWORK_DESCRIPTOR, providerCode };
  }

  if (
    lower.includes('validação') ||
    lower.includes('validation') ||
    lower.includes('inválid') ||
    lower.includes('invalid') ||
    lower.includes('obrigatóri') ||
    lower.includes('required')
  ) {
    return { ...VALIDATION_DESCRIPTOR, providerCode };
  }

  return { ...UNKNOWN_DESCRIPTOR, providerCode };
};

/** Convenience used by the UI layer: a friendly message for any error. */
export const toUserMessage = error => classifyError(error).userMessage;
