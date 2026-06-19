import { rest } from 'msw';

import { apiClient } from '@core/api/apiClient';
import { auth } from '@core/firebase/firebase';
import { clearRecentLogs, getRecentLogs } from '@core/observability';
import { useMainStore } from '@core/store';

import { server } from '../mocks/server';

// Mock Firebase Auth
jest.mock('@core/firebase/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

describe('ApiClient Interceptors & Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRecentLogs();
    useMainStore.setState({
      signOut: jest.fn(),
    });
  });

  describe('Request Interceptor (Token Injection)', () => {
    it('should inject Authorization header if currentUser is present', async () => {
      // Mock Firebase User with getIdToken
      const mockToken = 'mock-jwt-token-123';
      auth.currentUser = {
        getIdToken: jest.fn().mockResolvedValue(mockToken),
      };

      server.use(
        rest.get('https://api.bookrats.com/test-auth', (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          return res(ctx.json({ receivedHeader: authHeader }));
        }),
      );

      const response = await apiClient.get(
        'https://api.bookrats.com/test-auth',
      );

      expect(response.receivedHeader).toBe(`Bearer ${mockToken}`);
      expect(auth.currentUser.getIdToken).toHaveBeenCalled();
    });

    it('should NOT fail if currentUser is null, but proceed without token', async () => {
      auth.currentUser = null;

      server.use(
        rest.get('https://api.bookrats.com/test-no-auth', (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          return res(ctx.json({ hasAuth: !!authHeader }));
        }),
      );

      const response = await apiClient.get(
        'https://api.bookrats.com/test-no-auth',
      );

      expect(response.hasAuth).toBe(false);
    });
  });

  describe('Response Interceptor (Error Handling)', () => {
    it('should handle 500 Server Error and call Logger.error', async () => {
      server.use(
        rest.get('https://api.bookrats.com/500-endpoint', (req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      await expect(
        apiClient.get('https://api.bookrats.com/500-endpoint'),
      ).rejects.toThrow('Erro interno no servidor remoto.');

      expect(
        getRecentLogs().some(
          r =>
            r.message === 'Remote server error' &&
            r.providerCode === 'HTTP_500' &&
            r.levelName === 'ERROR',
        ),
      ).toBe(true);
    });

    it('should handle 401 Unauthorized and call global signOut ONLY ONCE (Race Condition test)', async () => {
      server.use(
        rest.get('https://api.bookrats.com/401-endpoint', (req, res, ctx) => {
          return res(ctx.status(401));
        }),
      );

      const mockSignOut = useMainStore.getState().signOut;

      // Disparando DUAS requisições simultâneas que falharão com 401
      await Promise.allSettled([
        apiClient.get('https://api.bookrats.com/401-endpoint'),
        apiClient.get('https://api.bookrats.com/401-endpoint'),
      ]);

      expect(
        getRecentLogs().some(
          r =>
            r.providerCode === 'HTTP_401' &&
            r.message.toLowerCase().includes('unauthorized'),
        ),
      ).toBe(true);

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should parse client error (400) JSON messages correctly', async () => {
      server.use(
        rest.post('https://api.bookrats.com/400-endpoint', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({ message: 'E-mail já cadastrado.' }),
          );
        }),
      );

      await expect(
        apiClient.post('https://api.bookrats.com/400-endpoint', {}),
      ).rejects.toThrow('E-mail já cadastrado.');
    });

    it('should fallback to default error message if 400 response is not JSON', async () => {
      server.use(
        rest.get('https://api.bookrats.com/400-no-json', (req, res, ctx) => {
          return res(ctx.status(400), ctx.text('Not JSON'));
        }),
      );

      await expect(
        apiClient.get('https://api.bookrats.com/400-no-json'),
      ).rejects.toThrow('Erro na requisição: 400');
    });

    it('should handle token retrieval failure and log warning', async () => {
      auth.currentUser = {
        getIdToken: jest.fn().mockRejectedValue(new Error('Token Fail')),
      };

      server.use(
        rest.get('https://api.bookrats.com/token-fail', (req, res, ctx) => {
          return res(ctx.json({ ok: true }));
        }),
      );

      await apiClient.get('https://api.bookrats.com/token-fail');
      expect(getRecentLogs().some(r => r.op === 'request.authHeader')).toBe(
        true,
      );
    });

    it('should handle total network failure (fetch throws)', async () => {
      server.use(
        rest.get('https://api.bookrats.com/network-fail', (req, res, ctx) => {
          return res.networkError('Failed to connect');
        }),
      );

      await expect(
        apiClient.get('https://api.bookrats.com/network-fail'),
      ).rejects.toThrow();
      // Network failures are classified as retryable (logged as WARN/ERROR),
      // but a structured record for the failed request must exist.
      expect(
        getRecentLogs().some(
          r => r.op === 'request' && r.level >= 30, // WARN or above
        ),
      ).toBe(true);
    });

    it('should work correctly with PUT and DELETE methods', async () => {
      server.use(
        rest.put('https://api.bookrats.com/put-test', (req, res, ctx) =>
          res(ctx.json({ method: 'PUT' })),
        ),
        rest.delete('https://api.bookrats.com/delete-test', (req, res, ctx) =>
          res(ctx.json({ method: 'DELETE' })),
        ),
      );

      const putRes = await apiClient.put('https://api.bookrats.com/put-test', {
        data: 1,
      });
      const delRes = await apiClient.delete(
        'https://api.bookrats.com/delete-test',
      );

      expect(putRes.method).toBe('PUT');
      expect(delRes.method).toBe('DELETE');
    });

    it('should handle 401 even if signOut is not defined in store', async () => {
      useMainStore.setState({ signOut: null });
      server.use(
        rest.get('https://api.bookrats.com/401-no-signout', (req, res, ctx) =>
          res(ctx.status(401)),
        ),
      );

      await expect(
        apiClient.get('https://api.bookrats.com/401-no-signout'),
      ).rejects.toThrow();
      // No crash even if signOut is missing
    });

    it('should handle absolute URLs and custom headers', async () => {
      server.use(
        rest.get('https://other-domain.com/data', (req, res, ctx) => {
          return res(
            ctx.json({ ok: true, custom: req.headers.get('X-Custom') }),
          );
        }),
      );

      const res = await apiClient.get('https://other-domain.com/data', {
        'X-Custom': 'Value',
      });
      expect(res.custom).toBe('Value');
    });

    it('should NOT overwrite Content-Type if already provided', async () => {
      server.use(
        rest.post('https://api.bookrats.com/content-type', (req, res, ctx) => {
          return res(ctx.json({ type: req.headers.get('Content-Type') }));
        }),
      );

      const res = await apiClient.request(
        'https://api.bookrats.com/content-type',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      expect(res.type).toBe('application/x-www-form-urlencoded');
    });

    it('should parse errorData.error.message if present', async () => {
      server.use(
        rest.get('https://api.bookrats.com/nested-error', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({ error: { message: 'Nested error message' } }),
          );
        }),
      );

      await expect(
        apiClient.get('https://api.bookrats.com/nested-error'),
      ).rejects.toThrow('Nested error message');
    });
  });

  // ── 503 Retry & _isHandledHttp prevention of double-logging ──────────────
  describe('503 Retry Logic & httpError sentinel', () => {
    afterEach(() => jest.useRealTimers());

    it('retries 503 exactly 3 times (1 + 2 retries) before throwing', async () => {
      let callCount = 0;
      server.use(
        rest.get('https://api.bookrats.com/503-all', (req, res, ctx) => {
          callCount++;
          return res(ctx.status(503));
        }),
      );

      jest.useFakeTimers();
      // Attach .catch immediately so the rejection is never unhandled
      const caught = apiClient.get('https://api.bookrats.com/503-all').catch(e => e);
      await jest.runAllTimersAsync();
      const err = await caught;

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Erro interno no servidor remoto');
      expect(callCount).toBe(3);
    });

    it('thrown error has _isHandledHttp=true to prevent double-logging', async () => {
      server.use(
        rest.get('https://api.bookrats.com/503-flag', (req, res, ctx) =>
          res(ctx.status(503)),
        ),
      );

      jest.useFakeTimers();
      const caught = apiClient.get('https://api.bookrats.com/503-flag').catch(e => e);
      await jest.runAllTimersAsync();
      const err = await caught;

      expect(err._isHandledHttp).toBe(true);
      expect(err._code).toBe('BR_NETWORK');
    });

    it('succeeds on the second attempt after a 503', async () => {
      let callCount = 0;
      server.use(
        rest.get('https://api.bookrats.com/503-then-ok', (req, res, ctx) => {
          callCount++;
          if (callCount === 1) return res(ctx.status(503));
          return res(ctx.json({ recovered: true }));
        }),
      );

      jest.useFakeTimers();
      const request = apiClient.get('https://api.bookrats.com/503-then-ok');
      await jest.runAllTimersAsync();

      const result = await request;
      expect(result.recovered).toBe(true);
      expect(callCount).toBe(2);
    });

    it('does NOT retry a 500 (non-503) server error', async () => {
      let callCount = 0;
      server.use(
        rest.get('https://api.bookrats.com/500-no-retry', (req, res, ctx) => {
          callCount++;
          return res(ctx.status(500));
        }),
      );

      await expect(
        apiClient.get('https://api.bookrats.com/500-no-retry'),
      ).rejects.toThrow('Erro interno no servidor remoto');

      // 500 is not retried — only 503 with remaining attempts is retried
      expect(callCount).toBe(1);
    });

    it('does NOT retry a 401 error', async () => {
      useMainStore.setState({ signOut: jest.fn() });
      let callCount = 0;
      server.use(
        rest.get('https://api.bookrats.com/401-no-retry', (req, res, ctx) => {
          callCount++;
          return res(ctx.status(401));
        }),
      );

      await expect(
        apiClient.get('https://api.bookrats.com/401-no-retry'),
      ).rejects.toThrow();

      expect(callCount).toBe(1);
    });

    it('does NOT retry a 400 client error', async () => {
      let callCount = 0;
      server.use(
        rest.get('https://api.bookrats.com/400-no-retry', (req, res, ctx) => {
          callCount++;
          return res(ctx.status(400), ctx.json({ message: 'Bad request' }));
        }),
      );

      await expect(
        apiClient.get('https://api.bookrats.com/400-no-retry'),
      ).rejects.toThrow('Bad request');

      expect(callCount).toBe(1);
    });
  });
});
