/**
 * Mapeia códigos de erro do Firebase e Firestore para mensagens amigáveis em Português.
 * 
 * @param {Object} error - O objeto de erro capturado no bloco catch.
 * @returns {string} - Mensagem amigável pronta para exibição.
 */
export const mapFirebaseError = (error) => {
  const code = error?.code;
  const message = error?.message;

  // Log interno para depuração (opcional, mantido apenas para o desenvolvedor)
  if (__DEV__) {
    console.warn(`[Firebase Error] Code: ${code}, Message: ${message}`);
  }

  const errorMap = {
    // Auth Errors
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/email-already-in-use': 'Este e-mail já está em uso.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/weak-password': 'A senha é muito fraca.',
    'auth/user-disabled': 'Esta conta foi desativada.',

    // Firestore Errors
    'permission-denied': 'Você não tem permissão para realizar esta ação.',
    'unauthenticated': 'Usuário não autenticado. Por favor, faça login novamente.',
    'unavailable': 'O serviço está temporariamente indisponível. Verifique sua conexão.',
    'not-found': 'O recurso solicitado não foi encontrado.',
    'already-exists': 'Este item já existe.',
    'resource-exhausted': 'Limite de uso atingido. Tente novamente mais tarde.',
    'deadline-exceeded': 'Tempo limite da operação excedido. Tente novamente.',
    
    // Quota Errors
    'firestore/resource-exhausted': 'Limite diário atingido. Tente novamente amanhã.',
    'functions/quota-exceeded': 'Limite diário atingido. Tente novamente amanhã.',
  };

  return errorMap[code] || 'Ocorreu um erro inesperado. Tente novamente.';
};
