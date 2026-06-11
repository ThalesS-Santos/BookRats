import { auth } from '@core/firebase/firebase';
import { createLogger } from '@core/observability';
import { useMainStore } from '@core/store';

const log = createLogger('core.api.client');

/**
 * Custom API Client wrapper over native fetch.
 * Centralizes network logic, authentication headers, and error handling.
 */
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
            throw new Error(
              'Sessão expirada ou acesso negado. Por favor, faça login novamente.',
            );
          }

          // 2. Handle 500+ (Server Errors) - Specific Retry for 503
          if (status >= 500) {
            if (status === 503 && attempt < maxRetries) {
              attempt++;
              const delay = Math.pow(2, attempt) * 500; // Exponential backoff
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
              context: { url, status },
            });
            throw new Error(
              'Erro interno no servidor remoto. Tente novamente mais tarde.',
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

          throw new Error(errorMessage);
        }

        // Success
        return await response.json();
      } catch (error) {
        if (attempt >= maxRetries) {
          log.exception(error, {
            op: 'request',
            action: 'http',
            resource: url,
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
