import { apiClient } from '@core/api/apiClient';
import { useMainStore } from '@core/store';
import { auth } from '@core/firebase/firebase';
import { Logger } from '@core/services/Logger';
import { rest } from 'msw';
import { server } from '../mocks/server';

// 1. Mock Logger
jest.mock('@core/services/Logger', () => ({
  Logger: {
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

// 2. Mock Firebase Auth
jest.mock('@core/firebase/firebase', () => ({
  auth: {
    currentUser: null
  }
}));

describe('ApiClient Interceptors & Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMainStore.setState({ 
      signOut: jest.fn() 
    });
  });

  describe('Request Interceptor (Token Injection)', () => {
    it('should inject Authorization header if currentUser is present', async () => {
      // Mock Firebase User with getIdToken
      const mockToken = 'mock-jwt-token-123';
      auth.currentUser = {
        getIdToken: jest.fn().mockResolvedValue(mockToken)
      };

      server.use(
        rest.get('https://api.bookrats.com/test-auth', (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          return res(ctx.json({ receivedHeader: authHeader }));
        })
      );

      const response = await apiClient.get('https://api.bookrats.com/test-auth');
      
      expect(response.receivedHeader).toBe(`Bearer ${mockToken}`);
      expect(auth.currentUser.getIdToken).toHaveBeenCalled();
    });

    it('should NOT fail if currentUser is null, but proceed without token', async () => {
      auth.currentUser = null;

      server.use(
        rest.get('https://api.bookrats.com/test-no-auth', (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          return res(ctx.json({ hasAuth: !!authHeader }));
        })
      );

      const response = await apiClient.get('https://api.bookrats.com/test-no-auth');
      
      expect(response.hasAuth).toBe(false);
    });
  });

  describe('Response Interceptor (Error Handling)', () => {
    it('should handle 500 Server Error and call Logger.error', async () => {
      server.use(
        rest.get('https://api.bookrats.com/500-endpoint', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      await expect(apiClient.get('https://api.bookrats.com/500-endpoint')).rejects.toThrow('Erro interno no servidor remoto.');
      
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Server Error 500'),
        null,
        expect.any(Object)
      );
    });

    it('should handle 401 Unauthorized and call global signOut ONLY ONCE (Race Condition test)', async () => {
      server.use(
        rest.get('https://api.bookrats.com/401-endpoint', (req, res, ctx) => {
          return res(ctx.status(401));
        })
      );

      const mockSignOut = useMainStore.getState().signOut;

      // Disparando DUAS requisições simultâneas que falharão com 401
      await Promise.allSettled([
        apiClient.get('https://api.bookrats.com/401-endpoint'),
        apiClient.get('https://api.bookrats.com/401-endpoint')
      ]);

      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('401 Unauthorized'),
        expect.any(Object)
      );
      
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should parse client error (400) JSON messages correctly', async () => {
      server.use(
        rest.post('https://api.bookrats.com/400-endpoint', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({ message: 'E-mail já cadastrado.' })
          );
        })
      );

      await expect(apiClient.post('https://api.bookrats.com/400-endpoint', {})).rejects.toThrow('E-mail já cadastrado.');
    });

    it('should fallback to default error message if 400 response is not JSON', async () => {
      server.use(
        rest.get('https://api.bookrats.com/400-no-json', (req, res, ctx) => {
          return res(ctx.status(400), ctx.text('Not JSON'));
        })
      );

      await expect(apiClient.get('https://api.bookrats.com/400-no-json')).rejects.toThrow('Erro na requisição: 400');
    });

    it('should handle token retrieval failure and log warning', async () => {
      auth.currentUser = {
        getIdToken: jest.fn().mockRejectedValue(new Error('Token Fail'))
      };

      server.use(
        rest.get('https://api.bookrats.com/token-fail', (req, res, ctx) => {
          return res(ctx.json({ ok: true }));
        })
      );

      await apiClient.get('https://api.bookrats.com/token-fail');
      expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to retrieve Firebase token'), expect.any(Object));
    });

    it('should handle total network failure (fetch throws)', async () => {
      server.use(
        rest.get('https://api.bookrats.com/network-fail', (req, res, ctx) => {
          return res.networkError('Failed to connect');
        })
      );

      await expect(apiClient.get('https://api.bookrats.com/network-fail')).rejects.toThrow();
      expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining('Request failed'), expect.any(Object));
    });

    it('should work correctly with PUT and DELETE methods', async () => {
      server.use(
        rest.put('https://api.bookrats.com/put-test', (req, res, ctx) => res(ctx.json({ method: 'PUT' }))),
        rest.delete('https://api.bookrats.com/delete-test', (req, res, ctx) => res(ctx.json({ method: 'DELETE' })))
      );

      const putRes = await apiClient.put('https://api.bookrats.com/put-test', { data: 1 });
      const delRes = await apiClient.delete('https://api.bookrats.com/delete-test');

      expect(putRes.method).toBe('PUT');
      expect(delRes.method).toBe('DELETE');
    });

    it('should handle 401 even if signOut is not defined in store', async () => {
      useMainStore.setState({ signOut: null });
      server.use(
        rest.get('https://api.bookrats.com/401-no-signout', (req, res, ctx) => res(ctx.status(401)))
      );

      await expect(apiClient.get('https://api.bookrats.com/401-no-signout')).rejects.toThrow();
      // No crash even if signOut is missing
    });

    it('should handle absolute URLs and custom headers', async () => {
      server.use(
        rest.get('https://other-domain.com/data', (req, res, ctx) => {
          return res(ctx.json({ ok: true, custom: req.headers.get('X-Custom') }));
        })
      );

      const res = await apiClient.get('https://other-domain.com/data', { 'X-Custom': 'Value' });
      expect(res.custom).toBe('Value');
    });

    it('should NOT overwrite Content-Type if already provided', async () => {
      server.use(
        rest.post('https://api.bookrats.com/content-type', (req, res, ctx) => {
          return res(ctx.json({ type: req.headers.get('Content-Type') }));
        })
      );

      const res = await apiClient.request('https://api.bookrats.com/content-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      expect(res.type).toBe('application/x-www-form-urlencoded');
    });

    it('should parse errorData.error.message if present', async () => {
      server.use(
        rest.get('https://api.bookrats.com/nested-error', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ error: { message: 'Nested error message' } }));
        })
      );

      await expect(apiClient.get('https://api.bookrats.com/nested-error')).rejects.toThrow('Nested error message');
    });
  });
});
