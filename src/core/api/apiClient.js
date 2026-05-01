import { useMainStore } from '@core/store';
import { auth } from '@core/firebase/firebase';
import { Logger } from '@core/services/Logger';

/**
 * Custom API Client wrapper over native fetch.
 * Centralizes network logic, authentication headers, and error handling.
 */
class ApiClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    // --- Request Interceptor ---
    const headers = new Headers(options.headers || {});
    
    try {
      // Fetch fresh token from Firebase Auth directly
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (e) {
      Logger.warn('Failed to retrieve Firebase token', { error: e });
    }

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      // --- Response Interceptor ---
      if (!response.ok) {
        const status = response.status;

        // 1. Handle 401 / 403 (Unauthorized / Forbidden)
        if (status === 401 || status === 403) {
          Logger.warn(`${status} Unauthorized. Triggering logout...`, { url });
          const { signOut } = useMainStore.getState();
          if (signOut) {
            await signOut();
          }
          throw new Error('Sessão expirada ou acesso negado. Por favor, faça login novamente.');
        }

        // 2. Handle 500+ (Server Errors)
        if (status >= 500) {
          Logger.error(`Server Error ${status} on ${url}`, null, { url, status });
          throw new Error('Erro interno no servidor remoto. Tente novamente mais tarde.');
        }

        // 3. Handle 400s (Client Errors)
        let errorMessage = `Erro na requisição: ${status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error?.message || errorMessage;
        } catch (_) {
          // Response is not JSON, fallback to standard message
        }
        
        throw new Error(errorMessage);
      }

      // Success
      return await response.json();

    } catch (error) {
      Logger.error(`Request failed: ${url}`, error);
      throw error; // Propagate the standardized error
    }
  }

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body), headers });
  }

  put(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body), headers });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
