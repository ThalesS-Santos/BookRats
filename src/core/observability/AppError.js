import { classifyError, CATEGORY } from './errorCatalog';

/**
 * AppError — a structured, identifiable error used across BookRats.
 *
 * Crucially, `error.message` stays equal to the friendly user-facing message,
 * so existing UI (popups reading `error.message`) keeps working unchanged.
 * The structured details ride along as properties for logging/telemetry:
 *
 *   code         stable BookRats code (e.g. BR_FIRESTORE_PERMISSION_DENIED)
 *   category     AUTH | FIRESTORE | FUNCTIONS | STORAGE | NETWORK | VALIDATION | ...
 *   op           the function/operation that failed (e.g. 'updateBookProgress')
 *   action       the verb (read | write | update | delete | query | transaction | ...)
 *   resource     the resource path (e.g. 'users/{uid}/books/{bookId}')
 *   providerCode the raw Firebase code (e.g. 'permission-denied')
 *   context      extra structured fields (redacted at log time)
 *   cause        the original error
 *   retryable    whether retrying might succeed
 */
export class AppError extends Error {
  constructor({
    message,
    userMessage,
    code,
    category,
    op,
    action,
    resource,
    providerCode,
    context,
    cause,
    retryable,
    severity,
  } = {}) {
    // `message` (the public one) is the friendly text the UI shows.
    super(userMessage || message || 'Erro inesperado.');
    this.name = 'AppError';
    this.code = code || 'BR_UNKNOWN';
    this.category = category || CATEGORY.UNKNOWN;
    this.userMessage = userMessage || this.message;
    this.technicalMessage = message || (cause && cause.message) || this.message;
    this.op = op || null;
    this.action = action || null;
    this.resource = resource || null;
    this.providerCode = providerCode || (cause && cause.code) || null;
    this.context = context || {};
    this.cause = cause || null;
    this.retryable = !!retryable;
    this.severity = severity || 'ERROR';
    this.isAppError = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
    // Preserve the original stack when wrapping so the true origin survives.
    if (cause && cause.stack) {
      this.causeStack = cause.stack;
    }
  }

  /** Structured representation for transports / remote sinks. */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      op: this.op,
      action: this.action,
      resource: this.resource,
      providerCode: this.providerCode,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      retryable: this.retryable,
      severity: this.severity,
    };
  }

  /**
   * Wrap any thrown value into an AppError, enriching it with the operation
   * context (op/action/resource) and the classified code/category/message.
   * If `error` is already an AppError, its context is merged and returned.
   *
   * @param {*} error
   * @param {{op?:string, action?:string, resource?:string, category?:string, context?:object, userMessage?:string}} [meta]
   * @returns {AppError}
   */
  static from(error, meta = {}) {
    if (error instanceof AppError) {
      // Enrich an already-structured error with any newly-known context.
      if (meta.op && !error.op) error.op = meta.op;
      if (meta.action && !error.action) error.action = meta.action;
      if (meta.resource && !error.resource) error.resource = meta.resource;
      if (meta.context) error.context = { ...error.context, ...meta.context };
      return error;
    }

    const descriptor = classifyError(error);
    return new AppError({
      message: error && error.message ? error.message : String(error),
      userMessage: meta.userMessage || descriptor.userMessage,
      code: meta.code || descriptor.code,
      category: meta.category || descriptor.category,
      op: meta.op,
      action: meta.action,
      resource: meta.resource,
      providerCode: descriptor.providerCode,
      context: meta.context,
      cause: error instanceof Error ? error : undefined,
      retryable: descriptor.retryable,
      severity: descriptor.severity,
    });
  }
}

export default AppError;
