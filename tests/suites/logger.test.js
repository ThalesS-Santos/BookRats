describe('Centralized Logger Service', () => {
  let Logger;

  beforeEach(() => {
    jest.resetModules(); // Clears cache so we can re-evaluate the module with different __DEV__ values
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  describe('Development Environment (__DEV__ = true)', () => {
    beforeEach(() => {
      global.__DEV__ = true;
      Logger = require('@core/services/Logger').Logger;
    });

    it('should output info logs to console.log', () => {
      Logger.info('Test info', { userId: 123 });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        { userId: 123 },
      );
    });

    it('should output warnings to console.warn', () => {
      Logger.warn('Test warning');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        {},
      );
    });

    it('should output errors to console.error', () => {
      const errorObj = new Error('test error');
      Logger.error('Test error msg', errorObj, { meta: true });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        errorObj,
        { meta: true },
      );
    });

    it('should handle default parameters for info and error', () => {
      Logger.info('Simple info');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        {},
      );

      Logger.error('Simple error');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        null,
        {},
      );
    });
  });

  describe('Production Environment (__DEV__ = false)', () => {
    beforeEach(() => {
      global.__DEV__ = false;
      Logger = require('@core/services/Logger').Logger;
    });

    it('should silence info logs (No PII leak)', () => {
      Logger.info('User PII data', { email: 'test@email.com' });
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should silence warnings from console', () => {
      Logger.warn('Test warning', { id: 1 });
      expect(console.warn).not.toHaveBeenCalled();
      // Em um cenário real, aqui verificaríamos a chamada para Sentry.captureMessage
    });

    it('should silence errors from console', () => {
      Logger.error('Critical failure', new Error(), { token: '12345' });
      expect(console.error).not.toHaveBeenCalled();
      // Em um cenário real, aqui verificaríamos a chamada para Sentry.captureException
    });
  });
});
