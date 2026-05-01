/**
 * @typedef {Object} LogParams
 * @property {string} message - A mensagem a ser logada
 * @property {any} [error] - Objeto de erro original, se houver
 * @property {Record<string, any>} [context] - Dados adicionais de contexto (ex: ids, rota atual)
 */

class LoggerService {
  constructor() {
    this.isDevelopment = __DEV__;
  }

  /**
   * Log de Informações
   * @param {string} message 
   * @param {Record<string, any>} [context] 
   */
  info(message, context = {}) {
    if (this.isDevelopment) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, context);
    }
    // Em produção, logs de INFO geralmente não são enviados para não onerar rede/armazenamento
  }

  /**
   * Log de Avisos (Não-críticos)
   * @param {string} message 
   * @param {Record<string, any>} [context] 
   */
  warn(message, context = {}) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, context);
    } else {
      // TODO: Sentry.captureMessage(message, 'warning');
    }
  }

  /**
   * Log de Erros (Críticos)
   * @param {string} message 
   * @param {any} [error] 
   * @param {Record<string, any>} [context] 
   */
  error(message, error = null, context = {}) {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error, context);
    } else {
      // Produção: Relata o erro silenciosamente para o serviço de monitoramento
      // ex: Sentry.captureException(error, { extra: context, tags: { message } });
      
      // Fallback mínimo se o serviço falhar (não usar console.error puro para não vazar stack no logcat de prod)
    }
  }
}

export const Logger = new LoggerService();
