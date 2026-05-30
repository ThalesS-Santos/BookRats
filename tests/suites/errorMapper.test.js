import { mapFirebaseError } from '@utils/errorMapper';

describe('Error Mapper Utility', () => {
  const authCases = [
    ['auth/network-request-failed', 'Erro de conexão. Verifique sua internet.'],
    [
      'auth/user-not-found',
      'E-mail não cadastrado ou senha incorreta. Se não tem uma conta, cadastre-se!',
    ],
    [
      'auth/wrong-password',
      'E-mail não cadastrado ou senha incorreta. Se não tem uma conta, cadastre-se!',
    ],
    ['auth/email-already-in-use', 'Este e-mail já está em uso.'],
    ['auth/invalid-email', 'E-mail inválido.'],
    ['auth/weak-password', 'A senha é muito fraca.'],
    ['auth/user-disabled', 'Esta conta foi desativada.'],
  ];

  const firestoreCases = [
    ['permission-denied', 'Você não tem permissão para realizar esta ação.'],
    [
      'unauthenticated',
      'Usuário não autenticado. Por favor, faça login novamente.',
    ],
    [
      'unavailable',
      'O serviço está temporariamente indisponível. Verifique sua conexão.',
    ],
    ['not-found', 'O recurso solicitado não foi encontrado.'],
    ['already-exists', 'Este item já existe.'],
    [
      'resource-exhausted',
      'Limite de uso atingido. Tente novamente mais tarde.',
    ],
    [
      'deadline-exceeded',
      'Tempo limite da operação excedido. Tente novamente.',
    ],
  ];

  const quotaCases = [
    [
      'firestore/resource-exhausted',
      'Limite diário atingido. Tente novamente amanhã.',
    ],
    [
      'functions/quota-exceeded',
      'Limite diário atingido. Tente novamente amanhã.',
    ],
  ];

  describe('Auth Error Mapping', () => {
    test.each(authCases)(
      'should map %s to Brazilian Portuguese',
      (code, expected) => {
        expect(mapFirebaseError({ code })).toBe(expected);
      },
    );
  });

  describe('Firestore Error Mapping', () => {
    test.each(firestoreCases)(
      'should map %s to Brazilian Portuguese',
      (code, expected) => {
        expect(mapFirebaseError({ code })).toBe(expected);
      },
    );
  });

  describe('Quota & Other Error Mapping', () => {
    test.each(quotaCases)(
      'should map %s to Brazilian Portuguese',
      (code, expected) => {
        expect(mapFirebaseError({ code })).toBe(expected);
      },
    );
  });

  describe('The Fallback Protocol (Safety First)', () => {
    it('should return the default message for unknown codes (e.g., random string)', () => {
      const result = mapFirebaseError({ code: 'error/internal-kaboom' });
      expect(result).toBe('Ocorreu um erro inesperado. Tente novamente.');
    });

    it('should return the default message for codes not in the map', () => {
      const result = mapFirebaseError({ code: 'some-non-existent-code' });
      expect(result).toBe('Ocorreu um erro inesperado. Tente novamente.');
    });
  });

  describe('Robustness & Input Validation', () => {
    it('should handle null input gracefully', () => {
      expect(mapFirebaseError(null)).toBe(
        'Ocorreu um erro inesperado. Tente novamente.',
      );
    });

    it('should handle undefined input gracefully', () => {
      expect(mapFirebaseError(undefined)).toBe(
        'Ocorreu um erro inesperado. Tente novamente.',
      );
    });

    it('should handle an empty object input gracefully', () => {
      expect(mapFirebaseError({})).toBe(
        'Ocorreu um erro inesperado. Tente novamente.',
      );
    });

    it('should handle input without a code property', () => {
      expect(mapFirebaseError({ message: 'Something went wrong' })).toBe(
        'Ocorreu um erro inesperado. Tente novamente.',
      );
    });
  });
});
