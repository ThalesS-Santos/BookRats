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
  });
});
