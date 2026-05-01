/**
 * @typedef {Object} Book
 * @property {string} id - Identificador único do livro (ex: Google Books API)
 * @property {string} title - O título do livro
 * @property {string} [author] - O autor do livro
 * @property {string} [description] - A sinopse ou descrição
 * @property {string} [coverImage] - URL da imagem de capa
 * @property {'reading' | 'wantToRead' | 'read'} status - Status de leitura do usuário
 * @property {number} [pageCount] - Número total de páginas
 * @property {number} [currentPage] - A página em que o usuário está atualmente (se aplicável)
 * @property {Record<string, any>} [extraData] - Espaço flexível para futuros campos do Firebase
 */

/**
 * @typedef {Object} UserStats
 * @property {number} totalBooks - Quantidade total de livros lidos
 * @property {number} totalClaps - Quantidade de "Rat Claps" (reações) recebidas
 * @property {number} currentStreak - Sequência atual de dias de leitura
 */

/**
 * @typedef {Object} User
 * @property {string} uid - ID único do Firebase Auth
 * @property {string} name - Nome de exibição do usuário
 * @property {string} email - Endereço de e-mail do usuário
 * @property {string} [photoURL] - URL do avatar/foto do usuário
 * @property {string} [bio] - Biografia do perfil
 * @property {UserStats} [stats] - Estatísticas de leitura e gamificação
 * @property {Record<string, any>} [extraData] - Espaço flexível para futuros campos do Firebase
 */

/**
 * @typedef {Object} Badge
 * @property {string} id - Identificador único da conquista
 * @property {string} name - Nome de exibição da conquista
 * @property {string} description - Descrição de como obter a conquista
 * @property {string} icon - Nome do ícone ou URL da imagem
 * @property {string|number|Date} [dateUnlocked] - Data em que foi desbloqueada (timestamp ou string)
 * @property {boolean} isUnlocked - Status indicando se o usuário possui a conquista
 * @property {Record<string, any>} [extraData] - Espaço flexível para futuros campos do Firebase
 */

/**
 * @typedef {Object} Notification
 * @property {string} id - Identificador único da notificação
 * @property {string} type - Tipo da notificação (ex: 'group_message', 'system')
 * @property {string} title - Título da notificação
 * @property {string} message - Texto da notificação
 * @property {boolean} read - Status de leitura
 * @property {string|number|Date} timestamp - Data/hora de envio
 * @property {Record<string, any>} [extraData] - Espaço flexível
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id - Identificador único da mensagem
 * @property {string} senderId - ID do remetente
 * @property {string} senderName - Nome do remetente
 * @property {string} text - Conteúdo da mensagem
 * @property {string} type - Tipo (text, system_notification)
 * @property {string|number|Date} timestamp - Data/hora de envio
 * @property {Record<string, any>} [extraData] - Espaço flexível (ex: pagesRead, bookTitle)
 */

export {}; // Export vazio para forçar o arquivo a ser tratado como um módulo ES e facilitar o auto-complete.
