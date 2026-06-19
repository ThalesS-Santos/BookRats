import { auth } from '@core/firebase/firebase';
import { createLogger } from '@core/observability';
import { useMainStore } from '@core/store';

const log = createLogger('core.api.client');

/**
 * Custom API Client wrapper over native fetch.
 * Centralizes network logic, authentication headers, and error handling.
 */
// Marks an error as already-logged so the catch block skips re-logging/retrying.
function httpError(message, code) {
  const err = new Error(message);
  err._isHandledHttp = true;
  err._code = code;
  return err;
}

class ApiClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseURL}${endpoint}`;

    // --- Request Interceptor ---
    const headers = new Headers(options.headers || {});

    try {
      // Fetch fresh token from Firebase Auth directly
      // Only append Authorization header for internal/protected requests
      // We skip it for public APIs like Google Books to avoid header conflicts
      const currentUser = auth.currentUser;
      const isExternalRequest = url.includes('googleapis.com');

      if (currentUser && !isExternalRequest) {
        const token = await currentUser.getIdToken();
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (e) {
      log.exception(e, {
        op: 'request.authHeader',
        action: 'token',
        level: 'WARN',
        context: { url },
      });
    }

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const config = {
      ...options,
      headers,
    };

    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const response = await fetch(url, config);

        // --- Response Interceptor ---
        if (!response.ok) {
          const status = response.status;

          // 1. Handle 401 / 403 (Unauthorized / Forbidden)
          if (status === 401 || status === 403) {
            log.warn('Unauthorized response — triggering logout', {
              op: 'request',
              action: 'http',
              resource: url,
              providerCode: `HTTP_${status}`,
              context: { url, status },
            });
            const { signOut } = useMainStore.getState();
            if (signOut) {
              await signOut();
            }
            throw httpError(
              'Sessão expirada ou acesso negado. Por favor, faça login novamente.',
              'BR_AUTH',
            );
          }

          // 2. Handle 500+ (Server Errors) — retry 503 with exponential backoff
          if (status >= 500) {
            if (status === 503 && attempt < maxRetries) {
              attempt++;
              const delay = Math.pow(2, attempt) * 500;
              log.warn('Service unavailable (503) — retrying', {
                op: 'request',
                action: 'http',
                resource: url,
                providerCode: 'HTTP_503',
                retryable: true,
                context: { url, attempt, delayMs: delay },
              });
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            log.error('Remote server error', {
              op: 'request',
              action: 'http',
              resource: url,
              code: 'BR_NETWORK',
              category: 'NETWORK',
              providerCode: `HTTP_${status}`,
              context: { url, status, attempts: attempt },
            });
            throw httpError(
              'Erro interno no servidor remoto. Tente novamente mais tarde.',
              'BR_NETWORK',
            );
          }

          // 3. Handle 400s (Client Errors)
          let errorMessage = `Erro na requisição: ${status}`;
          try {
            const errorData = await response.json();
            errorMessage =
              errorData.message || errorData.error?.message || errorMessage;
          } catch (_) {
            // Response is not JSON, fallback to standard message
          }

          throw httpError(errorMessage, 'BR_CLIENT');
        }

        // Success
        return await response.json();
      } catch (error) {
        // HTTP errors are already logged above — skip re-logging and retrying.
        if (error._isHandledHttp) {
          throw error;
        }
        // Pure network failures (fetch threw, no response): log once, then retry.
        if (attempt >= maxRetries) {
          log.exception(error, {
            op: 'request',
            action: 'http',
            resource: url,
            code: 'BR_NETWORK',
            context: { url, attempts: attempt },
          });
          throw error;
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  }

  put(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers,
    });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
